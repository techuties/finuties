/**
 * US Debt card - Treasury debt outstanding as big number with ECharts sparkline.
 */
import { registerCard, type CardData } from '../card-registry';
import { apiFetch } from '../api-client';

const _E: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
function e(s: string): string { return String(s ?? '').replace(/[&<>"]/g, (c) => _E[c]); }
function items(raw: unknown): Record<string, unknown>[] { if (Array.isArray(raw)) return raw; if (raw && typeof raw === 'object') { if ('items' in raw) return (raw as Record<string, unknown>).items as Record<string, unknown>[] ?? []; if ('data' in raw) return (raw as Record<string, unknown>).data as Record<string, unknown>[] ?? []; } return []; }

function fmtTrillions(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e12) return '$' + (v / 1e12).toFixed(2) + 'T';
  if (abs >= 1e9) return '$' + (v / 1e9).toFixed(1) + 'B';
  if (abs >= 1e6) return '$' + (v / 1e6).toFixed(1) + 'M';
  return '$' + v.toLocaleString();
}

registerCard({
  type: 'treasury-debt',
  title: 'US Debt',
  description: 'Treasury debt outstanding',
  icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />',
  defaultSize: 'sm',
  cacheTtl: 600_000,
  exploreUrl: '/explore?mode=data&source=im_macro_treasury-debt-outstanding-series',
  async fetch(): Promise<CardData> {
    const res = await apiFetch<unknown>('/api/v1/rates/treasury-debt-outstanding-series?limit=12');
    return { payload: res.data, tokenCost: res.tokenCost, creditsRemaining: res.creditsRemaining };
  },
  render(container, data) {
    const rows = items(data.payload);
    if (!rows.length) { container.innerHTML = '<p class="text-sm text-slate-500 text-center py-6">No debt data.</p>'; return; }
    const sorted = [...rows].sort((a, b) => String(b.period ?? '').localeCompare(String(a.period ?? '')));
    const current = Number(sorted[0].value ?? 0);
    const prev = sorted.length > 1 ? Number(sorted[1].value ?? 0) : null;
    const change = prev !== null ? current - prev : null;
    const up = change !== null && change > 0; const dn = change !== null && change < 0;
    const arrow = up ? '\u25B2' : dn ? '\u25BC' : '';
    const cc = up ? 'text-red-400' : dn ? 'text-emerald-400' : 'text-slate-500';
    const latestDate = String(sorted[0].period ?? '').slice(0, 10);
    const chartId = 'debt-spark-' + Date.now();
    const points = sorted.slice(0, 12).reverse();

    container.innerHTML = '<div class="space-y-3"><div class="flex items-center justify-end px-1"><a href="/explore?mode=data&source=im_macro_treasury-debt-outstanding-series" class="text-[10px] text-fin-400 hover:underline">Explore \u2192</a></div><div class="rounded-lg bg-fin-800/50 border border-fin-700/40 p-4"><div class="text-[10px] text-slate-500 uppercase tracking-wider">Total Outstanding</div><div class="text-3xl font-bold tabular-nums text-slate-100 mt-1">' + e(fmtTrillions(current)) + '</div><div class="flex items-center gap-2 mt-1 text-[10px]">' + (change !== null ? '<span class="' + cc + ' font-mono">' + arrow + ' ' + fmtTrillions(Math.abs(change)) + '</span>' : '') + '<span class="text-slate-600">' + e(latestDate) + '</span></div><div id="' + chartId + '" class="w-full h-[60px] mt-3"></div></div></div>';

    requestAnimationFrame(() => {
      import('echarts').then(echarts => {
        const el = document.getElementById(chartId);
        if (!el) return;
        const chart = echarts.init(el);
        const dates = points.map(p => String(p.period ?? '').slice(0, 10));
        const values = points.map(p => Number(p.value ?? 0));
        const min = Math.min(...values); const max = Math.max(...values); const pad = (max - min) * 0.2 || 1;
        chart.setOption({
          backgroundColor: 'transparent',
          grid: { left: 0, right: 0, top: 2, bottom: 0 },
          xAxis: { type: 'category', data: dates, show: false },
          yAxis: { type: 'value', min: min - pad, max: max + pad, show: false },
          tooltip: { trigger: 'axis', formatter: (params: { name: string; value: number }[]) => { if (!Array.isArray(params) || !params[0]) return ''; return params[0].name + ': ' + fmtTrillions(Number(params[0].value)); } },
          series: [{ type: 'line', data: values, smooth: true, symbol: 'none', lineStyle: { color: '#ef4444', width: 2 }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(239,68,68,0.25)' }, { offset: 1, color: 'rgba(239,68,68,0.02)' }] } } }],
        });
        const onResize = () => chart.resize();
        window.addEventListener('resize', onResize);
        (container as any).__debtCleanup = () => { window.removeEventListener('resize', onResize); chart.dispose(); };
      });
    });
    return () => { if ((container as any).__debtCleanup) (container as any).__debtCleanup(); };
  },
});
