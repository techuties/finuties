/**
 * Positioning View -- enhanced CFTC COT positioning data.
 * Features: commodity selector, KPI strip, stacked bar chart, sortable table.
 */
import {
  podGrid, pod, kpiStrip, esc, spinnerHtml, errorHtml, badgeCls,
  type RenderContext,
} from '../layout';
import { fetchSource } from '../../global-data-api';
import { SOURCE_MAP, sourcesForCategory } from '../../source-registry';

function fmtNum(n: unknown): string {
  const v = Number(n);
  if (isNaN(v)) return '\u2014';
  return v.toLocaleString('en-US');
}

export async function renderPositioningView(ctx: RenderContext): Promise<void> {
  const sourceId = ctx.params.get('source') || '';
  const src = sourceId ? SOURCE_MAP.get(sourceId) : undefined;
  const positionSources = sourcesForCategory('economy').filter(
    (s) => s.id.includes('cftc') || s.id.includes('position') || s.id.includes('cot'),
  );
  const activeSrc = src || positionSources[0];

  if (!activeSrc) {
    ctx.sectionsGrid.innerHTML = errorHtml('No positioning data sources available');
    return;
  }

  ctx.typeBadge.textContent = 'Positioning';
  ctx.typeBadge.className = badgeCls('bg-purple-500/20 text-purple-400');
  ctx.nameEl.textContent = activeSrc.label;
  ctx.subEl.textContent = activeSrc.description;
  ctx.updateBreadcrumbs(activeSrc.shortLabel, 'data');
  ctx.sectionsGrid.innerHTML = spinnerHtml('Loading positioning data...');

  try {
    const params: Record<string, string | number> = { limit: 200 };
    const qCommodity = ctx.params.get('commodity_name') || ctx.params.get('q') || '';
    if (qCommodity) params.commodity_name = qCommodity;
    for (const [k, v] of ctx.params.entries()) {
      if (!['type', 'mode', 'source', 'category', 'q', 'commodity_name'].includes(k) && v) params[k] = v;
    }

    const res = await fetchSource(activeSrc.endpoint, params);
    const rows: Record<string, unknown>[] = res.data || [];

    if (rows.length === 0) {
      ctx.sectionsGrid.innerHTML = errorHtml('No positioning data found for these filters.');
      return;
    }

    // Extract unique commodities for the selector
    const commodities = new Set<string>();
    for (const r of rows) {
      const c = String(r.commodity_name ?? r.commodity ?? '').trim();
      if (c) commodities.add(c);
    }
    const commodityList = [...commodities].sort();
    let activeCommodity = qCommodity || (commodityList.length > 0 ? commodityList[0] : '');

    // Build layout
    const root = document.createElement('div');
    root.className = 'space-y-4';

    // Source selector (if multiple CFTC sources)
    if (positionSources.length > 1) {
      const srcBar = document.createElement('div');
      srcBar.className = 'flex gap-1.5 flex-wrap';
      for (const s of positionSources) {
        const chip = document.createElement('a');
        chip.href = `/explore?mode=data&source=${encodeURIComponent(s.id)}${activeCommodity ? '&commodity_name=' + encodeURIComponent(activeCommodity) : ''}`;
        chip.className = `px-2.5 py-1 text-[11px] rounded-full border transition-colors no-underline ${s.id === activeSrc.id ? 'border-purple-400 bg-purple-400/10 text-purple-400' : 'border-fin-700 text-slate-400 hover:border-purple-500'}`;
        chip.textContent = s.shortLabel;
        srcBar.appendChild(chip);
      }
      root.appendChild(srcBar);
    }

    // Commodity selector
    if (commodityList.length > 1) {
      const selWrap = document.createElement('div');
      selWrap.className = 'flex items-center gap-2';
      selWrap.innerHTML = '<span class="text-xs text-slate-500">Commodity:</span>';
      const sel = document.createElement('select');
      sel.className = 'bg-fin-800 border border-fin-700 rounded-lg px-2 py-1 text-sm text-slate-200 focus:outline-none focus:border-fin-500';
      for (const c of commodityList) {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        if (c === activeCommodity) opt.selected = true;
        sel.appendChild(opt);
      }
      selWrap.appendChild(sel);
      root.appendChild(selWrap);

      sel.addEventListener('change', () => {
        activeCommodity = sel.value;
        renderContent();
      });
    }

    // KPI container
    const kpiWrap = document.createElement('div');
    root.appendChild(kpiWrap);

    // Chart container
    const chartWrap = document.createElement('div');
    chartWrap.style.cssText = 'width:100%;height:280px;';
    root.appendChild(chartWrap);

    // Table container
    const tableWrap = document.createElement('div');
    root.appendChild(tableWrap);

    let chartInstance: { dispose: () => void; resize: () => void; setOption: (o: unknown) => void } | null = null;
    const resizeHandler = () => chartInstance?.resize();

    function filteredRows(): Record<string, unknown>[] {
      if (!activeCommodity) return rows;
      return rows.filter(r => {
        const c = String(r.commodity_name ?? r.commodity ?? '');
        return c === activeCommodity;
      });
    }

    function renderContent(): void {
      const filtered = filteredRows();
      const sorted = [...filtered].sort((a, b) =>
        String(a.report_date ?? '').localeCompare(String(b.report_date ?? ''))
      );

      // KPIs from latest row
      const latest = sorted.length > 0 ? sorted[sorted.length - 1] : null;
      if (latest) {
        const ncLong = Number(latest.noncommercial_long ?? 0);
        const ncShort = Number(latest.noncommercial_short ?? 0);
        const cLong = Number(latest.commercial_long ?? 0);
        const cShort = Number(latest.commercial_short ?? 0);
        const netNonComm = ncLong - ncShort;
        const netComm = cLong - cShort;
        const oi = Number(latest.open_interest ?? 0);

        const kpis = [
          { label: 'Net Non-Commercial', value: fmtNum(netNonComm), color: netNonComm >= 0 ? 'text-emerald-400' : 'text-red-400' },
          { label: 'Net Commercial', value: fmtNum(netComm), color: netComm >= 0 ? 'text-emerald-400' : 'text-red-400' },
          { label: 'Open Interest', value: fmtNum(oi) },
          { label: 'Latest Report', value: String(latest.report_date ?? '').slice(0, 10) },
          { label: 'Records', value: String(filtered.length) },
        ];
        kpiWrap.innerHTML = '<div class="flex flex-wrap gap-3">' +
          kpis.map(k => `<div class="bg-fin-800/60 border border-fin-700/40 rounded-lg px-3 py-2 min-w-[100px]"><p class="text-[10px] text-slate-500 uppercase">${esc(k.label)}</p><p class="text-sm font-bold ${k.color || 'text-slate-200'}">${esc(k.value)}</p></div>`).join('') +
          '</div>';
      }

      // ECharts stacked bar chart
      renderChart(sorted);

      // Sortable table
      renderTable(filtered);
    }

    function renderChart(sorted: Record<string, unknown>[]): void {
      if (sorted.length < 2) {
        chartWrap.style.display = 'none';
        return;
      }
      chartWrap.style.display = '';

      import('echarts').then(echarts => {
        if (chartInstance) chartInstance.dispose();
        chartInstance = echarts.init(chartWrap);

        const dates = sorted.map(r => String(r.report_date ?? '').slice(0, 10));
        const ncLong = sorted.map(r => Number(r.noncommercial_long ?? 0));
        const ncShort = sorted.map(r => -(Number(r.noncommercial_short ?? 0)));
        const cLong = sorted.map(r => Number(r.commercial_long ?? 0));
        const cShort = sorted.map(r => -(Number(r.commercial_short ?? 0)));

        chartInstance!.setOption({
          backgroundColor: 'transparent',
          tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: (params: { seriesName: string; value: number; axisValue: string }[]) => {
              if (!Array.isArray(params) || params.length === 0) return '';
              let html = `<div style="font-size:11px"><strong>${esc(params[0].axisValue)}</strong>`;
              for (const p of params) {
                const v = Math.abs(p.value);
                html += `<br/>${esc(p.seriesName)}: ${v.toLocaleString()}`;
              }
              return html + '</div>';
            },
          },
          legend: { top: 0, textStyle: { color: '#94a3b8', fontSize: 10 } },
          grid: { left: 65, right: 10, top: 35, bottom: 25 },
          xAxis: {
            type: 'category',
            data: dates,
            axisLabel: { color: '#64748b', fontSize: 9, rotate: dates.length > 20 ? 45 : 0 },
          },
          yAxis: {
            type: 'value',
            axisLabel: {
              color: '#64748b', fontSize: 9,
              formatter: (v: number) => {
                const abs = Math.abs(v);
                if (abs >= 1e6) return (v / 1e6).toFixed(1) + 'M';
                if (abs >= 1e3) return (v / 1e3).toFixed(0) + 'K';
                return String(v);
              },
            },
            splitLine: { lineStyle: { color: '#1e293b' } },
          },
          series: [
            { name: 'Non-Comm Long', type: 'bar', stack: 'long', data: ncLong, itemStyle: { color: '#22c55e' } },
            { name: 'Comm Long', type: 'bar', stack: 'long', data: cLong, itemStyle: { color: '#3b82f6' } },
            { name: 'Non-Comm Short', type: 'bar', stack: 'short', data: ncShort, itemStyle: { color: '#ef4444' } },
            { name: 'Comm Short', type: 'bar', stack: 'short', data: cShort, itemStyle: { color: '#f97316' } },
          ],
        });

        window.removeEventListener('resize', resizeHandler);
        window.addEventListener('resize', resizeHandler);
      }).catch(() => { chartWrap.style.display = 'none'; });
    }

    function renderTable(filtered: Record<string, unknown>[]): void {
      const sortedDesc = [...filtered].sort((a, b) =>
        String(b.report_date ?? '').localeCompare(String(a.report_date ?? ''))
      );
      const display = sortedDesc.slice(0, 50);

      let html = '<div class="overflow-x-auto"><table class="w-full text-left text-xs">';
      html += '<thead><tr class="border-b border-fin-800">';
      const cols = [
        { key: 'report_date', label: 'Date', align: 'left' },
        { key: 'commodity_name', label: 'Commodity', align: 'left' },
        { key: 'noncommercial_long', label: 'NC Long', align: 'right' },
        { key: 'noncommercial_short', label: 'NC Short', align: 'right' },
        { key: 'commercial_long', label: 'C Long', align: 'right' },
        { key: 'commercial_short', label: 'C Short', align: 'right' },
        { key: 'open_interest', label: 'OI', align: 'right' },
      ];
      for (const col of cols) {
        html += `<th class="px-2 py-1.5 text-[10px] text-slate-500 font-medium uppercase ${col.align === 'right' ? 'text-right' : ''}">${esc(col.label)}</th>`;
      }
      html += '</tr></thead><tbody>';
      for (const row of display) {
        html += '<tr class="border-b border-fin-800/40 hover:bg-fin-800/30">';
        for (const col of cols) {
          const val = row[col.key];
          const isNum = col.align === 'right';
          const cls = isNum ? 'text-right font-mono text-slate-300' : 'text-slate-400';
          const formatted = isNum ? fmtNum(val) : (val == null ? '\u2014' : String(val).slice(0, 10));
          html += `<td class="px-2 py-1.5 ${cls}">${esc(formatted)}</td>`;
        }
        html += '</tr>';
      }
      html += '</tbody></table></div>';
      if (filtered.length > 50) {
        html += `<p class="text-[10px] text-slate-600 text-center mt-2">${filtered.length} total rows (${filtered.length - 50} more)</p>`;
      }
      tableWrap.innerHTML = html;
    }

    renderContent();

    ctx.sectionsGrid.innerHTML = '';
    ctx.sectionsGrid.appendChild(root);
  } catch (err) {
    ctx.sectionsGrid.innerHTML = errorHtml('Failed to load positioning data', err);
  }
}
