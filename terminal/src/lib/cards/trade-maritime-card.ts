/**
 * Trade and Shipping card - UN COMTRADE flows + maritime vessel events.
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
    if ('items' in raw) return (raw as Record<string, unknown>).items as Record<string, unknown>[] ?? [];
    if ('data' in raw) return (raw as Record<string, unknown>).data as Record<string, unknown>[] ?? [];
  }
  return [];
}

function fmtValue(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e12) return '$' + (v / 1e12).toFixed(1) + 'T';
  if (abs >= 1e9) return '$' + (v / 1e9).toFixed(1) + 'B';
  if (abs >= 1e6) return '$' + (v / 1e6).toFixed(1) + 'M';
  if (abs >= 1e3) return '$' + (v / 1e3).toFixed(1) + 'K';
  return '$' + v.toLocaleString();
}

registerCard({
  type: 'trade-maritime',
  title: 'Trade & Shipping',
  description: 'Global trade flows and vessel activity',
  icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />',
  defaultSize: 'md',
  cacheTtl: 600_000,
  exploreUrl: '/explore?mode=data&source=fd_comtrade_trade',

  async fetch(): Promise<CardData> {
    const [tradeRes, maritimeRes] = await Promise.all([
      apiFetch<unknown>('/api/v1/data/trade/flows?limit=10').catch(() => null),
      apiFetch<unknown>('/api/v1/data/maritime/events?limit=6').catch(() => null),
    ]);
    const totalCost = (tradeRes?.tokenCost ?? 0) + (maritimeRes?.tokenCost ?? 0);
    const credits = tradeRes?.creditsRemaining ?? maritimeRes?.creditsRemaining ?? null;
    return {
      payload: {
        trade: tradeRes?.ok ? items(tradeRes.data) : [],
        maritime: maritimeRes?.ok ? items(maritimeRes.data) : [],
      },
      tokenCost: totalCost,
      creditsRemaining: credits,
    };
  },

  render(container, data) {
    const payload = data.payload as { trade: Record<string, unknown>[]; maritime: Record<string, unknown>[] };
    const trade = payload.trade ?? [];
    const maritime = payload.maritime ?? [];

    if (trade.length === 0 && maritime.length === 0) {
      container.innerHTML = '<p class="text-sm text-slate-500 text-center py-6">No data available.</p>';
      return;
    }

    const totalTradeValue = trade.reduce((sum, r) => sum + Number(r.trade_value ?? 0), 0);
    const topRoute = trade
      .slice(0, 12)
      .sort((a, b) => Number(b.trade_value ?? 0) - Number(a.trade_value ?? 0))[0];
    const topRouteShare = topRoute && totalTradeValue > 0
      ? (Number(topRoute.trade_value ?? 0) / totalTradeValue) * 100
      : 0;
    const exportCount = trade.filter((r) => String(r.trade_flow ?? '').toLowerCase().includes('export')).length;
    const importCount = Math.max(0, trade.length - exportCount);

    let tradeHtml = '';
    for (const r of trade.slice(0, 6)) {
      const reporter = String(r.reporter_code ?? '');
      const partner = String(r.partner_code ?? '');
      const val = Number(r.trade_value ?? 0);
      const flow = String(r.trade_flow ?? '');
      const year = String(r.year ?? '');
      const flowColor = flow.toLowerCase().includes('export') ? 'text-emerald-400' : 'text-blue-400';

      tradeHtml += '<div class="flex items-center gap-2 rounded-lg bg-fin-800/30 border border-fin-700/20 px-3 py-2">'
        + '<span class="text-sm font-medium text-slate-200 min-w-[40px]">' + e(reporter) + '</span>'
        + '<svg class="w-3 h-3 text-slate-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>'
        + '<span class="text-sm text-slate-300 min-w-[40px]">' + e(partner) + '</span>'
        + '<span class="flex-1 text-right tabular-nums text-sm text-slate-100 font-medium">' + e(fmtValue(val)) + '</span>'
        + '<span class="text-[9px] ' + flowColor + ' font-mono uppercase">' + e(flow) + '</span>'
        + '<span class="text-[9px] text-slate-600">' + e(year) + '</span>'
        + '</div>';
    }

    let maritimeHtml = '';
    for (const r of maritime.slice(0, 4)) {
      const vessel = String(r.vessel_name ?? 'Unknown');
      const flag = String(r.vessel_flag ?? '');
      const evType = String(r.event_type ?? '');
      const port = String(r.port_name ?? '');
      const date = String(r.start_time ?? '').slice(0, 10);

      maritimeHtml += '<div class="flex items-center gap-2 text-[11px] py-1">'
        + '<span class="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0"></span>'
        + '<span class="text-slate-200 font-medium truncate">' + e(vessel) + '</span>'
        + (flag ? '<span class="text-slate-600">' + e(flag) + '</span>' : '')
        + '<span class="text-cyan-400/70 text-[9px] uppercase">' + e(evType) + '</span>'
        + (port ? '<span class="text-slate-500">' + e(port) + '</span>' : '')
        + '<span class="text-slate-600 ml-auto flex-shrink-0">' + e(date) + '</span>'
        + '</div>';
    }

    container.innerHTML = '<div class="space-y-3">'
      + '<div class="rounded-lg border border-fin-700/30 bg-fin-800/25 px-3 py-2">'
      + '<div class="flex items-end justify-between">'
      + '<div><div class="text-[10px] text-slate-500 uppercase tracking-wider">Flow Snapshot</div>'
      + '<div class="text-xl font-mono tabular-nums font-bold text-slate-200">' + e(fmtValue(totalTradeValue)) + '</div></div>'
      + '<span class="text-[10px] text-slate-500">' + trade.length + ' routes</span></div>'
      + '<div class="mt-1 text-[10px] text-slate-500">' + (topRoute ? e(String(topRoute.reporter_code ?? '') + '→' + String(topRoute.partner_code ?? '')) + ' top route · ' + e(topRouteShare.toFixed(1)) + '%' : 'No top route') + '</div>'
      + '<div class="mt-2 h-1.5 w-full rounded bg-fin-900/70 overflow-hidden flex">'
      + '<span class="bg-emerald-400" style="width:' + (trade.length ? ((exportCount / trade.length) * 100).toFixed(1) : '0') + '%"></span>'
      + '<span class="bg-blue-400" style="width:' + (trade.length ? ((importCount / trade.length) * 100).toFixed(1) : '0') + '%"></span>'
      + '</div>'
      + '<div class="mt-1 flex items-center justify-between text-[10px] text-slate-500"><span>Exports ' + exportCount + '</span><span>Maritime events ' + maritime.length + '</span></div>'
      + '</div>'
      + '<div class="flex items-center justify-end px-1"><a href="/explore?mode=data&source=fd_comtrade_trade" class="text-[10px] text-fin-400 hover:underline">Explore \u2192</a></div>'
      + (tradeHtml ? '<div class="space-y-1">' + tradeHtml + '</div>' : '')
      + (maritimeHtml ? '<div class="border-t border-fin-700/30 pt-2 mt-2 space-y-0.5">'
        + '<div class="text-[10px] text-slate-500 uppercase tracking-wider px-1 mb-1">Vessel Activity</div>'
        + maritimeHtml + '</div>' : '')
      + '</div>';
  },
});
