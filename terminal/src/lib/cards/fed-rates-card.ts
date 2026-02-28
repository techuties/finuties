/**
 * Fed & Overnight Rates card — SOFR, EFFR, and key reference rates.
 * Shows current rate as KPI tile with ECharts sparkline of recent history.
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

interface RateSeries {
  name: string;
  shortName: string;
  current: number;
  prev: number | null;
  points: { date: string; value: number }[];
}

function buildSeries(
  rows: Record<string, unknown>[],
  name: string,
  shortName: string,
): RateSeries | null {
  if (rows.length === 0) return null;

  const sorted = [...rows].sort((a, b) => {
    const da = String(a.date ?? a.period ?? '');
    const db = String(b.date ?? b.period ?? '');
    return db.localeCompare(da);
  });

  const points = sorted.slice(0, 20).map(r => ({
    date: String(r.date ?? r.period ?? '').slice(0, 10),
    value: Number(r.rate ?? r.value ?? r.percentRate ?? 0),
  })).reverse();

  const current = points.length > 0 ? points[points.length - 1].value : 0;
  const prev = points.length > 1 ? points[points.length - 2].value : null;

  return { name, shortName, current, prev, points };
}

registerCard({
  type: 'fed-rates',
  title: 'Fed & Overnight Rates',
  description: 'SOFR, EFFR & key reference rates',
  icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />',
  defaultSize: 'md',
  cacheTtl: 600_000,
  exploreUrl: '/explore?mode=data&source=macro_nyfed-sofr-series',

  async fetch(): Promise<CardData> {
    const [sofrRes, effrRes, obfrRes, tgcrRes, bgcrRes] = await Promise.all([
      apiFetch<unknown>('/api/v1/rates/nyfed-sofr-series?limit=20').catch(() => null),
      apiFetch<unknown>('/api/v1/rates/nyfed-effr-series?limit=20').catch(() => null),
      apiFetch<unknown>('/api/v1/rates/nyfed-obfr-series?limit=20').catch(() => null),
      apiFetch<unknown>('/api/v1/rates/nyfed-tgcr-series?limit=20').catch(() => null),
      apiFetch<unknown>('/api/v1/rates/nyfed-bgcr-series?limit=20').catch(() => null),
    ]);

    const totalCost = (sofrRes?.tokenCost ?? 0) + (effrRes?.tokenCost ?? 0)
      + (obfrRes?.tokenCost ?? 0) + (tgcrRes?.tokenCost ?? 0) + (bgcrRes?.tokenCost ?? 0);
    const credits = sofrRes?.creditsRemaining ?? effrRes?.creditsRemaining
      ?? obfrRes?.creditsRemaining ?? tgcrRes?.creditsRemaining ?? bgcrRes?.creditsRemaining ?? null;

    return {
      payload: {
        sofr: sofrRes?.ok ? items(sofrRes.data) : [],
        effr: effrRes?.ok ? items(effrRes.data) : [],
        obfr: obfrRes?.ok ? items(obfrRes.data) : [],
        tgcr: tgcrRes?.ok ? items(tgcrRes.data) : [],
        bgcr: bgcrRes?.ok ? items(bgcrRes.data) : [],
      },
      tokenCost: totalCost,
      creditsRemaining: credits,
    };
  },

  render(container, data) {
    const payload = data.payload as {
      sofr: Record<string, unknown>[];
      effr: Record<string, unknown>[];
      obfr: Record<string, unknown>[];
      tgcr: Record<string, unknown>[];
      bgcr: Record<string, unknown>[];
    };

    const series: RateSeries[] = [
      buildSeries(payload.sofr ?? [], 'Secured Overnight Financing Rate', 'SOFR'),
      buildSeries(payload.effr ?? [], 'Effective Federal Funds Rate', 'EFFR'),
      buildSeries(payload.obfr ?? [], 'Overnight Bank Funding Rate', 'OBFR'),
      buildSeries(payload.tgcr ?? [], 'Tri-Party General Collateral Rate', 'TGCR'),
      buildSeries(payload.bgcr ?? [], 'Broad General Collateral Rate', 'BGCR'),
    ].filter((s): s is RateSeries => s !== null);

    if (series.length === 0) {
      container.innerHTML = '<p class="text-sm text-slate-500 text-center py-6">No rate data available.</p>';
      return;
    }

    const chartIds = series.map((_, i) => `fed-rate-spark-${Date.now()}-${i}`);

    container.innerHTML = `
      <div class="space-y-3">
        <div class="flex items-center justify-end px-1">
          <a href="/explore?mode=data&source=macro_nyfed-sofr-series" class="text-[10px] text-fin-400 hover:underline">Explore rates \u2192</a>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          ${series.map((s, i) => {
            const change = s.prev !== null ? s.current - s.prev : null;
            const isUp = change !== null && change > 0;
            const isDown = change !== null && change < 0;
            const changeColor = isUp ? 'text-red-400' : isDown ? 'text-emerald-400' : 'text-slate-500';
            const arrow = isUp ? '\u25B2' : isDown ? '\u25BC' : '';
            const latestDate = s.points.length > 0 ? s.points[s.points.length - 1].date : '';

            return `
              <div class="rounded-lg bg-fin-800/50 border border-fin-700/40 p-3">
                <div class="flex items-start justify-between mb-2">
                  <div>
                    <div class="text-[10px] text-slate-500 uppercase tracking-wider">${e(s.shortName)}</div>
                    <div class="text-2xl font-bold tabular-nums text-slate-100">${e(s.current.toFixed(2))}%</div>
                    <div class="flex items-center gap-2 mt-0.5">
                      ${change !== null ? `<span class="text-[10px] font-mono ${changeColor}">${arrow} ${Math.abs(change).toFixed(3)}%</span>` : ''}
                      <span class="text-[9px] text-slate-600">${e(latestDate)}</span>
                    </div>
                  </div>
                  <div class="text-[9px] text-slate-600 text-right max-w-[120px]">${e(s.name)}</div>
                </div>
                <div id="${chartIds[i]}" class="w-full h-[60px]"></div>
              </div>`;
          }).join('')}
        </div>
      </div>
    `;

    let cleanups: (() => void)[] = [];

    requestAnimationFrame(() => {
      import('echarts').then(echarts => {
        series.forEach((s, i) => {
          const el = document.getElementById(chartIds[i]);
          if (!el) return;
          const chart = echarts.init(el);
          const dates = s.points.map(p => p.date);
          const values = s.points.map(p => p.value);
          const min = Math.min(...values);
          const max = Math.max(...values);
          const padding = (max - min) * 0.2 || 0.01;

          chart.setOption({
            backgroundColor: 'transparent',
            grid: { left: 0, right: 0, top: 2, bottom: 0 },
            xAxis: { type: 'category', data: dates, show: false },
            yAxis: { type: 'value', min: min - padding, max: max + padding, show: false },
            tooltip: {
              trigger: 'axis',
              formatter: (params: { name: string; value: number }[]) => {
                if (!Array.isArray(params) || !params[0]) return '';
                return `${params[0].name}: ${Number(params[0].value).toFixed(3)}%`;
              },
            },
            series: [{
              type: 'line',
              data: values,
              smooth: true,
              symbol: 'none',
              lineStyle: { color: '#0ea5e9', width: 2 },
              areaStyle: {
                color: {
                  type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                  colorStops: [
                    { offset: 0, color: 'rgba(14,165,233,0.25)' },
                    { offset: 1, color: 'rgba(14,165,233,0.02)' },
                  ],
                },
              },
            }],
          });

          const onResize = () => chart.resize();
          window.addEventListener('resize', onResize);
          cleanups.push(() => {
            window.removeEventListener('resize', onResize);
            chart.dispose();
          });
        });
      });
    });

    return () => {
      for (const fn of cleanups) fn();
      cleanups = [];
    };
  },
});
