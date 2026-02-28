/**
 * Global page data loader -- builds query params, manages concurrent fetches
 * with abort control, and progressively updates the UI as sources complete.
 */
import {
  state, dom,
  MAP_SOURCES,
  sourceData, sourceErrors,
} from './state';
import { fetchSource, defaultStartDate } from '../global-data-api';
import { mapNameToIso3 } from '../geo-map';
import type { SourceDef } from '../source-registry';
import { showLoading, hideLoading, buildLayerToggles, updateTabBadges } from './ui';
import { refreshViews } from './refresh';

// ─── Param Builder ───────────────────────────────────────────────

function buildParams(src: SourceDef): Record<string, string | number | boolean | null | undefined> {
  const startDate = dom.startInput?.value || defaultStartDate(365);
  const endDate = dom.endInput?.value || undefined;
  const country = dom.countryInput?.value.trim() || undefined;
  const params: Record<string, string | number | boolean | null | undefined> = {
    limit: src.defaultLimit,
  };
  if (src.id === 'epa') {
    params.no_cache = true;
  }

  if (src.defaultDays > 0) {
    params.start_date = startDate;
    params.end_date = endDate;
  } else if (src.geoType !== 'none' && state.explicitTimeRange) {
    const sy = dom.startInput?.value ? new Date(dom.startInput.value).getFullYear() : undefined;
    const ey = dom.endInput?.value ? new Date(dom.endInput.value).getFullYear() : undefined;
    if (sy) params.start_year = sy;
    if (ey) params.end_year = ey;
  }

  if (country) {
    const iso3 = mapNameToIso3(country);
    if (src.id === 'gdelt') params.actor1_country = iso3;
    else if (src.id === 'epa') {
      // EPA endpoint expects a US 2-letter state code; ignore broader country inputs.
      const stateCode = country.toUpperCase();
      if (/^[A-Z]{2}$/.test(stateCode)) params.state = stateCode;
    }
    else if (src.countryField) params[src.countryField] = iso3;
    else params.country = iso3;
  }

  // Geopolitical requirement: include still-ongoing conflicts even if they started years ago.
  // On default load we avoid clipping by start_date/end_date.
  if (src.id === 'ucdp') {
    params.ongoing_only = true;
    if (!state.explicitTimeRange) {
      delete params.start_date;
      delete params.end_date;
    }
  }

  return params;
}

// ─── Debounce Utility ────────────────────────────────────────────

interface Debounced<T extends (...args: unknown[]) => void> {
  (...args: Parameters<T>): void;
  flush(): void;
  cancel(): void;
}

function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): Debounced<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const db = ((...args: unknown[]) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { timer = null; fn(...args); }, ms);
  }) as Debounced<T>;
  db.flush = () => { if (timer) { clearTimeout(timer); timer = null; fn(); } };
  db.cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
  return db;
}

// ─── Load Data ───────────────────────────────────────────────────

let _loadAbort: AbortController | null = null;

export async function loadData(): Promise<void> {
  if (_loadAbort) _loadAbort.abort();
  _loadAbort = new AbortController();
  const signal = _loadAbort.signal;

  showLoading('Loading sources...');
  sourceErrors.clear();

  const toFetch = MAP_SOURCES.filter(s => !s.placeholder);
  let done = 0;
  const total = toFetch.length;
  const CONCURRENCY = 6;

  let idx = 0;
  const refreshDebounce = debounce(() => {
    buildLayerToggles();
    updateTabBadges();
    refreshViews();
  }, 120);

  function next(): Promise<void> {
    if (signal.aborted || idx >= toFetch.length) return Promise.resolve();
    const src = toFetch[idx++];
    return fetchSource(src.endpoint, buildParams(src), 45_000, signal)
      .then(result => {
        if (signal.aborted) return;
        if (result.ok) {
          sourceData.set(src.id, result.data as Record<string, unknown>[]);
        } else {
          sourceErrors.set(src.id, result.error ?? 'Unknown error');
          sourceData.set(src.id, []);
        }
      })
      .catch(err => {
        if (signal.aborted) return;
        sourceErrors.set(src.id, err?.message ?? 'Network error');
        sourceData.set(src.id, []);
      })
      .finally(() => {
        done++;
        if (!signal.aborted && dom.loadingMsg) {
          dom.loadingMsg.textContent = `Loading sources... (${done}/${total})`;
          refreshDebounce();
        }
        return next();
      });
  }

  const safetyTimer = setTimeout(() => {
    if (!signal.aborted) {
      console.warn('[Global] Safety timeout: forcing hide of loading overlay');
      hideLoading();
    }
  }, 120_000);

  try {
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, total) }, () => next()),
    );
    if (!signal.aborted) {
      refreshDebounce.cancel();
      buildLayerToggles();
      updateTabBadges();
      refreshViews();
    }
  } catch (err) {
    console.error('Global data fetch failed:', err);
  } finally {
    clearTimeout(safetyTimer);
    if (!signal.aborted) {
      try {
        hideLoading();
      } catch (e) {
        console.error('Failed to hide loading overlay:', e);
        if (dom.loadingEl) dom.loadingEl.style.display = 'none';
      }
    }
  }
}
