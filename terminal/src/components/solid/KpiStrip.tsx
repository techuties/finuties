/**
 * KpiStrip -- compact row of KPI values inside a single Pod.
 *
 * Replaces the HTML-as-strings kpiStrip() helper. Renders vertically
 * in narrow spans (1-col) or as an inline row in wider spans (2+).
 */
import type { JSX } from 'solid-js';
import { For, splitProps, mergeProps } from 'solid-js';
import Pod from './Pod';

export interface KpiItem {
  label: string;
  value: string;
  color?: string;
}

export interface KpiStripProps {
  items: KpiItem[];
  title?: string;
  span?: 1 | 2 | 3 | 4;
  id?: string;
}

export default function KpiStrip(props: KpiStripProps): JSX.Element {
  const merged = mergeProps({ span: 1 as const }, props);
  const [local] = splitProps(merged, ['items', 'title', 'span', 'id']);

  const isWide = () => local.span >= 2;

  return (
    <Pod span={local.span} compact title={local.title} id={local.id}>
      <div class={isWide() ? 'flex items-center gap-4 flex-wrap' : 'space-y-2'}>
        <For each={local.items}>
          {(item) => (
            <div class={isWide() ? 'flex items-baseline gap-1.5' : ''}>
              <span class="text-[10px] uppercase tracking-wider text-slate-500">
                {item.label}
              </span>
              {isWide() && <span class="text-slate-700">:</span>}
              <span
                class="text-xs font-semibold"
                style={{ color: item.color || '#e2e8f0' }}
              >
                {item.value}
              </span>
            </div>
          )}
        </For>
      </div>
    </Pod>
  );
}
