/**
 * Analysis Workbench UI -- notebook-style cell-based analysis tool.
 *
 * Provides data loading, transformation, charting, and stats cells
 * that work with the FinUties API.
 */

import { apiFetch } from '../api-client';
import { CATEGORIES, SOURCES, sourcesForCategory, type SourceDef } from '../source-registry';

// ─── Types ─────────────────────────────────────────────────────────────────

type CellType = 'data' | 'transform' | 'chart' | 'stats' | 'table' | 'note';

interface Cell {
  id: string;
  type: CellType;
  el: HTMLElement;
}

type ChartType = 'line' | 'bar' | 'scatter';

interface ChartState {
  tableName: string;
  xField: string;
  yField: string;
  chartType: ChartType;
}

type EChartsModule = typeof import('echarts');
type EChartsInstance = import('echarts').ECharts;

// ─── State ─────────────────────────────────────────────────────────────────

let cells: Cell[] = [];
let cellCounter = 0;
let totalCalls = 0;
let totalCredits = 0;
const loadedTables = new Map<string, Record<string, unknown>[]>();
const chartStateByCell = new Map<string, ChartState>();
const chartInstances = new Map<string, EChartsInstance>();
let echartsModulePromise: Promise<EChartsModule> | null = null;

// ─── HTML helpers ──────────────────────────────────────────────────────────

