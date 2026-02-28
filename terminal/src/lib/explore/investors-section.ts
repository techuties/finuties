/**
 * Investors section -- self-registering.
 * Displays institutional holders for a stock with sortable columns.
 */
import {
  registerSection, sectionFetch, normalizeItems, payloadError,
  renderError, renderEmpty, esc, fmtCompact, fmtDate, exploreLink,
  type EntityParams, type SectionData,
} from '../explore-sections';
import { mountSortableTable, fmtNumber, TD_CLS, type ColDef } from './sortable-table';

const COLUMNS: ColDef[] = [
  { key: 'investor_name', label: 'Investor',  align: 'left',  sortType: 'string', format: (v) => String(v ?? '') },
  { key: 'investor_type', label: 'Type',      align: 'left',  sortType: 'string', format: (v) => String(v ?? '') },
  { key: 'value',         label: 'Value ($)',  align: 'right', sortType: 'number', format: (v) => fmtCompact(v as number) },
  { key: 'shares',        label: 'Shares',    align: 'right', sortType: 'number', format: (v) => fmtNumber(v as number) },
  { key: 'filing_date',   label: 'Filed',     align: 'right', sortType: 'date',   format: (v) => fmtDate(v as string) },
  { key: 'put_call',      label: 'Put/Call',  align: 'left',  sortType: 'string', format: (v) => v ? String(v) : '\u2014' },
];

registerSection({
  id: 'investors',
  title: 'Investors',
  icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"/>',
  entityTypes: ['stock', 'company'],
  minSize: { minCols: 2, weight: 'wide' },

  async fetch(p: EntityParams): Promise<SectionData> {
    if (p.symbol) {
      return sectionFetch('/api/v1/holdings/stock/' + encodeURIComponent(p.symbol) + '?limit=50');
    }
    const qps: string[] = [];
    if (p.cik) qps.push('cik=' + p.cik);
    qps.push('limit=50');
    return sectionFetch('/api/v1/market/investors?' + qps.join('&'));
  },

  render(container: HTMLElement, data: SectionData): void {
    const err = payloadError(data.payload);
    if (err) { renderError(container, err); return; }
    const rawItems = normalizeItems(data.payload) as Record<string, unknown>[];
    if (rawItems.length === 0) { renderEmpty(container, 'No investor data found.'); return; }

    mountSortableTable(container, {
      columns: COLUMNS,
      items: rawItems,
      defaultSortKey: 'value',
      defaultSortDir: -1,
      cellRenderer(col, row) {
        if (col.key !== 'investor_name') return null;
        const iName = String(row.investor_name || '');
        const iCik = String(row.investor_cik || '');
        let html = `<td class="${TD_CLS}">`;
        if (iCik) html += `<a href="${esc(exploreLink({ type: 'investor', cik: iCik, name: iName }))}" class="text-fin-400 hover:text-fin-300">`;
        html += esc(iName || '\u2014');
        if (iCik) html += '</a>';
        html += '</td>';
        return html;
      },
    });
  },
});
