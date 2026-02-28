/**
 * Treasury Yields card — US Treasury yield curve.
 */
import { registerCard } from '../card-registry';
import { apiFetch } from '../api-client';

const _E: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
function e(s: string): string {
  return String(s ?? '').replace(/[&<>"]/g, (c) => _E[c]);
}

function items(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    if ('items' in raw) return (raw as Record<string, unknown>).items || [];
    if ('data' in raw) return (raw as Record<string, unknown>).data || [];
  }
  return [];
}

registerCard({
  type: 'treasury-yields',
  title: 'Treasury Yields',
  description: 'US Treasury yield curve',
  icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />',
  defaultSize: 'md',
  views: ['chart', 'list'],
  cacheTtl: 300_000,
  exploreUrl: '/explore?mode=data&source=macro_treasury-yield-series',
  fetch: async () => {
    const res = await apiFetch<unknown>(
      '/api/v1/rates/treasury-yield-series?limit=20'
    );
    const raw = res.ok && res.data ? res.data : null;
    return {
      payload: raw,
      tokenCost: res.tokenCost,
      creditsRemaining: res.creditsRemaining,
    };
  },
  render: (container, data, activeView) => {
    const view = activeView ?? 'chart';
    const raw = data.payload;
    const list = items(raw);
    const error = raw == null || (typeof raw === 'object' && 'error' in raw);

    if (error && list.length === 0) {
      container.innerHTML = `
        <div class="p-4 rounded-lg bg-fin-800 border border-fin-700/50 text-slate-200">
          <p class="text-sm text-red-400/90">Failed to load treasury yields.</p>
        </div>
      `;
      return;
    }

    if (view === 'chart') {
      container.innerHTML = `
        <div class="p-4 rounded-lg bg-fin-800 border border-fin-700/50 text-slate-200">
          <div class="treasury-chart-el w-full h-[240px] min-h-[200px]"></div>
        </div>
      `;
      let cleanup: (() => void) | null = null;
      requestAnimationFrame(() => {
        import('echarts').then((echarts) => {
          const el = container.querySelector('.treasury-chart-el') as HTMLElement;
          if (!el) return;
          const chart = echarts.init(el);
          const bySeries = new Map<string, { period: string; value: number }[]>();
          for (const r of list) {
            const rec = r as Record<string, unknown>;
            const sid = String(rec.series_id ?? rec.id ?? '');
            if (!bySeries.has(sid)) bySeries.set(sid, []);
            const val = rec.value ?? rec.rate ?? rec.yield;
            bySeries.get(sid)!.push({
              period: String(rec.period ?? rec.date ?? ''),
              value: Number(val ?? 0),
            });
          }
          const seriesIds = Array.from(bySeries.keys()).slice(0, 8);
          const series = seriesIds.map((sid) => {
            const pts = bySeries.get(sid)!;
            pts.sort((a, b) => a.period.localeCompare(b.period));
            return {
              name: sid || 'Yield',
              type: 'line',
              smooth: true,
              data: pts.map((p) => [p.period, p.value]),
            };
          });
          const periods = [...new Set(list.map((r) => String((r as Record<string, unknown>).period ?? (r as Record<string, unknown>).date ?? '')))].sort();
          chart.setOption({
            backgroundColor: 'transparent',
            textStyle: { color: '#94a3b8' },
            legend: { top: 0, textStyle: { color: '#94a3b8' } },
            grid: { left: 50, right: 20, top: 40, bottom: 40 },
            tooltip: { trigger: 'axis' },
            xAxis: { type: 'category', data: periods, axisLine: { lineStyle: { color: '#475569' } } },
            yAxis: { type: 'value', axisLine: { show: false }, splitLine: { lineStyle: { color: '#334155' } } },
            series,
          });
          const onResize = () => chart.resize();
          window.addEventListener('resize', onResize);
          cleanup = () => {
            window.removeEventListener('resize', onResize);
            chart.dispose();
          };
        });
      });
      return () => cleanup?.();
    }

    container.innerHTML = `
      <div class="flex justify-end mb-1">
        <a href="/explore?mode=data&source=macro_treasury-yield-series" class="text-[10px] text-fin-400 hover:underline">View all in Explorer &rarr;</a>
      </div>
      <div class="p-4 rounded-lg bg-fin-800 border border-fin-700/50 text-slate-200 overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-fin-700/50">
              <th class="text-left py-2 pr-4 text-slate-400 font-medium">Period</th>
              <th class="text-left py-2 pr-4 text-slate-400 font-medium">Series</th>
              <th class="text-right py-2 text-slate-400 font-medium">Yield</th>
            </tr>
          </thead>
          <tbody>
            ${list
              .slice(0, 20)
              .map(
                (r) => {
                const rec = r as Record<string, unknown>;
                const val = rec.value ?? rec.rate ?? rec.yield ?? 0;
                const sid = String(rec.series_id ?? rec.id ?? '');
                return `<tr class="border-b border-fin-700/30">
                  <td class="py-2 pr-4 text-slate-500">${e(String(rec.period ?? rec.date ?? ''))}</td>
                  <td class="py-2 pr-4"><a href="/explore?mode=data&source=macro_treasury-yield-series&q=${encodeURIComponent(sid)}" class="text-fin-400 hover:underline">${e(sid)}</a></td>
                  <td class="py-2 text-right tabular-nums">${e(String(Number(val).toFixed(2)))}%</td>
                </tr>`;
              }
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  },
});
