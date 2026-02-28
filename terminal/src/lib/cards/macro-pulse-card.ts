/**
 * Macro Pulse card - BLS + BEA headline economic KPIs.
 */
import { registerCard, type CardData } from '../card-registry';
import { apiFetch } from '../api-client';

const _E: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
function e(s: string): string { return String(s ?? '').replace(/[&<>"]/g, (c) => _E[c]); }
function items(raw: unknown): Record<string, unknown>[] { if (Array.isArray(raw)) return raw; if (raw && typeof raw === 'object') { if ('items' in raw) return (raw as Record<string, unknown>).items as Record<string, unknown>[] ?? []; if ('data' in raw) return (raw as Record<string, unknown>).data as Record<string, unknown>[] ?? []; } return []; }

const KPI_COLORS = [
  { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400' },
  { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
  { bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400' },
  { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400' },
  { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400' },
  { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400' },
];

interface KpiTile { label: string; source: string; value: number; period: string; prevValue: number | null; color: typeof KPI_COLORS[0]; }

function buildKpis(blsRows: Record<string, unknown>[], beaRows: Record<string, unknown>[]): KpiTile[] {
  const tiles: KpiTile[] = [];
  const byId = (rows: Record<string, unknown>[]) => { const m = new Map<string, Record<string, unknown>[]>(); for (const r of rows) { const id = String(r.series_id ?? ''); if (!m.has(id)) m.set(id, []); m.get(id)!.push(r); } return m; };
  const add = (recs: Record<string, unknown>[], label: string, src: string, ci: number) => { if (!recs.length) return; const s = [...recs].sort((a, b) => String(b.period ?? '').localeCompare(String(a.period ?? ''))); tiles.push({ label, source: src, value: Number(s[0].value ?? 0), period: String(s[0].period ?? '').slice(0, 10), prevValue: s[1] ? Number(s[1].value ?? 0) : null, color: KPI_COLORS[ci % KPI_COLORS.length] }); };
  let ci = 0; for (const [id, r] of byId(blsRows)) add(r, id, 'BLS', ci++); for (const [id, r] of byId(beaRows)) add(r, id, 'BEA', ci++);
  return tiles;
}

registerCard({
  type: 'macro-pulse',
  title: 'Macro Pulse',
  description: 'Key economic indicators (BLS, BEA)',
  icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />',
  defaultSize: 'md',
  cacheTtl: 600_000,
  exploreUrl: '/explore?mode=data&source=im_macro_bls_series',
  async fetch(): Promise<CardData> {
    const [blsRes, beaRes] = await Promise.all([apiFetch<unknown>('/api/v1/macro/bls-series?limit=12').catch(() => null), apiFetch<unknown>('/api/v1/macro/bea-series?limit=12').catch(() => null)]);
    return { payload: { bls: blsRes?.ok ? items(blsRes.data) : [], bea: beaRes?.ok ? items(beaRes.data) : [] }, tokenCost: (blsRes?.tokenCost ?? 0) + (beaRes?.tokenCost ?? 0), creditsRemaining: blsRes?.creditsRemaining ?? beaRes?.creditsRemaining ?? null };
  },
  render(container, data) {
    const p = data.payload as { bls: Record<string, unknown>[]; bea: Record<string, unknown>[] };
    const tiles = buildKpis(p.bls ?? [], p.bea ?? []);
    if (!tiles.length) { container.innerHTML = '<p class="text-sm text-slate-500 text-center py-6">No macro data available.</p>'; return; }
    let h = '';
    for (const t of tiles.slice(0, 6)) {
      const ch = t.prevValue !== null ? t.value - t.prevValue : null;
      const up = ch !== null && ch > 0; const dn = ch !== null && ch < 0;
      const arr = up ? '\u25B2' : dn ? '\u25BC' : '';
      const cc = up ? 'text-red-400' : dn ? 'text-emerald-400' : 'text-slate-500';
      h += '<div class="rounded-lg ' + t.color.bg + ' border ' + t.color.border + ' p-3"><div class="flex items-center gap-1.5"><div class="text-[10px] text-slate-500 uppercase tracking-wider truncate">' + e(t.label) + '</div><span class="text-[8px] ' + t.color.text + ' font-mono">' + e(t.source) + '</span></div><div class="text-xl font-bold tabular-nums text-slate-100 mt-1">' + e(t.value.toLocaleString(undefined, { maximumFractionDigits: 2 })) + '</div><div class="flex items-center gap-2 mt-0.5 text-[9px]">' + (ch !== null ? '<span class="' + cc + ' font-mono">' + arr + ' ' + Math.abs(ch).toFixed(2) + '</span>' : '') + '<span class="text-slate-600">' + e(t.period) + '</span></div></div>';
    }
    container.innerHTML = '<div class="space-y-3"><div class="flex items-center justify-end px-1"><a href="/explore?mode=data&source=im_macro_bls_series" class="text-[10px] text-fin-400 hover:underline">All macro data \u2192</a></div><div class="grid grid-cols-2 gap-2">' + h + '</div></div>';
  },
});
