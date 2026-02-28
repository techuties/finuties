/**
 * Stock Prices section -- self-registering.
 * Enhanced: daily change / % change, period selector, volume bars on chart, sortable table.
 */
import {
  registerSection, sectionFetch, normalizeItems, payloadError,
  renderError, renderEmpty, esc, fmtDate, loadECharts,
  type EntityParams, type SectionData,
} from '../explore-sections';
import { mountSortableTable, TD_CLS, type ColDef } from './sortable-table';

function fmtPrice(v: unknown): string {
  if (v == null) return '\u2014';
  const n = Number(v);
  return isNaN(n) ? '\u2014' : n.toFixed(2);
}

function fmtVol(v: unknown): string {
  if (v == null) return '\u2014';
  const n = Number(v);
  if (isNaN(n)) return '\u2014';
  return n.toLocaleString('en-US');
}

const COLUMNS: ColDef[] = [
  { key: 'date',    label: 'Date',    align: 'left',  sortType: 'date',   format: (v) => fmtDate(v as string) },
  { key: 'open',    label: 'Open',    align: 'right', sortType: 'number', format: fmtPrice },
  { key: 'high',    label: 'High',    align: 'right', sortType: 'number', format: fmtPrice },
  { key: 'low',     label: 'Low',     align: 'right', sortType: 'number', format: fmtPrice },
  { key: 'close',   label: 'Close',   align: 'right', sortType: 'number', format: fmtPrice },
  { key: '_change', label: 'Chg',     align: 'right', sortType: 'number', format: fmtPrice },
  { key: '_pctChg', label: '% Chg',   align: 'right', sortType: 'number', format: (v) => v != null ? Number(v).toFixed(2) + '%' : '\u2014' },
  { key: 'volume',  label: 'Volume',  align: 'right', sortType: 'number', format: fmtVol },
];

