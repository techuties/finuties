/**
 * Money Flow section -- self-registering.
 * Displays cash flow statement data: operations, investing, financing,
 * free cash flow, capital expenditures, and net change in cash.
 */
import {
  registerSection, sectionFetch, normalizeItems, payloadError,
  renderError, renderEmpty, esc, fmtDate, fmtCurrency, loadECharts,
  type EntityParams, type SectionData,
} from '../explore-sections';
import { mountSortableTable, TD_CLS, type ColDef } from './sortable-table';

const COLUMNS: ColDef[] = [
  { key: 'period',               label: 'Period',        align: 'left',  sortType: 'date',   format: (v) => fmtDate(v as string) },
  { key: 'cash_from_operations', label: 'Operations',    align: 'right', sortType: 'number', format: (v) => fmtCurrency(v as number) },
  { key: 'cash_from_investing',  label: 'Investing',     align: 'right', sortType: 'number', format: (v) => fmtCurrency(v as number) },
  { key: 'cash_from_financing',  label: 'Financing',     align: 'right', sortType: 'number', format: (v) => fmtCurrency(v as number) },
  { key: 'free_cash_flow',       label: 'Free CF',       align: 'right', sortType: 'number', format: (v) => fmtCurrency(v as number) },
  { key: 'net_change_in_cash',   label: 'Net Change',    align: 'right', sortType: 'number', format: (v) => fmtCurrency(v as number) },
  { key: 'capital_expenditures', label: 'CapEx',         align: 'right', sortType: 'number', format: (v) => fmtCurrency(v as number) },
];

const FLOW_COLORS: Record<string, string> = {
  cash_from_operations: '#10b981',
  cash_from_investing:  '#f59e0b',
  cash_from_financing:  '#3b82f6',
};

