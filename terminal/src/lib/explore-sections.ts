/**
 * Explore section registry -- manages section definitions for the /explore entity detail page.
 *
 * Each section is a self-contained fetch + render unit (similar to dashboard cards)
 * that can be loaded for specific entity types (company, investor, stock).
 */

import { apiFetch } from './api-client';
import { esc } from './explore/layout';

// ─── Types ──────────────────────────────────────────────────────────────────

export type EntityType = 'company' | 'investor' | 'stock';

export interface EntityParams {
  type: EntityType;
  cik?: string;
  symbol?: string;
  name?: string;
}

export interface SectionData {
  payload: unknown;
  tokenCost: number;
  creditsRemaining: number | null;
}

export interface SectionMinSize {
  /** Minimum columns to span: 1 = compact, 2 = wide table, 3 = chart+table */
  minCols: 1 | 2 | 3;
  /** Content category hint for priority ordering */
  weight: 'compact' | 'standard' | 'wide';
}

export interface SectionDefinition {
  id: string;
  title: string;
  icon: string;
  /** Which entity types this section applies to. */
  entityTypes: EntityType[];
  /** Fetch data for this section given entity parameters. */
  fetch: (params: EntityParams) => Promise<SectionData>;
  /** Render section content into the container element. */
  render: (container: HTMLElement, data: SectionData, params: EntityParams) => void;
  /** Optional size hint for the grid layout. Defaults to { minCols: 1, weight: 'standard' } */
  minSize?: SectionMinSize;
}

// ─── Registry ───────────────────────────────────────────────────────────────

const _registry = new Map<string, SectionDefinition>();

/** Register an explore section. */
export function registerSection(def: SectionDefinition): void {
  _registry.set(def.id, def);
}

/** Get a section definition by ID. */
export function getSectionDef(id: string): SectionDefinition | undefined {
  return _registry.get(id);
}

/** Get all sections applicable to a given entity type. */
export function getSectionsForEntity(type: EntityType): SectionDefinition[] {
  return Array.from(_registry.values()).filter((s) => s.entityTypes.includes(type));
}

/** All registered section definitions. */
export function allSectionDefs(): SectionDefinition[] {
  return Array.from(_registry.values());
}

// ─── Discovery -> Custom Section Map ─────────────────────────────────────────
// Maps backend discovery view_keys to registered section IDs so the explore
// page can decide whether to use a rich custom section or the generic table.

const CUSTOM_SECTION_MAP: Record<string, string> = {
  'sec/filings':                'sec-filings',
  'sec/insider-transactions':   'insider-transactions',
  'sec/executive-compensation': 'exec-compensation',
  'sec/financial-statements':   'financial-statements',
  'sec/holdings':               'holdings',
  'sec/holdings:by-stock':      'investors',
  'sec/beneficial-ownership':   'beneficial-ownership',
  'sec/news-items':             'news-items',
  'sec/money-flow':             'money-flow',
  'sec/agreements':             'agreements',
  'market/stocks':              'stock-info',
  'market/stock-prices':        'stock-prices-detail',
  'market/investors':           'investors',
};

/** Return the custom section ID for a discovery view_key, or null if none. */
export function getCustomSectionId(viewKey: string): string | null {
  return CUSTOM_SECTION_MAP[viewKey] ?? null;
}

// ─── Resource title humanization ────────────────────────────────────────────

const _TITLE_OVERRIDES: Record<string, string> = {
  'sec/nport-reports':       'N-PORT Fund Reports',
  'sec/filing-documents':    'Filing Documents',
  'sec/filing-headers':      'Filing Headers',
  'system/sec-rss-entries':  'SEC RSS Feed Entries',
  'market/investors':        'Institutional Holders',
  'market/stocks':           'Stock Information',
  'market/stock-prices':     'Stock Prices',
};

/** Human-friendly title for a discovery view_key. */
export function humanizeResourceTitle(viewKey: string): string {
  if (_TITLE_OVERRIDES[viewKey]) return _TITLE_OVERRIDES[viewKey];
  const resource = viewKey.includes('/') ? viewKey.split('/')[1] : viewKey;
  return resource
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Explore link builder ────────────────────────────────────────────────────

interface ExploreLinkParams {
  type: string;
  cik?: string;
  symbol?: string;
  name?: string;
  accession?: string;
  from?: string;
  indicator?: string;
}

/** Build an /explore URL from parameters. */
export function exploreLink(p: ExploreLinkParams): string {
  const qps: string[] = ['type=' + encodeURIComponent(p.type)];
  if (p.cik) qps.push('cik=' + encodeURIComponent(p.cik));
  if (p.symbol) qps.push('symbol=' + encodeURIComponent(p.symbol));
  if (p.name) qps.push('name=' + encodeURIComponent(p.name));
  if (p.accession) qps.push('accession=' + encodeURIComponent(p.accession));
  if (p.from) qps.push('from=' + encodeURIComponent(p.from));
  if (p.indicator) qps.push('indicator=' + encodeURIComponent(p.indicator));
  return '/explore?' + qps.join('&');
}

// ─── Shared helpers ─────────────────────────────────────────────────────────

export { esc };

/** Strip HTML tags, collapse whitespace, and truncate. */
export function stripHtml(html: string, maxLen = 300): string {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  let text = (tmp.textContent || tmp.innerText || '').trim().replace(/\s+/g, ' ');
  if (text.length > maxLen) text = text.slice(0, maxLen) + '\u2026';
  return text;
}

/** Standard fetch helper for sections: call an API path and return SectionData. */
export async function sectionFetch(path: string): Promise<SectionData> {
  const res = await apiFetch<unknown>(path);
  return {
    payload: res.ok ? res.data : { error: res.error || 'Request failed' },
    tokenCost: res.tokenCost,
    creditsRemaining: res.creditsRemaining,
  };
}

/** Check if payload is an error object. Returns the error string or null. */
export function payloadError(raw: unknown): string | null {
  if (raw && typeof raw === 'object' && 'error' in (raw as Record<string, unknown>)) {
    return String((raw as Record<string, unknown>).error);
  }
  return null;
}

/** Render an error message into a container. */
export function renderError(container: HTMLElement, msg: string): void {
  container.innerHTML = '<p class="text-amber-400 text-sm">' + esc(msg) + '</p>';
}

/** Render an empty-state message into a container. */
export function renderEmpty(container: HTMLElement, msg: string): void {
  container.innerHTML = '<p class="text-slate-500 text-sm">' + esc(msg) + '</p>';
}

/** Lazy-load ECharts module. */
export function loadECharts(): Promise<typeof import('echarts')> {
  return import('echarts');
}

/** Normalize API response to an array of items. */
export function normalizeItems<T = Record<string, unknown>>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    if ('items' in raw && Array.isArray((raw as { items: unknown }).items))
      return (raw as { items: T[] }).items;
    if ('data' in raw && Array.isArray((raw as { data: unknown }).data))
      return (raw as { data: T[] }).data;
  }
  return [];
}

/** Format a date string to YYYY-MM-DD. */
export function fmtDate(d: string | undefined | null): string {
  if (!d) return '\u2014';
  return String(d).slice(0, 10);
}

/** Format a number as currency. */
export function fmtCurrency(n: number | undefined | null): string {
  if (n == null || isNaN(n)) return '\u2014';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/** Format a large number with K/M/B suffix. */
export function fmtCompact(n: number | undefined | null): string {
  if (n == null || isNaN(n)) return '\u2014';
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (abs >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (abs >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toLocaleString();
}
