/**
 * Chart -- reactive ECharts wrapper for SolidJS.
 *
 * Handles init, dispose, resize, and dark-theme automatically.
 * Replaces the scattered manual ECharts lifecycle across view modules.
 *
 * Usage:
 *   <Chart option={myOption} height="300px" />
 */
import { onMount, onCleanup, createEffect, splitProps, mergeProps } from 'solid-js';
import type { JSX } from 'solid-js';

export interface ChartProps {
  /** ECharts option object (reactive -- chart updates when this changes). */
  option: Record<string, unknown> | null;
  /** CSS height string. Default: '300px'. */
  height?: string;
  /** CSS width string. Default: '100%'. */
  width?: string;
  /** DOM id for imperative access. */
  id?: string;
  /** Additional CSS classes. */
  class?: string;
  /** If true, shows a loading spinner while option is null. */
  loading?: boolean;
}

export default function Chart(props: ChartProps): JSX.Element {
  const merged = mergeProps({ height: '300px', width: '100%', loading: false }, props);
  const [local] = splitProps(merged, ['option', 'height', 'width', 'id', 'class', 'loading']);

  let containerRef!: HTMLDivElement;
  let chartInstance: ReturnType<typeof import('echarts/core')['init']> | null = null;
  let resizeObserver: ResizeObserver | null = null;

  onMount(async () => {
    try {
      const ec = await import('echarts/core');
      const { LineChart, BarChart, ScatterChart, PieChart } = await import('echarts/charts');
      const {
        GridComponent,
        TooltipComponent,
        LegendComponent,
        GeoComponent,
        DataZoomComponent,
        VisualMapComponent,
      } = await import('echarts/components');
      const { CanvasRenderer } = await import('echarts/renderers');

      ec.use([
        LineChart, BarChart, ScatterChart, PieChart,
        GridComponent, TooltipComponent, LegendComponent,
        GeoComponent, DataZoomComponent, VisualMapComponent,
        CanvasRenderer,
      ]);

      chartInstance = ec.init(containerRef, 'dark');
      if (local.option) chartInstance.setOption(local.option);

      resizeObserver = new ResizeObserver(() => chartInstance?.resize());
      resizeObserver.observe(containerRef);
    } catch (err) {
      console.warn('[Chart] ECharts init failed:', err);
    }
  });

  createEffect(() => {
    const opt = local.option;
    if (chartInstance && opt) {
      chartInstance.setOption(opt, { notMerge: false, lazyUpdate: true });
    }
  });

  onCleanup(() => {
    resizeObserver?.disconnect();
    chartInstance?.dispose();
    chartInstance = null;
  });

  return (
    <div
      ref={containerRef}
      id={local.id}
      class={local.class}
      style={{ height: local.height, width: local.width }}
    />
  );
}
