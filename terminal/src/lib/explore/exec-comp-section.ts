/**
 * Executive Compensation section -- self-registering.
 * Fixed field names: executive_name, executive_title, total_compensation, salary.
 * Added: fiscal_year, bonus, stock_awards, option_awards, other_compensation.
 * Stacked bar chart + sortable table.
 */
import {
  registerSection, sectionFetch, normalizeItems, payloadError,
  renderError, renderEmpty, fmtCurrency, loadECharts,
  type EntityParams, type SectionData,
} from '../explore-sections';
import { mountSortableTable, type ColDef } from './sortable-table';

const COLUMNS: ColDef[] = [
  { key: 'executive_name',       label: 'Name',           align: 'left',  sortType: 'string', format: (v) => String(v ?? '') },
  { key: 'executive_title',      label: 'Title',          align: 'left',  sortType: 'string', format: (v) => String(v ?? '') },
  { key: 'fiscal_year',          label: 'Year',           align: 'left',  sortType: 'number', format: (v) => v != null ? String(v) : '\u2014' },
  { key: 'salary',               label: 'Salary',         align: 'right', sortType: 'number', format: (v) => fmtCurrency(v as number) },
  { key: 'bonus',                label: 'Bonus',          align: 'right', sortType: 'number', format: (v) => fmtCurrency(v as number) },
  { key: 'stock_awards',         label: 'Stock Awards',   align: 'right', sortType: 'number', format: (v) => fmtCurrency(v as number) },
  { key: 'option_awards',        label: 'Options',        align: 'right', sortType: 'number', format: (v) => fmtCurrency(v as number) },
  { key: 'other_compensation',   label: 'Other',          align: 'right', sortType: 'number', format: (v) => fmtCurrency(v as number) },
  { key: 'total_compensation',   label: 'Total',          align: 'right', sortType: 'number', format: (v) => fmtCurrency(v as number) },
];

registerSection({
  id: 'exec-compensation',
  title: 'Executive Compensation',
  icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>',
  entityTypes: ['company'],
  minSize: { minCols: 2, weight: 'wide' },

  async fetch(p: EntityParams): Promise<SectionData> {
    const qps: string[] = [];
    if (p.cik) qps.push('cik=' + p.cik);
    qps.push('limit=30');
    return sectionFetch('/api/v1/sec/executive-compensation?' + qps.join('&'));
  },

  render(container: HTMLElement, data: SectionData): void {
    const err = payloadError(data.payload);
    if (err) { renderError(container, err); return; }
    const items = normalizeItems(data.payload) as Record<string, unknown>[];
    if (items.length === 0) { renderEmpty(container, 'No compensation data found.'); return; }

    const chartId = 'exec-chart-' + Date.now();
    const chartDiv = document.createElement('div');
    chartDiv.id = chartId;
    chartDiv.style.cssText = 'width:100%;height:200px;margin-bottom:12px';
    container.innerHTML = '';
    container.appendChild(chartDiv);

    const tableWrap = document.createElement('div');
    container.appendChild(tableWrap);

    mountSortableTable(tableWrap, {
      columns: COLUMNS,
      items: items,
      defaultSortKey: 'total_compensation',
      defaultSortDir: -1,
    });

    requestAnimationFrame(() => {
      loadECharts().then((echarts) => {
        const el = document.getElementById(chartId);
        if (!el) return;
        const top5 = [...items]
          .sort((a, b) => (Number(b.total_compensation) || 0) - (Number(a.total_compensation) || 0))
          .slice(0, 5);
        if (top5.length === 0) return;

        const names = top5.map(r => String(r.executive_name || 'Unknown'));
        const components = [
          { name: 'Salary', key: 'salary', color: '#3b82f6' },
          { name: 'Bonus', key: 'bonus', color: '#10b981' },
          { name: 'Stock Awards', key: 'stock_awards', color: '#8b5cf6' },
          { name: 'Options', key: 'option_awards', color: '#f59e0b' },
          { name: 'Other', key: 'other_compensation', color: '#6b7280' },
        ];

        const chart = echarts.init(el);
        chart.setOption({
          tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
          legend: { data: components.map(c => c.name), textStyle: { color: '#94a3b8', fontSize: 10 }, bottom: 0 },
          grid: { left: 120, right: 20, top: 10, bottom: 40 },
          xAxis: { type: 'value', axisLabel: { fontSize: 10, color: '#94a3b8', formatter: (v: number) => v >= 1e6 ? (v / 1e6).toFixed(0) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(0) + 'K' : String(v) }, splitLine: { lineStyle: { color: '#1e293b' } } },
          yAxis: { type: 'category', data: names, axisLabel: { fontSize: 10, color: '#94a3b8', width: 100, overflow: 'truncate' } },
          series: components.map(c => ({
            name: c.name, type: 'bar', stack: 'total',
            data: top5.map(r => Number(r[c.key]) || 0),
            itemStyle: { color: c.color },
            emphasis: { focus: 'series' },
          })),
        });
        const onResize = () => { if (el.isConnected) chart.resize(); else window.removeEventListener('resize', onResize); };
        window.addEventListener('resize', onResize);
      }).catch(() => {});
    });
  },
});
