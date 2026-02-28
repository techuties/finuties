/**
 * World Events card — unified view of conflicts + natural disasters,
 * fetched in parallel, severity-coded visual feed.
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
    if ('items' in raw) return (raw as Record<string, unknown>).items || [];
    if ('data' in raw) return (raw as Record<string, unknown>).data || [];
  }
  return [];
}

interface WorldEvent {
  kind: 'conflict' | 'earthquake' | 'acled' | 'gdelt';
  name: string;
  location: string;
  date: string;
  severity: number;
  severityLabel: string;
  link: string;
}

function parseConflicts(raw: Record<string, unknown>[]): WorldEvent[] {
  return raw.map(r => {
    const name = String(r.conflict_name ?? r.event_name ?? r.name ?? '\u2014');
    const loc = String(r.country ?? r.location ?? r.admin1 ?? r.region ?? '');
    const date = String(r.date_start ?? r.event_date ?? r.date ?? r.start_date ?? '').slice(0, 10);
    const sev = Number(r.deaths_best ?? r.fatalities ?? r.intensity_level ?? r.severity ?? 0);
    const cc = String(r.country_code ?? r.country ?? '');
    return {
      kind: 'conflict' as const,
      name,
      location: loc,
      date,
      severity: sev,
      severityLabel: sev > 0 ? `${sev} fatalities` : '',
      link: cc ? `/global?country=${encodeURIComponent(cc)}` : '/global',
    };
  });
}

function parseEarthquakes(raw: Record<string, unknown>[]): WorldEvent[] {
  return raw.map(r => {
    const mag = Number(r.magnitude ?? r.mag ?? r.mag_value ?? 0);
    const loc = String(r.location ?? r.place ?? r.title ?? r.location_name ?? '\u2014');
    const date = String(r.date ?? r.event_time ?? r.time ?? r.timestamp ?? '').slice(0, 10);
    const depth = r.depth ?? r.depth_km ?? null;
    const cc = String(r.country ?? r.country_code ?? '');
    return {
      kind: 'earthquake' as const,
      name: `M${mag.toFixed(1)} — ${loc}`,
      location: loc,
      date,
      severity: mag,
      severityLabel: depth != null ? `Depth ${depth}km` : '',
      link: cc ? `/global?country=${encodeURIComponent(cc)}` : '/global',
    };
  });
}

function parseAcled(raw: Record<string, unknown>[]): WorldEvent[] {
  return raw.map(r => {
    const evType = String(r.event_type ?? r.sub_event_type ?? '\u2014');
    const actor = String(r.actor1 ?? '');
    const loc = String(r.country ?? r.admin1 ?? '');
    const date = String(r.event_date ?? '').slice(0, 10);
    const fatalities = Number(r.fatalities ?? 0);
    return {
      kind: 'acled' as const,
      name: actor ? `${actor} — ${evType}` : evType,
      location: loc,
      date,
      severity: fatalities,
      severityLabel: fatalities > 0 ? `${fatalities} fatalities` : '',
      link: loc ? `/global?country=${encodeURIComponent(loc)}` : '/global',
    };
  });
}

function parseGdelt(raw: Record<string, unknown>[]): WorldEvent[] {
  return raw.map(r => {
    const a1 = String(r.actor1_name ?? r.actor1_country ?? '');
    const a2 = String(r.actor2_name ?? r.actor2_country ?? '');
    const geo = String(r.action_geo_fullname ?? r.action_geo_country ?? '');
    const date = String(r.event_date ?? '').slice(0, 10);
    const tone = Number(r.avg_tone ?? r.goldstein_scale ?? 0);
    const mentions = Number(r.num_mentions ?? 0);
    return {
      kind: 'gdelt' as const,
      name: a1 && a2 ? `${a1} \u2194 ${a2}` : a1 || 'Global event',
      location: geo,
      date,
      severity: Math.abs(tone),
      severityLabel: mentions > 0 ? `${mentions} mentions` : '',
      link: '/global',
    };
  });
}

function impactPoints(ev: WorldEvent): number {
  if (ev.kind === 'earthquake') return ev.severity >= 6 ? 4 : ev.severity >= 4 ? 3 : 1;
  if (ev.kind === 'gdelt') return ev.severity >= 5 ? 3 : 1;
  return ev.severity >= 50 ? 4 : ev.severity >= 10 ? 3 : ev.severity > 0 ? 2 : 1;
}

registerCard({
  type: 'world-events',
  title: 'World Events',
  description: 'Conflicts & natural disasters',
  icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582" />',
  defaultSize: 'md',
  cacheTtl: 300_000,
  exploreUrl: '/global',

  async fetch(): Promise<CardData> {
    const [conflictRes, quakeRes, acledRes, gdeltRes] = await Promise.all([
      apiFetch<unknown>('/api/v1/data/conflicts/ucdp?limit=4').catch(() => null),
      apiFetch<unknown>('/api/v1/data/earthquakes?limit=4').catch(() => null),
      apiFetch<unknown>('/api/v1/data/conflicts/acled?limit=4').catch(() => null),
      apiFetch<unknown>('/api/v1/data/conflicts/gdelt?limit=4').catch(() => null),
    ]);

    const totalCost = (conflictRes?.tokenCost ?? 0) + (quakeRes?.tokenCost ?? 0)
      + (acledRes?.tokenCost ?? 0) + (gdeltRes?.tokenCost ?? 0);
    const credits = conflictRes?.creditsRemaining ?? quakeRes?.creditsRemaining
      ?? acledRes?.creditsRemaining ?? gdeltRes?.creditsRemaining ?? null;

    return {
      payload: {
        conflicts: conflictRes?.ok ? items(conflictRes.data) : [],
        earthquakes: quakeRes?.ok ? items(quakeRes.data) : [],
        acled: acledRes?.ok ? items(acledRes.data) : [],
        gdelt: gdeltRes?.ok ? items(gdeltRes.data) : [],
        sourceOk: {
          ucdp: !!conflictRes?.ok,
          quakes: !!quakeRes?.ok,
          acled: !!acledRes?.ok,
          gdelt: !!gdeltRes?.ok,
        },
      },
      tokenCost: totalCost,
      creditsRemaining: credits,
    };
  },

  render(container, data) {
    const payload = data.payload as {
      conflicts: Record<string, unknown>[];
      earthquakes: Record<string, unknown>[];
      acled: Record<string, unknown>[];
      gdelt: Record<string, unknown>[];
      sourceOk?: { ucdp: boolean; quakes: boolean; acled: boolean; gdelt: boolean };
    };

    const conflicts = parseConflicts(payload.conflicts ?? []);
    const quakes = parseEarthquakes(payload.earthquakes ?? []);
    const acled = parseAcled(payload.acled ?? []);
    const gdelt = parseGdelt(payload.gdelt ?? []);
    const all = [...conflicts, ...quakes, ...acled, ...gdelt].sort((a, b) => b.date.localeCompare(a.date));
    const impactScore = all.reduce((sum, ev) => sum + impactPoints(ev), 0);
    const maxCount = Math.max(conflicts.length, acled.length, gdelt.length, quakes.length, 1);
    const pct = (n: number) => Math.max(8, (n / maxCount) * 100);

    if (all.length === 0) {
      const source = payload.sourceOk ?? { ucdp: false, quakes: false, acled: false, gdelt: false };
      const sourceText = 'Sources: UCDP ' + (source.ucdp ? 'ok' : 'down')
        + ' · Quakes ' + (source.quakes ? 'ok' : 'down')
        + ' · ACLED ' + (source.acled ? 'ok' : 'down')
        + ' · GDELT ' + (source.gdelt ? 'ok' : 'down');
      container.innerHTML = '<div class="text-center py-6 space-y-1"><p class="text-sm text-slate-500">No world events to display.</p><p class="text-[10px] text-slate-600">' + e(sourceText) + '</p></div>';
      return;
    }

    container.innerHTML = `
      <div class="space-y-3">
        <div class="rounded-lg border border-fin-700/30 bg-fin-800/25 px-3 py-2">
          <div class="flex items-end justify-between">
            <div>
              <div class="text-[10px] text-slate-500 uppercase tracking-wider">Global Impact</div>
              <div class="text-xl font-mono tabular-nums font-bold ${impactScore >= 28 ? 'text-red-400' : impactScore >= 16 ? 'text-amber-400' : 'text-emerald-400'}">${impactScore}</div>
            </div>
            <span class="text-[10px] text-slate-500">${all.length} events</span>
          </div>
          <div class="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
            <div class="text-slate-500">UCDP</div><div><div class="h-1.5 rounded bg-red-400/70" style="width:${pct(conflicts.length).toFixed(1)}%"></div></div>
            <div class="text-slate-500">ACLED</div><div><div class="h-1.5 rounded bg-rose-400/70" style="width:${pct(acled.length).toFixed(1)}%"></div></div>
            <div class="text-slate-500">GDELT</div><div><div class="h-1.5 rounded bg-violet-400/70" style="width:${pct(gdelt.length).toFixed(1)}%"></div></div>
            <div class="text-slate-500">Quakes</div><div><div class="h-1.5 rounded bg-amber-400/70" style="width:${pct(quakes.length).toFixed(1)}%"></div></div>
          </div>
        </div>
        <div class="flex items-center justify-between px-1">
          <div class="flex items-center gap-3 text-[10px]">
            ${conflicts.length ? `<span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-red-400 inline-block"></span> ${conflicts.length} UCDP</span>` : ''}
            ${acled.length ? `<span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-rose-400 inline-block"></span> ${acled.length} ACLED</span>` : ''}
            ${gdelt.length ? `<span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-violet-400 inline-block"></span> ${gdelt.length} GDELT</span>` : ''}
            ${quakes.length ? `<span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-amber-400 inline-block"></span> ${quakes.length} quakes</span>` : ''}
          </div>
          <a href="/global" class="text-[10px] text-fin-400 hover:underline">Global map \u2192</a>
        </div>
        <div class="space-y-1.5 max-h-[380px] overflow-y-auto pr-1 fin-scroll">
          ${all.slice(0, 12).map(ev => {
            const dotColorMap: Record<string, string> = {
              conflict: 'bg-red-400',
              acled: 'bg-rose-400',
              gdelt: 'bg-violet-400',
              earthquake: ev.severity >= 6 ? 'bg-red-400' : ev.severity >= 4 ? 'bg-amber-400' : 'bg-slate-400',
            };
            const dotColor = dotColorMap[ev.kind] ?? 'bg-slate-400';
            const borderHoverMap: Record<string, string> = {
              conflict: 'hover:border-red-700/30',
              acled: 'hover:border-rose-700/30',
              gdelt: 'hover:border-violet-700/30',
              earthquake: 'hover:border-amber-700/30',
            };
            const borderHover = borderHoverMap[ev.kind] ?? '';
            const iconMap: Record<string, string> = {
              conflict: '<svg class="w-3.5 h-3.5 text-red-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" /></svg>',
              acled: '<svg class="w-3.5 h-3.5 text-rose-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" /></svg>',
              gdelt: '<svg class="w-3.5 h-3.5 text-violet-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3" /></svg>',
              earthquake: '<svg class="w-3.5 h-3.5 text-amber-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>',
            };
            const icon = iconMap[ev.kind] ?? iconMap.conflict;

            return `
              <a href="${e(ev.link)}" class="flex items-start gap-2.5 rounded-lg bg-fin-800/40 border border-fin-700/25 ${borderHover} px-3 py-2 transition-colors no-underline">
                <div class="flex-shrink-0 mt-0.5">${icon}</div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full ${dotColor} flex-shrink-0"></span>
                    <span class="text-sm text-slate-200 font-medium truncate">${e(ev.name)}</span>
                  </div>
                  <div class="flex flex-wrap gap-x-2 text-[10px] text-slate-500 mt-0.5">
                    ${ev.location ? `<span>${e(ev.location)}</span>` : ''}
                    ${ev.date ? `<span>${e(ev.date)}</span>` : ''}
                    ${ev.severityLabel ? `<span class="${ev.kind === 'earthquake' && ev.severity >= 6 ? 'text-red-400/90' : ev.severity >= 10 ? 'text-red-400/80' : ev.severity > 0 ? 'text-amber-400/80' : 'text-slate-500'}">${e(ev.severityLabel)}</span>` : ''}
                  </div>
                </div>
              </a>`;
          }).join('')}
        </div>
      </div>
    `;
  },
});
