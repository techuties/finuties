/**
 * COT Sentiment card -- visualises the latest Commitment of Traders release.
 * Shows non-commercial net positioning as a sentiment gauge across commodities.
 */
import { registerCard, type CardData, type ViewType } from '../card-registry';
import { apiFetch } from '../api-client';

const _E: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
function esc(s: string): string { return String(s ?? '').replace(/[&<>"]/g, c => _E[c]); }

function num(v: unknown): number { const n = Number(v); return isNaN(n) ? 0 : n; }
function fmtK(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (abs >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(0);
}

interface CotRow {
  commodity_name: string;
  report_date_as_yyyy_mm_dd: string;
  noncomm_positions_long_all: string | number;
  noncomm_positions_short_all: string | number;
  comm_positions_long_all: string | number;
  comm_positions_short_all: string | number;
  open_interest_all: string | number;
  change_in_noncomm_long_all: string | number;
  change_in_noncomm_short_all: string | number;
  change_in_open_interest_all: string | number;
  commodity_group_name?: string;
  [key: string]: unknown;
}

interface Sentiment {
  name: string;
  group: string;
  date: string;
  ncLong: number;
  ncShort: number;
  ncNet: number;
  cLong: number;
  cShort: number;
  cNet: number;
  oi: number;
  ncLongChg: number;
  ncShortChg: number;
  oiChg: number;
  pctLong: number;
}

function parseSentiment(rows: CotRow[]): Sentiment[] {
  const byName = new Map<string, CotRow>();
  for (const r of rows) {
    const name = String(r.commodity_name ?? '');
    const existing = byName.get(name);
    if (!existing || String(r.report_date_as_yyyy_mm_dd ?? '') > String(existing.report_date_as_yyyy_mm_dd ?? '')) {
      byName.set(name, r);
    }
  }
  const sentiments: Sentiment[] = [];
  for (const [name, r] of byName) {
    const ncLong = num(r.noncomm_positions_long_all);
    const ncShort = num(r.noncomm_positions_short_all);
    const cLong = num(r.comm_positions_long_all);
    const cShort = num(r.comm_positions_short_all);
    const oi = num(r.open_interest_all);
    const total = ncLong + ncShort;
    sentiments.push({
      name,
      group: String(r.commodity_group_name ?? ''),
      date: String(r.report_date_as_yyyy_mm_dd ?? '').slice(0, 10),
      ncLong, ncShort,
      ncNet: ncLong - ncShort,
      cLong, cShort,
      cNet: cLong - cShort,
      oi,
      ncLongChg: num(r.change_in_noncomm_long_all),
      ncShortChg: num(r.change_in_noncomm_short_all),
      oiChg: num(r.change_in_open_interest_all),
      pctLong: total > 0 ? (ncLong / total) * 100 : 50,
    });
  }
  sentiments.sort((a, b) => Math.abs(b.ncNet) - Math.abs(a.ncNet));
  return sentiments;
}

function items(raw: unknown): CotRow[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    if ('items' in raw) return ((raw as Record<string, unknown>).items as CotRow[]) || [];
    if ('data' in raw) return ((raw as Record<string, unknown>).data as CotRow[]) || [];
  }
  return [];
}

registerCard({
  type: 'cot-sentiment',
  title: 'COT Sentiment',
  description: 'Latest Commitment of Traders positioning sentiment',
  icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>',
  defaultSize: 'lg',
  views: ['chart', 'table'] as ViewType[],
  cacheTtl: 600_000,
  exploreUrl: '/commodities',

  async fetch(): Promise<CardData> {
    const res = await apiFetch<unknown>('/api/v1/cftc/legacy_futures-facts?limit=100', { timeout: 60_000 });
    return {
      payload: res.ok ? res.data : null,
      tokenCost: res.tokenCost,
      creditsRemaining: res.creditsRemaining,
    };
  },

  render(container: HTMLElement, data: CardData, activeView?: ViewType): (() => void) | void {
    const rows = items(data.payload);
    if (rows.length === 0) {
      container.innerHTML = '<p class="text-sm text-slate-500 text-center py-6">No COT data available.</p>';
      return;
    }

    const sentiments = parseSentiment(rows);
    const top = sentiments.slice(0, 25);
    const reportDate = top[0]?.date || '';

    if (activeView === 'table') return renderTable(container, top, reportDate);
    return renderChart(container, top, reportDate);
  },
});

function renderChart(container: HTMLElement, data: Sentiment[], reportDate: string): (() => void) | void {
  const chartId = 'cot-sent-' + Date.now();
  const bullish = data.filter(d => d.pctLong >= 50).length;
  const bearish = data.length - bullish;

  container.innerHTML = `
    <div class="space-y-2">
      <div class="flex items-center justify-between px-1">
        <div class="flex items-center gap-3 text-[10px] text-slate-500">
          <span>Report: <span class="text-slate-300">${esc(reportDate)}</span></span>
          <span class="text-emerald-400">${bullish} bullish</span>
          <span class="text-red-400">${bearish} bearish</span>
        </div>
        <a href="/commodities" class="text-[10px] text-fin-400 hover:underline">All commodities &rarr;</a>
      </div>
      <div id="${chartId}" style="width:100%;height:${Math.max(240, data.length * 22 + 40)}px"></div>
    </div>
  `;

  let chart: { dispose: () => void; resize: () => void } | null = null;
  const resizeHandler = () => chart?.resize();

  requestAnimationFrame(() => {
    import('echarts').then(echarts => {
      const el = document.getElementById(chartId);
      if (!el) return;
      chart = echarts.init(el);

      const names = data.map(d => d.name.length > 22 ? d.name.slice(0, 20) + '\u2026' : d.name).reverse();
      const values = data.map(d => d.pctLong - 50).reverse();
      const colors = values.map(v => v >= 0 ? '#22c55e' : '#ef4444');

      (chart as ReturnType<typeof echarts.init>).setOption({
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          formatter: (params: { name: string; value: number; dataIndex: number }[]) => {
            if (!Array.isArray(params) || !params[0]) return '';
            const idx = data.length - 1 - params[0].dataIndex;
            const d = data[idx];
            if (!d) return '';
            const pct = d.pctLong.toFixed(1);
            const sentiment = d.pctLong >= 50 ? '<span style="color:#22c55e">Bullish</span>' : '<span style="color:#ef4444">Bearish</span>';
            return `<div style="font-size:11px"><strong>${esc(d.name)}</strong><br/>` +
              `Sentiment: ${sentiment} (${pct}% long)<br/>` +
              `Net NC: ${fmtK(d.ncNet)}<br/>` +
              `OI: ${fmtK(d.oi)}</div>`;
          },
        },
        grid: { left: 140, right: 30, top: 5, bottom: 5 },
        xAxis: {
          type: 'value',
          min: -50, max: 50,
          axisLabel: {
            color: '#64748b', fontSize: 9,
            formatter: (v: number) => (v + 50) + '%',
          },
          splitLine: { lineStyle: { color: '#1e293b' } },
          axisLine: { lineStyle: { color: '#334155' } },
        },
        yAxis: {
          type: 'category',
          data: names,
          axisLabel: { color: '#94a3b8', fontSize: 9, width: 130, overflow: 'truncate' },
          axisLine: { show: false },
          axisTick: { show: false },
        },
        series: [{
          type: 'bar',
          data: values.map((v, i) => ({ value: v, itemStyle: { color: colors[i] } })),
          barWidth: 14,
          label: { show: false },
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: '#475569', type: 'dashed', width: 1 },
            data: [{ xAxis: 0 }],
            label: { show: false },
          },
        }],
      });

      window.addEventListener('resize', resizeHandler);
    }).catch(() => {
      container.innerHTML = '<p class="text-sm text-slate-500 text-center py-6">Failed to load chart.</p>';
    });
  });

  return () => {
    window.removeEventListener('resize', resizeHandler);
    if (chart) chart.dispose();
  };
}

