/**
 * Country Overview Dashboard renderer.
 * Renders a full country overview with map, KPIs, and category cards
 * when the explore page receives ?mode=data&country=<ISO3>.
 */
import {
  CATEGORIES, SOURCES, CATEGORY_MAP, SOURCE_MAP,
  sourcesForCategory, type CategoryId, type SourceDef, type CategoryDef,
} from './source-registry';
import { fetchSource } from './global-data-api';
import { initGeoChart, iso3ToMapName, centroidOf } from './geo-map';
import { esc } from './explore-sections';

type SrcResult = { src: SourceDef; rows: Record<string, unknown>[] };

const PANEL = 'rounded-xl border border-fin-800 bg-fin-900/80 backdrop-blur shadow-sm overflow-hidden';

function kpi(label: string, value: string, color = '#e2e8f0'): string {
  return '<div class="rounded-xl border border-fin-800 bg-fin-900/80 p-3">' +
    '<p class="text-[10px] uppercase tracking-wider text-slate-500">' + esc(label) + '</p>' +
    '<p class="text-sm font-semibold mt-0.5" style="color:' + color + '">' + esc(value) + '</p></div>';
}

/** Build the country-filtered fetch params for a given source + ISO-3 code. */
function countryParams(src: SourceDef, iso3: string, displayName: string): Record<string, string | number> {
  const fp: Record<string, string | number> = { limit: 50 };
  if (src.id === 'gdelt') fp.actor1_country = iso3;
  else if (src.id === 'epa') fp.state = displayName;
  else if (src.countryField) fp[src.countryField] = iso3;
  else fp.country = iso3;
  if (src.defaultDays === 0) {
    fp.start_year = new Date().getFullYear() - 1;
    fp.end_year = new Date().getFullYear();
  }
  return fp;
}

/** Build the explore drill-down URL for a source filtered by country. */
function exploreUrl(src: SourceDef, iso3: string): string {
  let url = '/explore?mode=data&source=' + encodeURIComponent(src.id);
  if (src.id === 'gdelt') url += '&actor1_country=' + encodeURIComponent(iso3);
  else if (src.countryField) url += '&' + encodeURIComponent(src.countryField) + '=' + encodeURIComponent(iso3);
  else url += '&country=' + encodeURIComponent(iso3);
  return url;
}

/** Render a compact 5-row preview table for a source. */
function previewTable(src: SourceDef, rows: Record<string, unknown>[]): string {
  const cols = src.columns.filter(c => !c.secondary).slice(0, 5);
  const preview = rows.slice(0, 5);
  let h = '<div class="overflow-x-auto -mx-1"><table class="w-full text-[11px]"><thead><tr>';
  for (const col of cols) h += '<th class="px-2 py-1 text-left text-[9px] uppercase tracking-wider text-slate-600 font-medium whitespace-nowrap">' + esc(col.label) + '</th>';
  h += '</tr></thead><tbody>';
  for (const row of preview) {
    h += '<tr class="border-t border-fin-800/30">';
    for (const col of cols) {
      const val = row[col.key];
      if (col.type === 'number' && val != null && val !== '') {
        h += '<td class="px-2 py-1 text-slate-300 tabular-nums whitespace-nowrap">' + Number(val).toLocaleString(undefined, { maximumFractionDigits: 4 }) + '</td>';
      } else if (col.type === 'date' && val) {
        h += '<td class="px-2 py-1 text-slate-400 whitespace-nowrap">' + esc(String(val).slice(0, 10)) + '</td>';
      } else if (col.type === 'badge' && val) {
        h += '<td class="px-2 py-1"><span class="inline-block rounded-full px-1.5 py-0.5 text-[9px] font-medium bg-fin-700/40 text-slate-300">' + esc(String(val)) + '</span></td>';
      } else {
        h += '<td class="px-2 py-1 text-slate-400 whitespace-nowrap truncate max-w-[120px]">' + esc(val != null ? String(val) : '\u2014') + '</td>';
      }
    }
    h += '</tr>';
  }
  h += '</tbody></table></div>';
  return h;
}

