/**
 * Food Prices card - FAO food price index by category as colored tiles.
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

interface PriceTile {
  category: string;
  value: number;
  prevValue: number | null;
  date: string;
}

const CAT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  meat: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400' },
  dairy: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400' },
  cereals: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400' },
  oils: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
  sugar: { bg: 'bg-pink-500/10', border: 'border-pink-500/20', text: 'text-pink-400' },
};

const DEFAULT_COLOR = { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400' };

function catColor(cat: string) {
  const lower = cat.toLowerCase();
  for (const [key, val] of Object.entries(CAT_COLORS)) {
    if (lower.includes(key)) return val;
  }
  return DEFAULT_COLOR;
}

function buildTiles(rows: Record<string, unknown>[]): PriceTile[] {
  const byCat = new Map<string, Record<string, unknown>[]>();
  for (const r of rows) {
    const cat = String(r.category ?? r.index_type ?? 'Food Price Index');
    if (!byCat.has(cat)) byCat.set(cat, []);
    byCat.get(cat)!.push(r);
  }

  const result: PriceTile[] = [];
  for (const [cat, recs] of byCat) {
    const sorted = recs.sort((a, b) =>
      String(b.date ?? '').localeCompare(String(a.date ?? '')),
    );
    const latest = sorted[0];
    const prev = sorted[1] ?? null;
    if (!latest) continue;
    result.push({
      category: cat,
      value: Number(latest.value ?? latest.nominal_value ?? 0),
      prevValue: prev ? Number(prev.value ?? prev.nominal_value ?? 0) : null,
      date: String(latest.date ?? '').slice(0, 10),
    });
  }
  return result;
}

registerCard({
  type: 'food-prices',
  title: 'Food Prices',
  description: 'FAO food price index by category',
  icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.379a48.474 48.474 0 00-6-.371c-2.032 0-4.034.126-6 .371m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.169c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M12.265 3.11a.375.375 0 11-.53 0L12 2.845l.265.265zm-3 0a.375.375 0 11-.53 0L9 2.845l.265.265zm6 0a.375.375 0 11-.53 0L15 2.845l.265.265z" />',
  defaultSize: 'sm',
  cacheTtl: 600_000,
  exploreUrl: '/explore?mode=data&source=fd_fao_price_index',

  async fetch(): Promise<CardData> {
    const res = await apiFetch<unknown>('/api/v1/data/food/price-index?limit=30');
    return {
      payload: res.data,
      tokenCost: res.tokenCost,
      creditsRemaining: res.creditsRemaining,
    };
  },

  render(container, data) {
    const rows = items(data.payload);
    const tiles = buildTiles(rows);

    if (tiles.length === 0) {
      container.innerHTML = '<p class="text-sm text-slate-500 text-center py-6">No food price data.</p>';
      return;
    }

    const html = tiles.map(t => {
      const c = catColor(t.category);
      const change = t.prevValue !== null ? t.value - t.prevValue : null;
      const isUp = change !== null && change > 0;
      const isDown = change !== null && change < 0;
      const arrow = isUp ? '\u25B2' : isDown ? '\u25BC' : '';
      const changeColor = isUp ? 'text-red-400' : isDown ? 'text-emerald-400' : 'text-slate-500';
      const pct = t.prevValue && t.prevValue !== 0 && change !== null
        ? ((change / t.prevValue) * 100).toFixed(1) + '%'
        : '';

      return '<div class="rounded-lg ' + c.bg + ' border ' + c.border + ' p-3">'
        + '<div class="text-[10px] text-slate-500 uppercase tracking-wider truncate">' + e(t.category) + '</div>'
        + '<div class="text-lg font-bold tabular-nums text-slate-100 mt-1">' + e(t.value.toFixed(1)) + '</div>'
        + '<div class="flex items-center gap-2 mt-0.5 text-[9px]">'
        + (change !== null ? '<span class="' + changeColor + ' font-mono">' + arrow + ' ' + pct + '</span>' : '')
        + '<span class="text-slate-600">' + e(t.date) + '</span>'
        + '</div></div>';
    }).join('');

    container.innerHTML = '<div class="space-y-3">'
      + '<div class="flex items-center justify-end px-1">'
      + '<a href="/explore?mode=data&source=fd_fao_price_index" class="text-[10px] text-fin-400 hover:underline">All indices \u2192</a>'
      + '</div>'
      + '<div class="grid grid-cols-2 gap-2">' + html + '</div>'
      + '</div>';
  },
});
