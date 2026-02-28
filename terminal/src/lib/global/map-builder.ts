/**
 * Global page map builder -- constructs ECharts geo option from source data,
 * handles tooltip formatting, map navigation, and map update.
 */
import {
  state, charts,
  sourceData,
  visibleSources, firstStr,
  MAP_CATEGORIES,
} from './state';
import {
  centroidOf, normalizeCountryName, iso3ToMapName, mapNameToIso3,
} from '../geo-map';
import { SOURCE_MAP, type SourceDef } from '../source-registry';

// ─── HTML Escape ─────────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Color Maps ──────────────────────────────────────────────────

const UCDP_COLORS: Record<string, string> = { '1': '#ef4444', '2': '#f97316', '3': '#eab308' };
const GFW_COLORS: Record<string, string> = {
  encounter: '#06b6d4', port_visit: '#22c55e', loitering: '#f59e0b',
  fishing: '#3b82f6', ais_gap: '#ef4444',
};
const GDELT_COLORS: Record<string, string> = { '1': '#22c55e', '2': '#3b82f6', '3': '#f97316', '4': '#ef4444' };

// ─── Map Navigation ──────────────────────────────────────────────

const DEFAULT_GEO = { zoom: 1.2, center: [10, 15] as [number, number] };
const ZOOM_STEP = 1.3;
const PAN_STEP = 20;

function getGeoState(): { zoom: number; center: [number, number] } {
  if (!charts.main) return { ...DEFAULT_GEO };
  const opt = (charts.main.getOption() as Record<string, unknown>);
  const geo = ((opt?.geo as Record<string, unknown>[])?.[0]) ?? {};
  return {
    zoom: (geo.zoom as number) ?? DEFAULT_GEO.zoom,
    center: (geo.center as [number, number]) ?? [...DEFAULT_GEO.center],
  };
}

function setGeo(zoom: number, center: [number, number]): void {
  if (!charts.main) return;
  charts.main.setOption({ geo: { zoom, center } } as Record<string, unknown>);
}

export function mapNav(action: string): void {
  const { zoom, center } = getGeoState();
  const panAmount = PAN_STEP / zoom;
  switch (action) {
    case 'zoom-in':   setGeo(Math.min(zoom * ZOOM_STEP, 40), center); break;
    case 'zoom-out':  setGeo(Math.max(zoom / ZOOM_STEP, 0.8), center); break;
    case 'pan-up':    setGeo(zoom, [center[0], center[1] + panAmount]); break;
    case 'pan-down':  setGeo(zoom, [center[0], center[1] - panAmount]); break;
    case 'pan-left':  setGeo(zoom, [center[0] - panAmount, center[1]]); break;
    case 'pan-right': setGeo(zoom, [center[0] + panAmount, center[1]]); break;
    case 'reset':     setGeo(DEFAULT_GEO.zoom, [...DEFAULT_GEO.center]); break;
  }
}

// ─── Tooltip Formatter ───────────────────────────────────────────

function tooltipFormatter(params: Record<string, unknown>): string {
  const data = (params as Record<string, unknown>).data as Record<string, unknown> | undefined;
  if (!data?._raw) {
    const name = esc((params.name as string) ?? '');
    const val = esc(String(params.value ?? ''));
    if (!name) return '';
    return `<div style="font-weight:600;margin-bottom:4px">${name}</div><div style="color:#94a3b8">Events: <span style="color:#e2e8f0;font-weight:500">${val}</span></div>`;
  }
  const raw = data._raw as Record<string, unknown>;
  const srcDef = SOURCE_MAP.get(data._src as string);
  if (!srcDef) return '';

  let html = `<div style="font-weight:600;color:${srcDef.color};margin-bottom:6px;font-size:12px">${esc(srcDef.shortLabel)}</div>`;
  for (const col of srcDef.columns.filter(c => !c.secondary)) {
    const v = raw[col.key];
    if (v == null || v === '') continue;
    let display: string;
    if (col.type === 'date') display = String(v).slice(0, 16).replace('T', ' ');
    else if (col.type === 'number') display = Number(v).toLocaleString('en-US');
    else display = esc(String(v));
    html += `<div style="display:flex;justify-content:space-between;gap:12px;line-height:1.6"><span style="color:#64748b">${esc(col.label)}</span><span style="color:#e2e8f0">${display}${col.unit ? ' ' + esc(col.unit) : ''}</span></div>`;
  }
  return html;
}

// ─── Build Map Option ────────────────────────────────────────────

