/**
 * Global page sparkline and timeline chart renderers.
 */
import {
  charts,
  sourceData,
  MAP_SOURCES, MAP_CATEGORIES,
  visibleSources, catColor,
  type EChartsInstance,
} from './state';
import { loadECharts } from '../explore-sections';

// ─── Dispose Helper ──────────────────────────────────────────────

function disposeChart(chart: EChartsInstance | null, ro: ResizeObserver | null): void {
  if (ro) ro.disconnect();
  if (chart) chart.dispose();
}

// ─── Sparkline ───────────────────────────────────────────────────

export async function renderSparkline(): Promise<void> {
  const ec = await loadECharts();
  const el = document.getElementById('sparkline-chart');
  if (!el) return;

  disposeChart(charts.spark, charts.sparkRo);
  charts.spark = ec.init(el, 'dark');
  charts.sparkRo = new ResizeObserver(() => charts.spark?.resize());
  charts.sparkRo.observe(el);

  const vs = visibleSources();
  const byDate = new Map<string, number>();
  for (const src of vs) {
    const dateCol = src.columns.find(c => c.type === 'date');
    if (!dateCol) continue;
    for (const e of sourceData.get(src.id) ?? []) {
      const d = String(e[dateCol.key] ?? '').slice(0, 10);
      if (d.length === 10) byDate.set(d, (byDate.get(d) ?? 0) + 1);
    }
  }

  const sorted = Array.from(byDate.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  if (!sorted.length) return;
  const color = catColor();

  charts.spark.setOption({
    backgroundColor: 'transparent',
    grid: { left: 28, right: 4, top: 4, bottom: 18 },
    xAxis: {
      type: 'category', data: sorted.map(([d]) => d.slice(5)),
      axisLabel: { fontSize: 8, color: '#475569' },
      axisLine: { lineStyle: { color: '#1e293b' } },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#0f172a' } },
      axisLabel: { fontSize: 8, color: '#475569' },
    },
    series: [{
      type: 'line', data: sorted.map(([, v]) => v), smooth: true, symbol: 'none',
      lineStyle: { width: 1.5, color },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: color + '40' },
            { offset: 1, color: color + '05' },
          ],
        },
      },
    }],
    tooltip: {
      trigger: 'axis', backgroundColor: '#0f172a',
      borderColor: '#334155', textStyle: { color: '#e2e8f0', fontSize: 10 },
    },
  });
}

// ─── Timeline ────────────────────────────────────────────────────

export async function renderTimeline(): Promise<void> {
  const ec = await loadECharts();
  const el = document.getElementById('timeline-chart');
  if (!el) return;

  disposeChart(charts.time, charts.timeRo);
  charts.time = ec.init(el, 'dark');
  charts.timeRo = new ResizeObserver(() => charts.time?.resize());
  charts.timeRo.observe(el);

  const byDate = new Map<string, Record<string, number>>();
  const empty = (): Record<string, number> =>
    Object.fromEntries(MAP_CATEGORIES.map(c => [c.id, 0]));

  for (const src of MAP_SOURCES) {
    if (src.placeholder) continue;
    const dateCol = src.columns.find(c => c.type === 'date');
    if (!dateCol) continue;
    for (const e of sourceData.get(src.id) ?? []) {
      const d = String(e[dateCol.key] ?? '').slice(0, 10);
      if (d.length !== 10) continue;
      const cur = byDate.get(d) ?? empty();
      cur[src.category] = (cur[src.category] ?? 0) + 1;
      byDate.set(d, cur);
    }
  }

  const sorted = Array.from(byDate.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  if (!sorted.length) return;

  charts.time.setOption({
    backgroundColor: 'transparent',
    grid: { left: 40, right: 16, top: 18, bottom: 20 },
    xAxis: {
      type: 'category', data: sorted.map(([d]) => d),
      axisLabel: { fontSize: 8, color: '#475569', interval: 'auto' },
      axisLine: { lineStyle: { color: '#1e293b' } },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#0f172a' } },
      axisLabel: { fontSize: 8, color: '#475569' },
    },
    legend: {
      show: true, right: 16, top: 0,
      textStyle: { color: '#64748b', fontSize: 9 },
      itemWidth: 8, itemHeight: 8,
      type: 'scroll',
    },
    tooltip: {
      trigger: 'axis', backgroundColor: '#0f172a',
      borderColor: '#334155', textStyle: { color: '#e2e8f0', fontSize: 10 },
    },
    series: MAP_CATEGORIES.map(cat => ({
      name: cat.shortLabel, type: 'bar' as const, stack: 'events',
      data: sorted.map(([, v]) => v[cat.id] ?? 0),
      itemStyle: { color: cat.color }, barMaxWidth: 6,
    })),
  });
}
