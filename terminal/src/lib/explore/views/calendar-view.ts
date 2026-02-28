/**
 * Calendar View -- pod-grid view for economic calendar events.
 * Falls back to fetching directly from the API if no matching source is in the registry.
 */
import {
  podGrid, pod, kpiStrip, miniTable, esc, spinnerHtml, errorHtml, badgeCls,
  type RenderContext,
} from '../layout';
import { fetchSource } from '../../global-data-api';
import { apiFetch } from '../../api-client';
import { SOURCE_MAP, sourcesForCategory } from '../../source-registry';
import { normalizeItems } from '../../explore-sections';

export async function renderCalendarView(ctx: RenderContext): Promise<void> {
  const sourceId = ctx.params.get('source') || '';
  const src = sourceId ? SOURCE_MAP.get(sourceId) : undefined;
  const calendarSources = sourcesForCategory('economy').filter(
    (s) => s.id.includes('calendar') || s.id.includes('event') || s.id.includes('econ'),
  );
  const activeSrc = src || calendarSources[0];

  ctx.typeBadge.textContent = 'Calendar';
  ctx.typeBadge.className = badgeCls('bg-blue-500/20 text-blue-400');
  ctx.nameEl.textContent = activeSrc?.label || 'Economic Calendar';
  ctx.subEl.textContent = activeSrc?.description || 'Upcoming economic events and releases';
  ctx.updateBreadcrumbs(activeSrc?.shortLabel || 'Calendar', 'data');
  ctx.sectionsGrid.innerHTML = spinnerHtml('Loading calendar events...');

  try {
    let rows: Record<string, unknown>[] = [];

    if (activeSrc) {
      const res = await fetchSource(activeSrc.endpoint, { limit: 50 });
      rows = res.data || [];
    } else {
      const res = await apiFetch<unknown>('/api/v1/data/economy/calendar?limit=50');
      if (res.ok && res.data) {
        rows = normalizeItems(res.data) as Record<string, unknown>[];
      }
    }

    const pods: string[] = [];

    if (rows.length === 0) {
      pods.push(pod(
        '<div class="text-center py-8">' +
          '<svg class="w-12 h-12 mx-auto text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/></svg>' +
          '<p class="text-sm text-slate-400 font-medium">No calendar data available</p>' +
          '<p class="text-xs text-slate-600 mt-1">Economic calendar events have not been collected yet.</p>' +
        '</div>',
        { span: 4 },
      ));
      ctx.sectionsGrid.innerHTML = podGrid(pods);
      return;
    }

    pods.push(kpiStrip([
      { label: 'Events', value: rows.length },
      { label: 'Source', value: activeSrc?.shortLabel || 'API' },
    ], { span: 4 }));

    const tableCols = activeSrc
      ? activeSrc.columns.filter((c) => !c.secondary).slice(0, 5)
      : inferColumns(rows[0] as Record<string, unknown>);

    pods.push(miniTable(
      rows, tableCols.map((c) => ({ key: c.key, label: c.label, type: c.type })),
      { title: 'Calendar Events', span: 4, maxRows: 25 },
    ));

    ctx.sectionsGrid.innerHTML = podGrid(pods);
  } catch (err) {
    ctx.sectionsGrid.innerHTML = errorHtml('Failed to load calendar', err);
  }
}

function inferColumns(row: Record<string, unknown>): { key: string; label: string; type: 'string' | 'number' | 'date' }[] {
  return Object.keys(row)
    .filter(k => !k.startsWith('_') && k !== 'id')
    .slice(0, 5)
    .map(k => ({
      key: k,
      label: k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      type: (typeof row[k] === 'number' ? 'number' : k.includes('date') ? 'date' : 'string') as 'string' | 'number' | 'date',
    }));
}
