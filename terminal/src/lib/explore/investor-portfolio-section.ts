/**
 * Investor Portfolio section -- self-registering.
 * Shows an investor's full current portfolio: KPI summary, sector pie chart,
 * and sortable holdings table with linked stock symbols.
 * Only visible for investor entity type.
 */
import {
  registerSection, sectionFetch, payloadError,
  renderError, renderEmpty, esc, fmtCompact, fmtCurrency, fmtDate, exploreLink, loadECharts,
  type EntityParams, type SectionData,
} from '../explore-sections';
import { mountSortableTable, TD_CLS, type ColDef } from './sortable-table';

interface PortfolioResponse {
  positions: number;
  total_value: number;
  last_filing: string | null;
  holdings: Record<string, unknown>[];
}

const COLUMNS: ColDef[] = [
  { key: 'stock_symbol',  label: 'Symbol',    align: 'left',  sortType: 'string', format: (v) => v ? String(v) : '\u2014' },
  { key: 'company_name',  label: 'Company',   align: 'left',  sortType: 'string', format: (v) => String(v ?? '') },
  { key: 'sector',        label: 'Sector',    align: 'left',  sortType: 'string', format: (v) => v ? String(v) : '\u2014' },
  { key: 'value',         label: 'Value ($)',  align: 'right', sortType: 'number', format: (v) => fmtCurrency(v as number) },
  { key: 'shares',        label: 'Shares',    align: 'right', sortType: 'number', format: (v) => fmtCompact(v as number) },
  { key: 'filing_date',   label: 'Filed',     align: 'left',  sortType: 'date',   format: (v) => fmtDate(v as string) },
  { key: 'put_call',      label: 'Put/Call',  align: 'left',  sortType: 'string', format: (v) => v ? String(v) : '\u2014' },
  { key: 'title_of_class', label: 'Class',    align: 'left',  sortType: 'string', format: (v) => v ? String(v) : '\u2014' },
];

const SECTOR_COLORS = [
  '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#a855f7',
];