registerSection({
  id: 'money-flow',
  title: 'Money Flow',
  icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"/>',
  entityTypes: ['company', 'stock'],
  minSize: { minCols: 2, weight: 'wide' },

  async fetch(p: EntityParams): Promise<SectionData> {
    const qps: string[] = [];
    if (p.cik) qps.push('cik=' + encodeURIComponent(p.cik));
    qps.push('limit=20');
    return sectionFetch('/api/v1/sec/money-flow?' + qps.join('&'));
  },

  render(container: HTMLElement, data: SectionData): void {
    const err = payloadError(data.payload);
    if (err) { renderError(container, err); return; }
    const items = normalizeItems(data.payload) as Record<string, unknown>[];
    if (items.length === 0) { renderEmpty(container, 'No cash flow data found.'); return; }

    const sorted = [...items].sort((a, b) =>
      String(b.period || '').localeCompare(String(a.period || ''))
    );

    container.innerHTML = '';

    // KPI strip for the latest period
    const latest = sorted[0];
    if (latest) {
      const kpi = document.createElement('div');
      kpi.className = 'grid grid-cols-3 gap-2 mb-3';
      const kpis = [
        { label: 'Operations', value: latest.cash_from_operations, color: '#10b981' },
        { label: 'Free Cash Flow', value: latest.free_cash_flow, color: '#8b5cf6' },
        { label: 'Net Change', value: latest.net_change_in_cash, color: '#3b82f6' },
      ];
      kpi.innerHTML = kpis.map(k => {
        const n = Number(k.value) || 0;
        const sign = n >= 0 ? '+' : '';
        const valColor = n >= 0 ? 'text-emerald-400' : 'text-red-400';
        return `<div class="rounded-lg bg-fin-800/60 border border-fin-700/30 px-3 py-2">
          <div class="text-[10px] text-slate-500 uppercase tracking-wider">${esc(k.label)}</div>
          <div class="text-sm font-mono font-medium ${valColor}">${sign}${fmtCurrency(n)}</div>
          <div class="text-[10px] text-slate-600">${fmtDate(latest.period as string)}</div>
        </div>`;
      }).join('');
      container.appendChild(kpi);
    }

    // Chart: stacked bar chart showing cash flow components over time
    const chartId = 'money-flow-chart-' + Date.now();
    const chartDiv = document.createElement('div');
    chartDiv.id = chartId;
    chartDiv.style.cssText = 'width:100%;height:220px;margin-bottom:12px';
    container.appendChild(chartDiv);

    // Sortable table
    const tableWrap = document.createElement('div');
    container.appendChild(tableWrap);

    mountSortableTable(tableWrap, {
      columns: COLUMNS,
      items: sorted,
      defaultSortKey: 'period',
      defaultSortDir: -1,
      cellRenderer(col, row) {
        if (col.key === 'period') return null;
        const val = Number(row[col.key]) || 0;
        if (row[col.key] == null) return `<td class="${TD_CLS} text-right font-mono text-slate-600">\u2014</td>`;
        const color = val >= 0 ? 'text-emerald-400' : 'text-red-400';
        const prefix = val >= 0 ? '+' : '';
        return `<td class="${TD_CLS} text-right font-mono ${color}">${prefix}${fmtCurrency(val)}</td>`;
      },
    });

    // Render chart
    requestAnimationFrame(() => {
      loadECharts().then((echarts) => {
        const el = document.getElementById(chartId);
        if (!el) return;

        const chartData = [...sorted].reverse();
        if (chartData.length === 0) { el.style.display = 'none'; return; }

        const chart = echarts.init(el);
        const periods = chartData.map(r => String(r.period || '').slice(0, 10));

        const seriesDefs = [
          { key: 'cash_from_operations', name: 'Operations', color: FLOW_COLORS.cash_from_operations },
          { key: 'cash_from_investing',  name: 'Investing',  color: FLOW_COLORS.cash_from_investing },
          { key: 'cash_from_financing',  name: 'Financing',  color: FLOW_COLORS.cash_from_financing },
        ];

        chart.setOption({
          backgroundColor: 'transparent',
          tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: (params: unknown) => {
              const ps = params as { seriesName: string; value: number; color: string; name?: string; axisValueLabel?: string }[];
              let html = `<strong>${esc(ps[0]?.name ?? ps[0]?.axisValueLabel ?? '')}</strong><br/>`;
              for (const p of ps) {
                const sign = p.value >= 0 ? '+' : '';
                html += `<span style="color:${p.color}">\u25CF</span> ${esc(p.seriesName)}: ${sign}${fmtCurrency(p.value)}<br/>`;
              }
              return html;
            },
          },
          legend: {
            top: 0, textStyle: { color: '#94a3b8', fontSize: 10 },
            data: seriesDefs.map(s => s.name),
          },
          grid: { left: 70, right: 15, top: 30, bottom: 30 },
          xAxis: {
            type: 'category',
            data: periods,
            axisLabel: { fontSize: 9, color: '#64748b', rotate: 30 },
            axisLine: { lineStyle: { color: '#334155' } },
          },
          yAxis: {
            type: 'value',
            axisLabel: {
              fontSize: 9, color: '#64748b',
              formatter: (v: number) => {
                const abs = Math.abs(v);
                if (abs >= 1e9) return (v / 1e9).toFixed(0) + 'B';
                if (abs >= 1e6) return (v / 1e6).toFixed(0) + 'M';
                if (abs >= 1e3) return (v / 1e3).toFixed(0) + 'K';
                return String(v);
              },
            },
            splitLine: { lineStyle: { color: '#1e293b' } },
          },
          series: seriesDefs.map(s => ({
            name: s.name,
            type: 'bar',
            stack: 'cashflow',
            data: chartData.map(r => Number(r[s.key]) || 0),
            itemStyle: { color: s.color },
            barMaxWidth: 24,
          })),
        });

        const onResize = () => { if (el.isConnected) chart.resize(); else window.removeEventListener('resize', onResize); };
        window.addEventListener('resize', onResize);
      }).catch(() => {});
    });
  },
});
