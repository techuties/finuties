import type { CardData, ViewType } from '../../card-registry';
import { apiFetch } from '../../api-client';
import type { TerminalPlugin } from '../contract';

function esc(s: string): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c));
}

function listRows(raw: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(raw)) return raw as Array<Record<string, unknown>>;
  if (raw && typeof raw === 'object') {
    const data = (raw as Record<string, unknown>).data;
    if (Array.isArray(data)) return data as Array<Record<string, unknown>>;
    const items = (raw as Record<string, unknown>).items;
    if (Array.isArray(items)) return items as Array<Record<string, unknown>>;
  }
  return [];
}

export const moneyFlowPlugin: TerminalPlugin = {
  id: 'plugin-money-flow',
  name: 'Money Flow Snapshot',
  version: '1.0.0',
  description: 'Community plugin card showing latest COT net positioning rows.',
  dataSources: ['/api/v1/cftc/legacy_futures-facts?limit=25'],
  cachePolicy: { ttlMs: 600_000, scope: 'user', persistent: true },
  capabilities: { network: true, python: false, filesystem: false },
  toCardDefinition() {
    return {
      type: 'plugin-money-flow',
      title: 'Money Flow (Plugin)',
      description: 'Latest COT snapshot via plugin contract',
      icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>',
      defaultSize: 'md',
      views: ['table'] as ViewType[],
      cacheTtl: 600_000,
      exploreUrl: '/commodities',
      async fetch(): Promise<CardData> {
        const r = await apiFetch<unknown>('/api/v1/cftc/legacy_futures-facts?limit=25', { timeout: 60_000 });
        return { payload: r.data, tokenCost: r.tokenCost, creditsRemaining: r.creditsRemaining };
      },
      render(container: HTMLElement, data: CardData): void {
        const rows = listRows(data.payload).slice(0, 8);
        if (rows.length === 0) {
          container.innerHTML = '<p class="text-sm text-slate-500 py-4 text-center">No COT rows available.</p>';
          return;
        }
        const body = rows.map((r) => {
          const name = esc(String(r.commodity_name ?? r.market_and_exchange_names ?? 'Unknown'));
          const long = Number(r.noncomm_positions_long_all ?? 0) || 0;
          const short = Number(r.noncomm_positions_short_all ?? 0) || 0;
          const net = long - short;
          const cls = net >= 0 ? 'text-emerald-400' : 'text-rose-400';
          return `<tr class="border-b border-fin-800/50"><td class="py-1.5 text-slate-300">${name}</td><td class="py-1.5 text-right ${cls}">${net.toLocaleString()}</td></tr>`;
        }).join('');
        container.innerHTML = `<div class="text-xs text-slate-500 mb-2">Plugin source: COT legacy futures</div><table class="w-full text-xs"><thead><tr class="text-slate-400"><th class="text-left py-1">Commodity</th><th class="text-right py-1">Net</th></tr></thead><tbody>${body}</tbody></table>`;
      },
    };
  },
};
