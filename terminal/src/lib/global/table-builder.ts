/**
 * Global page table builder -- renders data table with sort, column merge,
 * and multi-source display support.
 */
import {
  state, dom,
  sourceData,
  visibleSources,
} from './state';
import { primaryColumns, type SourceDef, type ColumnDef } from '../source-registry';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Column Merge ────────────────────────────────────────────────

function mergeColumns(sources: SourceDef[]): ColumnDef[] {
  const seen = new Set<string>();
  const result: ColumnDef[] = [];
  for (const src of sources) {
    for (const col of primaryColumns(src)) {
      if (!seen.has(col.key)) { seen.add(col.key); result.push(col); }
    }
  }
  return result;
}

// ─── Table Sort Delegation ────────────────────────────────────────

let _sortDelegated = false;

function ensureSortDelegation(): void {
  if (_sortDelegated || !dom.tableHead) return;
  _sortDelegated = true;
  dom.tableHead.addEventListener('click', (e) => {
    const th = (e.target as HTMLElement).closest('th') as HTMLElement | null;
    if (!th?.dataset.key) return;
    const key = th.dataset.key;
    if (state.tableSortKey === key) state.tableSortAsc = !state.tableSortAsc;
    else { state.tableSortKey = key; state.tableSortAsc = true; }
    updateTable();
  });
}

// ─── Explorer Link Builder ────────────────────────────────────────

function buildExploreLink(src: SourceDef, row: Record<string, unknown>): string {
  const srcId = src.id;
  const country = row[src.countryField || 'country'] ?? row.country_code ?? row.country ?? '';
  const countryStr = String(country).trim();

  // UCDP / conflict sources → Explorer data view with country filter
  if (srcId.includes('ucdp') || srcId.includes('conflict') || srcId.includes('acled')) {
    if (countryStr) return `/explore?mode=data&source=${encodeURIComponent(srcId)}&country=${encodeURIComponent(countryStr)}`;
    return `/explore?mode=data&source=${encodeURIComponent(srcId)}`;
  }

  // Maritime sources → Explorer data view
  if (srcId.includes('maritime') || srcId.includes('vessel')) {
    return `/explore?mode=data&source=${encodeURIComponent(srcId)}`;
  }

  // Earthquake / nature → Explorer data view
  if (srcId.includes('earthquake') || srcId.includes('gdacs') || srcId.includes('volcano')) {
    if (countryStr) return `/explore?mode=data&source=${encodeURIComponent(srcId)}&country=${encodeURIComponent(countryStr)}`;
    return `/explore?mode=data&source=${encodeURIComponent(srcId)}`;
  }

  // Generic fallback: link to the source in Explorer data mode
  return `/explore?mode=data&source=${encodeURIComponent(srcId)}`;
}

// ─── Update Table ────────────────────────────────────────────────

export function updateTable(): void {
  const { tableHead, tableBody, tableEmpty } = dom;
  if (!tableHead || !tableBody || !tableEmpty) return;

  // Performance: skip expensive table construction while hidden in pure map mode.
  // applyViewMode() triggers updateTable() when table becomes visible again.
  if (state.viewMode === 'map') return;

  ensureSortDelegation();

  const vs = visibleSources();
  const allData: { src: SourceDef; row: Record<string, unknown> }[] = [];
  for (const src of vs) {
    for (const row of sourceData.get(src.id) ?? []) {
      allData.push({ src, row });
    }
  }

  if (!allData.length) {
    tableHead.innerHTML = '';
    tableBody.innerHTML = '';
    tableEmpty.style.display = 'block';
    return;
  }
  tableEmpty.style.display = 'none';

  let columns: (ColumnDef & { srcId?: string })[];
  if (vs.length === 1) {
    columns = vs[0].columns;
  } else {
    columns = [{ key: '_source', label: 'Source', type: 'badge' as const }, ...mergeColumns(vs)];
  }

  if (state.tableSortKey) {
    allData.sort((a, b) => {
      const va = state.tableSortKey === '_source' ? a.src.shortLabel : a.row[state.tableSortKey];
      const vb = state.tableSortKey === '_source' ? b.src.shortLabel : b.row[state.tableSortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      const na = Number(va), nb = Number(vb);
      if (!isNaN(na) && !isNaN(nb)) return state.tableSortAsc ? na - nb : nb - na;
      return state.tableSortAsc
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
  }

  tableHead.innerHTML = '<tr>' + columns.map(col =>
    `<th data-key="${col.key}" class="${state.tableSortKey === col.key ? 'sorted' : ''}">${esc(col.label)}${col.unit ? ' <span class="text-slate-600">(' + esc(col.unit) + ')</span>' : ''} <span class="sort-icon">${state.tableSortKey === col.key ? (state.tableSortAsc ? '\u25B2' : '\u25BC') : '\u21C5'}</span></th>`,
  ).join('') + '</tr>';

  // Add an "Explore" link column
  columns = [...columns, { key: '_explore', label: '', type: 'string' as const }];

  const maxRows = Math.min(allData.length, 500);
  let html = '';
  for (let i = 0; i < maxRows; i++) {
    const { src, row } = allData[i];
    html += '<tr>';
    for (const col of columns) {
      if (col.key === '_explore') {
        const exploreHref = buildExploreLink(src, row);
        html += exploreHref
          ? `<td><a href="${esc(exploreHref)}" class="text-fin-400 hover:underline text-[10px] whitespace-nowrap" title="Open in Explorer">\u2197</a></td>`
          : '<td></td>';
        continue;
      }
      const val = col.key === '_source' ? src.shortLabel : row[col.key];
      let cell: string;
      if (val == null || val === '') cell = '<span class="text-slate-700">\u2014</span>';
      else if (col.type === 'date') cell = esc(String(val).slice(0, 16).replace('T', ' '));
      else if (col.type === 'number') cell = Number(val).toLocaleString('en-US');
      else if (col.type === 'badge') cell = `<span class="badge" style="background:${src.color}20;color:${src.color}">${esc(String(val))}</span>`;
      else cell = esc(String(val));
      html += `<td>${cell}</td>`;
    }
    html += '</tr>';
  }
  if (allData.length > 500) {
    html += `<tr><td colspan="${columns.length}" class="text-center text-slate-600 py-2 text-[10px]">Showing 500 of ${allData.length.toLocaleString()} rows</td></tr>`;
  }
  tableBody.innerHTML = html;
}
