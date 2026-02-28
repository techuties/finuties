/**
 * Insider Transactions section -- self-registering.
 * Fixed field names: transaction_code (not transaction_type), price (not price_per_share).
 * Added: security_title, acquired_disposed, shares_owned_after, ownership_nature.
 * Buy/sell color coding and sortable columns.
 */
import {
  registerSection, sectionFetch, normalizeItems, payloadError,
  renderError, renderEmpty, esc, fmtDate, fmtCompact, exploreLink,
  type EntityParams, type SectionData,
} from '../explore-sections';
import { mountSortableTable, fmtNumber, TD_CLS, type ColDef } from './sortable-table';

const TX_CODES: Record<string, string> = {
  P: 'Purchase', S: 'Sale', M: 'Exercise', A: 'Grant',
  D: 'Disposition', F: 'Tax', G: 'Gift', J: 'Other',
  C: 'Conversion', W: 'Expiration',
};

const COLUMNS: ColDef[] = [
  { key: 'transaction_date',   label: 'Date',       align: 'left',  sortType: 'date',   format: (v) => fmtDate(v as string) },
  { key: 'reporting_owner_name', label: 'Owner',    align: 'left',  sortType: 'string', format: (v) => String(v ?? '') },
  { key: 'transaction_code',  label: 'Type',        align: 'left',  sortType: 'string', format: (v) => { const s = String(v ?? ''); return TX_CODES[s] || s || '\u2014'; } },
  { key: 'security_title',    label: 'Security',    align: 'left',  sortType: 'string', format: (v) => v ? String(v) : '\u2014' },
  { key: 'acquired_disposed', label: 'A/D',         align: 'left',  sortType: 'string', format: (v) => v ? String(v) : '\u2014' },
  { key: 'shares',            label: 'Shares',      align: 'right', sortType: 'number', format: (v) => fmtNumber(v as number) },
  { key: 'price',             label: 'Price',       align: 'right', sortType: 'number', format: (v) => v != null ? '$' + Number(v).toFixed(2) : '\u2014' },
  { key: 'shares_owned_after', label: 'After',      align: 'right', sortType: 'number', format: (v) => fmtCompact(v as number) },
  { key: 'ownership_nature',  label: 'D/I',         align: 'left',  sortType: 'string', format: (v) => v === 'D' ? 'Direct' : v === 'I' ? 'Indirect' : v ? String(v) : '\u2014' },
];

registerSection({
  id: 'insider-transactions',
  title: 'Insider Transactions',
  icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"/>',
  entityTypes: ['company', 'stock'],
  minSize: { minCols: 2, weight: 'wide' },

  async fetch(p: EntityParams): Promise<SectionData> {
    const qps: string[] = [];
    if (p.cik) qps.push('cik=' + p.cik);
    if (p.symbol) qps.push('symbol=' + p.symbol);
    qps.push('limit=40');
    return sectionFetch('/api/v1/sec/insider-transactions?' + qps.join('&'));
  },

  render(container: HTMLElement, data: SectionData, _p: EntityParams): void {
    const err = payloadError(data.payload);
    if (err) { renderError(container, err); return; }
    const items = normalizeItems(data.payload) as Record<string, unknown>[];
    if (items.length === 0) { renderEmpty(container, 'No insider transactions found.'); return; }

    mountSortableTable(container, {
      columns: COLUMNS,
      items: items,
      defaultSortKey: 'transaction_date',
      defaultSortDir: -1,
      cellRenderer(col, row) {
        if (col.key === 'reporting_owner_name') {
          const name = String(row.reporting_owner_name || '');
          const cik = String(row.reporting_owner_cik || '');
          let html = `<td class="${TD_CLS}">`;
          if (cik) html += `<a href="${esc(exploreLink({ type: 'person', cik, name }))}" class="text-fin-400 hover:text-fin-300">`;
          html += esc(name || '\u2014');
          if (cik) html += '</a>';
          html += '</td>';
          return html;
        }
        if (col.key === 'acquired_disposed') {
          const ad = String(row.acquired_disposed || '');
          const isAcquired = ad === 'A';
          const isDisposed = ad === 'D';
          const color = isAcquired ? 'text-emerald-400' : isDisposed ? 'text-red-400' : 'text-slate-400';
          const label = isAcquired ? 'Acquired' : isDisposed ? 'Disposed' : ad || '\u2014';
          return `<td class="${TD_CLS} ${color} font-medium text-xs">${esc(label)}</td>`;
        }
        return null;
      },
    });
  },
});
