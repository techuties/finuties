/**
 * Central refresh coordinator -- updates all data-dependent views.
 * Exists as a separate module to break the circular dependency
 * between data-loader and the individual view modules.
 */
import {
  sourceData, MAP_SOURCES, state, mapSourcesFor,
} from './state';
import type { CategoryId } from '../source-registry';
import { updateKpis } from './kpis';
import { updateMap } from './map-builder';
import { updateTable } from './table-builder';
import { renderSparkline, renderTimeline } from './charts';

export function refreshViews(): void {
  updateKpis();
  updateMap();
  updateTable();
  renderSparkline();
  renderTimeline();
  updateEmptyState();
}

/**
 * Show "No data loaded" overlay when all non-placeholder sources have
 * reported back but none returned any rows.
 */
function updateEmptyState(): void {
  const el = document.getElementById('map-empty');
  if (!el) return;
  const relevantSources = (
    state.activeCat === 'all'
      ? MAP_SOURCES
      : mapSourcesFor(state.activeCat as CategoryId)
  ).filter(s => !s.placeholder);

  const hasData = relevantSources.some(s => (sourceData.get(s.id)?.length ?? 0) > 0);
  if (hasData) {
    el.style.display = 'none';
    return;
  }
  const allDone = relevantSources.every(s => sourceData.has(s.id));
  el.style.display = allDone ? 'flex' : 'none';
}
