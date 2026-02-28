/**
 * Kpi — single key-performance-indicator card.
 *
 * Replaces the HTML-as-strings `kpi()` helper with a type-safe SolidJS
 * component. Supports an optional trend indicator.
 */
import type { JSX } from 'solid-js';
import { Show, splitProps, mergeProps } from 'solid-js';

export interface KpiProps {
  /** Metric label (e.g. "Population"). */
  label: string;
  /** Formatted value string (e.g. "1.4B"). */
  value: string;
  /** Accent colour for the value (CSS colour string). */
  color?: string;
  /** Optional trend: positive = green arrow up, negative = red arrow down. */
  trend?: number;
  /** Optional unit suffix (e.g. "USD", "%"). */
  unit?: string;
}

export default function Kpi(props: KpiProps): JSX.Element {
  const merged = mergeProps({ color: '#e2e8f0' }, props);
  const [local] = splitProps(merged, ['label', 'value', 'color', 'trend', 'unit']);

  return (
    <div class="rounded-xl border border-fin-800 bg-fin-900/80 p-3">
      <p class="text-[10px] uppercase tracking-wider text-slate-500">{local.label}</p>
      <div class="flex items-baseline gap-1.5 mt-0.5">
        <p class="text-sm font-semibold" style={{ color: local.color }}>
          {local.value}
        </p>
        <Show when={local.unit}>
          <span class="text-[10px] text-slate-500">{local.unit}</span>
        </Show>
        <Show when={typeof local.trend === 'number' && local.trend !== 0}>
          <span
            class={`text-[10px] font-medium ${
              (local.trend ?? 0) > 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {(local.trend ?? 0) > 0 ? '\u25B2' : '\u25BC'}{' '}
            {Math.abs(local.trend ?? 0).toFixed(1)}%
          </span>
        </Show>
      </div>
    </div>
  );
}
