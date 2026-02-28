/**
 * Holdings section -- self-registering.
 * Shows institutional holders for a stock or holdings for an investor.
 * Keeps API usage lean: no per-row follow-up requests (CIK fallback labels).
 */
import {
  registerSection, sectionFetch, normalizeItems, payloadError,
  renderError, renderEmpty, esc, fmtCompact, fmtCurrency, fmtDate, exploreLink, loadECharts,
  type EntityParams, type SectionData,
} from '../explore-sections';
import { mountSortableTable, TD_CLS, type ColDef } from './sortable-table';

const COLUMNS: ColDef[] = [
  { key: 'investor_name',         label: 'Investor',     align: 'left',  sortType: 'string', format: (v) => String(v ?? '') },
  { key: 'stock_symbol',          label: 'Symbol',       align: 'left',  sortType: 'string', format: (v) => v ? String(v) : '\u2014' },
  { key: 'shares',                label: 'Shares',       align: 'right', sortType: 'number', format: (v) => fmtCompact(v as number) },
  { key: 'value',                 label: 'Value',        align: 'right', sortType: 'number', format: (v) => fmtCurrency(v as number) },
  { key: 'filing_date',           label: 'Filed',        align: 'left',  sortType: 'date',   format: (v) => fmtDate(v as string) },
  { key: 'put_call',              label: 'Put/Call',     align: 'left',  sortType: 'string', format: (v) => v ? String(v) : '\u2014' },
  { key: 'investment_discretion', label: 'Discretion',   align: 'left',  sortType: 'string', format: (v) => v ? String(v) : '\u2014' },
];

registerSection({
  id: 'holdings',
  title: 'Institutional Holdings',
  icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21"/>',
  entityTypes: ['company', 'stock'],
  minSize: { minCols: 2, weight: 'wide' },

  async fetch(p: EntityParams): Promise<SectionData> {
    const qps: string[] = [];
    if (p.type === 'investor' && p.cik) {
      qps.push('investor_cik=' + encodeURIComponent(p.cik));
    } else if (p.symbol) {
      qps.push('stock_symbol=' + encodeURIComponent(p.symbol));
    }
    if (qps.length === 0) {
      return { payload: { error: 'No symbol or investor CIK available for holdings lookup' }, tokenCost: 0, creditsRemaining: null };
    }
    qps.push('limit=50');
    return sectionFetch('/api/v1/sec/holdings?' + qps.join('&'));
  },

  render(container: HTMLElement, data: SectionData): void {
    const err = payloadError(data.payload);
    if (err) { renderError(container, err); return; }
    const items = normalizeItems(data.payload) as Record<string, unknown>[];
    if (items.length === 0) { renderEmpty(container, 'No holdings data found.'); return; }

    container.innerHTML = '';

    const chartId = 'holdings-pie-' + Date.now();
    const chartDiv = document.createElement('div');
    chartDiv.id = chartId;
    chartDiv.style.cssText = 'width:100%;height:200px;margin-bottom:12px';
    container.appendChild(chartDiv);

    const tableWrap = document.createElement('div');
    container.appendChild(tableWrap);

    function renderTable(): void {
      tableWrap.innerHTML = '';
      mountSortableTable(tableWrap, {
        columns: COLUMNS,
        items: items,
        defaultSortKey: 'value',
        defaultSortDir: -1,
        cellRenderer(col, row) {
          if (col.key === 'investor_name') {
            const iName = String(row.investor_name || '');
            const iCik = String(row.investor_cik || row.cik || '');
            const display = iName || (iCik ? 'CIK ' + iCik : '\u2014');
            let html = `<td class="${TD_CLS}">`;
            if (iCik) html += `<a href="${esc(exploreLink({ type: 'investor', cik: iCik, name: iName || iCik }))}" class="text-fin-400 hover:text-fin-300">`;
            html += esc(display);
            if (iCik) html += '</a>';
            html += '</td>';
            return html;
          }
          if (col.key === 'stock_symbol') {
            const sym = String(row.stock_symbol || '');
            if (!sym) return `<td class="${TD_CLS} text-slate-400">\u2014</td>`;
            return `<td class="${TD_CLS}"><a href="${esc(exploreLink({ type: 'stock', symbol: sym, name: sym }))}" class="text-purple-400 hover:text-purple-300 font-mono font-medium">${esc(sym)}</a></td>`;
          }
          return null;
        },
      });
    }

    renderTable();

    requestAnimationFrame(() => {
      loadECharts().then((echarts) => {
        const el = document.getElementById(chartId);
        if (!el) return;

        const sortedByValue = [...items]
          .filter(r => r.value != null)
          .sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0));
        const top10 = sortedByValue.slice(0, 10);
        if (top10.length === 0) { el.style.display = 'none'; return; }

        const otherVal = sortedByValue.slice(10).reduce((sum, r) => sum + (Number(r.value) || 0), 0);
        const pieData = top10.map(r => ({
          name: String(r.investor_name || r.stock_symbol || 'CIK ' + (r.investor_cik || '?')),
          value: Number(r.value) || 0,
        }));
        if (otherVal > 0) pieData.push({ name: 'Other', value: otherVal });

        const chart = echarts.init(el);
        chart.setOption({
          tooltip: { trigger: 'item', formatter: '{b}: ${c} ({d}%)' },
          series: [{
            type: 'pie', radius: ['35%', '70%'], center: ['50%', '50%'],
            data: pieData,
            label: { fontSize: 10, color: '#94a3b8', overflow: 'truncate', width: 80 },
            emphasis: { label: { show: true, fontSize: 12, fontWeight: 'bold' } },
          }],
        });
        const onResize = () => { if (el.isConnected) chart.resize(); else window.removeEventListener('resize', onResize); };
        window.addEventListener('resize', onResize);
      }).catch(() => {});
    });
  },
});
