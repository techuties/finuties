/**
 * Global page UI utilities -- loading overlays, view mode switching,
 * layer toggle panel, and category tab badge updates.
 */
import {
  state, dom, charts,
  MAP_SOURCES, MAP_CATEGORIES,
  sourceData, sourceErrors, layerEnabled,
  mapSourcesFor, type ActiveCat,
} from './state';
import { updateMap } from './map-builder';
import { updateTable } from './table-builder';
import type { CategoryId } from '../source-registry';

// ─── Loading Overlay ─────────────────────────────────────────────

/** BUG FIX: explicitly set display:flex (not '') to avoid Tailwind specificity conflict. */
export function showLoading(msg = 'Loading global data...'): void {
  if (!dom.loadingEl || !dom.loadingMsg || !dom.loadingSpinner || !dom.loadingRetry) return;
  dom.loadingEl.style.display = 'flex';
  dom.loadingMsg.textContent = msg;
  dom.loadingMsg.className = 'text-sm text-slate-400';
  dom.loadingSpinner.classList.remove('hidden');
  dom.loadingRetry.classList.add('hidden');
}

export function hideLoading(): void {
  if (!dom.loadingEl) return;
  dom.loadingEl.style.display = 'none';
}

export function showError(msg: string): void {
  if (!dom.loadingEl || !dom.loadingMsg || !dom.loadingSpinner || !dom.loadingRetry) return;
  dom.loadingEl.style.display = 'flex';
  dom.loadingMsg.textContent = msg;
  dom.loadingMsg.className = 'text-sm text-amber-400';
  dom.loadingSpinner.classList.add('hidden');
  dom.loadingRetry.classList.remove('hidden');
}

// ─── View Mode Switching ─────────────────────────────────────────

/**
 * BUG FIX: use style.display instead of classList.toggle('hidden')
 * to avoid specificity conflict with Tailwind flex utilities.
 * Also resets orphaned inline flex values before applying new ones.
 */
export function applyViewMode(): void {
  const { mapPanel, tablePanel } = dom;
  if (!mapPanel || !tablePanel) return;

  const isMap = state.viewMode === 'map' || state.viewMode === 'split';
  const isTable = state.viewMode === 'table' || state.viewMode === 'split';

  mapPanel.style.display = isMap ? '' : 'none';
  mapPanel.style.flex = isMap ? '1' : '';

  tablePanel.style.display = isTable ? '' : 'none';
  tablePanel.style.flex = isTable ? '1' : '';

  // Keep table content fresh when user enters table/split view.
  if (isTable) updateTable();

  setTimeout(() => charts.main?.resize(), 50);
}

// ─── Layer Toggles ───────────────────────────────────────────────

/** Track which source-set the toggles were last built for. */
let _lastToggleCat: string = '';
const _badgeEls = new Map<string, HTMLSpanElement>();

/**
 * Build layer toggle checkboxes. On category change the DOM is fully rebuilt.
 * On data updates (same category), only badge text/colors are patched in-place
 * to avoid checkbox flicker and event-listener churn.
 */
export function buildLayerToggles(): void {
  const el = dom.layerTogglesEl;
  if (!el) return;

  const sources = state.activeCat === 'all'
    ? MAP_SOURCES
    : mapSourcesFor(state.activeCat as CategoryId);

  const catKey = state.activeCat;

  // Fast path: only update badges if the source list hasn't changed
  if (_lastToggleCat === catKey && _badgeEls.size > 0) {
    for (const src of sources) {
      const badge = _badgeEls.get(src.id);
      if (!badge) continue;
      const count = sourceData.get(src.id)?.length ?? 0;
      const hasError = sourceErrors.has(src.id);
      if (hasError) {
        badge.style.color = '#ef4444';
        badge.textContent = '!';
        badge.title = sourceErrors.get(src.id) ?? 'Fetch failed';
      } else {
        badge.style.color = count > 0 ? src.color : '#475569';
        badge.textContent = count > 0 ? count.toLocaleString() : '0';
        badge.removeAttribute('title');
      }
    }
    return;
  }

  // Full rebuild
  _lastToggleCat = catKey;
  _badgeEls.clear();
  el.innerHTML = '<p class="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Layers</p>';

  for (const src of sources) {
    if (!layerEnabled.has(src.id)) layerEnabled.set(src.id, !src.placeholder);
    const count = sourceData.get(src.id)?.length ?? 0;
    const hasError = sourceErrors.has(src.id);

    const label = document.createElement('label');
    label.className = `flex items-center gap-2 cursor-pointer group py-0.5 ${src.placeholder ? 'opacity-40 cursor-not-allowed' : ''}`;

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = layerEnabled.get(src.id)!;
    cb.disabled = !!src.placeholder;
    cb.className = 'w-3 h-3 rounded shrink-0';
    cb.style.accentColor = src.color;
    cb.setAttribute('aria-label', `Toggle ${src.shortLabel} layer`);
    cb.addEventListener('change', () => {
      layerEnabled.set(src.id, cb.checked);
      updateMap();
      updateTable();
    });

    const dot = document.createElement('span');
    dot.className = 'w-2 h-2 rounded-full shrink-0';
    dot.style.background = src.color;

    const text = document.createElement('span');
    text.className = 'text-[11px] text-slate-300 group-hover:text-white transition-colors truncate flex-1';
    text.textContent = src.shortLabel;
    if (src.placeholder) text.innerHTML += ' <span class="text-[9px] text-slate-600">(soon)</span>';

    const badge = document.createElement('span');
    badge.className = 'text-[9px] font-mono tabular-nums shrink-0';
    if (hasError) {
      badge.style.color = '#ef4444';
      badge.textContent = '!';
      badge.title = sourceErrors.get(src.id) ?? 'Fetch failed';
    } else {
      badge.style.color = count > 0 ? src.color : '#475569';
      badge.textContent = count > 0 ? count.toLocaleString() : '0';
      badge.removeAttribute('title');
    }

    _badgeEls.set(src.id, badge);
    label.append(cb, dot, text, badge);
    el.appendChild(label);
  }
}

// ─── Tab Badges ──────────────────────────────────────────────────

export function updateTabBadges(): void {
  let total = 0;
  for (const cat of MAP_CATEGORIES) {
    const catTotal = mapSourcesFor(cat.id).reduce(
      (s, src) => s + (sourceData.get(src.id)?.length ?? 0), 0,
    );
    total += catTotal;
    const badge = document.getElementById(`badge-${cat.id}`);
    if (badge) {
      if (catTotal > 0) {
        badge.textContent = catTotal.toLocaleString();
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
  }
  const allBadge = document.getElementById('badge-all');
  if (allBadge) {
    if (total > 0) {
      allBadge.textContent = total.toLocaleString();
      allBadge.classList.remove('hidden');
    } else {
      allBadge.classList.add('hidden');
    }
  }
}
