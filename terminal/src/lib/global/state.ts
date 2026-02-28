/**
 * Global page shared state -- reactive data, chart refs, DOM handles, and derived constants.
 */
import {
  CATEGORIES, SOURCES, CATEGORY_MAP,
  type CategoryId, type SourceDef,
} from '../source-registry';

// ─── Types ───────────────────────────────────────────────────────

export type ViewMode = 'map' | 'table' | 'split';
export type ActiveCat = CategoryId | 'all';
export type EChartsInstance = ReturnType<typeof import('echarts')['init']>;

// ─── Derived Constants ───────────────────────────────────────────

export const MAP_SOURCES = SOURCES.filter(s => s.geoType !== 'none');
export const MAP_CATEGORIES = CATEGORIES.filter(
  cat => MAP_SOURCES.some(s => s.category === cat.id),
);

// ─── Shared Reactive State ───────────────────────────────────────

export const state = {
  activeCat: 'all' as ActiveCat,
  viewMode: 'map' as ViewMode,
  tableSortKey: '',
  tableSortAsc: true,
  /** True once the user explicitly changes the time range (clicks preset or Apply). */
  explicitTimeRange: false,
};

export const sourceData = new Map<string, Record<string, unknown>[]>();
export const sourceErrors = new Map<string, string>();
export const layerEnabled = new Map<string, boolean>();

// ─── Chart Refs ──────────────────────────────────────────────────

export const charts = {
  main: null as EChartsInstance | null,
  mainRo: null as ResizeObserver | null,
  spark: null as EChartsInstance | null,
  time: null as EChartsInstance | null,
  sparkRo: null as ResizeObserver | null,
  timeRo: null as ResizeObserver | null,
};

// ─── DOM Refs ────────────────────────────────────────────────────

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

export const dom = {
  catNav: null as HTMLElement | null,
  layerTogglesEl: null as HTMLElement | null,
  kpiGrid: null as HTMLElement | null,
  mapPanel: null as HTMLElement | null,
  tablePanel: null as HTMLElement | null,
  mapEl: null as HTMLElement | null,
  loadingEl: null as HTMLElement | null,
  loadingMsg: null as HTMLElement | null,
  loadingSpinner: null as HTMLElement | null,
  loadingRetry: null as HTMLElement | null,
  startInput: null as HTMLInputElement | null,
  endInput: null as HTMLInputElement | null,
  countryInput: null as HTMLInputElement | null,
  applyBtn: null as HTMLElement | null,
  tableHead: null as HTMLElement | null,
  tableBody: null as HTMLElement | null,
  tableEmpty: null as HTMLElement | null,
};

export function initDom(): void {
  dom.catNav = $('cat-nav');
  dom.layerTogglesEl = $('layer-toggles');
  dom.kpiGrid = $('kpi-grid');
  dom.mapPanel = $('map-panel');
  dom.tablePanel = $('table-panel');
  dom.mapEl = $('geo-map');
  dom.loadingEl = $('map-loading');
  dom.loadingMsg = $('loading-msg');
  dom.loadingSpinner = $('loading-spinner');
  dom.loadingRetry = $('loading-retry');
  dom.startInput = $<HTMLInputElement>('filter-start');
  dom.endInput = $<HTMLInputElement>('filter-end');
  dom.countryInput = $<HTMLInputElement>('filter-country');
  dom.applyBtn = $('btn-apply');
  dom.tableHead = $('table-head');
  dom.tableBody = $('table-body');
  dom.tableEmpty = $('table-empty');
}

// ─── Helpers ─────────────────────────────────────────────────────

export function mapSourcesFor(cat: CategoryId): SourceDef[] {
  return MAP_SOURCES.filter(s => s.category === cat);
}

export function visibleSources(): SourceDef[] {
  const pool = state.activeCat === 'all'
    ? MAP_SOURCES
    : mapSourcesFor(state.activeCat as CategoryId);
  return pool.filter(s => layerEnabled.get(s.id) && !s.placeholder);
}

export function firstStr(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (v && typeof v === 'string') return v;
  }
  return '';
}

export function catColor(): string {
  return CATEGORY_MAP.get(state.activeCat as CategoryId)?.color ?? '#3b82f6';
}