const _ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
function esc(s: string): string { return String(s ?? '').replace(/[&<>"]/g, (c) => _ESC[c]); }

const CELL_COLORS: Record<CellType, string> = {
  data: 'border-blue-500/40',
  transform: 'border-purple-500/40',
  chart: 'border-green-500/40',
  stats: 'border-amber-500/40',
  table: 'border-teal-500/40',
  note: 'border-slate-500/40',
};

const CELL_LABELS: Record<CellType, string> = {
  data: 'Data',
  transform: 'Transform',
  chart: 'Chart',
  stats: 'Stats',
  table: 'Table',
  note: 'Note',
};

// ─── Cell creation ─────────────────────────────────────────────────────────

function createCell(type: CellType): Cell {
  const id = 'cell-' + (++cellCounter);
  const el = document.createElement('div');
  el.id = id;
  el.className = 'rounded-xl border-l-4 ' + CELL_COLORS[type] + ' bg-fin-900/80 shadow-sm overflow-hidden';

  let bodyHtml = '';
  switch (type) {
    case 'data':
      bodyHtml = buildDataCellBody();
      break;
    case 'transform':
      bodyHtml = '<textarea class="wb-code w-full bg-transparent text-xs text-slate-200 font-mono p-3 min-h-[80px] focus:outline-none resize-y" placeholder="// JavaScript transform\nreturn rows.filter(r => r.value > 0)"></textarea>';
      break;
    case 'chart':
      bodyHtml = buildChartCellBody(id);
      break;
    case 'stats':
      bodyHtml = '<div class="wb-stats-area p-3"><p class="text-xs text-slate-500">Load data first to see statistics.</p></div>';
      break;
    case 'table':
      bodyHtml = '<div class="wb-table-area p-3"><p class="text-xs text-slate-500">No data loaded yet.</p></div>';
      break;
    case 'note':
      bodyHtml = '<textarea class="wb-note w-full bg-transparent text-xs text-slate-200 p-3 min-h-[60px] focus:outline-none resize-y" placeholder="Write notes here..."></textarea>';
      break;
  }

  el.innerHTML =
    '<div class="flex items-center gap-2 px-3 py-2 bg-fin-800/30">' +
      '<span class="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">' + CELL_LABELS[type] + '</span>' +
      '<span class="text-[9px] text-slate-600 font-mono">#' + cellCounter + '</span>' +
      '<div class="flex-1"></div>' +
      '<button type="button" class="wb-run rounded bg-fin-700/60 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-fin-600">Run</button>' +
      '<button type="button" class="wb-delete rounded px-1.5 py-0.5 text-[10px] text-slate-500 hover:text-red-400">&times;</button>' +
    '</div>' +
    '<div class="wb-body">' + bodyHtml + '</div>' +
    '<div class="wb-output hidden border-t border-fin-800/40 px-3 py-2"></div>';

  // Delete handler
  el.querySelector('.wb-delete')!.addEventListener('click', () => {
    disposeChartCell(id);
    chartStateByCell.delete(id);
    cells = cells.filter((c) => c.id !== id);
    el.remove();
    if (cells.length === 0) showEmpty();
  });

  // Run handler
  el.querySelector('.wb-run')!.addEventListener('click', () => runCell({ id, type, el }));

  const cell: Cell = { id, type, el };
  cells.push(cell);
  return cell;
}

function buildDataCellBody(): string {
  let opts = '<option value="">Select data source...</option>';
  for (const cat of CATEGORIES) {
    opts += '<optgroup label="' + esc(cat.label) + '">';
    for (const src of sourcesForCategory(cat.id)) {
      opts += '<option value="' + esc(src.id) + '">' + esc(src.shortLabel) + '</option>';
    }
    opts += '</optgroup>';
  }
  return '<div class="p-3 space-y-2">' +
    '<select class="wb-source rounded bg-fin-800/60 border border-fin-700 px-2 py-1 text-xs text-slate-200 w-full">' + opts + '</select>' +
    '<div class="flex gap-2">' +
      '<input type="text" class="wb-filter flex-1 rounded bg-fin-800/60 border border-fin-700 px-2 py-1 text-xs text-slate-200 placeholder-slate-600" placeholder="country=USA">' +
      '<input type="number" class="wb-limit w-20 rounded bg-fin-800/60 border border-fin-700 px-2 py-1 text-xs text-slate-200" value="50" min="1" max="500">' +
    '</div></div>';
}

function buildChartCellBody(cellId: string): string {
  return '<div class="wb-chart-area p-3 space-y-2">' +
    '<div class="grid grid-cols-1 md:grid-cols-4 gap-2">' +
      '<select class="wb-chart-table rounded bg-fin-800/60 border border-fin-700 px-2 py-1 text-xs text-slate-200" data-cell="' + esc(cellId) + '">' +
        '<option value="">Select table...</option>' +
      '</select>' +
      '<select class="wb-chart-x rounded bg-fin-800/60 border border-fin-700 px-2 py-1 text-xs text-slate-200">' +
        '<option value="">X field</option>' +
      '</select>' +
      '<select class="wb-chart-y rounded bg-fin-800/60 border border-fin-700 px-2 py-1 text-xs text-slate-200">' +
        '<option value="">Y field</option>' +
      '</select>' +
      '<select class="wb-chart-type rounded bg-fin-800/60 border border-fin-700 px-2 py-1 text-xs text-slate-200">' +
        '<option value="line">Line</option>' +
        '<option value="bar">Bar</option>' +
        '<option value="scatter">Scatter</option>' +
      '</select>' +
    '</div>' +
    '<div class="wb-chart-canvas h-[320px] rounded border border-fin-800/60 bg-fin-950/60"></div>' +
    '<p class="text-[11px] text-slate-500">Run this cell to render the chart from a loaded table.</p>' +
  '</div>';
}

// ─── Cell execution ────────────────────────────────────────────────────────

async function runCell(cell: Cell): Promise<void> {
  const output = cell.el.querySelector('.wb-output') as HTMLElement;
  output.classList.remove('hidden');
  output.innerHTML = '<p class="text-xs text-slate-400 animate-pulse">Running...</p>';

  try {
    if (cell.type === 'data') {
      const srcSelect = cell.el.querySelector('.wb-source') as HTMLSelectElement;
      const filterInput = cell.el.querySelector('.wb-filter') as HTMLInputElement;
      const limitInput = cell.el.querySelector('.wb-limit') as HTMLInputElement;
      const sourceId = srcSelect.value;
      if (!sourceId) { output.innerHTML = '<p class="text-xs text-amber-400">Select a data source first.</p>'; return; }

      const src = SOURCES.find((s) => s.id === sourceId);
      if (!src) { output.innerHTML = '<p class="text-xs text-red-400">Unknown source.</p>'; return; }

      let path = src.endpoint + '?limit=' + (limitInput.value || '50');
      if (filterInput.value.trim()) {
        for (const part of filterInput.value.split('&')) {
          const [k, v] = part.split('=');
          if (k && v) path += '&' + encodeURIComponent(k.trim()) + '=' + encodeURIComponent(v.trim());
        }
      }

      const res = await apiFetch<unknown>(path);
      totalCalls++;
      if (res.tokenCost) totalCredits += res.tokenCost;
      updateCost();

      if (!res.ok) { output.innerHTML = '<p class="text-xs text-red-400">Error: ' + esc(res.error || 'Request failed') + '</p>'; return; }

      const items = Array.isArray(res.data) ? res.data : (res.data && typeof res.data === 'object' && 'items' in (res.data as Record<string, unknown>)) ? (res.data as Record<string, unknown>).items as Record<string, unknown>[] : [];
      const tableName = sourceId + '_' + cellCounter;
      loadedTables.set(tableName, items as Record<string, unknown>[]);
      updateTablesList();

      output.innerHTML = '<p class="text-xs text-green-400">' + items.length + ' rows loaded as <span class="font-mono">' + esc(tableName) + '</span></p>';
    } else if (cell.type === 'note') {
      output.innerHTML = '<p class="text-xs text-slate-500">Notes saved.</p>';
    } else if (cell.type === 'chart') {
      await runChartCell(cell, output);
    } else {
      output.innerHTML = '<p class="text-xs text-slate-500">Cell type "' + cell.type + '" execution not yet implemented.</p>';
    }
  } catch (err) {
    output.innerHTML = '<p class="text-xs text-red-400">Error: ' + esc(err instanceof Error ? err.message : String(err)) + '</p>';
  }
}

function isNumberLike(value: unknown): boolean {
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'string' && value.trim() !== '') return Number.isFinite(Number(value));
  return false;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function isDateLike(value: unknown): boolean {
  if (value instanceof Date) return !Number.isNaN(value.getTime());
  if (typeof value === 'string' && value.trim() !== '') return !Number.isNaN(Date.parse(value));
  return false;
}

function toTimestamp(value: unknown): number | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.getTime();
  if (typeof value === 'string' && value.trim() !== '') {
    const ts = Date.parse(value);
    return Number.isNaN(ts) ? null : ts;
  }
  return null;
}

function uniqueFields(rows: Record<string, unknown>[]): string[] {
  const keys = new Set<string>();
  for (const row of rows.slice(0, 200)) {
    for (const key of Object.keys(row)) keys.add(key);
  }
  return [...keys];
}

function numericFields(rows: Record<string, unknown>[], fields: string[]): string[] {
  const out: string[] = [];
  for (const field of fields) {
    let seen = 0;
    let numeric = 0;
    for (const row of rows.slice(0, 250)) {
      const value = row[field];
      if (value == null) continue;
      seen += 1;
      if (isNumberLike(value)) numeric += 1;
    }
    if (seen > 0 && numeric / seen >= 0.6) out.push(field);
  }
  return out;
}

function maybeDateFields(rows: Record<string, unknown>[], fields: string[]): string[] {
  const out: string[] = [];
  for (const field of fields) {
    let seen = 0;
    let dateLike = 0;
    for (const row of rows.slice(0, 250)) {
      const value = row[field];
      if (value == null) continue;
      seen += 1;
      if (isDateLike(value)) dateLike += 1;
    }
    if (seen > 0 && dateLike / seen >= 0.6) out.push(field);
  }
  return out;
}

function setSelectOptions(select: HTMLSelectElement, values: string[], placeholder: string): void {
  const prior = select.value;
  let html = '<option value="">' + esc(placeholder) + '</option>';
  for (const value of values) {
    html += '<option value="' + esc(value) + '">' + esc(value) + '</option>';
  }
  select.innerHTML = html;
  if (prior && values.includes(prior)) select.value = prior;
}

function getChartControls(cell: Cell): {
  tableSelect: HTMLSelectElement;
  xSelect: HTMLSelectElement;
  ySelect: HTMLSelectElement;
  typeSelect: HTMLSelectElement;
} | null {
  const tableSelect = cell.el.querySelector('.wb-chart-table');
  const xSelect = cell.el.querySelector('.wb-chart-x');
  const ySelect = cell.el.querySelector('.wb-chart-y');
  const typeSelect = cell.el.querySelector('.wb-chart-type');
  if (!(tableSelect instanceof HTMLSelectElement)) return null;
  if (!(xSelect instanceof HTMLSelectElement)) return null;
  if (!(ySelect instanceof HTMLSelectElement)) return null;
  if (!(typeSelect instanceof HTMLSelectElement)) return null;
  return { tableSelect, xSelect, ySelect, typeSelect };
}

function refreshChartControls(cell: Cell): void {
  if (cell.type !== 'chart') return;
  const controls = getChartControls(cell);
  if (!controls) return;

  const tables = [...loadedTables.keys()];
  setSelectOptions(controls.tableSelect, tables, 'Select table...');
  if (!controls.tableSelect.value && tables.length > 0) controls.tableSelect.value = tables[0];

  const rows = loadedTables.get(controls.tableSelect.value) || [];
  const fields = uniqueFields(rows);
  const numeric = numericFields(rows, fields);
  const dateLike = maybeDateFields(rows, fields);
  const preferredX = dateLike[0] || fields[0] || '';
  const preferredY = numeric[0] || '';

  setSelectOptions(controls.xSelect, fields, 'X field');
  setSelectOptions(controls.ySelect, numeric, 'Y field');

  if (!controls.xSelect.value && preferredX) controls.xSelect.value = preferredX;
  if (!controls.ySelect.value && preferredY) controls.ySelect.value = preferredY;
}

function getChartState(cell: Cell): ChartState | null {
  const controls = getChartControls(cell);
  if (!controls) return null;
  const chartType: ChartType = controls.typeSelect.value === 'bar' || controls.typeSelect.value === 'scatter'
    ? controls.typeSelect.value
    : 'line';
  return {
    tableName: controls.tableSelect.value,
    xField: controls.xSelect.value,
    yField: controls.ySelect.value,
    chartType,
  };
}

function getChartHost(cell: Cell): HTMLElement | null {
  const host = cell.el.querySelector('.wb-chart-canvas');
  return host instanceof HTMLElement ? host : null;
}

async function getEchartsModule(): Promise<EChartsModule> {
  if (!echartsModulePromise) {
    echartsModulePromise = import('echarts');
  }
  return echartsModulePromise;
}

async function ensureChartInstance(cell: Cell, host: HTMLElement): Promise<EChartsInstance> {
  const existing = chartInstances.get(cell.id);
  if (existing) {
    existing.resize();
    return existing;
  }
  const echarts = await getEchartsModule();
  const instance = echarts.init(host, 'dark');
  chartInstances.set(cell.id, instance);
  return instance;
}

function disposeChartCell(cellId: string): void {
  const instance = chartInstances.get(cellId);
  if (instance) {
    instance.dispose();
    chartInstances.delete(cellId);
  }
}

function buildChartOption(rows: Record<string, unknown>[], state: ChartState): Record<string, unknown> | null {
  const filtered = rows.filter((row) => toNumber(row[state.yField]) != null);
  if (filtered.length === 0) return null;

  const title = state.tableName + ': ' + state.yField + ' by ' + state.xField;
  const yLabel = state.yField;
  const xLabel = state.xField;
  const base = {
    backgroundColor: 'transparent',
    title: {
      text: title,
      left: 'center',
      textStyle: { color: '#cbd5e1', fontSize: 12 },
    },
    tooltip: { trigger: state.chartType === 'scatter' ? 'item' : 'axis' },
    grid: { left: 56, right: 18, top: 46, bottom: 52 },
    textStyle: { color: '#94a3b8', fontSize: 11 },
  };

  if (state.chartType === 'scatter') {
    const points: [number, number][] = [];
    for (let i = 0; i < filtered.length; i += 1) {
      const row = filtered[i];
      const y = toNumber(row[state.yField]);
      if (y == null) continue;
      const xNumeric = toNumber(row[state.xField]);
      const xDate = toTimestamp(row[state.xField]);
      const x = xNumeric ?? xDate ?? i;
      points.push([x, y]);
    }
    return {
      ...base,
      xAxis: { type: 'value', name: xLabel, nameLocation: 'middle', nameGap: 28 },
      yAxis: { type: 'value', name: yLabel, nameLocation: 'middle', nameGap: 42 },
      series: [{ type: 'scatter', symbolSize: 7, itemStyle: { color: '#38bdf8' }, data: points }],
    };
  }

  const categories: string[] = [];
  const values: number[] = [];
  for (const row of filtered) {
    const y = toNumber(row[state.yField]);
    if (y == null) continue;
    const rawX = row[state.xField];
    if (rawX == null) continue;
    const xDate = toTimestamp(rawX);
    categories.push(xDate != null ? new Date(xDate).toISOString().slice(0, 10) : String(rawX));
    values.push(y);
  }
  if (values.length === 0) return null;

  return {
    ...base,
    xAxis: {
      type: 'category',
      data: categories,
      name: xLabel,
      nameLocation: 'middle',
      nameGap: 34,
      axisLabel: { rotate: categories.length > 20 ? 35 : 0 },
    },
    yAxis: { type: 'value', name: yLabel, nameLocation: 'middle', nameGap: 44 },
    dataZoom: categories.length > 30
      ? [{ type: 'inside', start: 0, end: 100 }, { type: 'slider', start: 0, end: 100, height: 16, bottom: 8 }]
      : [],
    series: [{
      type: state.chartType,
      data: values,
      smooth: state.chartType === 'line',
      showSymbol: state.chartType !== 'line' || values.length < 80,
      itemStyle: { color: '#34d399' },
      lineStyle: { width: 2 },
    }],
  };
}

async function runChartCell(cell: Cell, output: HTMLElement): Promise<void> {
  refreshChartControls(cell);
  const state = getChartState(cell);
  if (!state) {
    output.innerHTML = '<p class="text-xs text-red-400">Chart controls unavailable.</p>';
    return;
  }
  if (!state.tableName) {
    output.innerHTML = '<p class="text-xs text-amber-400">Load data in a Data cell first.</p>';
    return;
  }
  if (!state.xField || !state.yField) {
    output.innerHTML = '<p class="text-xs text-amber-400">Select both X and Y fields.</p>';
    return;
  }

  const rows = loadedTables.get(state.tableName) || [];
  if (rows.length === 0) {
    output.innerHTML = '<p class="text-xs text-amber-400">Selected table is empty.</p>';
    return;
  }

  const option = buildChartOption(rows, state);
  if (!option) {
    output.innerHTML = '<p class="text-xs text-amber-400">No chartable values found for selected fields.</p>';
    return;
  }

  const host = getChartHost(cell);
  if (!host) {
    output.innerHTML = '<p class="text-xs text-red-400">Chart canvas not found.</p>';
    return;
  }

  const chart = await ensureChartInstance(cell, host);
  chart.setOption(option, { notMerge: true, lazyUpdate: true });
  chart.resize();
  chartStateByCell.set(cell.id, state);
  output.innerHTML = '<p class="text-xs text-green-400">Rendered ' + esc(state.chartType) + ' chart from <span class="font-mono">' + esc(state.tableName) + '</span>.</p>';
}

// ─── UI updates ────────────────────────────────────────────────────────────

function updateCost(): void {
  const callsEl = document.getElementById('wb-cost-calls');
  const creditsEl = document.getElementById('wb-cost-credits');
  if (callsEl) callsEl.textContent = totalCalls + ' calls';
  if (creditsEl) creditsEl.textContent = totalCredits + ' credits';
}

function updateTablesList(): void {
  const list = document.getElementById('wb-tables-list');
  const empty = document.getElementById('wb-tables-empty');
  if (!list) return;
  if (loadedTables.size > 0 && empty) empty.style.display = 'none';
  let html = '';
  for (const [name, rows] of loadedTables) {
    html += '<div class="flex items-center gap-1 py-0.5 text-xs">' +
      '<span class="font-mono text-slate-300">' + esc(name) + '</span>' +
      '<span class="text-slate-600">(' + rows.length + ')</span></div>';
  }
  list.innerHTML = html;
  for (const cell of cells) refreshChartControls(cell);
}

function showEmpty(): void {
  const emptyEl = document.getElementById('wb-empty');
  if (emptyEl) emptyEl.style.display = '';
}

function hideEmpty(): void {
  const emptyEl = document.getElementById('wb-empty');
  if (emptyEl) emptyEl.style.display = 'none';
}

// ─── Catalog sidebar ───────────────────────────────────────────────────────

function initCatalog(): void {
  const catalog = document.getElementById('wb-catalog');
  if (!catalog) return;
  let html = '<h3 class="font-semibold text-slate-300 text-xs uppercase tracking-wide mb-2">Data Catalog</h3>';
  for (const cat of CATEGORIES) {
    const sources = sourcesForCategory(cat.id);
    html += '<details class="mb-1"><summary class="text-xs text-slate-400 cursor-pointer hover:text-slate-200 py-0.5">' +
      '<span style="color:' + cat.color + '">\u25CF</span> ' + esc(cat.shortLabel) + ' (' + sources.length + ')</summary>';
    html += '<div class="pl-3 space-y-0.5">';
    for (const src of sources) {
      html += '<button type="button" class="wb-cat-src block w-full text-left text-[11px] text-slate-500 hover:text-slate-200 py-0.5 truncate" data-source="' + esc(src.id) + '">' + esc(src.shortLabel) + '</button>';
    }
    html += '</div></details>';
  }
  catalog.innerHTML = html;

  // Click source -> add data cell with source pre-selected
  catalog.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.wb-cat-src') as HTMLElement | null;
    if (!btn) return;
    const srcId = btn.dataset.source;
    if (!srcId) return;
    hideEmpty();
    const cell = createCell('data');
    const cellsArea = document.getElementById('wb-cells')!;
    cellsArea.appendChild(cell.el);
    const srcSelect = cell.el.querySelector('.wb-source') as HTMLSelectElement;
    if (srcSelect) srcSelect.value = srcId;
  });
}

