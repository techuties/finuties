/**
 * Beneficial Ownership section -- self-registering.
 * Fixed field names: ownership_percentage (not percent_owned), created_at (not filed_at).
 * Added: shares_owned, owner_type, voting_power columns. Sortable.
 */
import {
  registerSection, sectionFetch, normalizeItems, payloadError,
  renderError, renderEmpty, esc, fmtDate, fmtCompact,
  type EntityParams, type SectionData,
} from '../explore-sections';
import { mountSortableTable, TD_CLS, type ColDef } from './sortable-table';

const COLUMNS: ColDef[] = [
  { key: 'owner_name',           label: 'Owner',      align: 'left',  sortType: 'string', format: (v) => String(v ?? '') },
  { key: 'owner_type',           label: 'Type',        align: 'left',  sortType: 'string', format: (v) => v ? String(v) : '\u2014' },
  { key: 'created_at',           label: 'Filed',       align: 'left',  sortType: 'date',   format: (v) => fmtDate(v as string) },
  { key: 'form_type',            label: 'Form',        align: 'left',  sortType: 'string', format: (v) => String(v ?? '') },
  { key: 'ownership_percentage', label: '% Owned',     align: 'right', sortType: 'number', format: (v) => v != null ? Number(v).toFixed(1) + '%' : '\u2014' },
  { key: 'shares_owned',         label: 'Shares',      align: 'right', sortType: 'number', format: (v) => fmtCompact(v as number) },
  { key: 'voting_power',         label: 'Voting Power', align: 'left', sortType: 'string', format: (v) => v ? String(v) : '\u2014' },
];

registerSection({
  id: 'beneficial-ownership',
  title: 'Beneficial Ownership',
  icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/>',
  entityTypes: ['company', 'investor'],
  minSize: { minCols: 2, weight: 'wide' },

  async fetch(p: EntityParams): Promise<SectionData> {
    const qps: string[] = [];
    if (p.cik) qps.push('cik=' + p.cik);
    qps.push('limit=25');
    return sectionFetch('/api/v1/sec/beneficial-ownership?' + qps.join('&'));
  },

  render(container: HTMLElement, data: SectionData): void {
    const err = payloadError(data.payload);
    if (err) { renderError(container, err); return; }
    const items = normalizeItems(data.payload) as Record<string, unknown>[];
    if (items.length === 0) { renderEmpty(container, 'No ownership reports found.'); return; }

    mountSortableTable(container, {
      columns: COLUMNS,
      items: items,
      defaultSortKey: 'ownership_percentage',
      defaultSortDir: -1,
      cellRenderer(col, row) {
        if (col.key === 'ownership_percentage') {
          const pct = Number(row.ownership_percentage);
          if (isNaN(pct) || row.ownership_percentage == null) {
            return `<td class="${TD_CLS} text-right text-slate-400 font-mono">\u2014</td>`;
          }
          const barWidth = Math.min(pct, 100);
          const barColor = pct >= 10 ? '#ef4444' : pct >= 5 ? '#f59e0b' : '#3b82f6';
          return `<td class="${TD_CLS} text-right"><div class="flex items-center justify-end gap-2"><div class="w-16 h-1.5 rounded-full bg-fin-800 overflow-hidden"><div class="h-full rounded-full" style="width:${barWidth}%;background:${barColor}"></div></div><span class="font-mono text-slate-300 text-xs">${pct.toFixed(1)}%</span></div></td>`;
        }
        return null;
      },
    });
  },
});
