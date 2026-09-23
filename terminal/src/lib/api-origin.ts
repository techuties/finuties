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

/** Build-time / SSR default passed into inline scripts (empty in dev → browser uses location.origin). */
export function getConfiguredApiOrigin(): string {
  const explicit = (import.meta.env.PUBLIC_API_ORIGIN || '').trim();
  if (explicit) return explicit.replace(/\/+$/, '');
  if (import.meta.env.DEV) return '';
  return FINUTIES_API_ORIGIN;
}

/** Resolve the API origin in the browser (connect page, settings). */
export function resolveBrowserApiOrigin(configuredOrigin?: string): string {
  const candidate = (configuredOrigin || '').trim();
  if (candidate) return candidate.replace(/\/+$/, '');
  if (typeof window !== 'undefined') {
    return window.location.origin.replace(/\/+$/, '');
  }
  return getConfiguredApiOrigin() || FINUTIES_API_ORIGIN;
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
  try {
    const u = new URL(normalized);
    if (import.meta.env.PUBLIC_ALLOW_NON_FINUTIES_API === 'true') return true;
    if (import.meta.env.DEV && isLocalDevApiHostname(u.hostname)) return true;
    return isFinutiesApiHostname(u.hostname);
  } catch {
    return false;
  }
}