export function buildMapOption(): Record<string, unknown> {
  const series: Record<string, unknown>[] = [];
  const vs = visibleSources();

  // Choropleth: aggregate country-level event counts
  const countryMap = new Map<string, number>();
  for (const src of vs) {
    if (src.geoType === 'point') continue;
    const data = sourceData.get(src.id) ?? [];
    if (src.id === 'gdelt') {
      for (const e of data) {
        const n = iso3ToMapName(e.actor1_country as string);
        if (n) countryMap.set(n, (countryMap.get(n) ?? 0) + 1);
      }
    }
    if (src.geoType === 'country' && src.countryField) {
      for (const e of data) {
        const code = String(e[src.countryField!] ?? '');
        const n = iso3ToMapName(code) || normalizeCountryName(code);
        if (n) countryMap.set(n, (countryMap.get(n) ?? 0) + 1);
      }
    }
  }

  if (countryMap.size > 0) {
    series.push({
      name: 'Country Heatmap', type: 'map', geoIndex: 0,
      data: Array.from(countryMap.entries()).map(([name, value]) => ({ name, value })),
      z: 1,
    });
  }

  // Scatter: point-type sources (exact lat/lon)
  for (const src of vs) {
    if (src.geoType !== 'point' || !src.latField || !src.lonField) continue;
    const data = sourceData.get(src.id) ?? [];
    if (!data.length) continue;

    const pts = data.map(e => {
      const lat = Number(e[src.latField!]);
      let lon = Number(e[src.lonField!]);
      if (isNaN(lat) || isNaN(lon) || (lat === 0 && lon === 0)) return null;
      // EPA rows can occasionally carry positive US longitudes from source quirks.
      if (src.id === 'epa' && lon > 0 && lat > 0) lon = -lon;
      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;

      let size = 5, color = src.color;
      if (src.id === 'ucdp') {
        const d = Number(e.deaths_best) || 0;
        size = d <= 0 ? 4 : Math.min(18, Math.max(4, Math.log2(d + 1) * 3));
        color = UCDP_COLORS[String(e.event_type)] ?? '#ef4444';
      } else if (src.id === 'gfw') {
        color = GFW_COLORS[e.event_type as string] ?? '#06b6d4';
      } else if (src.id === 'earthquakes') {
        const mag = Number(e.magnitude) || 0;
        size = Math.max(3, mag * 2.2);
        const al = e.alert_level as string;
        color = al === 'red' ? '#ef4444' : al === 'orange' ? '#f97316' : al === 'yellow' ? '#eab308' : '#f59e0b';
      } else if (src.id === 'gdacs') {
        size = Math.max(4, Math.min(14, (Number(e.severity) || 1) * 2.5));
      }

      return {
        name: firstStr(e, ['conflict_name', 'vessel_name', 'place', 'event_name', 'facility_name', 'disease', 'species', 'scientific_name', 'indicator', 'indicator_name', 'entity_name', 'country']) || src.shortLabel,
        value: [lon, lat, 1],
        symbolSize: size,
        itemStyle: { color },
        _src: src.id,
        _raw: e,
      };
    }).filter(Boolean);

    if (pts.length) {
      series.push({
        name: src.shortLabel,
        type: src.id === 'earthquakes' ? 'effectScatter' : 'scatter',
        coordinateSystem: 'geo',
        data: pts,
        symbolSize: (_: unknown, p: Record<string, unknown>) =>
          (p?.data as Record<string, unknown>)?.symbolSize ?? 5,
        z: 10,
        ...(src.id === 'earthquakes'
          ? { showEffectOn: 'emphasis', rippleEffect: { brushType: 'stroke', scale: 2.5 } }
          : {}),
      });
    }
  }

  // Centroid scatter: country-code-based sources (except GDELT)
  for (const src of vs) {
    if (src.geoType !== 'centroid' || src.id === 'gdelt') continue;
    const data = sourceData.get(src.id) ?? [];
    if (!data.length || !src.countryField) continue;
    const pts: Record<string, unknown>[] = [];
    for (const e of data) {
      const c = centroidOf(String(e[src.countryField!] ?? ''));
      if (c) pts.push({
        name: firstStr(e, ['country', 'name', 'entity_name', 'indicator']) || String(e[src.countryField!]),
        value: [c[1], c[0], 1], symbolSize: 6,
        itemStyle: { color: src.color }, _src: src.id, _raw: e,
      });
    }
    if (pts.length) {
      series.push({
        name: src.shortLabel, type: 'scatter', coordinateSystem: 'geo',
        data: pts, symbolSize: 6, z: 10,
      });
    }
  }

  // GDELT: centroid scatter + relation lines
  const gdeltSrc = vs.find(s => s.id === 'gdelt');
  if (gdeltSrc) {
    const gd = sourceData.get('gdelt') ?? [];
    const scatter: Record<string, unknown>[] = [];
    const lines: Record<string, unknown>[] = [];
    for (const e of gd) {
      const c1 = centroidOf(e.actor1_country as string);
      if (c1) scatter.push({
        name: (e.actor1_name as string) || (e.actor1_country as string),
        value: [c1[1], c1[0], (e.num_mentions as number) ?? 1],
        itemStyle: { color: GDELT_COLORS[String(e.quad_class)] ?? '#f97316' },
        _src: 'gdelt', _raw: e,
      });
      const c2 = centroidOf(e.actor2_country as string);
      if (c1 && c2 && e.actor1_country !== e.actor2_country) {
        const gs = (e.goldstein_scale as number) ?? 0;
        lines.push({
          coords: [[c1[1], c1[0]], [c2[1], c2[0]]],
          lineStyle: {
            color: gs >= 0 ? '#22c55e' : '#ef4444',
            width: Math.max(0.5, Math.min(3, Math.abs(gs) / 3)),
            opacity: Math.min(0.7, ((e.num_articles as number) ?? 1) / 25),
            curveness: 0.2,
          },
        });
      }
    }
    if (scatter.length) series.push({
      name: 'GDELT Events', type: 'effectScatter', coordinateSystem: 'geo', data: scatter,
      symbolSize: (v: number[]) => Math.min(14, Math.max(4, Math.log2((v[2] ?? 1) + 1) * 2.5)),
      showEffectOn: 'emphasis', rippleEffect: { brushType: 'stroke', scale: 3 }, z: 12,
    });
    if (lines.length) series.push({
      name: 'GDELT Relations', type: 'lines', coordinateSystem: 'geo', data: lines,
      lineStyle: { opacity: 0.4, curveness: 0.2 }, z: 8,
    });
  }

  const maxVal = countryMap.size ? Math.max(10, ...Array.from(countryMap.values())) : 10;
  const { zoom, center } = getGeoState();

  return {
    backgroundColor: 'transparent',
    geo: {
      map: 'world', roam: true, zoom, center,
      itemStyle: { areaColor: '#162032', borderColor: '#2a3a52', borderWidth: 0.6 },
      emphasis: {
        itemStyle: { areaColor: '#1e3a5f', borderColor: '#60a5fa', borderWidth: 1 },
        label: { show: true, color: '#e2e8f0', fontSize: 11, fontWeight: 500 },
      },
      label: { show: false },
      select: { itemStyle: { areaColor: '#1e3a5f' } },
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: '#0f172aee', borderColor: '#334155', borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: '#e2e8f0', fontSize: 11 },
      confine: true,
      formatter: tooltipFormatter,
      extraCssText: 'border-radius:8px;box-shadow:0 4px 24px #0005;max-width:300px;',
    },
    visualMap: countryMap.size > 0 ? {
      seriesIndex: 0, min: 0, max: maxVal,
      text: ['High', 'Low'], calculable: true,
      inRange: { color: ['#162032', '#1e3a5f', '#2563eb', '#60a5fa'] },
      textStyle: { color: '#94a3b8', fontSize: 10 },
      left: 'right', bottom: 40, orient: 'vertical',
      itemWidth: 12, itemHeight: 80, show: true,
    } : undefined,
    series,
  };
}

