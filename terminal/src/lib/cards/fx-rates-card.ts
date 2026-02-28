/**
 * FX Rates card — currency pair tiles with rate + change indicator.
 */
import { registerCard } from '../card-registry';
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

const PAIR_FLAGS: Record<string, string> = {
  EUR: '\u20AC', USD: '$', GBP: '\u00A3', JPY: '\u00A5',
  CHF: 'Fr', CAD: 'C$', AUD: 'A$', NZD: 'NZ$',
  SEK: 'kr', NOK: 'kr', DKK: 'kr', PLN: 'z\u0142',
  CZK: 'K\u010D', HUF: 'Ft', TRY: '\u20BA', CNY: '\u00A5',
  HKD: 'HK$', SGD: 'S$', KRW: '\u20A9', INR: '\u20B9',
  BRL: 'R$', MXN: 'Mex$', ZAR: 'R', RUB: '\u20BD',
};

interface ParsedRate {
  pair: string;
  from: string;
  to: string;
  rate: number;
  date: string;
  prevRate: number | null;
}

function parseRates(list: Record<string, unknown>[]): ParsedRate[] {
  const byPair = new Map<string, { rate: number; date: string; prevRate: number | null }>();

  const sorted = [...list].sort((a, b) => {
    const da = String(a.date ?? '');
    const db = String(b.date ?? '');
    return db.localeCompare(da);
  });

  for (const r of sorted) {
    const from = String(r.currency_from ?? '');
    const to = String(r.currency_to ?? '');
    if (!from || !to) continue;
    const pair = `${from}/${to}`;
    const rate = Number(r.rate ?? 0);
    const date = String(r.date ?? '');

    const existing = byPair.get(pair);
    if (!existing) {
      byPair.set(pair, { rate, date, prevRate: null });
    } else if (existing.prevRate === null) {
      existing.prevRate = rate;
    }
  }

  return Array.from(byPair.entries()).map(([pair, v]) => ({
    pair,
    from: pair.split('/')[0],
    to: pair.split('/')[1],
    rate: v.rate,
    date: v.date,
    prevRate: v.prevRate,
  }));
}

registerCard({
  type: 'fx-rates',
  title: 'FX Rates',
  description: 'Major currency pairs — live rates',
  icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />',
  defaultSize: 'md',
  cacheTtl: 300_000,
  exploreUrl: '/explore?mode=data&source=ecb_observations',
  fetch: async () => {
    const res = await apiFetch<unknown>('/api/v1/data/fx/rates?limit=24');
    const raw = res.ok && res.data ? res.data : null;
    return {
      payload: raw,
      tokenCost: res.tokenCost,
      creditsRemaining: res.creditsRemaining,
    };
  },
  render: (container, data) => {
    const raw = data.payload;
    const list = items(raw);

    if (list.length === 0) {
      container.innerHTML = '<p class="text-sm text-red-400/90 p-4">Failed to load FX rates.</p>';
      return;
    }

    const rates = parseRates(list).slice(0, 12);
    const latestDate = rates[0]?.date?.slice(0, 10) ?? '';

    container.innerHTML = `
      <div class="space-y-3">
        <div class="flex items-center justify-between px-1">
          <span class="text-[10px] text-slate-500">${e(latestDate)}</span>
          <a href="/explore?mode=data&source=ecb_observations" class="text-[10px] text-fin-400 hover:underline">All rates \u2192</a>
        </div>
        <div class="grid grid-cols-2 gap-2">
          ${rates.map(r => {
            const change = r.prevRate !== null ? r.rate - r.prevRate : null;
            const pctChange = r.prevRate !== null && r.prevRate !== 0 ? ((r.rate - r.prevRate) / r.prevRate) * 100 : null;
            const isUp = change !== null && change > 0;
            const isDown = change !== null && change < 0;
            const changeColor = isUp ? 'text-emerald-400' : isDown ? 'text-red-400' : 'text-slate-500';
            const arrow = isUp ? '\u25B2' : isDown ? '\u25BC' : '';
            const bgHover = isUp ? 'hover:border-emerald-700/30' : isDown ? 'hover:border-red-700/30' : 'hover:border-fin-700';
            const sym = PAIR_FLAGS[r.from] ?? '';

            return `
              <a href="/explore?mode=data&source=ecb_observations&q=${encodeURIComponent(r.pair)}" 
                 class="block rounded-lg bg-fin-800/50 border border-fin-700/40 ${bgHover} px-3 py-2.5 transition-colors no-underline group">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-[11px] font-semibold text-slate-300 tracking-wide">${sym ? `<span class="text-slate-500 mr-0.5">${e(sym)}</span>` : ''}${e(r.pair)}</span>
                  ${pctChange !== null ? `<span class="text-[10px] font-mono ${changeColor}">${arrow} ${Math.abs(pctChange).toFixed(2)}%</span>` : ''}
                </div>
                <div class="text-lg font-bold tabular-nums text-slate-100 leading-tight">${e(r.rate.toFixed(4))}</div>
                ${change !== null ? `<div class="text-[10px] font-mono ${changeColor} mt-0.5">${change >= 0 ? '+' : ''}${change.toFixed(4)}</div>` : '<div class="text-[10px] text-slate-600 mt-0.5">\u2014</div>'}
              </a>`;
          }).join('')}
        </div>
      </div>
    `;
  },
});
