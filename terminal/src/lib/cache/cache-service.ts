interface CacheStats {
  keyCount: number;
  totalBytes: number;
  byPrefix: Record<string, { keyCount: number; totalBytes: number }>;
}

const PREFIXES = ['card-cache:', 'plugin-cache:', 'analysis-cache:'];

function keySize(key: string, value: string): number {
  return new Blob([key + value]).size;
}

function classify(key: string): string {
  const match = PREFIXES.find((p) => key.startsWith(p));
  return match || 'other';
}

export function cacheGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : null;
  } catch {
    return null;
  }
}

export function cacheSet<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota errors for now
  }
}

export function invalidateCacheKey(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function invalidateByPrefix(prefix: string): number {
  let removed = 0;
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) {
        localStorage.removeItem(k);
        removed += 1;
      }
    }
  } catch {
    // ignore
  }
  return removed;
}

export function clearAllCaches(): number {
  let removed = 0;
  for (const prefix of PREFIXES) removed += invalidateByPrefix(prefix);
  return removed;
}

export function getCacheStats(): CacheStats {
  const byPrefix: CacheStats['byPrefix'] = {};
  let keyCount = 0;
  let totalBytes = 0;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      const v = localStorage.getItem(k) || '';
      const prefix = classify(k);
      const bytes = keySize(k, v);
      if (!byPrefix[prefix]) byPrefix[prefix] = { keyCount: 0, totalBytes: 0 };
      byPrefix[prefix].keyCount += 1;
      byPrefix[prefix].totalBytes += bytes;
      keyCount += 1;
      totalBytes += bytes;
    }
  } catch {
    // ignore
  }

  return { keyCount, totalBytes, byPrefix };
}
