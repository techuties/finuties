/**
 * Agreements section -- self-registering.
 * Enhanced: exhibit_number column, sortable table, filter chips by agreement type, minSize.
 */
import {
  registerSection, sectionFetch, normalizeItems, payloadError,
  renderError, renderEmpty, esc, fmtDate,
  type EntityParams, type SectionData,
} from '../explore-sections';
import { mountSortableTable, type ColDef } from './sortable-table';

const COLUMNS: ColDef[] = [
  { key: 'date',             label: 'Date',        align: 'left',  sortType: 'date',   format: (v) => fmtDate(v as string) },
  { key: 'agreement_type',   label: 'Type',        align: 'left',  sortType: 'string', format: (v) => String(v ?? '') },
  { key: 'exhibit_number',   label: 'Exhibit #',   align: 'left',  sortType: 'string', format: (v) => v ? String(v) : '\u2014' },
  { key: 'description',      label: 'Description', align: 'left',  sortType: 'string', format: (v) => String(v ?? '') },
  { key: 'counterparty',     label: 'Party',       align: 'left',  sortType: 'string', format: (v) => v ? String(v) : '\u2014' },
];

registerSection({
  id: 'agreements',
  title: 'Agreements',
  icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"/>',
  entityTypes: ['company', 'investor'],
  minSize: { minCols: 2, weight: 'wide' },

  async fetch(p: EntityParams): Promise<SectionData> {
    const qps: string[] = [];
    if (p.cik) qps.push('cik=' + encodeURIComponent(p.cik));
    qps.push('limit=50');
    return sectionFetch('/api/v1/sec/agreements?' + qps.join('&'));
  },

  render(container: HTMLElement, data: SectionData): void {
    const err = payloadError(data.payload);
    if (err) { renderError(container, err); return; }
    const allItems = normalizeItems(data.payload) as Record<string, unknown>[];
    if (allItems.length === 0) { renderEmpty(container, 'No agreements found.'); return; }

    for (const row of allItems) {
      if (!row.date && row.filed_at) row.date = row.filed_at;
      if (!row.agreement_type && row.type) row.agreement_type = row.type;
      if (!row.description && row.title) row.description = row.title;
      if (!row.counterparty && row.party) row.counterparty = row.party;
    }

    const types = new Set<string>();
    for (const row of allItems) {
      const t = String(row.agreement_type ?? '').trim();
      if (t) types.add(t);
    }
    const typeList = [...types].sort();

    let activeFilter = 'all';

    const root = document.createElement('div');
    root.className = 'space-y-2';

    // Filter chips
    if (typeList.length > 1) {
      const chipBar = document.createElement('div');
      chipBar.className = 'flex gap-1.5 flex-wrap mb-1';

      const allChip = document.createElement('button');
      allChip.className = 'px-2.5 py-1 text-[11px] rounded-full border transition-colors';
      allChip.textContent = 'All';
      allChip.dataset.filter = 'all';
      chipBar.appendChild(allChip);

      for (const t of typeList.slice(0, 8)) {
        const chip = document.createElement('button');
        chip.className = 'px-2.5 py-1 text-[11px] rounded-full border transition-colors';
        chip.textContent = t.length > 25 ? t.slice(0, 25) + '\u2026' : t;
        chip.title = t;
        chip.dataset.filter = t;
        chipBar.appendChild(chip);
      }
      root.appendChild(chipBar);

      function updateChips(): void {
        chipBar.querySelectorAll('button').forEach(btn => {
          const f = (btn as HTMLButtonElement).dataset.filter;
          const isActive = f === activeFilter;
          (btn as HTMLElement).className = `px-2.5 py-1 text-[11px] rounded-full border transition-colors ${isActive ? 'border-fin-400 bg-fin-400/10 text-fin-400' : 'border-fin-700 text-slate-400 hover:border-fin-500'}`;
        });
      }

      chipBar.addEventListener('click', (ev) => {
        const btn = (ev.target as HTMLElement).closest('button[data-filter]') as HTMLButtonElement | null;
        if (!btn) return;
        activeFilter = btn.dataset.filter!;
        updateChips();
        renderTable();
      });

      updateChips();
    }

    const tableWrap = document.createElement('div');
    root.appendChild(tableWrap);

    function renderTable(): void {
      const items = activeFilter === 'all'
        ? allItems
        : allItems.filter(r => String(r.agreement_type ?? '') === activeFilter);
      if (items.length === 0) {
        tableWrap.innerHTML = '<p class="text-sm text-slate-500 text-center py-4">No agreements for this type.</p>';
        return;
      }
      mountSortableTable(tableWrap, {
        columns: COLUMNS,
        items,
        defaultSortKey: 'date',
        defaultSortDir: -1,
      });
    }

    renderTable();
    container.innerHTML = '';
    container.appendChild(root);
  },
});