registerSection({
  id: 'investor-portfolio',
  title: 'Current Portfolio',
  icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6"/>',
  entityTypes: ['investor'],
  minSize: { minCols: 3, weight: 'wide' },

  async fetch(p: EntityParams): Promise<SectionData> {
    if (!p.cik) return { payload: { error: 'No CIK provided' }, tokenCost: 0, creditsRemaining: null };
    return sectionFetch('/api/v1/holdings/investor/' + encodeURIComponent(p.cik) + '?limit=200');
  },

  render(container: HTMLElement, data: SectionData): void {
    const err = payloadError(data.payload);
    if (err) { renderError(container, err); return; }

    const raw = data.payload as PortfolioResponse | null;
    if (!raw || !raw.holdings || raw.holdings.length === 0) {
      renderEmpty(container, 'No portfolio data found.');
      return;
    }

    container.innerHTML = '';

    // KPI strip
    const kpiDiv = document.createElement('div');
    kpiDiv.className = 'grid grid-cols-3 gap-4 mb-4 px-1';
    const kpis = [
      { label: 'Total Value', value: fmtCurrency(raw.total_value), color: 'text-emerald-400' },
      { label: 'Positions', value: String(raw.positions), color: 'text-blue-400' },
      { label: 'Last Filing', value: fmtDate(raw.last_filing), color: 'text-slate-300' },
    ];
    for (const k of kpis) {
      kpiDiv.innerHTML += `<div class="text-center"><p class="text-[10px] uppercase tracking-wider text-slate-500">${esc(k.label)}</p><p class="text-lg font-bold ${k.color}">${esc(k.value)}</p></div>`;
    }
    container.appendChild(kpiDiv);

    // Charts row: sector allocation pie + top 10 holdings bar
    const chartsRow = document.createElement('div');
    chartsRow.className = 'grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4';

    const sectorChartId = 'portfolio-sector-' + Date.now();
    const sectorDiv = document.createElement('div');
    sectorDiv.innerHTML = `<p class="text-[10px] text-slate-500 uppercase tracking-wider mb-1 px-1">Sector Allocation</p><div id="${sectorChartId}" style="width:100%;height:200px"></div>`;
    chartsRow.appendChild(sectorDiv);

    const top10ChartId = 'portfolio-top10-' + Date.now();
    const top10Div = document.createElement('div');
    top10Div.innerHTML = `<p class="text-[10px] text-slate-500 uppercase tracking-wider mb-1 px-1">Top 10 Holdings</p><div id="${top10ChartId}" style="width:100%;height:200px"></div>`;
    chartsRow.appendChild(top10Div);

    container.appendChild(chartsRow);

    // Sortable holdings table
    const tableWrap = document.createElement('div');
    container.appendChild(tableWrap);

    mountSortableTable(tableWrap, {
      columns: COLUMNS,
      items: raw.holdings,
      defaultSortKey: 'value',
      defaultSortDir: -1,
      cellRenderer(col, row) {
        if (col.key === 'stock_symbol') {
          const sym = String(row.stock_symbol || '');
          if (!sym) return `<td class="${TD_CLS} text-slate-400">\u2014</td>`;
          return `<td class="${TD_CLS}"><a href="${esc(exploreLink({ type: 'stock', symbol: sym, name: String(row.company_name || sym) }))}" class="text-purple-400 hover:text-purple-300 font-mono font-semibold">${esc(sym)}</a></td>`;
        }
        if (col.key === 'company_name') {
          const name = String(row.company_name || '');
          return `<td class="${TD_CLS} text-slate-300 truncate max-w-[200px]">${esc(name || '\u2014')}</td>`;
        }
        if (col.key === 'sector') {
          const s = String(row.sector || '');
          if (!s) return `<td class="${TD_CLS} text-slate-500">\u2014</td>`;
          return `<td class="${TD_CLS}"><span class="rounded-full bg-fin-800/60 px-2 py-0.5 text-[10px] text-slate-400">${esc(s)}</span></td>`;
        }
        return null;
      },
    });

    if (raw.holdings.length >= 200) {
      const note = document.createElement('p');
      note.className = 'text-[10px] text-slate-600 text-center mt-2';
      note.textContent = 'Showing top 200 positions by value';
      tableWrap.appendChild(note);
    }

    // Deferred charts
    requestAnimationFrame(() => {
      loadECharts().then((echarts) => {
        // Sector pie chart
        const sectorEl = document.getElementById(sectorChartId);
        if (sectorEl) {
          const sectorMap = new Map<string, number>();
          for (const h of raw.holdings) {
            const sec = String(h.sector || 'Unknown');
            sectorMap.set(sec, (sectorMap.get(sec) || 0) + (Number(h.value) || 0));
          }
          const sectorData = Array.from(sectorMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 12)
            .map(([name, value]) => ({ name, value }));

          const chart = echarts.init(sectorEl);
          chart.setOption({
            tooltip: { trigger: 'item', formatter: '{b}: ${c} ({d}%)' },
            color: SECTOR_COLORS,
            series: [{
              type: 'pie', radius: ['30%', '70%'], center: ['50%', '50%'],
              data: sectorData,
              label: { fontSize: 9, color: '#94a3b8', overflow: 'truncate', width: 70 },
              emphasis: { label: { show: true, fontSize: 11, fontWeight: 'bold' } },
            }],
          });
          const onSectorResize = () => { if (sectorEl.isConnected) chart.resize(); else window.removeEventListener('resize', onSectorResize); };
          window.addEventListener('resize', onSectorResize);
        }

        // Top 10 bar chart
        const top10El = document.getElementById(top10ChartId);
        if (top10El) {
          const top10 = raw.holdings
            .filter(h => h.value != null)
            .slice(0, 10);
          if (top10.length === 0) { top10El.style.display = 'none'; return; }

          const names = top10.map(h => String(h.stock_symbol || 'Unknown'));
          const values = top10.map(h => Number(h.value) || 0);

          const chart = echarts.init(top10El);
          chart.setOption({
            tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
            grid: { left: 60, right: 20, top: 10, bottom: 30 },
            xAxis: {
              type: 'category', data: names,
              axisLabel: { fontSize: 9, color: '#94a3b8', rotate: 30 },
            },
            yAxis: {
              type: 'value',
              axisLabel: {
                fontSize: 9, color: '#94a3b8',
                formatter: (v: number) => v >= 1e9 ? (v / 1e9).toFixed(0) + 'B' : v >= 1e6 ? (v / 1e6).toFixed(0) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(0) + 'K' : String(v),
              },
              splitLine: { lineStyle: { color: '#1e293b' } },
            },
            series: [{
              type: 'bar', data: values,
              itemStyle: {
                color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#8b5cf6' }, { offset: 1, color: '#3b82f6' }] },
                borderRadius: [3, 3, 0, 0],
              },
            }],
          });
          const onTop10Resize = () => { if (top10El.isConnected) chart.resize(); else window.removeEventListener('resize', onTop10Resize); };
          window.addEventListener('resize', onTop10Resize);
        }
      }).catch(() => {});
    });
  },
});
