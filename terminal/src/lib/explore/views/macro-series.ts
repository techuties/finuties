/**
 * Macro Series -- pod-grid view for rates and macro time-series sources.
 */
import {
  podGrid, pod, kpiStrip, miniTable, esc, spinnerHtml, errorHtml, badgeCls,
  type RenderContext,
} from '../layout';
import { fetchSource } from '../../global-data-api';
import { SOURCE_MAP, sourcesForCategory } from '../../source-registry';

export async function renderMacroSeries(ctx: RenderContext): Promise<void> {
  const sourceId = ctx.params.get('source') || '';
  const src = SOURCE_MAP.get(sourceId);
  if (!src) { ctx.sectionsGrid.innerHTML = errorHtml('Unknown source: ' + sourceId); return; }

  ctx.typeBadge.textContent = 'Data';
  ctx.typeBadge.className = badgeCls('bg-blue-500/20 text-blue-400');
  ctx.nameEl.textContent = src.label;
  ctx.subEl.textContent = src.description;
  ctx.updateBreadcrumbs(src.shortLabel, 'data');
  ctx.sectionsGrid.innerHTML = spinnerHtml('Loading ' + src.shortLabel + '...');

  try {
    const params: Record<string, string | number> = { limit: src.defaultLimit || 100 };
    for (const [k, v] of ctx.params.entries()) {
      if (!['type', 'mode', 'source', 'category'].includes(k) && v) params[k] = v;
    }

    const res = await fetchSource(src.endpoint, params);
    const rows = res.data || [];
    const pods: string[] = [];

    // KPIs
    const numCols = src.columns.filter((c) => c.type === 'number');
    const kpis: { label: string; value: string | number }[] = [{ label: 'Records', value: rows.length }];
    for (const col of numCols.slice(0, 3)) {
      const vals = rows.map((r) => Number(r[col.key])).filter((n) => !isNaN(n));
      if (vals.length > 0) {
        const last = vals[0];
        kpis.push({ label: col.label, value: typeof last === 'number' ? last.toFixed(2) : String(last) });
      }
    }
    pods.push(kpiStrip(kpis, { span: 4 }));

    // Chart
    const dateCol = src.columns.find((c) => c.type === 'date' || c.key === 'year' || c.key === 'date');
    const valCol = numCols[0];
    if (dateCol && valCol && rows.length > 1) {
      const chartId = 'macro-chart-' + src.id;
      pods.push(pod('<div id="' + chartId + '" style="width:100%;height:280px"></div>', { span: 3, title: src.shortLabel + ' Trend' }));
      requestAnimationFrame(() => {
        import('echarts').then((echarts) => {
          const el = document.getElementById(chartId);
          if (!el) return;
          const chart = echarts.init(el);
          const sorted = [...rows].sort((a, b) => String(a[dateCol.key]).localeCompare(String(b[dateCol.key])));
          chart.setOption({
            tooltip: { trigger: 'axis' },
            grid: { left: 60, right: 20, top: 20, bottom: 30 },
            xAxis: { type: 'category', data: sorted.map((r) => String(r[dateCol.key])), axisLabel: { fontSize: 10, color: '#94a3b8' } },
            yAxis: { type: 'value', axisLabel: { fontSize: 10, color: '#94a3b8' }, splitLine: { lineStyle: { color: '#1e293b' } } },
            series: [{ type: 'line', data: sorted.map((r) => Number(r[valCol.key]) || 0), smooth: true, lineStyle: { color: src.color }, itemStyle: { color: src.color } }],
          });
          const onResize = () => { if (el.isConnected) chart.resize(); else window.removeEventListener('resize', onResize); };
          window.addEventListener('resize', onResize);
        }).catch(() => {});
      });
    }

    // Data table
    const tableCols = src.columns.filter((c) => !c.secondary).slice(0, 6);
    pods.push(miniTable(
      rows, tableCols.map((c) => ({ key: c.key, label: c.label, type: c.type })),
      { title: 'Data', span: dateCol && valCol && rows.length > 1 ? 1 : 4, maxRows: 15 },
    ));

    ctx.sectionsGrid.innerHTML = podGrid(pods);
  } catch (err) {
    ctx.sectionsGrid.innerHTML = errorHtml('Failed to load ' + src.shortLabel, err);
  }
}
