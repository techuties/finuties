/**
 * Source Detail -- pod-grid view for a single data source.
 *
 * Shows KPIs, a chart, a data table, and related sources.
 */
import {
  podGrid, pod, kpiStrip, miniTable, esc, spinnerHtml, errorHtml, badgeCls,
  type RenderContext,
} from '../layout';
import { fetchSource } from '../../global-data-api';
import {
  SOURCE_MAP, CATEGORY_MAP, sourcesForCategory,
  type SourceDef,
} from '../../source-registry';

export async function renderSourceDetail(ctx: RenderContext): Promise<void> {
  const sourceId = ctx.params.get('source') || '';
  const country = ctx.params.get('country') || '';
  const src = SOURCE_MAP.get(sourceId);
  if (!src) {
    ctx.sectionsGrid.innerHTML = errorHtml('Unknown data source: ' + sourceId);
    return;
  }

  ctx.typeBadge.textContent = 'Data';
  ctx.typeBadge.className = badgeCls('bg-pink-500/20 text-pink-400');
  ctx.nameEl.textContent = src.label;
  ctx.subEl.textContent = src.description;
  ctx.updateBreadcrumbs(src.shortLabel, 'data');
  ctx.sectionsGrid.innerHTML = spinnerHtml('Loading ' + src.shortLabel + '...');

  try {
    const params: Record<string, string | number> = { limit: src.defaultLimit || 50 };
    if (country) {
      if (src.countryField) params[src.countryField] = country;
      else params.country = country;
    }
    // Forward any extra filter params
    for (const [k, v] of ctx.params.entries()) {
      if (!['type', 'mode', 'source', 'country', 'category'].includes(k) && v) params[k] = v;
    }

    const res = await fetchSource(src.endpoint, params);
    const rows = res.data || [];
    const pods: string[] = [];

    // KPIs
    const numCols = src.columns.filter((c) => c.type === 'number');
    const kpis: { label: string; value: string | number; color?: string }[] = [
      { label: 'Records', value: rows.length },
    ];
    for (const col of numCols.slice(0, 3)) {
      const vals = rows.map((r) => Number(r[col.key])).filter((n) => !isNaN(n));
      if (vals.length > 0) {
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
        kpis.push({ label: 'Avg ' + col.label, value: avg.toFixed(2) });
      }
    }
    pods.push(kpiStrip(kpis, { span: 4 }));

    // Chart pod (if we have a numeric column and a date/year axis)
    const dateCol = src.columns.find((c) => c.type === 'date' || c.key === 'year');
    const valCol = numCols[0];
    if (dateCol && valCol && rows.length > 1) {
      const chartId = 'chart-' + src.id;
      pods.push(pod('<div id="' + chartId + '" style="width:100%;height:260px"></div>', { span: 2, title: src.shortLabel + ' Chart' }));
      // Deferred ECharts initialization
      requestAnimationFrame(() => {
        import('echarts').then((echarts) => {
          const el = document.getElementById(chartId);
          if (!el) return;
          const chart = echarts.init(el);
          const sorted = [...rows].sort((a, b) => String(a[dateCol.key]).localeCompare(String(b[dateCol.key])));
          chart.setOption({
            tooltip: { trigger: 'axis' },
            grid: { left: 50, right: 20, top: 20, bottom: 30 },
            xAxis: { type: 'category', data: sorted.map((r) => String(r[dateCol.key])), axisLabel: { fontSize: 10, color: '#94a3b8' } },
            yAxis: { type: 'value', axisLabel: { fontSize: 10, color: '#94a3b8' }, splitLine: { lineStyle: { color: '#1e293b' } } },
            series: [{ type: 'line', data: sorted.map((r) => Number(r[valCol.key]) || 0), smooth: true, lineStyle: { color: src.color }, itemStyle: { color: src.color }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: src.color + '40' }, { offset: 1, color: src.color + '05' }] } } }],
          });
          const onResize = () => { if (el.isConnected) chart.resize(); else window.removeEventListener('resize', onResize); };
          window.addEventListener('resize', onResize);
        }).catch(() => {});
      });
    }

    // Data table
    const tableCols = src.columns.filter((c) => !c.secondary).slice(0, 6);
    pods.push(
      miniTable(rows, tableCols.map((c) => ({ key: c.key, label: c.label, type: c.type })), {
        title: 'Data Table',
        span: dateCol && valCol && rows.length > 1 ? 2 : 4,
        maxRows: 15,
      }),
    );

    // See also: related sources in the same category
    const catDef = CATEGORY_MAP.get(src.category);
    if (catDef) {
      const related = sourcesForCategory(src.category).filter((s) => s.id !== src.id).slice(0, 4);
      if (related.length > 0) {
        let relatedInner = '<div class="flex flex-wrap gap-2">';
        for (const r of related) {
          relatedInner += '<a href="/explore?mode=data&source=' + esc(r.id) + (country ? '&country=' + esc(country) : '') + '" class="flex items-center gap-1.5 rounded-lg bg-fin-800/40 px-2.5 py-1.5 text-[11px] text-slate-300 hover:bg-fin-800/60 transition-colors">';
          relatedInner += '<svg class="w-3 h-3" style="color:' + r.color + '" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">' + r.icon + '</svg>';
          relatedInner += esc(r.shortLabel) + '</a>';
        }
        relatedInner += '</div>';
        pods.push(pod(relatedInner, { title: 'See Also · ' + catDef.shortLabel, span: 4, compact: true }));
      }
    }

    ctx.sectionsGrid.innerHTML = podGrid(pods);
  } catch (err) {
    ctx.sectionsGrid.innerHTML = errorHtml('Failed to load ' + src.shortLabel, err);
  }
}
