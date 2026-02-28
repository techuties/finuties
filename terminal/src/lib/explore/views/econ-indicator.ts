/**
 * Economic Indicator -- pod-grid view for a single indicator series.
 */
import {
  podGrid, pod, kpiStrip, miniTable, esc, spinnerHtml, errorHtml, badgeCls,
  type RenderContext,
} from '../layout';
import { apiFetch } from '../../api-client';

interface IndicatorRow {
  date?: string;
  year?: number;
  value?: number;
  country?: string;
  unit?: string;
}

export async function renderEconIndicator(ctx: RenderContext): Promise<void> {
  const indicator = ctx.params.get('indicator') || '';
  const name = ctx.params.get('name') || indicator;

  ctx.typeBadge.textContent = 'Indicator';
  ctx.typeBadge.className = badgeCls('bg-cyan-500/20 text-cyan-400');
  ctx.nameEl.textContent = name;
  ctx.subEl.textContent = 'Economic indicator';
  ctx.updateBreadcrumbs(name, 'econ');
  ctx.sectionsGrid.innerHTML = spinnerHtml('Loading indicator data...');

  try {
    const res = await apiFetch<{ items: IndicatorRow[] }>(
      '/api/v1/data/economy/indicators?indicator=' + encodeURIComponent(indicator) + '&limit=100',
    );
    const items = res.ok && res.data?.items ? res.data.items : [];
    const pods: string[] = [];

    if (items.length === 0) {
      ctx.sectionsGrid.innerHTML = errorHtml('No data found for indicator: ' + indicator);
      return;
    }

    // KPIs
    const vals = items.map((r) => r.value).filter((v): v is number => v != null && !isNaN(v));
    const latest = vals[0];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;

    pods.push(kpiStrip([
      { label: 'Latest', value: latest?.toFixed(2) ?? '\u2014' },
      { label: 'Min', value: min.toFixed(2) },
      { label: 'Max', value: max.toFixed(2) },
      { label: 'Average', value: avg.toFixed(2) },
      { label: 'Records', value: items.length },
    ], { span: 4 }));

    // Chart
    const chartId = 'econ-chart-' + indicator.replace(/[^a-z0-9]/gi, '');
    pods.push(pod('<div id="' + chartId + '" style="width:100%;height:280px"></div>', { span: 3, title: name }));
    requestAnimationFrame(() => {
      import('echarts').then((echarts) => {
        const el = document.getElementById(chartId);
        if (!el) return;
        const chart = echarts.init(el);
        const sorted = [...items].sort((a, b) => String(a.date || a.year || '').localeCompare(String(b.date || b.year || '')));
        chart.setOption({
          tooltip: { trigger: 'axis' },
          grid: { left: 60, right: 20, top: 20, bottom: 30 },
          xAxis: { type: 'category', data: sorted.map((r) => String(r.date || r.year || '')), axisLabel: { fontSize: 10, color: '#94a3b8' } },
          yAxis: { type: 'value', axisLabel: { fontSize: 10, color: '#94a3b8' }, splitLine: { lineStyle: { color: '#1e293b' } } },
          series: [{ type: 'line', data: sorted.map((r) => r.value ?? null), smooth: true, lineStyle: { color: '#06b6d4' }, itemStyle: { color: '#06b6d4' }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#06b6d440' }, { offset: 1, color: '#06b6d405' }] } } }],
        });
        const onResize = () => { if (el.isConnected) chart.resize(); else window.removeEventListener('resize', onResize); };
        window.addEventListener('resize', onResize);
      }).catch(() => {});
    });

    // Data table
    pods.push(miniTable(
      items as Record<string, unknown>[],
      [
        { key: 'date', label: 'Date' },
        { key: 'value', label: 'Value', type: 'number' },
        { key: 'country', label: 'Country' },
        { key: 'unit', label: 'Unit' },
      ],
      { title: 'Data', span: 1, maxRows: 15 },
    ));

    ctx.sectionsGrid.innerHTML = podGrid(pods);
  } catch (err) {
    ctx.sectionsGrid.innerHTML = errorHtml('Failed to load indicator', err);
  }
}
