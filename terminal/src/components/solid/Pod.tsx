/**
 * Pod — the universal card wrapper for the Explorer pod grid.
 *
 * Replaces the HTML-as-strings `pod()` helper from layout.ts with a
 * type-safe, reactive SolidJS component.
 */
import type { JSX, ParentProps } from 'solid-js';
import { splitProps, mergeProps } from 'solid-js';

export interface PodProps {
  /** Column span (1-4). Responsive: collapses on small screens. */
  span?: 1 | 2 | 3 | 4;
  /** Optional title shown as a header bar. */
  title?: string;
  /** Compact mode — reduced padding. */
  compact?: boolean;
  /** DOM id for imperative references. */
  id?: string;
  /** Additional CSS classes. */
  class?: string;
}

const SPAN_CLASS: Record<number, string> = {
  1: '',
  2: 'pod-span-2',
  3: 'pod-span-3',
  4: 'pod-span-4',
};

export default function Pod(props: ParentProps<PodProps>): JSX.Element {
  const merged = mergeProps({ span: 1 as const, compact: false }, props);
  const [local, rest] = splitProps(merged, ['span', 'title', 'compact', 'id', 'class', 'children']);

  return (
    <div
      id={local.id}
      class={`rounded-xl border border-fin-800 bg-fin-900/80 backdrop-blur shadow-sm overflow-hidden ${SPAN_CLASS[local.span] || ''} ${local.class || ''}`}
    >
      {local.title && (
        <div class="px-3 py-2 border-b border-fin-800 flex items-center gap-2">
          <span class="text-xs font-semibold text-slate-200">{local.title}</span>
        </div>
      )}
      <div class={local.compact ? 'px-3 py-2' : 'px-4 py-3'}>{local.children}</div>
    </div>
  );
}