// ─── Update Map ──────────────────────────────────────────────────

export function updateMap(): void {
  if (!charts.main) return;
  charts.main.setOption(
    buildMapOption() as Record<string, unknown>,
    { replaceMerge: ['series'] },
  );
}

// ─── Map Click Handler ───────────────────────────────────────────

export function setupMapClicks(): void {
  if (!charts.main) return;
  charts.main.on('click', (params: Record<string, unknown>) => {
    const data = (params as Record<string, unknown>).data as Record<string, unknown> | undefined;

    if (params.componentType === 'series' && data?._raw && data?._src) {
      const srcDef = SOURCE_MAP.get(data._src as string);
      const raw = data._raw as Record<string, unknown>;
      let countryFilter = '';
      if (srcDef?.countryField && raw[srcDef.countryField]) countryFilter = String(raw[srcDef.countryField]);
      else if (raw.country) countryFilter = String(raw.country);
      else if (raw.actor1_country) countryFilter = String(raw.actor1_country);
      else if (raw.country_code) countryFilter = String(raw.country_code);

      if (countryFilter) {
        const iso3 = countryFilter.length === 3 ? countryFilter.toUpperCase() : countryFilter;
        window.open('/explore?mode=data&country=' + encodeURIComponent(iso3), '_blank');
      } else if (srcDef) {
        window.open('/explore?mode=data&source=' + encodeURIComponent(data._src as string), '_blank');
      }
      return;
    }

    if (params.componentType === 'geo' || params.seriesType === 'map') {
      const name = params.name as string;
      if (name) {
        window.location.href = '/explore?mode=data&country=' + encodeURIComponent(mapNameToIso3(name));
      }
    }
  });
}
