/**
 * Pod Grid Engine -- shared layout primitives for the Explorer.
 *
 * Every imperative view module imports from here to build responsive
 * pod-grid layouts with standardised styling.
 */

// ─── Constants ─────────────────────────────────────────────────────────────

export const PANEL_CLS =
  'rounded-xl border border-fin-800 bg-fin-900/80 backdrop-blur shadow-sm overflow-hidden';

export const TYPE_COLORS: Record<string, string> = {
  company: 'bg-blue-500/20 text-blue-400',
  investor: 'bg-emerald-500/20 text-emerald-400',
  stock: 'bg-purple-500/20 text-purple-400',
  filing: 'bg-amber-500/20 text-amber-400',
  person: 'bg-rose-500/20 text-rose-400',
  econ: 'bg-cyan-500/20 text-cyan-400',
  data: 'bg-pink-500/20 text-pink-400',
  country: 'bg-teal-500/20 text-teal-400',
};

export const TYPE_LABELS: Record<string, string> = {
  company: 'Company',
  investor: 'Investor',
  stock: 'Stock',
  filing: 'Filing',
  person: 'Person',
  econ: 'Indicator',
  data: 'Data',
};

// ─── Utility functions ─────────────────────────────────────────────────────

const _ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** HTML-escape a string. */
export function esc(s: string): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => _ESC[c]);
}

/** Format an error for display. */
export function fmtErr(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Unknown error';
}

/** Badge class helper. */
export function badgeCls(colorClass: string): string {
  return 'flex-shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ' + colorClass;
}

// ─── HTML Builders ─────────────────────────────────────────────────────────

/** Loading spinner HTML. */
export function spinnerHtml(label = 'Loading...'): string {
  return '<div class="flex items-center justify-center gap-3 py-12 text-slate-400">' +
    '<svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>' +
    '<span class="text-sm">' + esc(label) + '</span></div>';
}

/** Error display HTML. */
export function errorHtml(title: string, err?: unknown): string {
  const detail = err ? fmtErr(err) : '';
  return '<div class="rounded-xl border border-red-800/40 bg-red-900/20 px-4 py-3">' +
    '<p class="text-sm font-medium text-red-400">' + esc(title) + '</p>' +
    (detail ? '<p class="text-xs text-red-500/80 mt-1">' + esc(detail) + '</p>' : '') +
    '</div>';
}

// ─── Pod Grid Layout ───────────────────────────────────────────────────────

interface PodOptions {
  span?: 1 | 2 | 3 | 4;
  title?: string;
  compact?: boolean;
  id?: string;
}

/** Wrap inner HTML in a pod card. */
export function pod(inner: string, opts: PodOptions = {}): string {
  const { span = 1, title, compact, id } = opts;
  const spanCls = span > 1 ? ' pod-span-' + span : '';
  const idAttr = id ? ' id="' + esc(id) + '"' : '';
  const padding = compact ? 'px-3 py-2' : 'px-4 py-3';

  let html = '<div class="' + PANEL_CLS + spanCls + '"' + idAttr + '>';
  if (title) {
    html += '<div class="px-3 py-2 border-b border-fin-800 flex items-center gap-2">' +
      '<span class="text-xs font-semibold text-slate-200">' + esc(title) + '</span></div>';
  }
  html += '<div class="' + padding + '">' + inner + '</div></div>';
  return html;
}

/** Wrap an array of pod strings into a pod-grid container. */
export function podGrid(pods: string[]): string {
  return '<div class="pod-grid">' + pods.join('') + '</div>';
}

/** Single KPI display. */
export function kpi(label: string, value: string | number, color = 'text-slate-200'): string {
  return '<div class="text-center">' +
    '<p class="text-[10px] uppercase tracking-wider text-slate-500">' + esc(label) + '</p>' +
    '<p class="text-lg font-bold ' + color + '">' + esc(String(value)) + '</p></div>';
}

/** Compact KPI strip: multiple KPIs in a single row. */
export function kpiStrip(
  items: { label: string; value: string | number; color?: string }[],
  opts: PodOptions = {},
): string {
  const isVertical = (opts.span ?? 1) <= 1;
  const cls = isVertical ? 'flex flex-col gap-3' : 'flex items-center justify-around gap-4';
  let inner = '<div class="' + cls + '">';
  for (const item of items) {
    inner += '<div class="' + (isVertical ? '' : 'text-center') + '">' +
      '<p class="text-[10px] uppercase tracking-wider text-slate-500">' + esc(item.label) + '</p>' +
      '<p class="text-sm font-bold ' + (item.color || 'text-slate-200') + '">' + esc(String(item.value)) + '</p></div>';
  }
  inner += '</div>';
  return pod(inner, opts);
}

