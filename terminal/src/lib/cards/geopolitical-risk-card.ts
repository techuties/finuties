/**
 * Geopolitical Risk card — GPR index with gauge visualization and trend sparkline.
 */
import { registerCard, type CardData } from '../card-registry';
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

function riskLevel(val: number): { label: string; color: string; bgColor: string } {
  if (val >= 200) return { label: 'Extreme', color: '#dc2626', bgColor: 'bg-red-500/15' };
  if (val >= 150) return { label: 'Very High', color: '#ea580c', bgColor: 'bg-orange-500/15' };
  if (val >= 120) return { label: 'High', color: '#f59e0b', bgColor: 'bg-amber-500/15' };
  if (val >= 100) return { label: 'Elevated', color: '#eab308', bgColor: 'bg-yellow-500/15' };
  if (val >= 80) return { label: 'Moderate', color: '#84cc16', bgColor: 'bg-lime-500/10' };
  return { label: 'Low', color: '#22c55e', bgColor: 'bg-emerald-500/10' };
}

registerCard({
  type: 'geopolitical-risk',
  title: 'Geopolitical Risk',
  description: 'GPR Index — global risk thermometer',
  icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />',
  defaultSize: 'sm',
  cacheTtl: 600_000,
  exploreUrl: '/explore?mode=data&source=esg_gpr',

  async fetch(): Promise<CardData> {
    const res = await apiFetch<unknown>('/api/v1/data/esg/gpr?limit=24');
    return {
      payload: res.ok ? res.data : null,
      tokenCost: res.tokenCost,
      creditsRemaining: res.creditsRemaining,
    };
  },

  render(container, data) {
    const raw = items(data.payload);

    if (raw.length === 0) {
      container.innerHTML = '<p class="text-sm text-slate-500 text-center py-6">GPR data unavailable.</p>';
      return;
    }

    const sorted = [...raw].sort((a, b) => {
      const da = String(a.date ?? a.period ?? a.month ?? '');
      const db = String(b.date ?? b.period ?? b.month ?? '');
      return db.localeCompare(da);
    });

    const valueKey = Object.keys(sorted[0]).find(k =>
      /gpr|index|value|score/i.test(k) && typeof sorted[0][k] === 'number'
    ) ?? 'gpr';
    const dateKey = Object.keys(sorted[0]).find(k =>
      /date|period|month/i.test(k)
    ) ?? 'date';

    const current = Number(sorted[0][valueKey] ?? 0);
    const prev = sorted.length > 1 ? Number(sorted[1][valueKey] ?? 0) : null;
    const risk = riskLevel(current);
    const change = prev !== null ? current - prev : null;
    const isUp = change !== null && change > 0;
    const isDown = change !== null && change < 0;
    const changeColor = isUp ? 'text-red-400' : isDown ? 'text-emerald-400' : 'text-slate-500';
    const arrow = isUp ? '\u25B2' : isDown ? '\u25BC' : '';
    const latestDate = String(sorted[0][dateKey] ?? '').slice(0, 10);

    const points = sorted.slice(0, 20).reverse();
    const chartId = 'gpr-spark-' + Date.now();

    const gaugePercent = Math.min(current / 300, 1) * 100;

    container.innerHTML = `
      <div class="space-y-3">
        <div class="flex items-center justify-end px-1">
          <a href="/explore?mode=data&source=esg_gpr" class="text-[10px] text-fin-400 hover:underline">Explore GPR \u2192</a>
        </div>
        <div class="rounded-lg bg-fin-800/50 border border-fin-700/40 p-4 text-center">
          <div class="text-[10px] text-slate-500 uppercase tracking-wider mb-1">GPR Index</div>
          <div class="text-3xl font-bold tabular-nums text-slate-100">${e(current.toFixed(1))}</div>
          <div class="inline-flex items-center gap-1 mt-1 rounded-full ${risk.bgColor} px-2.5 py-0.5">
            <span class="w-2 h-2 rounded-full" style="background:${risk.color}"></span>
            <span class="text-[11px] font-semibold" style="color:${risk.color}">${e(risk.label)}</span>
          </div>
          <div class="mt-2 h-2 rounded-full bg-fin-800 overflow-hidden mx-auto max-w-[200px]">
            <div class="h-full rounded-full transition-all" style="width:${gaugePercent.toFixed(1)}%;background:${risk.color}"></div>
          </div>
          <div class="flex items-center justify-center gap-2 mt-2">
            ${change !== null ? `<span class="text-[10px] font-mono ${changeColor}">${arrow} ${Math.abs(change).toFixed(1)}</span>` : ''}
            <span class="text-[9px] text-slate-600">${e(latestDate)}</span>
          </div>
        </div>
        <div id="${chartId}" class="w-full h-[50px]"></div>
      </div>
    `;

    let cleanup: (() => void) | null = null;

    requestAnimationFrame(() => {
      import('echarts').then(echarts => {
        const el = document.getElementById(chartId);
        if (!el) return;
        const chart = echarts.init(el);
        const dates = points.map(p => String(p[dateKey] ?? '').slice(0, 10));
        const values = points.map(p => Number(p[valueKey] ?? 0));
        const min = Math.min(...values);
        const max = Math.max(...values);
        const pad = (max - min) * 0.2 || 1;

        chart.setOption({
          backgroundColor: 'transparent',
          grid: { left: 0, right: 0, top: 2, bottom: 0 },
          xAxis: { type: 'category', data: dates, show: false },
          yAxis: { type: 'value', min: min - pad, max: max + pad, show: false },
          tooltip: {
            trigger: 'axis',
            formatter: (params: { name: string; value: number }[]) => {
              if (!Array.isArray(params) || !params[0]) return '';
              return `${params[0].name}: ${Number(params[0].value).toFixed(1)}`;
            },
          },
          series: [{
            type: 'line',
            data: values,
            smooth: true,
            symbol: 'none',
            lineStyle: { color: risk.color, width: 2 },
            areaStyle: {
              color: {
                type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: risk.color + '30' },
                  { offset: 1, color: risk.color + '05' },
                ],
              },
            },
          }],
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
  },
});
