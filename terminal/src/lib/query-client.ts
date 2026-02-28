/**
 * Shared TanStack Query client for the Explorer.
 *
 * Provides a singleton QueryClient with sensible defaults for the
 * FinUties data-fetching pattern: 5-minute stale time, 3 retries,
 * background refetching, and request deduplication.
 */
import { QueryClient } from '@tanstack/solid-query';

let client: QueryClient | null = null;

export function getQueryClient(): QueryClient {
  if (!client) {
    client = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 60 * 1000,
          gcTime: 15 * 60 * 1000,
          retry: 2,
          retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
          refetchOnWindowFocus: false,
          refetchOnReconnect: true,
        },
      },
    });
  }
  return client;
}
