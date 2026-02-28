/**
 * Skeleton -- loading placeholder with pulse animation.
 *
 * Replaces the spinnerHtml() / skeleton string builders with a
 * composable SolidJS component.
 */
import type { JSX } from 'solid-js';
import { splitProps, mergeProps, Show } from 'solid-js';

export interface SkeletonProps {
  /** Number of skeleton rows. Default: 3. */
  rows?: number;
  /** Show a chart-size block above the rows. */
  chart?: boolean;
  /** Show KPI strip blocks. */
  kpis?: number;
  /** Optional label shown above the skeleton. */
  label?: string;
}

export default function Skeleton(props: SkeletonProps): JSX.Element {
  const merged = mergeProps({ rows: 3, chart: false, kpis: 0, label: '' }, props);
  const [local] = splitProps(merged, ['rows', 'chart', 'kpis', 'label']);

  return (
    <div class="space-y-3 animate-pulse py-4">
      <Show when={local.label}>
        <p class="text-xs text-slate-500 text-center">{local.label}</p>
      </Show>
      <Show when={local.kpis > 0}>
        <div class="grid grid-cols-4 gap-3">
          {Array.from({ length: local.kpis }, (_, i) => (
            <div class="h-10 rounded-lg bg-fin-800/40" />
          ))}
        </div>
      </Show>
      <Show when={local.chart}>
        <div class="h-48 rounded-lg bg-fin-800/30" />
      </Show>
      {Array.from({ length: local.rows }, (_, i) => (
        <div
          class="h-3 rounded bg-fin-800/40"
          style={{ width: `${100 - i * 12}%` }}
        />
      ))}
    </div>
  );
}
