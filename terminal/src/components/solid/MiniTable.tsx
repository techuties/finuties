/**
 * MiniTable -- compact data table with sorting.
 *
 * Replaces the miniTable() / previewTable() HTML string helpers
 * with a reactive SolidJS table that supports click-to-sort headers.
 */
import { createSignal, createMemo, For, Show } from 'solid-js';
import type { JSX } from 'solid-js';

/* ── Types ──────────────────────────────────────────────────────── */

export interface MiniTableColumn {
  key: string;
  label: string;
  type: 'date' | 'number' | 'string' | 'badge';
  unit?: string;
}

export interface MiniTableProps {
  columns: MiniTableColumn[];
  rows: Record<string, unknown>[];
  /** Max rows to display (default: 50). */
  maxRows?: number;
  /** If true, shows a "Load more" button when rows exceed maxRows. */
  loadMore?: boolean;
  /** CSS class for the wrapper. */
  class?: string;
}

/* ── Formatters ──────────────────────────────────────────────────── */

function formatCell(col: MiniTableColumn, val: unknown): string {
  if (val == null || val === '') return '\u2014';
  if (col.type === 'number') {
    const n = Number(val);
    return isNaN(n) ? String(val) : n.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }
  if (col.type === 'date') return String(val).slice(0, 10);
  return String(val);
}

function cellClass(type: string): string {
  if (type === 'number') return 'text-slate-300 tabular-nums';
  if (type === 'date') return 'text-slate-400';
  return 'text-slate-400 truncate max-w-[160px]';
}

/* ── Component ──────────────────────────────────────────────────── */

export default function MiniTable(props: MiniTableProps): JSX.Element {
  const maxRows = () => props.maxRows ?? 50;
  const [showAll, setShowAll] = createSignal(false);
  const [sortKey, setSortKey] = createSignal<string>('');
  const [sortAsc, setSortAsc] = createSignal(true);

  const sortedRows = createMemo(() => {
    const key = sortKey();
    if (!key) return props.rows;
    const col = props.columns.find((c) => c.key === key);
    const dir = sortAsc() ? 1 : -1;
    return [...props.rows].sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      if (av == null && bv == null) return 0;
      if (av == null) return dir;
      if (bv == null) return -dir;
      if (col?.type === 'number') return (Number(av) - Number(bv)) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  });

  const visibleRows = createMemo(() => {
    const all = sortedRows();
    if (showAll() || all.length <= maxRows()) return all;
    return all.slice(0, maxRows());
  });

  const hasMore = createMemo(
    () => props.loadMore !== false && sortedRows().length > maxRows() && !showAll(),
  );

  function handleSort(key: string) {
    if (sortKey() === key) {
      setSortAsc(!sortAsc());
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  return (
    <div class={`overflow-x-auto ${props.class || ''}`}>
      <table class="w-full text-[11px]">
        <thead>
          <tr>
            <For each={props.columns}>
              {(col) => (
                <th
                  class="px-2 py-1.5 text-left text-[9px] uppercase tracking-wider text-slate-600 font-medium whitespace-nowrap cursor-pointer hover:text-slate-400 transition-colors select-none"
                  onClick={() => handleSort(col.key)}
                >
                  {col.label}
                  <Show when={sortKey() === col.key}>
                    <span class="ml-0.5">{sortAsc() ? '\u25B4' : '\u25BE'}</span>
                  </Show>
                </th>
              )}
            </For>
          </tr>
        </thead>
        <tbody>
          <For each={visibleRows()}>
            {(row) => (
              <tr class="border-t border-fin-800/30 hover:bg-fin-800/20 transition-colors">
                <For each={props.columns}>
                  {(col) => {
                    const val = row[col.key];
                    return (
                      <td class={`px-2 py-1 whitespace-nowrap ${cellClass(col.type)}`}>
                        <Show
                          when={col.type === 'badge' && val != null && val !== ''}
                          fallback={formatCell(col, val)}
                        >
                          <span class="inline-block rounded-full px-1.5 py-0.5 text-[9px] font-medium bg-fin-700/40 text-slate-300">
                            {String(val)}
                          </span>
                        </Show>
                      </td>
                    );
                  }}
                </For>
              </tr>
            )}
          </For>
        </tbody>
      </table>
      <Show when={hasMore()}>
        <div class="pt-2 text-center">
          <button
            type="button"
            class="text-[10px] text-fin-400 hover:text-fin-300 transition-colors"
            onClick={() => setShowAll(true)}
          >
            Show all {sortedRows().length} rows
          </button>
        </div>
      </Show>
    </div>
  );
}
