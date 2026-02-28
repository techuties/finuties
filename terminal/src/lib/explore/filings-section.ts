/**
 * SEC Filings section -- self-registering.
 * Added: period_of_report column, direct SEC link, form type filter chips, sorting.
 */
import {
  registerSection, sectionFetch, normalizeItems, payloadError,
  renderError, renderEmpty, esc, fmtDate, exploreLink,
  type EntityParams, type SectionData,
} from '../explore-sections';
import { mountSortableTable, TD_CLS, type ColDef } from './sortable-table';

const FORM_COLORS: Record<string, string> = {
  '10-K': 'bg-blue-500/20 text-blue-400',
  '10-Q': 'bg-emerald-500/20 text-emerald-400',
  '8-K':  'bg-amber-500/20 text-amber-400',
  '4':    'bg-rose-500/20 text-rose-400',
  '13F':  'bg-purple-500/20 text-purple-400',
  'SC 13D': 'bg-teal-500/20 text-teal-400',
  'SC 13G': 'bg-teal-500/20 text-teal-400',
  'DEF 14A': 'bg-cyan-500/20 text-cyan-400',
};

function formColor(form: string): string {
  if (FORM_COLORS[form]) return FORM_COLORS[form];
  for (const [prefix, cls] of Object.entries(FORM_COLORS)) {
    if (form.startsWith(prefix)) return cls;
  }
  return 'bg-slate-500/20 text-slate-400';
}

const COLUMNS: ColDef[] = [
  { key: 'form_type',            label: 'Form',    align: 'left',  sortType: 'string', format: (v) => String(v ?? '') },
  { key: 'filed_at',             label: 'Filed',   align: 'left',  sortType: 'date',   format: (v) => fmtDate(v as string) },
  { key: 'period_of_report',     label: 'Period',  align: 'left',  sortType: 'date',   format: (v) => fmtDate(v as string) },
  { key: 'primary_doc_description', label: 'Description', align: 'left', sortType: 'string', format: (v) => String(v ?? '') },
  { key: '_sec_link',            label: 'SEC',     align: 'left',  sortType: 'string', format: () => '' },
];

const FILTER_TYPES = ['All', '10-K', '10-Q', '8-K', '4', '13F', 'SC 13'];

registerSection({
  id: 'sec-filings',
  title: 'SEC Filings',
  icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>',
  entityTypes: ['company', 'investor'],
  minSize: { minCols: 2, weight: 'wide' },

  async fetch(p: EntityParams): Promise<SectionData> {
    const qps: string[] = [];
    if (p.cik) qps.push('cik=' + p.cik);
    if (p.symbol) qps.push('symbol=' + p.symbol);
    qps.push('limit=50');
    return sectionFetch('/api/v1/sec/filings?' + qps.join('&'));
  },

  render(container: HTMLElement, data: SectionData, p: EntityParams): void {
    const err = payloadError(data.payload);
    if (err) { renderError(container, err); return; }
    const allItems = normalizeItems(data.payload) as Record<string, unknown>[];
    if (allItems.length === 0) { renderEmpty(container, 'No filings found.'); return; }

    container.innerHTML = '';

    const filterBar = document.createElement('div');
    filterBar.className = 'flex flex-wrap gap-1.5 mb-3';
    let activeFilter = 'All';

    function renderChips(): void {
      let html = '';
      for (const ft of FILTER_TYPES) {
        const active = ft === activeFilter;
        const cls = active
          ? 'bg-fin-600 text-white'
          : 'bg-fin-800/60 text-slate-400 hover:bg-fin-700/60 hover:text-slate-300';
        html += `<button type="button" data-filter="${esc(ft)}" class="rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${cls}">${esc(ft)}</button>`;
      }
      filterBar.innerHTML = html;
    }

    renderChips();
    container.appendChild(filterBar);

    const tableWrap = document.createElement('div');
    container.appendChild(tableWrap);

    function filteredItems(): Record<string, unknown>[] {
      if (activeFilter === 'All') return allItems;
      return allItems.filter(row => {
        const ft = String(row.form_type || '');
        return ft === activeFilter || ft.startsWith(activeFilter);
      });
    }

    function renderTable(): void {
      tableWrap.innerHTML = '';
      const items = filteredItems();
      if (items.length === 0) {
        tableWrap.innerHTML = '<p class="text-slate-500 text-xs py-4 text-center">No filings match this filter.</p>';
        return;
      }
      mountSortableTable(tableWrap, {
        columns: COLUMNS,
        items: items,
        defaultSortKey: 'filed_at',
        defaultSortDir: -1,
        cellRenderer(col, row) {
          if (col.key === 'form_type') {
            const form = String(row.form_type || '');
            const acc = String(row.accession_number || '');
            const href = exploreLink({ type: 'filing', accession: acc, name: form });
            const color = formColor(form);
            return `<td class="${TD_CLS}"><a href="${esc(href)}" class="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${color} hover:opacity-80 transition-opacity">${esc(form)}</a></td>`;
          }
          if (col.key === 'primary_doc_description') {
            const desc = String(row.primary_doc_description || row.description || '');
            return `<td class="${TD_CLS} text-slate-300 truncate max-w-[300px]">${esc(desc)}</td>`;
          }
          if (col.key === '_sec_link') {
            const htmlLink = String(row.link_to_html || '');
            if (htmlLink) {
              return `<td class="${TD_CLS}"><a href="${esc(htmlLink)}" target="_blank" rel="noopener" class="text-fin-400 hover:text-fin-300" title="View on SEC"><svg class="w-3.5 h-3.5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/></svg></a></td>`;
            }
            return `<td class="${TD_CLS} text-slate-600">\u2014</td>`;
          }
          return null;
        },
      });
    }

    renderTable();

    filterBar.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('button[data-filter]') as HTMLElement | null;
      if (!btn) return;
      activeFilter = btn.dataset.filter!;
      renderChips();
      renderTable();
    });
  },
});
