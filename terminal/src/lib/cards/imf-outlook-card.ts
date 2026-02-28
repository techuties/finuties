/**
 * IMF Outlook card - IMF World Economic Outlook country indicators
 * as horizontal bars, color-coded positive/negative.
 */
import { registerCard, type CardData } from '../card-registry';
import { apiFetch } from '../api-client';

const _E: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
function e(s: string): string { return String(s ?? '').replace(/[&<>"]/g, (c) => _E[c]); }
function items(raw: unknown): Record<string, unknown>[] { if (Array.isArray(raw)) return raw; if (raw && typeof raw === 'object') { if ('items' in raw) return (raw as Record<string, unknown>).items as Record<string, unknown>[] ?? []; if ('data' in raw) return (raw as Record<string, unknown>).data as Record<string, unknown>[] ?? []; } return []; }

interface ImfRow {
  country: string;
  indicator: string;
  year: string;
  value: number;
  unit: string;
}

function parseRows(raw: Record<string, unknown>[]): ImfRow[] {
  return raw.map(r => ({
    country: String(r.country_code ?? r.country ?? ''),
    indicator: String(r.indicator_code ?? ''),
    year: String(r.year ?? ''),
    value: Number(r.value ?? 0),
    unit: String(r.unit ?? r.scale ?? ''),
  }));
}

registerCard({
  type: 'imf-outlook',
  title: 'IMF Outlook',
  description: 'IMF World Economic Outlook indicators',
  icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />',
  defaultSize: 'sm',
  cacheTtl: 3_600_000,
  exploreUrl: '/explore?mode=data&source=fd_imf_indicators',

  async fetch(): Promise<CardData> {
    const res = await apiFetch<unknown>('/api/v1/data/economic/imf?limit=20');
    return { payload: res.data, tokenCost: res.tokenCost, creditsRemaining: res.creditsRemaining };
  },

  render(container, data) {
    const rows = parseRows(items(data.payload));
    if (rows.length === 0) {
      container.innerHTML = '<p class="text-sm text-slate-500 text-center py-6">No IMF data.</p>';
      return;
    }

    const maxVal = Math.max(...rows.map(r => Math.abs(r.value)), 1);

    let html = '';
    for (const r of rows.slice(0, 12)) {
      const pct = Math.min(Math.abs(r.value) / maxVal * 100, 100);
      const barColor = r.value >= 0 ? 'bg-emerald-500/40' : 'bg-red-500/40';
      const valColor = r.value >= 0 ? 'text-emerald-400' : 'text-red-400';

      html += '<div class="flex items-center gap-2 py-1">'
        + '<span class="text-[11px] text-slate-300 font-medium w-[50px] flex-shrink-0 truncate">' + e(r.country) + '</span>'
        + '<div class="flex-1 h-4 bg-fin-800/40 rounded overflow-hidden">'
        + '<div class="h-full ' + barColor + ' rounded" style="width:' + pct.toFixed(1) + '%"></div>'
        + '</div>'
        + '<span class="text-[11px] tabular-nums font-medium ' + valColor + ' w-[50px] text-right flex-shrink-0">' + e(r.value.toFixed(1)) + '</span>'
        + '<span class="text-[9px] text-slate-600 w-[30px] flex-shrink-0">' + e(r.year) + '</span>'
        + '</div>';
    }

    container.innerHTML = '<div class="space-y-2">'
      + '<div class="flex items-center justify-between px-1">'
      + '<span class="text-[10px] text-slate-500">' + rows.length + ' indicators</span>'
      + '<a href="/explore?mode=data&source=fd_imf_indicators" class="text-[10px] text-fin-400 hover:underline">Explore \u2192</a>'
      + '</div>'
      + '<div class="space-y-0.5">' + html + '</div></div>';
  },
});