// ─── Initialization ────────────────────────────────────────────────────────

export function initWorkbench(): void {
  initCatalog();

  // Toolbar: Add cell buttons
  document.querySelectorAll('.wb-add').forEach((btn) => {
    btn.addEventListener('click', () => {
      const type = (btn as HTMLElement).dataset.add as CellType;
      if (!type) return;
      hideEmpty();
      const cell = createCell(type);
      const cellsArea = document.getElementById('wb-cells')!;
      cellsArea.appendChild(cell.el);
    });
  });

  // Run All
  document.getElementById('wb-run-all')?.addEventListener('click', async () => {
    for (const cell of cells) await runCell(cell);
  });

  // New workbench
  document.getElementById('wb-new')?.addEventListener('click', () => {
    const cellsArea = document.getElementById('wb-cells')!;
    for (const cellId of chartInstances.keys()) disposeChartCell(cellId);
    chartStateByCell.clear();
    for (const cell of cells) cell.el.remove();
    cells = [];
    cellCounter = 0;
    totalCalls = 0;
    totalCredits = 0;
    loadedTables.clear();
    updateCost();
    updateTablesList();
    showEmpty();
  });

  // Export
  document.getElementById('wb-export-nb')?.addEventListener('click', () => {
    const notebook = cells.map((c) => ({
      type: c.type,
      source: c.type === 'data' ? (c.el.querySelector('.wb-source') as HTMLSelectElement)?.value : undefined,
      code: c.type === 'transform' ? (c.el.querySelector('.wb-code') as HTMLTextAreaElement)?.value : undefined,
      note: c.type === 'note' ? (c.el.querySelector('.wb-note') as HTMLTextAreaElement)?.value : undefined,
    }));
    const blob = new Blob([JSON.stringify(notebook, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'workbench-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  // Examples
  const examplesEl = document.getElementById('wb-examples-list');
  if (examplesEl) {
    examplesEl.innerHTML =
      '<button type="button" class="wb-example block w-full text-left text-[11px] text-slate-400 hover:text-slate-200 py-1" data-example="conflict-overview">Conflict overview</button>' +
      '<button type="button" class="wb-example block w-full text-left text-[11px] text-slate-400 hover:text-slate-200 py-1" data-example="climate-trends">Climate trends</button>' +
      '<button type="button" class="wb-example block w-full text-left text-[11px] text-slate-400 hover:text-slate-200 py-1" data-example="economic-snapshot">Economic snapshot</button>';
  }

  // Pricing
  const pricingEl = document.getElementById('wb-pricing-info');
  if (pricingEl) {
    pricingEl.innerHTML = '<p class="text-xs text-slate-500">API calls consume credits. Current session: <span class="text-slate-300 font-medium" id="wb-session-credits">0</span> credits used.</p>';
  }
}
