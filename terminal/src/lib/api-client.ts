/**
 * Client-side API configuration and fetch helper.
 *
 * Enforces a FinUties-first API contract:
 * - default endpoint is data.finuties.com
 * - non-Finuties hosts are blocked unless explicitly allowed
 * - all card/modules share one request adapter with retries + header parsing
 */

const STORAGE_KEY = 'finuties-api-config';
const DEFAULT_BASE = (import.meta.env.PUBLIC_API_ORIGIN || 'https://data.finuties.com').trim();
const ALLOW_NON_FINUTIES_API = import.meta.env.PUBLIC_ALLOW_NON_FINUTIES_API === 'true';

export function getDefaultApiBase(): string {
  return DEFAULT_BASE;
}

export interface ApiConfig {
  base: string;
  token: string;
}

export interface ApiFetchResult<T = unknown> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
  tokenCost: number;
  creditsRemaining: number | null;
}

export interface ApiFetchInit extends RequestInit {
  timeout?: number;
  retryCount?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _inflight = new Map<string, Promise<ApiFetchResult<any>>>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeToken(raw: string | undefined | null): string {
  return (raw || '').trim();
}

function isFinutiesHost(hostname: string): boolean {
  return hostname === 'data.finuties.com' || hostname.endsWith('.finuties.com');
}

export function normalizeApiBase(base: string | undefined | null): string {
  const candidate = (base || DEFAULT_BASE).trim();
  try {
    const url = new URL(candidate);
    return url.origin.replace(/\/+$/, '');
  } catch {
    return '';
  }
}

export function isAllowedApiBase(base: string): boolean {
  const normalized = normalizeApiBase(base);
  if (!normalized) return false;
  if (ALLOW_NON_FINUTIES_API) return true;
  try {
    const u = new URL(normalized);
    return isFinutiesHost(u.hostname);
  } catch {
    return false;
  }
}

export function validateApiConfig(base: string, token: string): { valid: boolean; error?: string; config?: ApiConfig } {
  const normalizedBase = normalizeApiBase(base);
  const normalizedToken = sanitizeToken(token);
  if (!normalizedBase) return { valid: false, error: 'Invalid API base URL' };
  if (!normalizedToken) return { valid: false, error: 'API key or token is required' };
  if (!isAllowedApiBase(normalizedBase)) {
    return {
      valid: false,
      error: 'Only FinUties API hosts are allowed. Set PUBLIC_ALLOW_NON_FINUTIES_API=true to override for local development.',
    };
  }
  return { valid: true, config: { base: normalizedBase, token: normalizedToken } };
}

/** Retrieve saved API config from localStorage (or null). */
export function getApiConfig(): ApiConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ApiConfig;
    const checked = validateApiConfig(parsed.base, parsed.token);
    return checked.valid && checked.config ? checked.config : null;
  } catch {
    return null;
  }
}

/** Persist API config to localStorage. Accepts (base, token) or ({ base, token }). */
export function setApiConfig(baseOrConfig: string | ApiConfig, token?: string): boolean {
  const checked = (typeof baseOrConfig === 'string')
    ? validateApiConfig(baseOrConfig, token || '')
    : validateApiConfig(baseOrConfig.base, baseOrConfig.token);
  if (!checked.valid || !checked.config) return false;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(checked.config));
  return true;
}

/** Remove API config from localStorage. */
export function clearApiConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** Check whether a fetch result represents a network error. */
export function isNetworkError(result: ApiFetchResult | unknown): boolean {
  if (result && typeof result === 'object' && 'ok' in result) {
    const r = result as ApiFetchResult;
    return r.status === 0 && !r.ok;
  }
  if (result instanceof TypeError && /fetch|network/i.test(result.message)) return true;
  if (result instanceof DOMException && result.name === 'AbortError') return true;
  return false;
}

function shouldRetry(method: string, status: number): boolean {
  if (method !== 'GET') return false;
  return status === 0 || status === 429 || status === 502 || status === 503 || status === 504;
}

/**
 * Centralized fetch wrapper for all API requests.
 * Includes GET dedupe and bounded retry for transient errors.
 */
export async function apiFetch<T = unknown>(path: string, init?: ApiFetchInit): Promise<ApiFetchResult<T>> {
  const cfg = getApiConfig();
  if (!cfg) {
    return { ok: false, status: 0, data: null, error: 'API not configured', tokenCost: 0, creditsRemaining: null };
  }
  if (!path.startsWith('/')) {
    return { ok: false, status: 0, data: null, error: 'API path must start with "/"', tokenCost: 0, creditsRemaining: null };
  }

  const method = (init?.method ?? 'GET').toUpperCase();
  const url = `${cfg.base.replace(/\/+$/, '')}${path}`;
  const key = `${method}:${url}`;
  const retryCount = Math.max(0, Math.min(init?.retryCount ?? 2, 4));

  if (method === 'GET') {
    const existing = _inflight.get(key);
    if (existing) return existing as Promise<ApiFetchResult<T>>;
  }

  const task = (async () => {
    let attempt = 0;
    let last: ApiFetchResult<T> = { ok: false, status: 0, data: null, error: 'Unknown error', tokenCost: 0, creditsRemaining: null };
    while (attempt <= retryCount) {
      // eslint-disable-next-line no-await-in-loop
      last = await _apiFetchInner<T>(cfg, url, init);
      if (last.ok || !shouldRetry(method, last.status) || attempt === retryCount) return last;
      const waitMs = Math.min(250 * (2 ** attempt) + Math.floor(Math.random() * 120), 2000);
      // eslint-disable-next-line no-await-in-loop
      await sleep(waitMs);
      attempt += 1;
    }
    return last;
  })();

  if (method === 'GET') {
    _inflight.set(key, task);
    task.finally(() => _inflight.delete(key));
  }
  return task;
}

async function _apiFetchInner<T>(cfg: ApiConfig, url: string, init?: ApiFetchInit): Promise<ApiFetchResult<T>> {
  const headers = new Headers(init?.headers);
  if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${cfg.token}`);

  const timeoutMs = init?.timeout ?? 30_000;
  const controller = new AbortController();
  if (init?.signal) init.signal.addEventListener('abort', () => controller.abort(), { once: true });
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...init, headers, signal: controller.signal });
    let data: T | null = null;
    let error: string | null = null;

    const rawCost = res.headers.get('X-Token-Cost');
    const rawRemaining = res.headers.get('X-Credits-Remaining');
    const tokenCost = rawCost ? parseInt(rawCost, 10) || 0 : 0;
    const creditsRemaining = rawRemaining ? parseInt(rawRemaining, 10) : null;

    try {
      data = await res.json() as T;
    } catch {
      // Non-JSON response.
    }

    if (!res.ok) {
      const detail = (data && typeof data === 'object' && 'detail' in data)
        ? (data as Record<string, unknown>).detail
        : null;
      if (typeof detail === 'string') error = detail;
      else if (Array.isArray(detail)) {
        error = detail.map((d: unknown) => {
          if (d && typeof d === 'object' && 'msg' in (d as Record<string, unknown>)) {
            return String((d as Record<string, unknown>).msg);
          }
          return String(d);
        }).join('; ');
      } else if (detail != null) error = JSON.stringify(detail);
      else error = res.statusText || `HTTP ${res.status}`;
    }

    return { ok: res.ok, status: res.status, data, error, tokenCost, creditsRemaining };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { ok: false, status: 0, data: null, error: 'Request timed out', tokenCost: 0, creditsRemaining: null };
    }
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, status: 0, data: null, error: msg, tokenCost: 0, creditsRemaining: null };
  } finally {
    clearTimeout(timer);
  }
}
