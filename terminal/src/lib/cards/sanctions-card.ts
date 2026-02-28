/**
 * Sanctions Monitor card - OFAC + EU + UN sanctions in a jurisdiction feed.
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

interface SanctionEntry {
  jurisdiction: 'US' | 'EU' | 'UN';
  name: string;
  entityType: string;
  country: string;
  program: string;
}

const JURIS_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  US: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/20' },
  EU: { bg: 'bg-indigo-500/15', text: 'text-indigo-400', border: 'border-indigo-500/20' },
  UN: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/20' },
};

function parseSanctions(raw: Record<string, unknown>[], jurisdiction: 'US' | 'EU' | 'UN'): SanctionEntry[] {
  return raw.map(r => ({
    jurisdiction,
    name: String(r.entity_name ?? r.name ?? '\u2014'),
    entityType: String(r.entity_type ?? 'unknown'),
    country: String(r.country ?? ''),
    program: String(r.program ?? r.regime ?? r.un_list ?? ''),
  }));
}

registerCard({
  type: 'sanctions',
  title: 'Sanctions Monitor',
  description: 'OFAC, EU and UN sanctions lists',
  icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />',
  defaultSize: 'md',
  cacheTtl: 600_000,
  exploreUrl: '/explore?mode=data&source=fd_ofac_sdn',

  async fetch(): Promise<CardData> {
    const [usRes, euRes, unRes] = await Promise.all([
      apiFetch<unknown>('/api/v1/data/governance/sanctions/us?limit=6').catch(() => null),
      apiFetch<unknown>('/api/v1/data/governance/sanctions/eu?limit=6').catch(() => null),
      apiFetch<unknown>('/api/v1/data/governance/sanctions/un?limit=6').catch(() => null),
    ]);
    const totalCost = (usRes?.tokenCost ?? 0) + (euRes?.tokenCost ?? 0) + (unRes?.tokenCost ?? 0);
    const credits = usRes?.creditsRemaining ?? euRes?.creditsRemaining ?? unRes?.creditsRemaining ?? null;
    return {
      payload: {
        us: usRes?.ok ? items(usRes.data) : [],
        eu: euRes?.ok ? items(euRes.data) : [],
        un: unRes?.ok ? items(unRes.data) : [],
      },
      tokenCost: totalCost,
      creditsRemaining: credits,
    };
  },

  render(container, data) {
    const payload = data.payload as {
      us: Record<string, unknown>[];
      eu: Record<string, unknown>[];
      un: Record<string, unknown>[];
    };
    const all = [
      ...parseSanctions(payload.us ?? [], 'US'),
      ...parseSanctions(payload.eu ?? [], 'EU'),
      ...parseSanctions(payload.un ?? [], 'UN'),
    ];

    if (all.length === 0) {
      container.innerHTML = '<p class="text-sm text-slate-500 text-center py-6">No sanctions data.</p>';
      return;
    }

    const counts = { US: (payload.us ?? []).length, EU: (payload.eu ?? []).length, UN: (payload.un ?? []).length };
    const entityCounts = new Map<string, number>();
    for (const entry of all) {
      const key = entry.entityType || 'unknown';
      entityCounts.set(key, (entityCounts.get(key) ?? 0) + 1);
    }
    const topEntity = [...entityCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    const total = Math.max(all.length, 1);
    const pct = (n: number) => Math.max(8, (n / total) * 100);
    let badges = '';
    for (const [j, c] of Object.entries(counts)) {
      if (c > 0) {
        const s = JURIS_STYLE[j];
        badges += '<span class="inline-flex items-center gap-1 rounded border ' + s.bg + ' ' + s.border + ' px-1.5 py-0.5 text-[9px] font-bold ' + s.text + '">' + j + ' <span class="opacity-70">' + c + '</span></span>';
      }
    }

    let rows = '';
    for (const entry of all.slice(0, 14)) {
      const s = JURIS_STYLE[entry.jurisdiction];
      const typeBadge = entry.entityType !== 'unknown'
        ? '<span class="text-[9px] text-slate-600 bg-fin-800/60 rounded px-1 py-0.5">' + e(entry.entityType) + '</span>'
        : '';
      rows += '<div class="flex items-center gap-2 rounded-lg bg-fin-800/30 border border-fin-700/20 px-3 py-2 hover:bg-fin-800/50 transition-colors">'
        + '<span class="flex-shrink-0 inline-flex items-center rounded border ' + s.bg + ' ' + s.border + ' px-1.5 py-0.5 text-[9px] font-bold ' + s.text + ' min-w-[28px] justify-center">' + entry.jurisdiction + '</span>'
        + '<div class="flex-1 min-w-0">'
        + '<div class="text-sm text-slate-200 font-medium truncate">' + e(entry.name) + '</div>'
        + '<div class="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">'
        + (entry.country ? '<span>' + e(entry.country) + '</span>' : '')
        + (entry.program ? '<span class="truncate max-w-[150px]">' + e(entry.program) + '</span>' : '')
        + '</div></div>' + typeBadge + '</div>';
    }

    container.innerHTML = '<div class="space-y-3">'
      + '<div class="rounded-lg border border-fin-700/30 bg-fin-800/25 px-3 py-2">'
      + '<div class="flex items-end justify-between">'
      + '<div><div class="text-[10px] text-slate-500 uppercase tracking-wider">Jurisdiction Mix</div>'
      + '<div class="text-xl font-mono tabular-nums font-bold text-slate-200">' + all.length + '</div></div>'
      + '<span class="text-[10px] text-slate-500">entities</span></div>'
      + '<div class="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">'
      + '<div class="text-slate-500">US</div><div><div class="h-1.5 rounded bg-blue-400/70" style="width:' + pct(counts.US).toFixed(1) + '%"></div></div>'
      + '<div class="text-slate-500">EU</div><div><div class="h-1.5 rounded bg-indigo-400/70" style="width:' + pct(counts.EU).toFixed(1) + '%"></div></div>'
      + '<div class="text-slate-500">UN</div><div><div class="h-1.5 rounded bg-cyan-400/70" style="width:' + pct(counts.UN).toFixed(1) + '%"></div></div>'
      + '</div>'
      + (topEntity ? '<div class="mt-1 text-[10px] text-slate-500">Top entity type: <span class="text-slate-300">' + e(topEntity[0]) + '</span> (' + topEntity[1] + ')</div>' : '')
      + '</div>'
      + '<div class="flex items-center justify-between px-1">'
      + '<div class="flex items-center gap-1.5 flex-wrap">' + badges + '</div>'
      + '<a href="/explore?mode=data&source=fd_ofac_sdn" class="text-[10px] text-fin-400 hover:underline flex-shrink-0">All sanctions \u2192</a>'
      + '</div>'
      + '<div class="space-y-1 max-h-[380px] overflow-y-auto pr-1 fin-scroll">' + rows + '</div></div>';
  },
});
