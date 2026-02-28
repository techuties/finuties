
/**
 * Commodities card - USDA WASDE + WFP hunger tiles.
 */
import { registerCard, type CardData } from '../card-registry';
import { apiFetch } from '../api-client';

const _E: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
function e(s: string): string { return String(s ?? '').replace(/[&<>"]/g, (c) => _E[c]); }
function items(raw: unknown): Record<string, unknown>[] { if (Array.isArray(raw)) return raw; if (raw && typeof raw === 'object') { if ('items' in raw) return (raw as Record<string, unknown>).items as Record<string, unknown>[] ?? []; if ('data' in raw) return (raw as Record<string, unknown>).data as Record<string, unknown>[] ?? []; } return []; }

const COMMODITY_COLORS: Record<string, string> = { corn: 'bg-amber-500/15 border-amber-500/20', wheat: 'bg-orange-500/15 border-orange-500/20', soybeans: 'bg-emerald-500/15 border-emerald-500/20', rice: 'bg-cyan-500/15 border-cyan-500/20', cotton: 'bg-violet-500/15 border-violet-500/20', sugar: 'bg-pink-500/15 border-pink-500/20' };
function commodityStyle(name: string): string { const l = name.toLowerCase(); for (const [k, c] of Object.entries(COMMODITY_COLORS)) { if (l.includes(k)) return c; } return 'bg-fin-700/20 border-fin-600/20'; }

registerCard({
  type: 'commodities',
  title: 'Commodities',
  description: 'USDA supply/demand and hunger indicators',
  icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.893 13.393l-1.135-1.135a2.252 2.252 0 01-.421-.585l-1.08-2.16a.414.414 0 00-.663-.107.827.827 0 01-.812.21l-1.273-.363a.89.89 0 00-.738 1.595l.587.39c.59.395.674 1.23.172 1.732l-.2.2c-.212.212-.33.498-.33.796v.41c0 .409-.11.809-.32 1.158l-1.315 2.191a2.11 2.11 0 01-1.81 1.025 1.055 1.055 0 01-1.055-1.055v-1.172c0-.92-.56-1.747-1.414-2.089l-.655-.261a2.25 2.25 0 01-1.383-2.46l.007-.042a2.25 2.25 0 01.29-.787l.09-.15a2.25 2.25 0 012.37-1.048l1.178.236a1.125 1.125 0 001.302-.795l.208-.73a1.125 1.125 0 00-.578-1.315l-.665-.332-.091.091a2.25 2.25 0 01-1.591.659h-.18c-.249 0-.487.1-.662.274a.931.931 0 01-1.458-1.137l1.411-2.353a2.25 2.25 0 00.286-.76m11.928 9.869A9 9 0 008.965 3.525m11.928 9.868A9 9 0 118.965 3.525" />',
  defaultSize: 'sm',
  cacheTtl: 600_000,
  exploreUrl: '/explore?mode=data&source=fd_usda_wasde',
  async fetch(): Promise<CardData> {
    const [wasdeRes, hungerRes] = await Promise.all([apiFetch<unknown>('/api/v1/data/food/wasde?limit=15').catch(() => null), apiFetch<unknown>('/api/v1/data/food/hunger?limit=8').catch(() => null)]);
    return { payload: { wasde: wasdeRes?.ok ? items(wasdeRes.data) : [], hunger: hungerRes?.ok ? items(hungerRes.data) : [] }, tokenCost: (wasdeRes?.tokenCost ?? 0) + (hungerRes?.tokenCost ?? 0), creditsRemaining: wasdeRes?.creditsRemaining ?? hungerRes?.creditsRemaining ?? null };
  },
  render(container, data) {
    const p = data.payload as { wasde: Record<string, unknown>[]; hunger: Record<string, unknown>[] };
    if (!p.wasde?.length && !p.hunger?.length) { container.innerHTML = '<p class="text-sm text-slate-500 text-center py-6">No data.</p>'; return; }
    let wh = '';
    for (const r of (p.wasde ?? []).slice(0, 8)) {
      const c = String(r.commodity ?? ''); const a = String(r.attribute ?? ''); const v = Number(r.value ?? 0); const u = String(r.unit ?? ''); const rg = String(r.region ?? ''); const st = commodityStyle(c);
      wh += '<div class="rounded-lg border ' + st + ' p-2"><div class="text-[10px] text-slate-400 truncate">' + e(c) + '</div><div class="text-sm font-bold tabular-nums text-slate-100">' + e(v.toLocaleString()) + ' <span class="text-[9px] text-slate-500 font-normal">' + e(u) + '</span></div><div class="text-[9px] text-slate-600 truncate">' + e(a) + (rg ? ' \u00b7 ' + e(rg) : '') + '</div></div>';
    }
    let hh = '';
    for (const r of (p.hunger ?? []).slice(0, 4)) {
      hh += '<div class="flex items-center gap-2 text-[11px] py-1"><span class="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0"></span><span class="text-slate-300 font-medium">' + e(String(r.country ?? '')) + '</span><span class="text-slate-500 truncate flex-1">' + e(String(r.indicator ?? '')) + '</span><span class="tabular-nums text-orange-400 font-medium">' + e(Number(r.value ?? 0).toFixed(1)) + '</span></div>';
    }
    container.innerHTML = '<div class="space-y-3"><div class="flex items-center justify-end px-1"><a href="/explore?mode=data&source=fd_usda_wasde" class="text-[10px] text-fin-400 hover:underline">Explore \u2192</a></div>' + (wh ? '<div class="grid grid-cols-2 gap-1.5">' + wh + '</div>' : '') + (hh ? '<div class="border-t border-fin-700/30 pt-2 mt-2"><div class="text-[10px] text-slate-500 uppercase tracking-wider px-1 mb-1">Hunger Indicators</div>' + hh + '</div>' : '') + '</div>';
  },
});