const PERIODS: { label: string; days: number }[] = [
  { label: '1W', days: 7 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
  { label: 'ALL', days: 9999 },
];

registerSection({
  id: 'stock-prices-detail',
  title: 'Stock Prices',
  icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"/>',
  entityTypes: ['stock', 'company'],
  minSize: { minCols: 3, weight: 'wide' },

  async fetch(p: EntityParams): Promise<SectionData> {
    if (!p.symbol) {
      return { payload: { _no_symbol: true }, tokenCost: 0, creditsRemaining: null };
    }
    const qps: string[] = [];
    qps.push('symbol=' + encodeURIComponent(p.symbol));
    qps.push('limit=250');
    return sectionFetch('/api/v1/market/stock-prices?' + qps.join('&'));
  },

  render(container: HTMLElement, data: SectionData): void {
    const raw = data.payload as Record<string, unknown> | null;
    if (raw && '_no_symbol' in raw) {
      renderEmpty(container, 'No stock symbol available for price lookup.');
      return;
    }
    const err = payloadError(data.payload);
    if (err) { renderError(container, err); return; }
    const rawItems = normalizeItems(data.payload) as Record<string, unknown>[];
    if (rawItems.length === 0) { renderEmpty(container, 'No price data found.'); return; }

    const sorted = [...rawItems].sort((a, b) =>
      String(b.date || '').localeCompare(String(a.date || ''))
    );

    for (let i = 0; i < sorted.length; i++) {
      const row = sorted[i];
      const close = Number(row.close) || 0;
      const prevClose = i + 1 < sorted.length ? (Number(sorted[i + 1].close) || 0) : close;
      const change = close - prevClose;
      const pctChg = prevClose !== 0 ? (change / prevClose) * 100 : 0;
      row._change = i + 1 < sorted.length ? change : null;
      row._pctChg = i + 1 < sorted.length ? pctChg : null;
    }

    container.innerHTML = '';

    let activePeriod = '3M';
    const periodBar = document.createElement('div');
    periodBar.className = 'flex gap-1 mb-3';

    function renderPeriodBar(): void {
      let html = '';
      for (const p of PERIODS) {
        const active = p.label === activePeriod;
        const cls = active ? 'bg-fin-600 text-white' : 'bg-fin-800/60 text-slate-400 hover:bg-fin-700/60';
        html += `<button type="button" data-period="${esc(p.label)}" class="rounded px-2.5 py-1 text-[10px] font-medium transition-colors ${cls}">${esc(p.label)}</button>`;
      }
      periodBar.innerHTML = html;
    }
    renderPeriodBar();
    container.appendChild(periodBar);

    const chartId = 'price-chart-' + Date.now();
    const chartDiv = document.createElement('div');
    chartDiv.id = chartId;
    chartDiv.style.cssText = 'width:100%;height:260px;margin-bottom:12px';
    container.appendChild(chartDiv);

    const tableWrap = document.createElement('div');
    container.appendChild(tableWrap);

    function filterByPeriod(): Record<string, unknown>[] {
      const periodDef = PERIODS.find(pp => pp.label === activePeriod) || PERIODS[5];
      if (periodDef.days >= 9999) return sorted;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - periodDef.days);
      const cutStr = cutoff.toISOString().slice(0, 10);
      return sorted.filter(r => String(r.date || '') >= cutStr);
    }

    let chartInstance: ReturnType<typeof import('echarts')['init']> | null = null;

    function renderAll(): void {
      const items = filterByPeriod();
      const chartData = [...items].reverse();

      tableWrap.innerHTML = '';
      mountSortableTable(tableWrap, {
        columns: COLUMNS,
        items: items.slice(0, 30),
        defaultSortKey: 'date',
        defaultSortDir: -1,
        cellRenderer(col, row) {
          if (col.key === '_change' || col.key === '_pctChg') {
            const val = row[col.key] as number | null;
            if (val == null) return `<td class="${TD_CLS} text-right font-mono text-slate-400">\u2014</td>`;
            const color = val > 0 ? 'text-emerald-400' : val < 0 ? 'text-red-400' : 'text-slate-400';
            const prefix = val > 0 ? '+' : '';
            const display = col.key === '_pctChg' ? prefix + val.toFixed(2) + '%' : prefix + val.toFixed(2);
            return `<td class="${TD_CLS} text-right font-mono ${color}">${esc(display)}</td>`;
          }
          if (col.key === 'close') {
            return `<td class="${TD_CLS} text-right font-mono text-slate-200 font-medium">${fmtPrice(row.close)}</td>`;
          }
          return null;
        },
      });

      if (items.length > 30) {
        const note = document.createElement('p');
        note.className = 'text-[10px] text-slate-600 text-center mt-2';
        note.textContent = `Showing 30 of ${items.length} records`;
        tableWrap.appendChild(note);
      }

      loadECharts().then((echarts) => {
        const el = document.getElementById(chartId);
        if (!el) return;
        if (!chartInstance) {
          chartInstance = echarts.init(el);
          const onResize = () => { if (el.isConnected) chartInstance?.resize(); else window.removeEventListener('resize', onResize); };
          window.addEventListener('resize', onResize);
        }
        chartInstance.setOption({
          tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
          grid: [
            { left: 60, right: 20, top: 10, bottom: '35%' },
            { left: 60, right: 20, top: '72%', bottom: 30 },
          ],
          xAxis: [
            { type: 'category', data: chartData.map(r => String(r.date || '').slice(0, 10)), axisLabel: { fontSize: 9, color: '#64748b' }, gridIndex: 0, axisLine: { show: false } },
            { type: 'category', data: chartData.map(r => String(r.date || '').slice(0, 10)), axisLabel: { show: false }, gridIndex: 1, axisLine: { show: false } },
          ],
          yAxis: [
            { type: 'value', axisLabel: { fontSize: 9, color: '#64748b' }, splitLine: { lineStyle: { color: '#1e293b' } }, gridIndex: 0 },
            { type: 'value', axisLabel: { fontSize: 9, color: '#64748b', formatter: (v: number) => v >= 1e6 ? (v/1e6).toFixed(0) + 'M' : v >= 1e3 ? (v/1e3).toFixed(0) + 'K' : String(v) }, splitLine: { lineStyle: { color: '#1e293b' } }, gridIndex: 1 },
          ],
          series: [
            {
              type: 'line', data: chartData.map(r => Number(r.close) || 0), smooth: true,
              lineStyle: { color: '#8b5cf6', width: 2 }, itemStyle: { color: '#8b5cf6' }, symbol: 'none',
              areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#8b5cf640' }, { offset: 1, color: '#8b5cf605' }] } },
              xAxisIndex: 0, yAxisIndex: 0,
            },
            {
              type: 'bar', data: chartData.map(r => Number(r.volume) || 0),
              itemStyle: { color: '#3b82f640' },
              xAxisIndex: 1, yAxisIndex: 1,
            },
          ],
        }, true);
      }).catch(() => {});
    }

    renderAll();

    periodBar.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('button[data-period]') as HTMLElement | null;
      if (!btn) return;
      activePeriod = btn.dataset.period!;
      renderPeriodBar();
      renderAll();
    });
  },
});
