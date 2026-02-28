/**
 * Energy Markets card - EIA energy data showing key price series
 * as KPI tiles with value, units, and period.
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

interface EnergySeries {
  id: string;
  label: string;
  value: number;
  units: string;
  period: string;
}

const TILE_COLORS = [
  { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400' },
  { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400' },
  { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400' },
  { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
  { bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400' },
  { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400' },
];

function shortLabel(desc: string, id: string): string {
  const d = desc || id;
  return d.length > 30 ? d.slice(0, 28) + '\u2026' : d;
}

function groupBySeries(rows: Record<string, unknown>[]): EnergySeries[] {
  const byId = new Map<string, Record<string, unknown>[]>();
  for (const r of rows) {
    const id = String(r.series_id ?? '');
    if (!byId.has(id)) byId.set(id, []);
    byId.get(id)!.push(r);
  }

  const result: EnergySeries[] = [];
  for (const [id, recs] of byId) {
    const sorted = recs.sort((a, b) =>
      String(b.period ?? '').localeCompare(String(a.period ?? '')),
    );
    const latest = sorted[0];
    if (!latest) continue;
    result.push({
      id,
      label: shortLabel(String(latest.description ?? ''), id),
      value: Number(latest.value ?? 0),
      units: String(latest.units ?? ''),
      period: String(latest.period ?? '').slice(0, 10),
    });
  }
  return result;
}

registerCard({
  type: 'energy',
  title: 'Energy Markets',
  description: 'Oil, gas and fuel prices from EIA',
  icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18a3.75 3.75 0 003.75-3.75c0-2.13-1.647-3.897-3.75-5.25-2.103 1.353-3.75 3.12-3.75 5.25A3.75 3.75 0 0012 18z" />',
  defaultSize: 'md',
  cacheTtl: 300_000,
  exploreUrl: '/explore?mode=data&source=fd_eia_energy',

  async fetch(): Promise<CardData> {
    const res = await apiFetch<unknown>('/api/v1/data/economic/energy?limit=40');
    return {
      payload: res.data,
      tokenCost: res.tokenCost,
      creditsRemaining: res.creditsRemaining,
    };
  },

  render(container, data) {
    const rows = items(data.payload);
    const series = groupBySeries(rows);

    if (series.length === 0) {
      container.innerHTML =
        '<p class="text-sm text-slate-500 text-center py-6">No energy data available.</p>';
      return;
    }

    const tiles = series.slice(0, 6).map((s, i) => {
      const c = TILE_COLORS[i % TILE_COLORS.length];
      const fmtVal = s.value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      return `<div class="rounded-lg ${c.bg} border ${c.border} p-3">
        <div class="text-[10px] text-slate-500 uppercase tracking-wider truncate">${e(s.label)}</div>
        <div class="text-xl font-bold tabular-nums text-slate-100 mt-1">${e(fmtVal)}</div>
        <div class="flex items-center gap-2 mt-0.5 text-[9px]">
          <span class="${c.text}">${e(s.units)}</span>
          <span class="text-slate-600">${e(s.period)}</span>
        </div>
      </div>`;
    }).join('');

    container.innerHTML = `
      <div class="space-y-3">
        <div class="flex items-center justify-end px-1">
          <a href="/explore?mode=data&source=fd_eia_energy" class="text-[10px] text-fin-400 hover:underline">All energy data \u2192</a>
        </div>
        <div class="grid grid-cols-2 gap-2">${tiles}</div>
      </div>`;
  },
});
