
/**
 * Global Development card - HDI + governance rankings.
 */
import { registerCard, type CardData } from '../card-registry';
import { apiFetch } from '../api-client';

const _E: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
function e(s: string): string { return String(s ?? '').replace(/[&<>"]/g, (c) => _E[c]); }
function items(raw: unknown): Record<string, unknown>[] { if (Array.isArray(raw)) return raw; if (raw && typeof raw === 'object') { if ('items' in raw) return (raw as Record<string, unknown>).items as Record<string, unknown>[] ?? []; if ('data' in raw) return (raw as Record<string, unknown>).data as Record<string, unknown>[] ?? []; } return []; }

interface DevRow { country: string; hdi: number | null; governance: number | null; year: string; }

function buildRows(hdiData: Record<string, unknown>[], govData: Record<string, unknown>[]): DevRow[] {
  const m = new Map<string, DevRow>();
  for (const r of hdiData) { const c = String(r.country ?? r.country_code ?? ''); if (!c) continue; const x = m.get(c) || { country: c, hdi: null, governance: null, year: '' }; x.hdi = Number(r.hdi_value ?? r.hdi ?? 0); x.year = String(r.year ?? ''); m.set(c, x); }
  for (const r of govData) { const c = String(r.country ?? r.country_code ?? ''); if (!c) continue; const x = m.get(c) || { country: c, hdi: null, governance: null, year: '' }; x.governance = Number(r.value ?? r.estimate ?? r.percentile_rank ?? 0); if (!x.year) x.year = String(r.year ?? ''); m.set(c, x); }
  return [...m.values()].sort((a, b) => (b.hdi ?? 0) - (a.hdi ?? 0));
}

registerCard({
  type: 'development',
  title: 'Global Development',
  description: 'HDI and governance rankings',
  icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />',
  defaultSize: 'sm',
  cacheTtl: 3_600_000,
  exploreUrl: '/explore?mode=data&source=fd_undp_hdi',
  async fetch(): Promise<CardData> {
    const [hdiRes, govRes] = await Promise.all([apiFetch<unknown>('/api/v1/data/development/hdi?limit=15').catch(() => null), apiFetch<unknown>('/api/v1/data/development/governance?limit=15').catch(() => null)]);
    return { payload: { hdi: hdiRes?.ok ? items(hdiRes.data) : [], gov: govRes?.ok ? items(govRes.data) : [] }, tokenCost: (hdiRes?.tokenCost ?? 0) + (govRes?.tokenCost ?? 0), creditsRemaining: hdiRes?.creditsRemaining ?? govRes?.creditsRemaining ?? null };
  },
  render(container, data) {
    const p = data.payload as { hdi: Record<string, unknown>[]; gov: Record<string, unknown>[] };
    const rows = buildRows(p.hdi ?? [], p.gov ?? []);
    if (!rows.length) { container.innerHTML = '<p class="text-sm text-slate-500 text-center py-6">No development data.</p>'; return; }
    let h = '';
    for (const r of rows.slice(0, 10)) {
      const pct = r.hdi !== null ? Math.min(r.hdi * 100, 100) : 0;
      const bc = pct >= 80 ? 'bg-emerald-500/40' : pct >= 60 ? 'bg-amber-500/40' : 'bg-red-500/40';
      const tc = pct >= 80 ? 'text-emerald-400' : pct >= 60 ? 'text-amber-400' : 'text-red-400';
      h += '<div class="flex items-center gap-2 py-1"><span class="text-[11px] text-slate-300 font-medium w-[60px] flex-shrink-0 truncate">' + e(r.country) + '</span><div class="flex-1 h-3.5 bg-fin-800/40 rounded overflow-hidden"><div class="h-full ' + bc + ' rounded" style="width:' + pct.toFixed(1) + '%"></div></div>' + (r.hdi !== null ? '<span class="text-[11px] tabular-nums font-medium ' + tc + ' w-[40px] text-right flex-shrink-0">' + r.hdi.toFixed(3) + '</span>' : '<span class="w-[40px]"></span>') + (r.governance !== null ? '<span class="text-[9px] text-slate-500 w-[30px] text-right flex-shrink-0">' + r.governance.toFixed(0) + '%</span>' : '') + '</div>';
    }
    container.innerHTML = '<div class="space-y-2"><div class="flex items-center justify-between px-1"><div class="flex items-center gap-3 text-[9px] text-slate-600"><span>HDI</span><span>Gov %ile</span></div><a href="/explore?mode=data&source=fd_undp_hdi" class="text-[10px] text-fin-400 hover:underline">Explore \u2192</a></div><div class="space-y-0.5">' + h + '</div></div>';
  },
});
