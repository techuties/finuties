/**
 * Breaking Alerts card — GDACS disasters + NOAA weather alerts + WHO outbreaks,
 * fetched in parallel, displayed as a severity-coded alert feed.
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

interface AlertItem {
  kind: 'disaster' | 'weather' | 'outbreak';
  title: string;
  location: string;
  date: string;
  severity: 'red' | 'orange' | 'yellow' | 'green' | 'grey';
  severityLabel: string;
  extra: string;
}

const SEVERITY_DOT: Record<string, string> = {
  red: 'bg-red-500',
  orange: 'bg-orange-400',
  yellow: 'bg-amber-400',
  green: 'bg-emerald-400',
  grey: 'bg-slate-500',
};

const SEVERITY_BORDER: Record<string, string> = {
  red: 'border-red-500/20',
  orange: 'border-orange-400/20',
  yellow: 'border-amber-400/20',
  green: 'border-emerald-400/20',
  grey: 'border-fin-700/20',
};

const KIND_ICON: Record<string, string> = {
  disaster:
    '<svg class="w-3.5 h-3.5 text-orange-400/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" /></svg>',
  weather:
    '<svg class="w-3.5 h-3.5 text-cyan-400/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" /></svg>',
  outbreak:
    '<svg class="w-3.5 h-3.5 text-rose-400/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.25-8.25-3.286zm0 13.036h.008v.008H12v-.008z" /></svg>',
};

function gdacsLevel(alert: string | undefined): AlertItem['severity'] {
  const lvl = String(alert ?? '').toLowerCase();
  if (lvl === 'red') return 'red';
  if (lvl === 'orange') return 'orange';
  if (lvl === 'green') return 'green';
  return 'grey';
}

function noaaSeverity(sev: string | undefined): AlertItem['severity'] {
  const s = String(sev ?? '').toLowerCase();
  if (s === 'extreme') return 'red';
  if (s === 'severe') return 'orange';
  if (s === 'moderate') return 'yellow';
  return 'grey';
}

function timeAgo(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const diff = Date.now() - d.getTime();
    const hours = Math.floor(diff / 3_600_000);
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

function parseGdacs(raw: Record<string, unknown>[]): AlertItem[] {
  return raw.map(r => ({
    kind: 'disaster' as const,
    title: String(r.event_name ?? r.event_type ?? '\u2014'),
    location: String(r.country ?? ''),
    date: String(r.start_date ?? ''),
    severity: gdacsLevel(r.alert_level as string | undefined),
    severityLabel: String(r.alert_level ?? '').toUpperCase(),
    extra: r.affected_population ? `${Number(r.affected_population).toLocaleString()} affected` : '',
  }));
}

function parseWeather(raw: Record<string, unknown>[]): AlertItem[] {
  return raw.map(r => ({
    kind: 'weather' as const,
    title: String(r.headline ?? r.event_type ?? '\u2014'),
    location: String(r.area_desc ?? ''),
    date: String(r.effective_at ?? ''),
    severity: noaaSeverity(r.severity as string | undefined),
    severityLabel: String(r.severity ?? '').toUpperCase(),
    extra: r.urgency ? String(r.urgency) : '',
  }));
}

function parseOutbreaks(raw: Record<string, unknown>[]): AlertItem[] {
  return raw.map(r => ({
    kind: 'outbreak' as const,
    title: String(r.disease ?? r.title ?? '\u2014'),
    location: String(r.country ?? ''),
    date: String(r.date_published ?? ''),
    severity: 'red' as const,
    severityLabel: 'OUTBREAK',
    extra: r.summary ? String(r.summary).slice(0, 80) : '',
  }));
}

function severityWeight(sev: AlertItem['severity']): number {
  if (sev === 'red') return 4;
  if (sev === 'orange') return 3;
  if (sev === 'yellow') return 2;
  if (sev === 'green') return 1;
  return 0;
}

registerCard({
  type: 'alerts',
  title: 'Breaking Alerts',
  description: 'GDACS disasters, weather alerts & disease outbreaks',
  icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />',
  defaultSize: 'md',
  cacheTtl: 120_000,
  exploreUrl: '/global',

  async fetch(): Promise<CardData> {
    const [gdacsRes, weatherRes, outbreakRes] = await Promise.all([
      apiFetch<unknown>('/api/v1/data/disasters/gdacs?limit=8').catch(() => null),
      apiFetch<unknown>('/api/v1/data/weather/alerts?limit=8').catch(() => null),
      apiFetch<unknown>('/api/v1/data/health/outbreaks?limit=6').catch(() => null),
    ]);

    const totalCost =
      (gdacsRes?.tokenCost ?? 0) + (weatherRes?.tokenCost ?? 0) + (outbreakRes?.tokenCost ?? 0);
    const credits =
      gdacsRes?.creditsRemaining ?? weatherRes?.creditsRemaining ?? outbreakRes?.creditsRemaining ?? null;

    return {
      payload: {
        gdacs: gdacsRes?.ok ? items(gdacsRes.data) : [],
        weather: weatherRes?.ok ? items(weatherRes.data) : [],
        outbreaks: outbreakRes?.ok ? items(outbreakRes.data) : [],
        sourceOk: {
          gdacs: !!gdacsRes?.ok,
          weather: !!weatherRes?.ok,
          outbreaks: !!outbreakRes?.ok,
        },
      },
      tokenCost: totalCost,
      creditsRemaining: credits,
    };
  },

  render(container, data) {
    const payload = data.payload as {
      gdacs: Record<string, unknown>[];
      weather: Record<string, unknown>[];
      outbreaks: Record<string, unknown>[];
      sourceOk?: { gdacs: boolean; weather: boolean; outbreaks: boolean };
    };

    const disasters = parseGdacs(payload.gdacs ?? []);
    const weather = parseWeather(payload.weather ?? []);
    const outbreaks = parseOutbreaks(payload.outbreaks ?? []);
    const all = [...disasters, ...weather, ...outbreaks].sort(
      (a, b) => b.date.localeCompare(a.date),
    );

    if (all.length === 0) {
      const source = payload.sourceOk ?? { gdacs: false, weather: false, outbreaks: false };
      const sourceText = 'Sources: GDACS ' + (source.gdacs ? 'ok' : 'down')
        + ' · NOAA ' + (source.weather ? 'ok' : 'down')
        + ' · WHO ' + (source.outbreaks ? 'ok' : 'down');
      container.innerHTML = '<div class="text-center py-6 space-y-1"><p class="text-sm text-slate-500">No active alerts.</p><p class="text-[10px] text-slate-600">' + e(sourceText) + '</p></div>';
      return;
    }

    const counts = { disaster: disasters.length, weather: weather.length, outbreak: outbreaks.length };
    const severityBuckets = { red: 0, orange: 0, yellow: 0, green: 0, grey: 0 };
    let pressure = 0;
    for (const a of all) {
      severityBuckets[a.severity] += 1;
      pressure += severityWeight(a.severity);
    }
    const pressureLabel = pressure >= 24 ? 'Extreme' : pressure >= 14 ? 'High' : pressure >= 7 ? 'Elevated' : 'Normal';
    const pressureColor = pressure >= 24 ? 'text-red-400' : pressure >= 14 ? 'text-amber-400' : 'text-emerald-400';
    const totalAlerts = Math.max(all.length, 1);
    const seg = (n: number) => Math.max(4, (n / totalAlerts) * 100);

    container.innerHTML = `
      <div class="space-y-3">
        <div class="rounded-lg border border-fin-700/30 bg-fin-800/25 px-3 py-2">
          <div class="flex items-end justify-between">
            <div>
              <div class="text-[10px] text-slate-500 uppercase tracking-wider">Alert Pressure</div>
              <div class="text-xl font-mono tabular-nums font-bold ${pressureColor}">${pressure}</div>
            </div>
            <span class="text-[10px] font-semibold ${pressureColor}">${pressureLabel}</span>
          </div>
          <div class="mt-2 h-1.5 w-full rounded bg-fin-900/70 overflow-hidden flex">
            ${severityBuckets.red ? `<span class="bg-red-500" style="width:${seg(severityBuckets.red).toFixed(1)}%"></span>` : ''}
            ${severityBuckets.orange ? `<span class="bg-orange-400" style="width:${seg(severityBuckets.orange).toFixed(1)}%"></span>` : ''}
            ${severityBuckets.yellow ? `<span class="bg-amber-400" style="width:${seg(severityBuckets.yellow).toFixed(1)}%"></span>` : ''}
            ${severityBuckets.green ? `<span class="bg-emerald-400" style="width:${seg(severityBuckets.green).toFixed(1)}%"></span>` : ''}
            ${severityBuckets.grey ? `<span class="bg-slate-500" style="width:${seg(severityBuckets.grey).toFixed(1)}%"></span>` : ''}
          </div>
        </div>
        <div class="flex items-center justify-between px-1">
          <div class="flex items-center gap-3 text-[10px]">
            ${counts.disaster ? `<span class="flex items-center gap-1">${KIND_ICON.disaster} ${counts.disaster}</span>` : ''}
            ${counts.weather ? `<span class="flex items-center gap-1">${KIND_ICON.weather} ${counts.weather}</span>` : ''}
            ${counts.outbreak ? `<span class="flex items-center gap-1">${KIND_ICON.outbreak} ${counts.outbreak}</span>` : ''}
          </div>
          <a href="/global" class="text-[10px] text-fin-400 hover:underline">Global map \u2192</a>
        </div>
        <div class="space-y-1.5 max-h-[380px] overflow-y-auto pr-1 fin-scroll">
          ${all.slice(0, 12).map(a => {
            const dot = SEVERITY_DOT[a.severity];
            const border = SEVERITY_BORDER[a.severity];
            const icon = KIND_ICON[a.kind];
            const ago = a.date ? timeAgo(a.date) : '';

            return `
              <div class="flex items-start gap-2.5 rounded-lg bg-fin-800/40 border ${border} px-3 py-2 transition-colors hover:bg-fin-800/60">
                <div class="flex-shrink-0 mt-0.5">${icon}</div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full ${dot} flex-shrink-0"></span>
                    <span class="text-sm text-slate-200 font-medium truncate">${e(a.title)}</span>
                    ${a.severityLabel ? `<span class="flex-shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${dot}/20 ${dot.replace('bg-', 'text-').replace('-500', '-300').replace('-400', '-300')}">${e(a.severityLabel)}</span>` : ''}
                  </div>
                  <div class="flex flex-wrap gap-x-2 text-[10px] text-slate-500 mt-0.5">
                    ${a.location ? `<span>${e(a.location)}</span>` : ''}
                    ${ago ? `<span>${e(ago)}</span>` : ''}
                    ${a.extra ? `<span class="text-slate-600 truncate max-w-[200px]">${e(a.extra)}</span>` : ''}
                  </div>
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>
    `;
  },
});