/** Build category cards HTML from grouped source results. */
function buildCategoryCards(srcResults: SrcResult[], iso3: string, displayName: string): string {
  const byCat = new Map<string, SrcResult[]>();
  for (const sr of srcResults) {
    const list = byCat.get(sr.src.category) || [];
    list.push(sr);
    byCat.set(sr.src.category, list);
  }

  let html = '';
  for (const cat of CATEGORIES) {
    const catResults = byCat.get(cat.id);
    if (!catResults) continue;
    const hasData = catResults.some(r => r.rows.length > 0);
    const catTotal = catResults.reduce((s, r) => s + r.rows.length, 0);

    html += '<div class="' + PANEL + '">';
    // Header
    html += '<div class="px-4 py-3 border-b border-fin-800 flex items-center gap-3">';
    html += '<svg class="w-5 h-5 flex-shrink-0" style="color:' + cat.color + '" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">' + cat.icon + '</svg>';
    html += '<span class="text-sm font-semibold text-slate-200">' + esc(cat.label) + '</span>';
    html += '<span class="ml-auto text-[10px] rounded-full px-2 py-0.5 font-medium" style="background:' + cat.color + '20;color:' + cat.color + '">' + catTotal + ' rows</span>';
    html += '</div>';

    if (!hasData) {
      html += '<div class="px-4 py-6 text-center text-sm text-slate-600">No data available for ' + esc(displayName) + '</div>';
    } else {
      html += '<div class="divide-y divide-fin-800/50">';
      for (const sr of catResults) {
        if (sr.rows.length === 0) continue;
        const s = sr.src;
        const rows = sr.rows;

        html += '<div class="px-4 py-3">';
        // Source header + link
        html += '<div class="flex items-center gap-2 mb-2">';
        html += '<svg class="w-4 h-4 flex-shrink-0" style="color:' + s.color + '" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">' + s.icon + '</svg>';
        html += '<span class="text-xs font-semibold text-slate-300">' + esc(s.label) + '</span>';
        html += '<span class="text-[10px] text-slate-600">' + rows.length + ' rows</span>';
        html += '<a href="' + esc(exploreUrl(s, iso3)) + '" class="ml-auto text-[10px] text-fin-400 hover:text-fin-300 transition-colors whitespace-nowrap">Explore full data →</a>';
        html += '</div>';

        // Mini KPIs
        html += '<div class="flex gap-3 mb-2 flex-wrap">';
        const numCol = s.columns.find(c => c.type === 'number' && !c.secondary);
        if (numCol) {
          const vals = rows.map(r => Number(r[numCol.key])).filter(v => !isNaN(v) && v !== 0);
          if (vals.length) {
            const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
            html += '<span class="text-[10px] text-slate-400">Avg ' + esc(numCol.label) + ': <span class="text-slate-200 font-medium">' + avg.toLocaleString(undefined, { maximumFractionDigits: 2 }) + (numCol.unit ? ' ' + esc(numCol.unit) : '') + '</span></span>';
          }
        }
        const dateCol = s.columns.find(c => c.type === 'date');
        if (dateCol && rows.length) {
          const dates = rows.map(r => String(r[dateCol.key] || '')).filter(Boolean).sort();
          if (dates.length >= 2) {
            html += '<span class="text-[10px] text-slate-500">' + esc(dates[0].slice(0, 10)) + ' → ' + esc(dates[dates.length - 1].slice(0, 10)) + '</span>';
          }
        }
        html += '</div>';

        // Preview table
        html += previewTable(s, rows);

        // Sparkline placeholder
        if (dateCol && numCol && rows.length > 2) {
          html += '<div class="co-sparkline mt-2" data-src="' + esc(s.id) + '" style="height:60px;width:100%"></div>';
        }

        html += '</div>';
      }
      html += '</div>';
    }
    html += '</div>';
  }
  return html;
}

/**
 * Main entry point: render the full Country Overview Dashboard.
 */