/** Mini sortable table. */
export function miniTable(
  rows: Record<string, unknown>[],
  columns: { key: string; label: string; type?: string }[],
  opts: PodOptions & { maxRows?: number } = {},
): string {
  const { maxRows = 10, ...podOpts } = opts;
  const displayRows = rows.slice(0, maxRows);

  let table = '<div class="overflow-x-auto"><table class="w-full text-left text-xs">';
  table += '<thead><tr class="border-b border-fin-800">';
  for (const col of columns) {
    table += '<th class="px-2 py-1.5 text-[10px] uppercase tracking-wider text-slate-500 font-medium">' + esc(col.label) + '</th>';
  }
  table += '</tr></thead><tbody>';
  for (const row of displayRows) {
    table += '<tr class="border-b border-fin-800/40 hover:bg-fin-800/30">';
    for (const col of columns) {
      const val = row[col.key];
      const display = val == null ? '\u2014' : String(val);
      const numCls = col.type === 'number' ? ' text-right font-mono' : '';
      table += '<td class="px-2 py-1.5 text-slate-300 truncate max-w-[200px]' + numCls + '">' + esc(display) + '</td>';
    }
    table += '</tr>';
  }
  table += '</tbody></table></div>';

  if (rows.length > maxRows) {
    table += '<p class="text-[10px] text-slate-600 text-center mt-2">' + rows.length + ' total rows (' + (rows.length - maxRows) + ' more)</p>';
  }

  return pod(table, podOpts);
}

/** Preview table: like miniTable but with a title. */
export function previewTable(
  title: string,
  rows: Record<string, unknown>[],
  columns: { key: string; label: string; type?: string }[],
  opts: PodOptions & { maxRows?: number } = {},
): string {
  return miniTable(rows, columns, { ...opts, title });
}

// ─── Empty / Unavailable Group ──────────────────────────────────────────────

/** Compact single-line group for unavailable/empty data sources. */
export function emptyGroup(
  labels: string[],
  opts: { title?: string; span?: 1 | 2 | 3 | 4 } = {},
): string {
  if (labels.length === 0) return '';
  const { title = 'No data available', span = 2 } = opts;
  let inner = '<div class="flex items-center gap-2 flex-wrap">';
  inner += '<span class="text-[10px] text-slate-600 italic flex-shrink-0">' + esc(title) + ':</span>';
  for (const label of labels) {
    inner += '<span class="text-[9px] rounded-full px-1.5 py-0.5 bg-fin-800/40 text-slate-500">' + esc(label) + '</span>';
  }
  inner += '</div>';
  return pod(inner, { span, compact: true });
}

// ─── Zoom Control ──────────────────────────────────────────────────────────

/** Render zoom control HTML. */
export function zoomControl(): string {
  const saved = parseFloat(localStorage.getItem('explore-zoom') || '1');
  const val = Math.max(0.7, Math.min(1.3, saved));
  const pct = Math.round(val * 100);

  return '<div class="flex items-center gap-1.5 text-slate-400">' +
    '<button type="button" id="zoom-out" class="p-1 hover:text-white transition-colors rounded" aria-label="Zoom out">' +
      '<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 12h-15"/></svg></button>' +
    '<input type="range" id="zoom-slider" min="70" max="130" step="5" value="' + pct + '" ' +
      'class="w-16 h-1 accent-fin-500 cursor-pointer" aria-label="Zoom level">' +
    '<button type="button" id="zoom-in" class="p-1 hover:text-white transition-colors rounded" aria-label="Zoom in">' +
      '<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg></button>' +
    '<span id="zoom-label" class="text-[10px] font-mono w-8 text-center">' + pct + '%</span></div>';
}

/** Initialize zoom event listeners (call after inserting zoomControl HTML). */
export function initZoom(): void {
  const slider = document.getElementById('zoom-slider') as HTMLInputElement | null;
  const label = document.getElementById('zoom-label');
  const outBtn = document.getElementById('zoom-out');
  const inBtn = document.getElementById('zoom-in');
  const content = document.getElementById('explore-content');
  if (!slider || !content) return;

  function apply(pct: number): void {
    const val = Math.max(70, Math.min(130, pct));
    slider!.value = String(val);
    if (label) label.textContent = val + '%';
    (content!.style as Record<string, string>).zoom = String(val / 100);
    try { localStorage.setItem('explore-zoom', String(val / 100)); } catch {}
  }

  // Apply saved zoom
  apply(parseInt(slider.value, 10));

  slider.addEventListener('input', () => apply(parseInt(slider.value, 10)));
  outBtn?.addEventListener('click', () => apply(parseInt(slider.value, 10) - 5));
  inBtn?.addEventListener('click', () => apply(parseInt(slider.value, 10) + 5));
}

// ─── Render Context ────────────────────────────────────────────────────────

import type { EntityType, EntityParams, SectionDefinition } from '../explore-sections';

export interface RenderContext {
  params: URLSearchParams;
  typeBadge: HTMLElement;
  nameEl: HTMLElement;
  subEl: HTMLElement;
  sectionsGrid: HTMLElement;
  entitySummarySlot: HTMLElement;
  relatedEntitiesSlot: HTMLElement;
  breadcrumbBar: HTMLElement;
  breadcrumbNav: HTMLElement;
  updateBreadcrumbs: (label: string, type: string) => void;
  saveRecentSearch: (label: string, url: string, type: string) => void;
  renderSectionPanel: (target: HTMLElement, section: SectionDefinition, ep: EntityParams) => void;
  renderViaDiscovery: (target: HTMLElement, ep: EntityParams, entityTypes: EntityType[]) => Promise<void>;
  renderTypeFallback: (target: HTMLElement, ep: EntityParams, entityTypes: EntityType[]) => void;
}
