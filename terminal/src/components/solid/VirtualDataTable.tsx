/**
 * VirtualDataTable -- TanStack Table + Virtual for large datasets.
 *
 * Provides sorting, filtering, column visibility, and virtual scrolling.
 * Use for datasets with 100+ rows; for small preview tables use MiniTable.
 */
import {
  createSignal, createMemo, For, Show, onMount,
} from 'solid-js';
import type { JSX } from 'solid-js';
import {
  createSolidTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/solid-table';
import type { ColumnDef, SortingState, ColumnFiltersState } from '@tanstack/solid-table';
import { createVirtualizer } from '@tanstack/solid-virtual';

/* ── Types ──────────────────────────────────────────────────────── */

export interface VirtualColumnDef {
  key: string;
  label: string;
  type: 'date' | 'number' | 'string' | 'badge';
  unit?: string;
}

export interface VirtualDataTableProps {
  columns: VirtualColumnDef[];
  rows: Record<string, unknown>[];
  /** Max visible height in px (default: 400). */
  height?: number;
  /** Row height in px (default: 32). */
  rowHeight?: number;
  /** Show a global filter input. */
  filterable?: boolean;
  /** Enable CSV download button. */
  downloadable?: boolean;
  /** CSS class for the wrapper. */
  class?: string;
}

/* ── Formatters ──────────────────────────────────────────────────── */

function formatCell(type: string, val: unknown): string {
  if (val == null || val === '') return '\u2014';
  if (type === 'number') {
    const n = Number(val);
    return isNaN(n) ? String(val) : n.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }
  if (type === 'date') return String(val).slice(0, 10);
  return String(val);
}

/* ── Component ──────────────────────────────────────────────────── */

export default function VirtualDataTable(props: VirtualDataTableProps): JSX.Element {
  const maxHeight = () => props.height ?? 400;
  const rowHeight = () => props.rowHeight ?? 32;

  const [sorting, setSorting] = createSignal<SortingState>([]);
  const [globalFilter, setGlobalFilter] = createSignal('');

  /* Build TanStack column definitions from our simple column defs */
  const tanstackColumns = createMemo<ColumnDef<Record<string, unknown>>[]>(() =>
    props.columns.map((col) => ({
      id: col.key,
      accessorFn: (row: Record<string, unknown>) => row[col.key],
      header: col.label,
      cell: (info) => formatCell(col.type, info.getValue()),
      sortingFn:
        col.type === 'number'
          ? (rowA, rowB, columnId) => {
              const a = Number(rowA.getValue(columnId));
              const b = Number(rowB.getValue(columnId));
              return (isNaN(a) ? -Infinity : a) - (isNaN(b) ? -Infinity : b);
            }
          : 'alphanumeric',
      meta: { type: col.type },
    })),
  );

  const table = createSolidTable({
    get data() { return props.rows; },
    get columns() { return tanstackColumns(); },
    state: {
      get sorting() { return sorting(); },
      get globalFilter() { return globalFilter(); },
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  /* Virtual scroller */
  let scrollRef!: HTMLDivElement;

  const virtualizer = createVirtualizer({
    get count() { return table.getRowModel().rows.length; },
    getScrollElement: () => scrollRef,
    estimateSize: () => rowHeight(),
    overscan: 10,
  });

  /* CSV download */
  function downloadCsv() {
    const header = props.columns.map((c) => c.label).join(',');
    const body = props.rows
      .map((row) =>
        props.columns
          .map((c) => {
            const val = row[c.key];
            const str = val == null ? '' : String(val);
            return str.includes(',') || str.includes('"')
              ? `"${str.replace(/"/g, '""')}"`
              : str;
          })
          .join(','),
      )
      .join('\n');
    const blob = new Blob([header + '\n' + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div class={props.class || ''}>
      {/* Toolbar */}
      <div class="flex items-center gap-2 mb-2">
        <Show when={props.filterable}>
          <input
            type="text"
            placeholder="Filter..."
            value={globalFilter()}
            onInput={(e) => setGlobalFilter(e.currentTarget.value)}
            class="rounded-lg bg-fin-800/60 border border-fin-700/50 px-2 py-1 text-[10px] text-slate-200 placeholder-slate-600 focus:border-fin-500 focus:outline-none w-40"
          />
        </Show>
        <span class="text-[10px] text-slate-500 ml-auto">
          {table.getRowModel().rows.length.toLocaleString()} rows
        </span>
        <Show when={props.downloadable}>
          <button
            type="button"
            onClick={downloadCsv}
            class="text-[10px] text-fin-400 hover:text-fin-300 transition-colors"
          >
            CSV
          </button>
        </Show>
      </div>

      {/* Virtual table */}
      <div
        ref={scrollRef}
        class="overflow-auto border border-fin-800/50 rounded-lg"
        style={{ height: `${maxHeight()}px` }}
      >
        <table class="w-full text-[11px]" style={{ height: `${virtualizer.getTotalSize()}px` }}>
          <thead class="sticky top-0 z-10 bg-fin-900">
            <For each={table.getHeaderGroups()}>
              {(hg) => (
                <tr>
                  <For each={hg.headers}>
                    {(header) => (
                      <th
                        class="px-2 py-1.5 text-left text-[9px] uppercase tracking-wider text-slate-600 font-medium whitespace-nowrap cursor-pointer hover:text-slate-400 transition-colors select-none"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                        <Show when={header.column.getIsSorted()}>
                          <span class="ml-0.5">
                            {header.column.getIsSorted() === 'asc' ? '\u25B4' : '\u25BE'}
                          </span>
                        </Show>
                      </th>
                    )}
                  </For>
                </tr>
              )}
            </For>
          </thead>
          <tbody>
            <For each={virtualizer.getVirtualItems()}>
              {(virtualRow) => {
                const row = table.getRowModel().rows[virtualRow.index];
                return (
                  <tr
                    class="border-t border-fin-800/30 hover:bg-fin-800/20 transition-colors"
                    style={{
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start - virtualizer.getVirtualItems()[0]?.start ?? 0}px)`,
                    }}
                  >
                    <For each={row.getVisibleCells()}>
                      {(cell) => {
                        const meta = cell.column.columnDef.meta as { type: string } | undefined;
                        const isNumber = meta?.type === 'number';
                        const isBadge = meta?.type === 'badge';
                        return (
                          <td
                            class={`px-2 py-1 whitespace-nowrap ${
                              isNumber ? 'text-slate-300 tabular-nums' : 'text-slate-400 truncate max-w-[160px]'
                            }`}
                          >
                            <Show
                              when={isBadge && cell.getValue() != null && cell.getValue() !== ''}
                              fallback={flexRender(cell.column.columnDef.cell, cell.getContext())}
                            >
                              <span class="inline-block rounded-full px-1.5 py-0.5 text-[9px] font-medium bg-fin-700/40 text-slate-300">
                                {String(cell.getValue())}
                              </span>
                            </Show>
                          </td>
                        );
                      }}
                    </For>
                  </tr>
                );
              }}
            </For>
          </tbody>
        </table>
      </div>
    </div>
  );
}
