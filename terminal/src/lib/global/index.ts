/**
 * Global page module barrel -- re-exports all sub-modules for clean imports.
 */
export { state, dom, charts, initDom, sourceData, sourceErrors, layerEnabled, MAP_SOURCES, MAP_CATEGORIES, mapSourcesFor } from './state';
export type { ViewMode, ActiveCat, EChartsInstance } from './state';
export { showLoading, hideLoading, showError, applyViewMode, buildLayerToggles, updateTabBadges } from './ui';
export { loadData } from './data-loader';
export { buildMapOption, updateMap, mapNav, setupMapClicks } from './map-builder';
export { updateTable } from './table-builder';
export { renderSparkline, renderTimeline } from './charts';
export { updateKpis } from './kpis';
export { refreshViews } from './refresh';