export async function renderCountryOverview(
  isoParam: string,
  container: HTMLElement,
  headerElements: { typeBadge: HTMLElement; nameEl: HTMLElement; subEl: HTMLElement },
  updateBreadcrumbs: (label: string, type: string) => void,
): Promise<void> {
  const iso3 = isoParam.toUpperCase();
  const displayName = iso3ToMapName(iso3) || iso3;

  // Update page header
  headerElements.typeBadge.textContent = 'Country';
  headerElements.typeBadge.className = 'flex-shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-sky-500/20 text-sky-400';
  headerElements.nameEl.textContent = displayName;
  headerElements.subEl.textContent = 'Country overview — ' + iso3;
  updateBreadcrumbs(displayName, 'data');

  // ── Layout skeleton ──
  let skeleton = '';

  // Header card
  skeleton += '<div class="' + PANEL + ' mb-6"><div class="px-5 py-4 flex items-center gap-4">';
  skeleton += '<div class="w-12 h-12 rounded-full bg-sky-500/10 flex items-center justify-center text-sky-400">';
  skeleton += '<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3"/></svg>';
  skeleton += '</div><div class="min-w-0 flex-1">';
  skeleton += '<h2 class="text-lg font-bold text-slate-100">' + esc(displayName) + '</h2>';
  skeleton += '<p class="text-xs text-slate-500">' + esc(iso3) + ' — Aggregated data from all available sources</p>';
  skeleton += '</div>';
  skeleton += '<a href="/global" class="text-xs text-fin-400 hover:text-fin-300 transition-colors whitespace-nowrap flex items-center gap-1">';
  skeleton += '<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>Back to Map</a>';
  skeleton += '</div></div>';

  // Map card
  skeleton += '<div class="' + PANEL + ' mb-6">';
  skeleton += '<div class="px-4 py-3 border-b border-fin-800 flex items-center justify-between">';
  skeleton += '<span class="text-sm font-semibold text-slate-200">' + esc(displayName) + ' — Data Map</span>';
  skeleton += '<span class="text-[10px] text-slate-500" id="co-map-status">Loading...</span></div>';
  skeleton += '<div id="co-map" class="w-full" style="height:340px"></div></div>';

  // KPI strip + category placeholders
  skeleton += '<div id="co-kpi-strip" class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">' + '<div class="h-16 rounded-xl bg-fin-800/30 animate-pulse"></div>'.repeat(4) + '</div>';
  skeleton += '<div id="co-categories" class="space-y-6"><div class="space-y-4 animate-pulse">' + '<div class="h-40 rounded-xl bg-fin-800/30"></div>'.repeat(3) + '</div></div>';

  container.innerHTML = skeleton;

  // ── Parallel data fetch ──
  const geoSources = SOURCES.filter(s => s.geoType !== 'none' && !s.placeholder);
  const results = await Promise.allSettled(geoSources.map(src =>
    fetchSource<Record<string, unknown>>(src.endpoint, countryParams(src, iso3, displayName), 20_000)
      .then(r => ({ src, rows: r.data || [] } as SrcResult))
      .catch(() => ({ src, rows: [] } as SrcResult))
  ));

  const srcResults: SrcResult[] = results
    .filter((r): r is PromiseFulfilledResult<SrcResult> => r.status === 'fulfilled')
    .map(r => r.value);

  // ── KPI strip ──
  const totalRows = srcResults.reduce((s, r) => s + r.rows.length, 0);
  const withData = srcResults.filter(r => r.rows.length > 0);
  const catsWithData = new Set(withData.map(r => r.src.category));

  let kpiHtml = kpi('Data Points', totalRows.toLocaleString(), '#38bdf8');
  kpiHtml += kpi('Active Sources', withData.length + ' / ' + geoSources.length);
  kpiHtml += kpi('Categories', String(catsWithData.size));

  for (const sr of srcResults) {
    if (sr.src.id === 'un_population' && sr.rows.length) {
      const pop = Number((sr.rows[0] as any).value || (sr.rows[0] as any).population);
      if (pop > 0) { kpiHtml += kpi('Population', pop >= 1e6 ? (pop / 1e6).toFixed(1) + 'M' : pop.toLocaleString(), '#a855f7'); break; }
    }
    if (sr.src.id === 'undp_hdi' && sr.rows.length) {
      const hdi = Number((sr.rows[0] as any).value || (sr.rows[0] as any).hdi);
      if (hdi > 0) { kpiHtml += kpi('HDI', hdi.toFixed(3), '#14b8a6'); break; }
    }
  }
  document.getElementById('co-kpi-strip')!.innerHTML = kpiHtml;

  // ── Category cards ──
  const catHtml = buildCategoryCards(srcResults, iso3, displayName);
  document.getElementById('co-categories')!.innerHTML = catHtml || '<div class="text-center text-sm text-slate-500 py-8">No data available for ' + esc(displayName) + ' from any source.</div>';

  // ── Sparklines ──
  const sparkEls = document.querySelectorAll('.co-sparkline');
  if (sparkEls.length) {
    try {
      const ec = await import('echarts/core');
      const { LineChart: LC } = await import('echarts/charts');
      const { GridComponent: GC, TooltipComponent: TC } = await import('echarts/components');
      const { CanvasRenderer: CR } = await import('echarts/renderers');
      ec.use([LC, GC, TC, CR]);
      for (const el of sparkEls) {
        const srcId = el.getAttribute('data-src');
        const sr = srcId ? srcResults.find(r => r.src.id === srcId) : null;
        if (!sr || sr.rows.length < 2) continue;
        const s = sr.src;
        const dc = s.columns.find(c => c.type === 'date');
        const nc = s.columns.find(c => c.type === 'number' && !c.secondary);
        if (!dc || !nc) continue;
        const sorted = [...sr.rows].sort((a, b) => String(a[dc.key]).localeCompare(String(b[dc.key])));
        const clr = CATEGORY_MAP.get(s.category)?.color || s.color;
        const chart = ec.init(el as HTMLElement);
        chart.setOption({
          grid: { left: 4, right: 4, top: 4, bottom: 4 },
          tooltip: { trigger: 'axis', textStyle: { fontSize: 10 } },
          xAxis: { type: 'category', data: sorted.map(r => String(r[dc.key]).slice(0, 10)), show: false },
          yAxis: { type: 'value', show: false },
          series: [{ type: 'line', data: sorted.map(r => Number(r[nc.key]) || 0), smooth: true, symbol: 'none', lineStyle: { color: clr, width: 1.5 }, areaStyle: { color: clr + '15' } }],
        });
        new ResizeObserver(() => chart.resize()).observe(el as HTMLElement);
      }
    } catch { /* echarts load failure - sparklines skipped */ }
  }

  // ── Focused country map ──
  const mapEl = document.getElementById('co-map');
  const mapStatus = document.getElementById('co-map-status');
  if (mapEl) {
    try {
      const { chart } = await initGeoChart(mapEl);
      const scatterData: any[] = [];
      for (const sr of srcResults) {
        if (!sr.rows.length) continue;
        const s = sr.src;
        if (s.geoType === 'point' && s.latField && s.lonField) {
          for (const row of sr.rows) {
            const lat = Number(row[s.latField]); const lon = Number(row[s.lonField]);
            if (isNaN(lat) || isNaN(lon) || (lat === 0 && lon === 0)) continue;
            scatterData.push({ name: String(row[s.columns[0]?.key] || s.shortLabel), value: [lon, lat, 1], itemStyle: { color: s.color }, symbolSize: 6 });
          }
        } else if (s.geoType === 'centroid' && s.countryField) {
          const c = centroidOf(iso3);
          if (c) scatterData.push({
            name: s.shortLabel + ' (' + sr.rows.length + ')',
            value: [c[1], c[0], sr.rows.length],
            itemStyle: { color: s.color },
            symbolSize: Math.min(16, Math.max(6, Math.log2(sr.rows.length + 1) * 3)),
          });
        }
      }
      const center = centroidOf(iso3) || [0, 0];
      chart.setOption({
        backgroundColor: 'transparent',
        geo: {
          map: 'world', roam: true,
          center: [center[1], center[0]], zoom: 5,
          itemStyle: { areaColor: '#1a1f2e', borderColor: '#334155', borderWidth: 0.5 },
          emphasis: { itemStyle: { areaColor: '#1e293b' }, label: { show: false } },
          regions: [{ name: displayName, itemStyle: { areaColor: '#38bdf820', borderColor: '#38bdf8', borderWidth: 1.5 } }],
          silent: false,
        },
        tooltip: { trigger: 'item', textStyle: { fontSize: 11 } },
        series: scatterData.length ? [{ type: 'scatter', coordinateSystem: 'geo', data: scatterData, symbolSize: (v: unknown, p: any) => p?.data?.symbolSize ?? 6, z: 10 }] : [],
      });
      if (mapStatus) mapStatus.textContent = scatterData.length + ' data points';
    } catch {
      if (mapStatus) mapStatus.textContent = 'Map unavailable';
      mapEl.innerHTML = '<div class="flex items-center justify-center h-full text-sm text-slate-600">Could not load map</div>';
    }
  }
}
