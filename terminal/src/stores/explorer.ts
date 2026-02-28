/**
 * Explorer shared state — nanostores atoms.
 *
 * These atoms are shareable across Astro islands and persist across
 * SolidJS component trees without prop drilling.
 */
import { atom, map } from 'nanostores';

/* ── Navigation / context ──────────────────────────────────────── */

/** Currently active country ISO-3 code (empty = none). */
export const $country = atom<string>('');

/** Active data category filter. */
export const $category = atom<string>('');

/** Active data source ID. */
export const $source = atom<string>('');

/** Current Explorer mode: landing | search | data | entity | filing | person | econ. */
export const $mode = atom<string>('');

/** Free-text search query. */
export const $searchQuery = atom<string>('');

/* ── UI preferences ────────────────────────────────────────────── */

/** Zoom / scale level for the pod grid (0.7 – 1.3, default 1). */
export const $zoom = atom<number>(
  (() => {
    try {
      const stored = localStorage.getItem('explore-zoom');
      return stored ? Number(stored) : 1;
    } catch {
      return 1;
    }
  })(),
);

/* Persist zoom changes to localStorage. */
$zoom.subscribe((val) => {
  try {
    localStorage.setItem('explore-zoom', String(val));
  } catch { /* noop */ }
});

/* ── Source toggle visibility (for global map) ─────────────────── */

/** Map<sourceId, boolean> — which data layers are visible. */
export const $visibleSources = map<Record<string, boolean>>({});

/* ── Breadcrumb trail ──────────────────────────────────────────── */

export interface BreadcrumbEntry {
  label: string;
  url: string;
  type: string;
}

export const $breadcrumbs = atom<BreadcrumbEntry[]>(
  (() => {
    try {
      const raw = sessionStorage.getItem('explore-trail');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  })(),
);

$breadcrumbs.subscribe((trail) => {
  try {
    sessionStorage.setItem('explore-trail', JSON.stringify(trail.slice(-10)));
  } catch { /* noop */ }
});

/** Push a new breadcrumb. De-duplicates by URL. */
export function pushBreadcrumb(label: string, url: string, type: string): void {
  const trail = [...$breadcrumbs.get()];
  const idx = trail.findIndex((c) => c.url === url);
  if (idx >= 0) {
    $breadcrumbs.set(trail.slice(0, idx + 1));
  } else {
    trail.push({ label, url, type });
    $breadcrumbs.set(trail);
  }
}

/* ── Recent searches ───────────────────────────────────────────── */

export interface RecentSearch {
  label: string;
  url: string;
  type: string;
}

export const $recentSearches = atom<RecentSearch[]>(
  (() => {
    try {
      const raw = localStorage.getItem('explore-recent');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  })(),
);

$recentSearches.subscribe((list) => {
  try {
    localStorage.setItem('explore-recent', JSON.stringify(list.slice(0, 8)));
  } catch { /* noop */ }
});

/** Save a recent search entry (deduplicates, caps at 8). */
export function saveRecent(label: string, url: string, type: string): void {
  const list = $recentSearches.get().filter((r) => r.url !== url);
  list.unshift({ label, url, type });
  $recentSearches.set(list.slice(0, 8));
}
