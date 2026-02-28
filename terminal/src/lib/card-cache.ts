/**
 * Card Cache -- localStorage-based cache for dashboard card data.
 */
import type { CardData } from './card-registry';

interface CacheEntry {
  data: CardData;
  fetchedAt: number;
}

const CACHE_PREFIX = 'card-cache:';

function cacheKey(instanceId: string, type: string): string {
  return CACHE_PREFIX + type + ':' + instanceId;
}

export function getCachedData(instanceId: string, type: string, ttl: number): CardData | null {
  try {
    const raw = localStorage.getItem(cacheKey(instanceId, type));
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.fetchedAt > ttl) {
      localStorage.removeItem(cacheKey(instanceId, type));
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export function getStaleCachedData(instanceId: string, type: string): CardData | null {
  try {
    const raw = localStorage.getItem(cacheKey(instanceId, type));
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    return entry.data ?? null;
  } catch {
    return null;
  }
}

export function setCachedData(instanceId: string, type: string, data: CardData, _ttl: number): void {
  try {
    const entry: CacheEntry = { data, fetchedAt: Date.now() };
    localStorage.setItem(cacheKey(instanceId, type), JSON.stringify(entry));
  } catch {}
}

export function invalidateCard(instanceId: string): void {
  try {
    const prefix = CACHE_PREFIX;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix) && key.endsWith(':' + instanceId)) {
        localStorage.removeItem(key);
      }
    }
  } catch {}
}

export function getCacheFetchedAt(instanceId: string, type: string): number | null {
  try {
    const raw = localStorage.getItem(cacheKey(instanceId, type));
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    return entry.fetchedAt;
  } catch {
    return null;
  }
}
