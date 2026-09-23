/**
 * API origin resolution for community Terminal.
 *
 * Production static builds default to https://data.finuties.com (CORS allowed for
 * terminal.finuties.com). Local `astro dev` uses same-origin requests proxied to the
 * hosted API — see astro.config.mjs server.proxy.
 */

export const FINUTIES_API_ORIGIN = 'https://data.finuties.com';

export function isFinutiesApiHostname(hostname: string): boolean {
  return hostname === 'data.finuties.com' || hostname.endsWith('.finuties.com');
}

export function isLocalDevApiHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

/**
 * Build-time API origin for pages and the API client.
 *
 * - `PUBLIC_API_ORIGIN` unset → dev: same-origin (`''`); production: hosted API.
 * - `PUBLIC_API_ORIGIN=` (empty) → same-origin (`''`) in any mode (use with dev proxy).
 * - `PUBLIC_API_ORIGIN=https://...` → explicit origin (trimmed, no trailing slash).
 */
export function getConfiguredApiOrigin(): string {
  const env = import.meta.env;
  const hasPublicOrigin = Object.prototype.hasOwnProperty.call(env, 'PUBLIC_API_ORIGIN');
  if (hasPublicOrigin) {
    const raw = env.PUBLIC_API_ORIGIN;
    if (raw === '' || (typeof raw === 'string' && !raw.trim())) return '';
    if (typeof raw === 'string' && raw.trim()) {
      return raw.trim().replace(/\/+$/, '');
    }
  }
  if (import.meta.env.DEV) return '';
  return FINUTIES_API_ORIGIN;
}

/** Resolve the API origin in the browser (connect page, settings). */
export function resolveBrowserApiOrigin(configuredOrigin?: string): string {
  const candidate = (configuredOrigin ?? '').trim();
  if (candidate) return candidate.replace(/\/+$/, '');
  if (typeof window !== 'undefined') {
    return window.location.origin.replace(/\/+$/, '');
  }
  const configured = getConfiguredApiOrigin();
  if (configured === '') return '';
  return configured || FINUTIES_API_ORIGIN;
}

/** True when the API base is the current page origin (local dev proxy / same-origin deploy). */
export function isSameOriginApiBase(origin: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const normalized = (origin || '').trim().replace(/\/+$/, '');
    return normalized === window.location.origin.replace(/\/+$/, '');
  } catch {
    return false;
  }
}

/**
 * In dev, rewrite a stored hosted API URL to same-origin so fetches hit the Vite proxy.
 * No-op in production builds.
 */
export function coerceDevProxiedApiBase(base: string): string {
  if (!import.meta.env.DEV || typeof window === 'undefined') {
    return (base || '').trim().replace(/\/+$/, '');
  }
  try {
    const u = new URL(base.trim());
    if (isFinutiesApiHostname(u.hostname)) {
      return window.location.origin.replace(/\/+$/, '');
    }
  } catch {
    // ignore
  }
  return base.trim().replace(/\/+$/, '');
}

export function isAllowedApiOrigin(origin: string): boolean {
  const normalized = (origin || '').trim();
  if (!normalized) return import.meta.env.DEV;
  if (isSameOriginApiBase(normalized)) return true;
  try {
    const u = new URL(normalized);
    if (import.meta.env.PUBLIC_ALLOW_NON_FINUTIES_API === 'true') return true;
    if (import.meta.env.DEV && isLocalDevApiHostname(u.hostname)) return true;
    return isFinutiesApiHostname(u.hostname);
  } catch {
    return false;
  }
}
