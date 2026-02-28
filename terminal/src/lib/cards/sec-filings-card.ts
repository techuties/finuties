/**
 * SEC Filings card — recent filings with color-coded form type badges
 * and a summary strip showing filing type distribution.
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

const FORM_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  '10-K':  { bg: 'bg-blue-500/15',   text: 'text-blue-400',   border: 'border-blue-500/20' },
  '10-Q':  { bg: 'bg-cyan-500/15',   text: 'text-cyan-400',   border: 'border-cyan-500/20' },
  '8-K':   { bg: 'bg-amber-500/15',  text: 'text-amber-400',  border: 'border-amber-500/20' },
  '4':     { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/20' },
  'SC 13': { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  '13F':   { bg: 'bg-rose-500/15',   text: 'text-rose-400',   border: 'border-rose-500/20' },
  'S-1':   { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/20' },
  'DEF':   { bg: 'bg-teal-500/15',   text: 'text-teal-400',   border: 'border-teal-500/20' },
};

function formStyle(formType: string): { bg: string; text: string; border: string } {
  const upper = formType.toUpperCase();
  for (const [prefix, style] of Object.entries(FORM_COLORS)) {
    if (upper.startsWith(prefix.toUpperCase())) return style;
  }
  return { bg: 'bg-fin-700/40', text: 'text-fin-400', border: 'border-fin-600/20' };
}

function timeAgo(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = Date.now();
    const diff = now - d.getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days}d ago`;
    return dateStr.slice(0, 10);
  } catch {
    return dateStr.slice(0, 10);
  }
}

registerCard({
  type: 'sec-filings',
  title: 'SEC Filings',
  description: 'Latest regulatory filings',
  icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />',
  defaultSize: 'md',
  cacheTtl: 180_000,
  exploreUrl: '/explore?mode=data&source=sec_filings',
  async fetch() {
    const res = await apiFetch<unknown>('/api/v1/sec/filings?limit=12');
    return {
      payload: res.data,
      tokenCost: res.tokenCost,
      creditsRemaining: res.creditsRemaining,
    };
  },
  render(container, data) {
    const list = items(data.payload);

    if (!list.length) {
      container.innerHTML = '<p class="text-sm text-slate-400 p-4">No filings available</p>';
      return;
    }

    const typeCounts = new Map<string, number>();
    for (const r of list) {
      const ft = String(r.form_type ?? r.form ?? r.type ?? 'Other');
      typeCounts.set(ft, (typeCounts.get(ft) ?? 0) + 1);
    }
    const topTypes = [...typeCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const dates = list
      .map((r) => String(r.filing_date ?? r.date ?? r.accepted_date ?? '').slice(0, 10))
      .filter(Boolean);
    const uniqueDays = new Set(dates).size || 1;
    const filingsPerDay = list.length / uniqueDays;
    const peakType = topTypes[0]?.[0] ?? 'N/A';

    container.innerHTML = `
      <div class="space-y-3">
        <div class="rounded-lg border border-fin-700/30 bg-fin-800/25 px-3 py-2">
          <div class="flex items-end justify-between">
            <div>
              <div class="text-[10px] text-slate-500 uppercase tracking-wider">Filing Velocity</div>
              <div class="text-xl font-mono tabular-nums font-bold text-slate-200">${filingsPerDay.toFixed(1)}/day</div>
            </div>
            <span class="text-[10px] text-slate-500">${list.length} filings</span>
          </div>
          <div class="mt-1 text-[10px] text-slate-500">Peak form: <span class="text-slate-300">${e(peakType)}</span> · ${list.length} filings across ${uniqueDays} day(s)</div>
        </div>
        <div class="flex items-center justify-between px-1">
          <div class="flex items-center gap-1.5 flex-wrap">
            ${topTypes.map(([ft, count]) => {
              const s = formStyle(ft);
              return `<span class="inline-flex items-center gap-1 rounded border ${s.bg} ${s.border} px-1.5 py-0.5 text-[9px] font-bold ${s.text}">${e(ft)} <span class="opacity-70">${count}</span></span>`;
            }).join('')}
          </div>
          <a href="/explore?mode=data&source=sec_filings" class="text-[10px] text-fin-400 hover:underline flex-shrink-0">All filings \u2192</a>
        </div>
        <div class="space-y-1 max-h-[380px] overflow-y-auto pr-1 fin-scroll">
          ${list.map(r => {
            const formType = String(r.form_type ?? r.form ?? r.type ?? '\u2014');
            const company = String(r.company ?? r.company_name ?? r.issuer ?? '\u2014');
            const date = String(r.filing_date ?? r.date ?? r.accepted_date ?? '');
            const accession = r.accession_number ?? r.accession ?? '';
            const url = accession
              ? `/explore?type=filing&accession=${encodeURIComponent(String(accession))}`
              : '#';
            const s = formStyle(formType);
            const ago = date ? timeAgo(date) : '';

            return `
              <a href="${e(url)}" class="flex items-center gap-2 rounded-lg bg-fin-800/30 border border-fin-700/20 px-3 py-2 hover:bg-fin-800/50 transition-colors no-underline group">
                <span class="flex-shrink-0 inline-flex items-center rounded border ${s.bg} ${s.border} px-1.5 py-0.5 text-[10px] font-bold ${s.text} tracking-wide min-w-[40px] justify-center">${e(formType)}</span>
                <span class="flex-1 text-sm text-slate-200 font-medium truncate group-hover:text-fin-400 transition-colors">${e(company)}</span>
                <span class="flex-shrink-0 text-[10px] text-slate-500">${e(ago)}</span>
              </a>`;
          }).join('')}
        </div>
      </div>
    `;
  },
});
