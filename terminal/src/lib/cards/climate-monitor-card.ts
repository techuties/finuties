
/**
 * Climate Monitor card - Temperature anomaly + sea ice + greenhouse gas KPIs.
 */
import { registerCard, type CardData } from '../card-registry';
import { apiFetch } from '../api-client';

const _E: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
function e(s: string): string { return String(s ?? '').replace(/[&<>"]/g, (c) => _E[c]); }
function items(raw: unknown): Record<string, unknown>[] { if (Array.isArray(raw)) return raw; if (raw && typeof raw === 'object') { if ('items' in raw) return (raw as Record<string, unknown>).items as Record<string, unknown>[] ?? []; if ('data' in raw) return (raw as Record<string, unknown>).data as Record<string, unknown>[] ?? []; } return []; }

registerCard({
  type: 'climate-monitor',
  title: 'Climate Monitor',
  description: 'Temperature, sea ice and greenhouse gas levels',
  icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />',
  defaultSize: 'sm',
  cacheTtl: 3_600_000,
  exploreUrl: '/explore?mode=data&source=fd_nasa_temperature',
  async fetch(): Promise<CardData> {
    const [tempRes, iceRes, ghgRes] = await Promise.all([apiFetch<unknown>('/api/v1/data/climate/temperature?limit=12').catch(() => null), apiFetch<unknown>('/api/v1/data/climate/sea-ice?limit=12').catch(() => null), apiFetch<unknown>('/api/v1/data/climate/greenhouse-gas?limit=12').catch(() => null)]);
    return { payload: { temp: tempRes?.ok ? items(tempRes.data) : [], ice: iceRes?.ok ? items(iceRes.data) : [], ghg: ghgRes?.ok ? items(ghgRes.data) : [] }, tokenCost: (tempRes?.tokenCost ?? 0) + (iceRes?.tokenCost ?? 0) + (ghgRes?.tokenCost ?? 0), creditsRemaining: tempRes?.creditsRemaining ?? iceRes?.creditsRemaining ?? ghgRes?.creditsRemaining ?? null };
  },
  render(container, data) {
    const p = data.payload as { temp: Record<string, unknown>[]; ice: Record<string, unknown>[]; ghg: Record<string, unknown>[] };
    if (!p.temp?.length && !p.ice?.length && !p.ghg?.length) { container.innerHTML = '<p class="text-sm text-slate-500 text-center py-6">No climate data.</p>'; return; }
    const tiles: string[] = [];
    if (p.temp?.length) {
      const s = [...p.temp].sort((a, b) => { const ya = Number(a.year ?? 0); const yb = Number(b.year ?? 0); if (yb !== ya) return yb - ya; return Number(b.month ?? 0) - Number(a.month ?? 0); });
      const l = s[0]; const an = Number(l.anomaly ?? 0); const clr = an > 0 ? 'text-red-400' : 'text-cyan-400'; const sign = an > 0 ? '+' : '';
      tiles.push('<div class="rounded-lg bg-red-500/10 border border-red-500/20 p-3"><div class="text-[10px] text-slate-500 uppercase tracking-wider">Temp Anomaly</div><div class="text-2xl font-bold tabular-nums ' + clr + ' mt-1">' + sign + an.toFixed(2) + '\u00b0C</div><div class="text-[9px] text-slate-600">' + e(String(l.year ?? '')) + '/' + e(String(l.month ?? '').padStart(2, '0')) + '</div></div>');
    }
    if (p.ice?.length) {
      const s = [...p.ice].sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')));
      const l = s[0]; const ext = Number(l.extent ?? l.extent_million_km2 ?? 0); const hem = String(l.hemisphere ?? '');
      tiles.push('<div class="rounded-lg bg-cyan-500/10 border border-cyan-500/20 p-3"><div class="text-[10px] text-slate-500 uppercase tracking-wider">Sea Ice ' + e(hem) + '</div><div class="text-2xl font-bold tabular-nums text-cyan-400 mt-1">' + ext.toFixed(2) + ' M km\u00b2</div><div class="text-[9px] text-slate-600">' + e(String(l.date ?? '').slice(0, 10)) + '</div></div>');
    }
    if (p.ghg?.length) {
      const s = [...p.ghg].sort((a, b) => { const ya = Number(a.year ?? 0); const yb = Number(b.year ?? 0); if (yb !== ya) return yb - ya; return Number(b.month ?? 0) - Number(a.month ?? 0); });
      const l = s[0]; const v = Number(l.value ?? 0); const gas = String(l.gas ?? 'CO2');
      tiles.push('<div class="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3"><div class="text-[10px] text-slate-500 uppercase tracking-wider">' + e(gas) + ' Level</div><div class="text-2xl font-bold tabular-nums text-amber-400 mt-1">' + v.toFixed(1) + ' ppm</div><div class="text-[9px] text-slate-600">' + e(String(l.year ?? '')) + '/' + e(String(l.month ?? '').padStart(2, '0')) + '</div></div>');
    }
    const colsClass: Record<number, string> = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3' };
    const cls = colsClass[Math.min(tiles.length, 3)] ?? 'grid-cols-1';
    container.innerHTML = '<div class="space-y-3"><div class="flex items-center justify-end px-1"><a href="/explore?mode=data&source=fd_nasa_temperature" class="text-[10px] text-fin-400 hover:underline">Explore \u2192</a></div><div class="grid ' + cls + ' gap-2">' + tiles.join('') + '</div></div>';
  },
});
