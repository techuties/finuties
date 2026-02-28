/**
 * Insider Transactions card — activity feed with buy/sell visual badges.
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

function fmtShares(v: unknown): string {
  const n = Number(v);
  if (!n || isNaN(n)) return '\u2014';
  const abs = Math.abs(n);
  if (abs >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (abs >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toLocaleString();
}

function classifyType(raw: string): 'buy' | 'sell' | 'other' {
  const t = raw.toLowerCase();
  if (t.includes('purchase') || t.includes('buy') || t === 'p' || t === 'a') return 'buy';
  if (t.includes('sale') || t.includes('sell') || t === 's' || t === 'd') return 'sell';
  return 'other';
}

registerCard({
  type: 'insider-transactions',
  title: 'Insider Activity',
  description: 'Latest insider buys & sells',
  icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />',
  defaultSize: 'md',
  cacheTtl: 180_000,
  exploreUrl: '/explore?mode=data&source=sec_insider-transactions',
  fetch: async () => {
    const res = await apiFetch('/api/v1/sec/insider-transactions?limit=12');
    return {
      payload: res.data,
      tokenCost: res.tokenCost,
      creditsRemaining: res.creditsRemaining,
    };
  },
  render: (container, data) => {
    const rows = items(data.payload);

    if (rows.length === 0) {
      container.innerHTML = '<p class="text-sm text-slate-500 text-center py-6">No insider transactions.</p>';
      return;
    }

    const buyCount = rows.filter(r => classifyType(String(r.type ?? r.transactionType ?? '')) === 'buy').length;
    const sellCount = rows.filter(r => classifyType(String(r.type ?? r.transactionType ?? '')) === 'sell').length;
    let buyShares = 0;
    let sellShares = 0;
    for (const r of rows) {
      const shares = Number(r.shares ?? r.sharesTransacted ?? 0);
      if (!Number.isFinite(shares) || shares <= 0) continue;
      const kind = classifyType(String(r.type ?? r.transactionType ?? ''));
      if (kind === 'buy') buyShares += shares;
      if (kind === 'sell') sellShares += shares;
    }
    const totalFlow = Math.max(buyShares + sellShares, 1);
    const netShares = buyShares - sellShares;
    const buySharePct = (buyShares / totalFlow) * 100;
    const sellSharePct = (sellShares / totalFlow) * 100;

    container.innerHTML = `
      <div class="space-y-3">
        <div class="rounded-lg border border-fin-700/30 bg-fin-800/25 px-3 py-2">
          <div class="flex items-end justify-between">
            <div>
              <div class="text-[10px] text-slate-500 uppercase tracking-wider">Net Flow</div>
              <div class="text-xl font-mono tabular-nums font-bold ${netShares >= 0 ? 'text-emerald-400' : 'text-red-400'}">${netShares >= 0 ? '+' : ''}${e(fmtShares(netShares))}</div>
            </div>
            <span class="text-[10px] text-slate-500">${buySharePct.toFixed(0)}% buy / ${sellSharePct.toFixed(0)}% sell</span>
          </div>
          <div class="mt-2 h-1.5 w-full rounded bg-fin-900/70 overflow-hidden flex">
            <span class="bg-emerald-400" style="width:${((buyShares / totalFlow) * 100).toFixed(1)}%"></span>
            <span class="bg-red-400" style="width:${((sellShares / totalFlow) * 100).toFixed(1)}%"></span>
          </div>
          <div class="mt-1 flex items-center justify-between text-[10px] text-slate-500"><span>Buy flow ${e(fmtShares(buyShares))}</span><span>Sell flow ${e(fmtShares(sellShares))}</span></div>
        </div>
        <div class="flex items-center justify-between px-1">
          <div class="flex items-center gap-3 text-[10px]">
            <span class="text-emerald-400">${buyCount} buys</span>
            <span class="text-red-400">${sellCount} sells</span>
          </div>
          <a href="/explore?mode=data&source=sec_insider-transactions" class="text-[10px] text-fin-400 hover:underline">All activity \u2192</a>
        </div>
        <div class="space-y-1 max-h-[380px] overflow-y-auto pr-1 fin-scroll">
          ${rows.map(r => {
            const typeRaw = String(r.type ?? r.transactionType ?? '');
            const kind = classifyType(typeRaw);
            const owner = String(r.owner ?? r.reportingOwnerName ?? '\u2014');
            const company = String(r.company ?? r.issuer ?? r.companyName ?? '\u2014');
            const cik = r.cik ?? r.issuerCik ?? '';
            const shares = r.shares ?? r.sharesTransacted ?? null;
            const date = String(r.date ?? r.transactionDate ?? '').slice(0, 10);

            const badgeCls = kind === 'buy'
              ? 'bg-emerald-400/15 text-emerald-400 border-emerald-500/20'
              : kind === 'sell'
                ? 'bg-red-400/15 text-red-400 border-red-500/20'
                : 'bg-slate-700/40 text-slate-400 border-slate-600/20';
            const badgeLabel = kind === 'buy' ? 'BUY' : kind === 'sell' ? 'SELL' : typeRaw.slice(0, 4).toUpperCase();
            const dotColor = kind === 'buy' ? 'bg-emerald-400' : kind === 'sell' ? 'bg-red-400' : 'bg-slate-500';

            const companyLink = cik
              ? `<a href="/explore?type=company&cik=${encodeURIComponent(String(cik))}" class="text-fin-400 hover:underline font-medium">${e(company)}</a>`
              : `<span class="font-medium text-slate-200">${e(company)}</span>`;

            return `
              <div class="flex items-start gap-2.5 rounded-lg bg-fin-800/30 border border-fin-700/20 px-3 py-2 hover:bg-fin-800/50 transition-colors">
                <div class="flex-shrink-0 mt-1">
                  <div class="w-2 h-2 rounded-full ${dotColor}"></div>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    ${companyLink}
                    <span class="inline-flex items-center rounded border ${badgeCls} px-1.5 py-0.5 text-[9px] font-bold tracking-wider">${badgeLabel}</span>
                    ${shares != null ? `<span class="text-[10px] tabular-nums text-slate-400">${e(fmtShares(shares))} shares</span>` : ''}
                  </div>
                  <div class="text-[10px] text-slate-500 mt-0.5">${e(owner)} \u00B7 ${e(date)}</div>
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>
    `;
  },
});
