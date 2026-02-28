/**
 * Latest Investments card — institutional money flow as a visual activity feed.
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

function fmtValue(v: unknown): string {
  const n = Number(v);
  if (!n || isNaN(n)) return '\u2014';
  const abs = Math.abs(n);
  if (abs >= 1e12) return '$' + (n / 1e12).toFixed(1) + 'T';
  if (abs >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (abs >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (abs >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
  return '$' + n.toLocaleString();
}

function fmtShares(v: unknown): string {
  const n = Number(v);
  if (!n || isNaN(n)) return '\u2014';
  const abs = Math.abs(n);
  if (abs >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (abs >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toLocaleString();
}

const FLOW_COLORS = [
  '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#84cc16',
];

registerCard({
  type: 'latest-investments',
  title: 'Institutional Flow',
  description: 'Recent institutional investment activity',
  icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />',
  defaultSize: 'md',
  cacheTtl: 300_000,
  exploreUrl: '/explore?mode=data&source=sec_holdings',
  fetch: async () => {
    const res = await apiFetch('/api/v1/holdings/top-companies?limit=8', { timeout: 45_000 });
    const raw = Array.isArray(res.data) ? res.data as Record<string, unknown>[] : [];
    const rows: Record<string, unknown>[] = [];
    for (const company of raw) {
      const stockSymbol = String(company.stock_symbol ?? '');
      const companyName = String(company.company_name ?? company.name ?? '');
      const topInvestors = Array.isArray(company.top_investors) ? company.top_investors as Record<string, unknown>[] : [];
      for (const inv of topInvestors.slice(0, 4)) {
        rows.push({
          investor_cik: inv.cik ?? '',
          investor: inv.name ?? (inv.cik ? ('CIK ' + String(inv.cik)) : 'Unknown investor'),
          stock_symbol: stockSymbol,
          company: companyName,
          shares: inv.shares ?? null,
          value: inv.value ?? null,
        });
      }
    }
    rows.sort((a, b) => Number(b.value ?? 0) - Number(a.value ?? 0));
    return {
      payload: rows.slice(0, 18),
      tokenCost: res.tokenCost,
      creditsRemaining: res.creditsRemaining,
    };
  },
  render: (container, data) => {
    const rows = items(data.payload);

    if (rows.length === 0) {
      container.innerHTML = '<p class="text-sm text-slate-500 text-center py-6">No investment data.</p>';
      return;
    }

    const investorSet = new Set<string>();
    rows.forEach(r => investorSet.add(String(r.investor ?? r.filerName ?? r.holder ?? '')));
    const investorColors = new Map<string, string>();
    let ci = 0;
    for (const name of investorSet) {
      investorColors.set(name, FLOW_COLORS[ci % FLOW_COLORS.length]);
      ci++;
    }

    const totalValue = rows.reduce((sum, r) => sum + Number(r.value ?? 0), 0);
    const byInvestor = new Map<string, number>();
    const bySymbol = new Map<string, number>();
    for (const r of rows) {
      const inv = String(r.investor ?? r.filerName ?? r.holder ?? 'Unknown investor');
      const sym = String(r.stock_symbol ?? r.symbol ?? 'N/A');
      const val = Number(r.value ?? 0);
      byInvestor.set(inv, (byInvestor.get(inv) ?? 0) + val);
      bySymbol.set(sym, (bySymbol.get(sym) ?? 0) + val);
    }
    const topInvestors = [...byInvestor.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    const topSymbols = [...bySymbol.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    const top3Share = totalValue > 0
      ? (topInvestors.reduce((sum, [, v]) => sum + v, 0) / totalValue) * 100
      : 0;

    container.innerHTML = `
      <div class="space-y-3">
        <div class="rounded-lg border border-fin-700/30 bg-fin-800/25 px-3 py-2">
          <div class="flex items-end justify-between">
            <div>
              <div class="text-[10px] text-slate-500 uppercase tracking-wider">Institutional Flow</div>
              <div class="text-xl font-mono tabular-nums font-bold text-slate-200">${e(fmtValue(totalValue))}</div>
            </div>
            <span class="text-[10px] text-slate-500">Top3 ${top3Share.toFixed(1)}%</span>
          </div>
          <div class="mt-2 flex items-center gap-1 flex-wrap">
            ${topSymbols.map(([s, v]) => `<span class="inline-flex rounded bg-fin-700/40 px-1.5 py-0.5 text-[9px] text-fin-300 font-semibold">${e(s)} ${e(fmtValue(v))}</span>`).join('')}
          </div>
        </div>
        <div class="flex items-center justify-between px-1">
          <span class="text-[10px] text-slate-500">${rows.length} positions</span>
          <a href="/explore?mode=data&source=sec_holdings" class="text-[10px] text-fin-400 hover:underline">All holdings \u2192</a>
        </div>
        <div class="space-y-1 max-h-[380px] overflow-y-auto pr-1 fin-scroll">
          ${rows.map(r => {
            const investorCik = r.investor_cik ?? r.cik ?? '';
            const investorName = String(r.investor ?? r.filerName ?? r.holder ?? '\u2014');
            const companySymbol = r.stock_symbol ?? r.symbol ?? '';
            const companyCik = r.company_cik ?? r.issuer_cik ?? '';
            const companyName = String(r.company ?? r.issuer ?? r.companyName ?? '\u2014');
            const shares = r.shares ?? r.sharesHeld ?? null;
            const value = r.value ?? r.marketValue ?? null;
            const color = investorColors.get(investorName) ?? '#64748b';

            const investorLink = investorCik
              ? `<a href="/explore?type=investor&cik=${encodeURIComponent(String(investorCik))}" class="text-fin-400 hover:underline font-medium truncate">${e(investorName)}</a>`
              : `<span class="font-medium text-slate-200 truncate">${e(investorName)}</span>`;

            const companyHref = companySymbol
              ? `/explore?type=company&symbol=${encodeURIComponent(String(companySymbol))}`
              : companyCik
                ? `/explore?type=company&cik=${encodeURIComponent(String(companyCik))}`
                : '';
            const companyLink = companyHref
              ? `<a href="${companyHref}" class="text-slate-200 hover:text-fin-400 hover:underline transition-colors">${e(companyName)}</a>`
              : `<span class="text-slate-200">${e(companyName)}</span>`;

            const symBadge = companySymbol
              ? `<span class="inline-flex items-center rounded bg-fin-700/40 px-1.5 py-0.5 text-[9px] font-bold text-fin-400 tracking-wider">${e(String(companySymbol))}</span>`
              : '';

            return `
              <div class="flex items-start gap-2.5 rounded-lg bg-fin-800/30 border border-fin-700/20 px-3 py-2 hover:bg-fin-800/50 transition-colors">
                <div class="flex-shrink-0 mt-1.5">
                  <div class="w-2 h-2 rounded-full" style="background:${color}"></div>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    ${investorLink}
                    <svg class="w-3 h-3 text-slate-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>
                    ${companyLink}
                    ${symBadge}
                  </div>
                  <div class="flex items-center gap-3 mt-0.5 text-[10px]">
                    ${value != null ? `<span class="tabular-nums text-slate-300">${e(fmtValue(value))}</span>` : ''}
                    ${shares != null ? `<span class="tabular-nums text-slate-500">${e(fmtShares(shares))} shares</span>` : ''}
                  </div>
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>
    `;
  },
});
