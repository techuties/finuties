/**
 * Crypto Prices card — coin tiles with price, 24h change badge, and mini bar.
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
    if ('items' in raw) return (raw as { items?: unknown[] }).items ?? [];
    if ('data' in raw) return (raw as { data?: unknown[] }).data ?? [];
  }
  return [];
}

function fmtPrice(v: unknown): string {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '0'));
  if (isNaN(n)) return '\u2014';
  if (n >= 1000) return '$' + n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (n >= 1) return '$' + n.toFixed(2);
  return '$' + n.toPrecision(4);
}

function fmtMcap(v: unknown): string {
  const n = Number(v);
  if (!n || isNaN(n)) return '';
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(1) + 'T';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  return '$' + n.toLocaleString();
}

registerCard({
  type: 'crypto-prices',
  title: 'Crypto Prices',
  description: 'Top cryptocurrencies — prices & 24h change',
  icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />',
  defaultSize: 'md',
  cacheTtl: 120_000,
  exploreUrl: '/explore?mode=data&source=crypto_prices',
  fetch: async () => {
    const res = await apiFetch('/api/v1/data/crypto/prices?limit=12');
    return {
      payload: res.data,
      tokenCost: res.tokenCost,
      creditsRemaining: res.creditsRemaining,
    };
  },
  render: (container, data) => {
    const rows = items(data.payload);

    if (rows.length === 0) {
      container.innerHTML = '<p class="text-sm text-red-400/90 p-4">Failed to load crypto data.</p>';
      return;
    }

    const maxPrice = Math.max(...rows.map(r => {
      const v = r.price ?? r.last ?? r.usd ?? r.value;
      return typeof v === 'number' ? v : parseFloat(String(v ?? '0')) || 0;
    }), 1);

    container.innerHTML = `
      <div class="space-y-3">
        <div class="flex items-center justify-end px-1">
          <a href="/explore?mode=data&source=crypto_prices" class="text-[10px] text-fin-400 hover:underline">All coins \u2192</a>
        </div>
        <div class="space-y-1.5">
          ${rows.map(r => {
            const sym = String(r.symbol ?? r.coin_id ?? r.id ?? '\u2014').toUpperCase();
            const name = String(r.name ?? r.coin_id ?? r.id ?? '\u2014');
            const price = r.price ?? r.last ?? r.usd ?? r.value;
            const priceNum = typeof price === 'number' ? price : parseFloat(String(price ?? '0')) || 0;
            const change = Number(r.change ?? r.changePercent ?? r.price_change_percentage_24h ?? r.price_change_24h ?? 0);
            const mcap = r.market_cap ?? r.marketCap ?? null;
            const isUp = change > 0;
            const isDown = change < 0;
            const changeColor = isUp ? 'text-emerald-400' : isDown ? 'text-red-400' : 'text-slate-500';
            const changeBg = isUp ? 'bg-emerald-400/10' : isDown ? 'bg-red-400/10' : 'bg-slate-700/30';
            const arrow = isUp ? '\u25B2' : isDown ? '\u25BC' : '';
            const barWidth = maxPrice > 0 ? Math.max(4, (priceNum / maxPrice) * 100) : 4;
            const barColor = isUp ? '#22c55e' : isDown ? '#ef4444' : '#475569';

            return `
              <a href="/explore?q=${encodeURIComponent(sym)}" 
                 class="flex items-center gap-3 rounded-lg bg-fin-800/40 border border-fin-700/30 hover:border-fin-700 px-3 py-2 transition-colors no-underline group">
                <div class="flex-shrink-0 w-16">
                  <div class="text-sm font-bold text-slate-200">${e(sym)}</div>
                  <div class="text-[10px] text-slate-500 truncate">${e(name)}</div>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="h-1.5 rounded-full bg-fin-800/80 overflow-hidden">
                    <div class="h-full rounded-full transition-all" style="width:${barWidth.toFixed(1)}%;background:${barColor}"></div>
                  </div>
                  ${mcap ? `<div class="text-[9px] text-slate-600 mt-0.5">MCap ${e(fmtMcap(mcap))}</div>` : ''}
                </div>
                <div class="flex-shrink-0 text-right">
                  <div class="text-sm font-semibold tabular-nums text-slate-100">${e(fmtPrice(price))}</div>
                  <span class="inline-flex items-center gap-0.5 rounded-full ${changeBg} px-1.5 py-0.5 text-[10px] font-mono ${changeColor}">
                    ${arrow} ${Math.abs(change).toFixed(2)}%
                  </span>
                </div>
              </a>`;
          }).join('')}
        </div>
      </div>
    `;
  },
});