function renderTable(container: HTMLElement, data: Sentiment[], reportDate: string): void {
  let html = `
    <div class="flex items-center justify-between px-1 mb-2">
      <span class="text-[10px] text-slate-500">Report: <span class="text-slate-300">${esc(reportDate)}</span></span>
      <a href="/commodities" class="text-[10px] text-fin-400 hover:underline">All commodities &rarr;</a>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full text-xs">
        <thead class="border-b border-fin-700/50">
          <tr class="text-left text-slate-500 uppercase tracking-wider text-[10px]">
            <th class="px-2 py-1.5 font-medium">Commodity</th>
            <th class="px-2 py-1.5 font-medium text-center">Sentiment</th>
            <th class="px-2 py-1.5 font-medium text-right">NC Net</th>
            <th class="px-2 py-1.5 font-medium text-right">NC Chg</th>
            <th class="px-2 py-1.5 font-medium text-right">OI</th>
            <th class="px-2 py-1.5 font-medium text-right">OI Chg</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-fin-800/50">
  `;

  for (const d of data) {
    const isBullish = d.pctLong >= 50;
    const sentimentColor = isBullish ? 'text-emerald-400' : 'text-red-400';
    const sentimentLabel = isBullish ? 'BULL' : 'BEAR';
    const pctWidth = Math.min(Math.abs(d.pctLong - 50) * 2, 100);
    const barColor = isBullish ? '#22c55e' : '#ef4444';
    const netChg = d.ncLongChg - d.ncShortChg;
    const netChgColor = netChg >= 0 ? 'text-emerald-400' : 'text-red-400';
    const oiChgColor = d.oiChg >= 0 ? 'text-emerald-400' : 'text-red-400';
    const arrow = (v: number) => v > 0 ? '\u25B2' : v < 0 ? '\u25BC' : '';

    html += `
      <tr class="hover:bg-fin-800/30 transition-colors">
        <td class="px-2 py-1.5">
          <a href="/commodities?commodity=${encodeURIComponent(d.name)}" class="text-fin-400 hover:underline truncate max-w-[140px] inline-block">${esc(d.name)}</a>
        </td>
        <td class="px-2 py-1.5">
          <div class="flex items-center gap-1.5 justify-center">
            <span class="${sentimentColor} text-[10px] font-bold">${sentimentLabel}</span>
            <div class="w-12 h-1.5 rounded-full bg-fin-800 overflow-hidden">
              <div class="h-full rounded-full" style="width:${pctWidth}%;background:${barColor}"></div>
            </div>
            <span class="text-slate-500 text-[10px] tabular-nums">${d.pctLong.toFixed(0)}%</span>
          </div>
        </td>
        <td class="px-2 py-1.5 text-right font-mono ${d.ncNet >= 0 ? 'text-emerald-400' : 'text-red-400'}">${fmtK(d.ncNet)}</td>
        <td class="px-2 py-1.5 text-right font-mono ${netChgColor}">${arrow(netChg)} ${fmtK(Math.abs(netChg))}</td>
        <td class="px-2 py-1.5 text-right font-mono text-slate-300">${fmtK(d.oi)}</td>
        <td class="px-2 py-1.5 text-right font-mono ${oiChgColor}">${arrow(d.oiChg)} ${fmtK(Math.abs(d.oiChg))}</td>
      </tr>
    `;
  }

  html += '</tbody></table></div>';
  container.innerHTML = html;
}
