/**
 * Economic Calendar card — timeline grouped by date with impact indicators.
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

interface CalEvent {
  date: string;
  time: string;
  name: string;
  country: string;
  impact: string;
}

function parseEvents(list: Record<string, unknown>[]): CalEvent[] {
  return list.map(r => {
    const rawTitle = String(r.raw_title ?? '');
    const m = rawTitle.match(/^(\d{4}-\d{2}-\d{2})(?:\s+(\d{2}:\d{2}))?\s*-\s*(.+)$/);
    const dateKey = Object.keys(r).find(k => /date|time|event_date/.test(k)) ?? 'date';
    const raw = String(r[dateKey] ?? r.date ?? r.event_date ?? '');
    const date = m?.[1] ?? raw.slice(0, 10);
    const time = m?.[2] ?? (raw.length > 10 ? raw.slice(11, 16) : '');
    return {
      date,
      time,
      name: String(r.name ?? r.event ?? r.title ?? m?.[3] ?? rawTitle ?? '\u2014'),
      country: String(r.country ?? r.country_code ?? r.region ?? ''),
      impact: String(r.impact ?? r.importance ?? '').toLowerCase(),
    };
  });
}

function groupByDate(events: CalEvent[]): Map<string, CalEvent[]> {
  const groups = new Map<string, CalEvent[]>();
  for (const ev of events) {
    const key = ev.date || 'Unknown';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(ev);
  }
  return groups;
}

function formatDateLabel(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = d.getTime() - today.getTime();
    const days = Math.round(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days === -1) return 'Yesterday';
    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
    const month = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${weekday}, ${month}`;
  } catch {
    return dateStr;
  }
}

const IMPACT_DOT: Record<string, { color: string; ring: string; label: string }> = {
  high: { color: 'bg-red-400', ring: 'ring-red-400/30', label: 'High' },
  medium: { color: 'bg-amber-400', ring: 'ring-amber-400/30', label: 'Medium' },
  low: { color: 'bg-slate-600', ring: 'ring-slate-600/20', label: 'Low' },
};

registerCard({
  type: 'econ-calendar',
  title: 'Economic Calendar',
  description: 'Upcoming events & releases',
  icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />',
  defaultSize: 'md',
  cacheTtl: 300_000,
  exploreUrl: '/explore?mode=data&category=calendar',
  async fetch() {
    const res = await apiFetch<unknown>('/api/v1/calendar/events?limit=20');
    return {
      payload: { items: items(res.data), sourceOk: !!res.ok },
      tokenCost: res.tokenCost,
      creditsRemaining: res.creditsRemaining,
    };
  },
  render(container, data) {
    const payload = data.payload as { items?: Record<string, unknown>[]; sourceOk?: boolean };
    const list = payload.items ?? [];

    if (!list.length) {
      container.innerHTML = '<div class="p-4 text-center"><p class="text-sm text-slate-400">No upcoming events</p><p class="text-[10px] text-slate-600 mt-1">Calendar source ' + (payload.sourceOk ? 'is live' : 'is unavailable') + '</p></div>';
      return;
    }

    const events = parseEvents(list);
    const grouped = groupByDate(events);
    const highCount = events.filter(ev => ev.impact === 'high').length;
    const mediumCount = events.filter(ev => ev.impact === 'medium').length;
    const lowCount = events.filter(ev => ev.impact === 'low' || (!ev.impact)).length;
    const total = Math.max(events.length, 1);

    let html = `
      <div class="space-y-4">
        <div class="rounded-lg border border-fin-700/30 bg-fin-800/25 px-3 py-2">
          <div class="flex items-end justify-between">
            <div>
              <div class="text-[10px] text-slate-500 uppercase tracking-wider">Impact Density</div>
              <div class="text-xl font-mono tabular-nums font-bold ${highCount > 0 ? 'text-red-400' : 'text-slate-200'}">${highCount}</div>
            </div>
            <span class="text-[10px] text-slate-500">high-impact · ${events.length} total</span>
          </div>
          <div class="mt-2 h-1.5 w-full rounded bg-fin-900/70 overflow-hidden flex">
            <span class="bg-amber-400" style="width:${((highCount / total) * 100).toFixed(1)}%"></span>
            <span class="bg-slate-300" style="width:${((mediumCount / total) * 100).toFixed(1)}%"></span>
            <span class="bg-slate-600" style="width:${((lowCount / total) * 100).toFixed(1)}%"></span>
          </div>
        </div>
        <div class="flex items-center justify-between px-1">
          <div class="flex items-center gap-3 text-[10px]">
            ${highCount > 0 ? `<span class="text-amber-400">${highCount} high-impact</span>` : ''}
            <span class="text-slate-500">${events.length} events</span>
          </div>
          <a href="/explore?mode=data&category=calendar" class="text-[10px] text-fin-400 hover:underline">Full calendar \u2192</a>
        </div>
    `;

    for (const [date, evts] of grouped) {
      const label = formatDateLabel(date);
      const isToday = label === 'Today';

      html += `
        <div>
          <div class="flex items-center gap-2 mb-1.5">
            <span class="text-[11px] font-semibold ${isToday ? 'text-fin-400' : 'text-slate-400'}">${e(label)}</span>
            <div class="flex-1 h-px bg-fin-800/60"></div>
          </div>
          <div class="space-y-0.5 pl-1 max-h-[300px] overflow-y-auto pr-1 fin-scroll">
      `;

      for (const ev of evts) {
        const imp = IMPACT_DOT[ev.impact] ?? IMPACT_DOT.low;
        html += `
            <div class="flex items-center gap-2.5 py-1.5 rounded-md hover:bg-fin-800/30 transition-colors px-2 -mx-1">
              <div class="flex-shrink-0 w-2 h-2 rounded-full ${imp!.color} ring-2 ${imp!.ring}" title="${e(imp!.label)} impact"></div>
              ${ev.time ? `<span class="flex-shrink-0 text-[10px] font-mono tabular-nums text-slate-500 w-10">${e(ev.time)}</span>` : '<span class="w-10"></span>'}
              <span class="flex-1 text-sm text-slate-200 truncate">${e(ev.name)}</span>
              ${ev.country ? `<span class="flex-shrink-0 text-[10px] text-slate-500 uppercase tracking-wider">${e(ev.country)}</span>` : ''}
            </div>
        `;
      }

      html += `
          </div>
        </div>
      `;
    }

    html += '</div>';
    container.innerHTML = html;
  },
});
