/**
 * Global page KPI summary panel.
 */
import {
  state, dom,
  MAP_SOURCES,
  sourceData,
  mapSourcesFor,
} from './state';
import type { CategoryId } from '../source-registry';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const MAX_KPIS = 8;

export function updateKpis(): void {
  const grid = dom.kpiGrid;
  if (!grid) return;

  const sources = state.activeCat === 'all'
    ? MAP_SOURCES
    : mapSourcesFor(state.activeCat as CategoryId);

  const kpis: { label: string; value: string; color: string; priority: number }[] = [];
  let total = 0;
  const countrySet = new Set<string>();
  let activeSrcCount = 0;

  for (const src of sources) {
    if (src.placeholder) continue;
    const data = sourceData.get(src.id) ?? [];
    total += data.length;
    if (data.length > 0) activeSrcCount++;
    const cf = src.countryField ?? src.columns.find(c => c.key === 'country')?.key;
    if (cf) data.forEach(d => { const v = d[cf]; if (v) countrySet.add(String(v)); });
  }

  kpis.push({ label: 'Events', value: total.toLocaleString(), color: '#3b82f6', priority: 0 });
  kpis.push({ label: 'Sources', value: String(activeSrcCount), color: '#8b5cf6', priority: 1 });
  if (countrySet.size > 0) kpis.push({ label: 'Countries', value: String(countrySet.size), color: '#f59e0b', priority: 2 });

  if (state.activeCat === 'politics' || state.activeCat === 'all') {
    const ucdp = sourceData.get('ucdp') ?? [];
    const deaths = ucdp.reduce((s, e) => s + (Number(e.deaths_best) || 0), 0);
    if (deaths > 0) kpis.push({ label: 'Conflict Deaths', value: deaths.toLocaleString(), color: '#ef4444', priority: 3 });
  }
  if (state.activeCat === 'nature' || state.activeCat === 'all') {
    const eq = sourceData.get('earthquakes') ?? [];
    const maxMag = eq.reduce((m, e) => Math.max(m, Number(e.magnitude) || 0), 0);
    if (maxMag > 0) kpis.push({ label: 'Max Magnitude', value: maxMag.toFixed(1), color: '#f59e0b', priority: 3 });
  }
  if (state.activeCat === 'maritime' || state.activeCat === 'all') {
    const gfw = sourceData.get('gfw') ?? [];
    if (gfw.length > 0) kpis.push({ label: 'Maritime', value: gfw.length.toLocaleString(), color: '#06b6d4', priority: 4 });
  }

  if (state.activeCat !== 'all') {
    const catSources = mapSourcesFor(state.activeCat as CategoryId);
    for (const src of catSources) {
      const cnt = sourceData.get(src.id)?.length ?? 0;
      if (cnt > 0 && !kpis.some(k => k.label === src.shortLabel)) {
        kpis.push({ label: src.shortLabel, value: cnt.toLocaleString(), color: src.color, priority: 5 });
      }
    }
  }

  kpis.sort((a, b) => a.priority - b.priority);
  grid.innerHTML = '';
  for (const kpi of kpis.slice(0, MAX_KPIS)) {
    const div = document.createElement('div');
    div.className = 'bg-fin-800/50 rounded-lg p-1.5 text-center';
    div.innerHTML = `<div class="text-sm font-bold tabular-nums" style="color:${kpi.color}">${esc(kpi.value)}</div><div class="text-[9px] text-slate-500 leading-tight truncate">${esc(kpi.label)}</div>`;
    grid.appendChild(div);
  }
}
