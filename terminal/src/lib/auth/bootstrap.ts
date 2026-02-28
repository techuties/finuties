const STORAGE_KEY = 'finuties-api-config';

interface StoredConfig {
  base?: string;
  token?: string;
}

interface SessionGuardOptions {
  redirectTo?: string;
  logPrefix?: string;
}

function readStoredConfig(): StoredConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as StoredConfig : {};
  } catch {
    return {};
  }
}

function writeStoredConfig(base: string, token: string): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ base, token }));
}

function clearStoredConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}

function normalizeBase(base: string | undefined, fallback: string): string {
  try {
    const target = new URL((base || fallback).trim());
    return target.origin.replace(/\/+$/, '');
  } catch {
    return fallback;
  }
}

export function isApiKeyToken(token: string | null | undefined): boolean {
  return typeof token === 'string' && token.trim().startsWith('fin_sk_');
}

export function getStoredToken(): string | null {
  const cfg = readStoredConfig();
  return cfg.token ? String(cfg.token) : null;
}

export function getStoredBase(defaultBase: string): string {
  return normalizeBase(readStoredConfig().base, defaultBase);
}

export function setStoredToken(base: string, token: string): void {
  writeStoredConfig(normalizeBase(base, base), token);
}

export function enforceApiKeySession(options: SessionGuardOptions): boolean {
  const { redirectTo = '/?apikey=1', logPrefix = 'auth-guard' } = options;
  const localToken = getStoredToken();

  if (localToken && !isApiKeyToken(localToken)) {
    clearStoredConfig();
    window.location.replace(redirectTo);
    return false;
  }

  if (localToken && isApiKeyToken(localToken)) {
    return true;
  }

  console.debug(`[${logPrefix}] missing FinUties API key session`);
  window.location.replace(redirectTo);
  return false;
}
