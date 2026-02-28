/**
 * Shared sortable table infrastructure for explore section cards.
 * Provides column definitions, comparator, and thead/tbody renderers
 * with clickable column header sorting.
 */
import { esc } from '../explore-sections';

/* ── Column definition ─────────────────────────────────────────────────── */

export interface ColDef {
  key: string;
  label: string;
  align: 'left' | 'right';
  sortType: 'string' | 'number' | 'date';
  format: (v: unknown) => string;
}

/* ── Sort comparator ───────────────────────────────────────────────────── */

export function comparator(col: ColDef, dir: 1 | -1): (a: Record<string, unknown>, b: Record<string, unknown>) => number {
  const k = col.key;
  return (a, b) => {
    const av = a[k], bv = b[k];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    let cmp = 0;
    if (col.sortType === 'number') {
      cmp = (Number(av) || 0) - (Number(bv) || 0);
    } else if (col.sortType === 'date') {
      cmp = String(av).localeCompare(String(bv));
    } else {
      cmp = String(av).localeCompare(String(bv), undefined, { sensitivity: 'base' });
    }
    return cmp * dir;
  };
}

/* ── Formatting helpers ────────────────────────────────────────────────── */

export function fmtNumber(n: number | undefined | null): string {
  if (n == null || isNaN(n)) return '\u2014';
  return n.toLocaleString('en-US');
}

/* ── Render helpers ────────────────────────────────────────────────────── */

const TH_CLS = 'px-2 py-1.5 text-[10px] text-slate-500 select-none cursor-pointer hover:text-slate-300 transition-colors whitespace-nowrap';
const TD_CLS = 'px-2 py-1.5';

export function renderThead(columns: ColDef[], sortKey: string, sortDir: 1 | -1): string {
  let html = '<thead><tr class="border-b border-fin-800">';
  for (const col of columns) {
    const active = col.key === sortKey;
    const arrow = active ? (sortDir === 1 ? ' \u25B2' : ' \u25BC') : '';
    const alignCls = col.align === 'right' ? ' text-right' : '';
    const activeCls = active ? ' text-slate-300' : '';
    html += `<th class="${TH_CLS}${alignCls}${activeCls}" data-sort-key="${col.key}">${esc(col.label)}${arrow}</th>`;
  }
  html += '</tr></thead>';
  return html;
}

export { TD_CLS };

export function renderTbody(columns: ColDef[], items: Record<string, unknown>[], cellRenderer?: (col: ColDef, row: Record<string, unknown>) => string | null): string {
  let html = '<tbody>';
  for (const row of items) {
    html += '<tr class="border-b border-fin-800/40 hover:bg-fin-800/30">';
    for (const col of columns) {
      const custom = cellRenderer ? cellRenderer(col, row) : null;
      if (custom !== null && custom !== undefined) {
        html += custom;
      } else {
        const alignCls = col.align === 'right' ? ' text-right' : '';
        const monoCls = col.sortType === 'number' ? ' font-mono text-slate-300' : ' text-slate-400';
        html += `<td class="${TD_CLS}${alignCls}${monoCls}">${esc(col.format(row[col.key]))}</td>`;
      }
    }
    html += '</tr>';
  }
  html += '</tbody>';
  return html;
}

/* ── Full sortable table wiring ────────────────────────────────────────── */

export interface SortableTableOpts {
  columns: ColDef[];
  items: Record<string, unknown>[];
  defaultSortKey: string;
  defaultSortDir?: 1 | -1;
  cellRenderer?: (col: ColDef, row: Record<string, unknown>) => string | null;
}

/**
 * Create a fully wired sortable table and append it to `container`.
 * Returns the table element for further manipulation.
 */
export function mountSortableTable(container: HTMLElement, opts: SortableTableOpts): HTMLTableElement {
  const { columns, items, defaultSortKey, defaultSortDir, cellRenderer } = opts;
  let sortKey = defaultSortKey;
  let sortDir: 1 | -1 = defaultSortDir ?? -1;

  const sorted = [...items];
  const col0 = columns.find(c => c.key === sortKey);
  if (col0) sorted.sort(comparator(col0, sortDir));

  const wrapper = document.createElement('div');
  wrapper.className = 'overflow-x-auto';
  const table = document.createElement('table');
  table.className = 'w-full text-left text-xs';

  function redraw(): void {
    table.innerHTML = renderThead(columns, sortKey, sortDir) + renderTbody(columns, sorted, cellRenderer);
  }

  table.addEventListener('click', (e) => {
    const th = (e.target as HTMLElement).closest('th[data-sort-key]') as HTMLElement | null;
    if (!th) return;
    const key = th.dataset.sortKey!;
    if (key === sortKey) {
      sortDir = sortDir === 1 ? -1 : 1;
    } else {
      sortKey = key;
      const c = columns.find(cc => cc.key === key)!;
      sortDir = c.sortType === 'number' || c.sortType === 'date' ? -1 : 1;
    }
    sorted.sort(comparator(columns.find(cc => cc.key === sortKey)!, sortDir));
    redraw();
  });

  redraw();
  wrapper.appendChild(table);
  container.innerHTML = '';
  container.appendChild(wrapper);
  return table;
}
