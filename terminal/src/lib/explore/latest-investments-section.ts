/**
 * Latest Investments section -- self-registering.
 * Shows an investor's most recent holdings filings (raw activity log).
 * Complementary to the Portfolio section which shows deduplicated current positions.
 */
import {
  registerSection, sectionFetch, normalizeItems, payloadError,
  renderError, renderEmpty, esc, fmtDate, fmtCompact, fmtCurrency, exploreLink,
  type EntityParams, type SectionData,
} from '../explore-sections';
import { mountSortableTable, TD_CLS, type ColDef } from './sortable-table';

const COLUMNS: ColDef[] = [
  { key: 'stock_symbol',   label: 'Symbol',    align: 'left',  sortType: 'string', format: (v) => v ? String(v) : '\u2014' },
  { key: 'company_name',   label: 'Company',   align: 'left',  sortType: 'string', format: (v) => String(v ?? '') },
  { key: 'shares',         label: 'Shares',    align: 'right', sortType: 'number', format: (v) => fmtCompact(v as number) },
  { key: 'value',          label: 'Value',     align: 'right', sortType: 'number', format: (v) => fmtCurrency(v as number) },
  { key: 'filing_date',    label: 'Filed',     align: 'left',  sortType: 'date',   format: (v) => fmtDate(v as string) },
  { key: 'filing_period',  label: 'Period',    align: 'left',  sortType: 'string', format: (v) => v ? String(v) : '\u2014' },
  { key: 'put_call',       label: 'Put/Call',  align: 'left',  sortType: 'string', format: (v) => v ? String(v) : '\u2014' },
];

registerSection({
  id: 'latest-investments',
  title: 'Recent Filing Activity',
  icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>',
  entityTypes: ['investor'],
  minSize: { minCols: 2, weight: 'wide' },

  async fetch(p: EntityParams): Promise<SectionData> {
    const qps: string[] = [];
    if (p.cik) qps.push('investor_cik=' + p.cik);
    qps.push('limit=40');
    return sectionFetch('/api/v1/sec/holdings?' + qps.join('&'));
  },

  render(container: HTMLElement, data: SectionData): void {
    const err = payloadError(data.payload);
    if (err) { renderError(container, err); return; }
    const items = normalizeItems(data.payload) as Record<string, unknown>[];
    if (items.length === 0) { renderEmpty(container, 'No recent activity found.'); return; }

    mountSortableTable(container, {
      columns: COLUMNS,
      items: items,
      defaultSortKey: 'filing_date',
      defaultSortDir: -1,
      cellRenderer(col, row) {
        if (col.key === 'stock_symbol') {
          const sym = String(row.stock_symbol || '');
          if (!sym) return `<td class="${TD_CLS} text-slate-400">\u2014</td>`;
          return `<td class="${TD_CLS}"><a href="${esc(exploreLink({ type: 'stock', symbol: sym, name: String(row.company_name || sym) }))}" class="text-purple-400 hover:text-purple-300 font-mono font-medium">${esc(sym)}</a></td>`;
        }
        if (col.key === 'company_name') {
          const name = String(row.company_name || row.issuer_name || row.name || '');
          const cik = String(row.company_cik || row.issuer_cik || '');
          let html = `<td class="${TD_CLS}">`;
          if (cik) html += `<a href="${esc(exploreLink({ type: 'company', cik, name }))}" class="text-fin-400 hover:text-fin-300">`;
          html += esc(name || '\u2014');
          if (cik) html += '</a>';
          html += '</td>';
          return html;
        }
        return null;
      },
    });
  },
});
