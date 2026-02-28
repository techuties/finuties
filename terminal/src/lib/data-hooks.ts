/**
 * TanStack Query hooks for Explorer data fetching.
 *
 * Wraps the existing fetchSource / fetchRegistry / apiFetch functions
 * with createQuery for automatic caching, deduplication, and SWR.
 *
 * These hooks are designed to be used from SolidJS components and
 * consume the existing api-client + global-data-api infrastructure.
 */
import { createQuery } from '@tanstack/solid-query';
import type { CreateQueryResult } from '@tanstack/solid-query';

/* -------------------------------------------------------------------
 * Re-export types that data hooks produce.
 * The actual fetch wrappers (apiFetch, fetchSource, fetchRegistry)
 * are defined in api-client.ts / global-data-api.ts. We import them
 * dynamically so this file can be used even if those modules are not
 * yet present as source (they exist in the compiled dist).
 * ---------------------------------------------------------------- */

/** Generic API response shape from apiFetch. */
export interface ApiResult<T> {
  ok: boolean;
  data: T | null;
  error?: string;
  tokenCost?: number;
  creditsRemaining?: number | null;
}

/** Registry source entry from /api/v1/data/metadata/registry. */
export interface RegistrySource {
  id: string;
  label: string;
  description: string;
  endpoint: string;
  category: string;
  color: string;
  rows: number;
  columns: { key: string; label: string; type: string }[];
}

export interface RegistryCategory {
  id: string;
  label: string;
  color: string;
  icon: string;
  sources: string[];
}

export interface RegistryResponse {
  sources: Record<string, RegistrySource>;
  categories: Record<string, RegistryCategory>;
  total_sources: number;
}

/* -------------------------------------------------------------------
 * Lazy import helpers — resolve the actual fetch functions at runtime.
 * This avoids hard import errors when the source modules are missing
 * during development, while still enabling full type safety.
 * ---------------------------------------------------------------- */

async function lazyApiFetch<T>(path: string, timeout?: number): Promise<ApiResult<T>> {
  try {
    const mod = await import('./api-client');
    return mod.apiFetch<T>(path, timeout);
  } catch {
    return { ok: false, data: null, error: 'api-client not available' };
  }
}

async function lazyFetchSource<T>(
  endpoint: string,
  params: Record<string, string | number> = {},
  timeout?: number,
): Promise<ApiResult<T[]>> {
  try {
    const mod = await import('./global-data-api');
    return mod.fetchSource<T>(endpoint, params, timeout);
  } catch {
    return { ok: false, data: null, error: 'global-data-api not available' };
  }
}

async function lazyFetchRegistry(): Promise<RegistryResponse | null> {
  try {
    const mod = await import('./global-data-api');
    return mod.fetchRegistry();
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------
 * Query hooks
 * ---------------------------------------------------------------- */

/**
 * Fetch a data source with caching and deduplication.
 *
 * @param sourceId  - Stable query key identifier (e.g. source.id)
 * @param endpoint  - API endpoint path (e.g. '/api/v1/free-data/earthquakes')
 * @param params    - Query parameters (country, limit, etc.)
 * @param options   - Extra query options
 */
export function useSourceQuery<T = Record<string, unknown>>(
  sourceId: () => string,
  endpoint: () => string,
  params: () => Record<string, string | number>,
  options?: { enabled?: () => boolean; staleTime?: number },
): CreateQueryResult<T[]> {
  return createQuery(() => ({
    queryKey: ['source', sourceId(), endpoint(), params()] as const,
    queryFn: async () => {
      const res = await lazyFetchSource<T>(endpoint(), params());
      if (!res.ok || !res.data) throw new Error(res.error || 'Fetch failed');
      return res.data;
    },
    enabled: options?.enabled?.() ?? true,
    staleTime: options?.staleTime,
  }));
}

/**
 * Fetch the global source registry with 5-minute caching.
 */
export function useRegistryQuery(): CreateQueryResult<RegistryResponse> {
  return createQuery(() => ({
    queryKey: ['registry'] as const,
    queryFn: async () => {
      const res = await lazyFetchRegistry();
      if (!res) throw new Error('Registry fetch failed');
      return res;
    },
    staleTime: 5 * 60 * 1000,
  }));
}

/**
 * Generic API fetch with caching.
 */
export function useApiFetch<T>(
  key: () => string[],
  path: () => string,
  options?: { enabled?: () => boolean; staleTime?: number },
): CreateQueryResult<T> {
  return createQuery(() => ({
    queryKey: key(),
    queryFn: async () => {
      const res = await lazyApiFetch<T>(path());
      if (!res.ok || !res.data) throw new Error(res.error || 'Fetch failed');
      return res.data;
    },
    enabled: options?.enabled?.() ?? true,
    staleTime: options?.staleTime,
  }));
}
