/**
 * Global Data API -- unified typed fetch wrappers for ALL free-data endpoints.
 *
 * All endpoints live under /api/v1/data/ and return an envelope:
 *   { source, count, items: [...], cached }
 * Each fetch wrapper unwraps `.items` so callers get a clean array.
 *
 * This module supersedes the old conflict-api.ts.
 */
import { apiFetch } from './api-client';

// ─── Shared Helpers ──────────────────────────────────────────────────────────

function qs(params: Record<string, string | number | boolean | null | undefined>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.length ? '?' + parts.join('&') : '';
}

export function defaultStartDate(daysBack = 365): string {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  return d.toISOString().slice(0, 10);
}

interface ApiEnvelope<T> {
  source: string;
  count: number;
  items: T[];
  cached: boolean;
}

function unwrap<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.items)) return obj.items as T[];
    if (Array.isArray(obj.data)) return obj.data as T[];
  }
  return [];
}

export interface DataFetchResult<T> {
  ok: boolean;
  data: T[];
  error: string | null;
  tokenCost: number;
  creditsRemaining: number | null;
}

async function dataFetch<T>(path: string, timeout = 45_000, signal?: AbortSignal): Promise<DataFetchResult<T>> {
  const res = await apiFetch<ApiEnvelope<T>>(path, { timeout, signal });
  return {
    ok: res.ok,
    data: res.ok ? unwrap<T>(res.data) : [],
    error: res.error,
    tokenCost: res.tokenCost,
    creditsRemaining: res.creditsRemaining,
  };
}

export async function fetchSource<T = Record<string, unknown>>(
  endpoint: string,
  params: Record<string, string | number | boolean | null | undefined> = {},
  timeout = 45_000,
  signal?: AbortSignal,
): Promise<DataFetchResult<T>> {
  return dataFetch<T>(endpoint + qs(params), timeout, signal);
}

// ─── Source Availability (cached) ─────────────────────────────────────────

export interface SourceAvailability { count: number; available: boolean }

let _availabilityCache: Record<string, SourceAvailability> | null = null;
let _availabilityCacheTime = 0;
const AVAILABILITY_TTL = 5 * 60 * 1000; // 5 minutes

export async function fetchSourceAvailability(): Promise<Record<string, SourceAvailability>> {
  if (_availabilityCache && Date.now() - _availabilityCacheTime < AVAILABILITY_TTL) return _availabilityCache;
  try {
    const cached = sessionStorage.getItem('fin-source-avail');
    if (cached) {
      const parsed = JSON.parse(cached) as { ts: number; data: Record<string, SourceAvailability> };
      if (Date.now() - parsed.ts < AVAILABILITY_TTL) {
        _availabilityCache = parsed.data;
        _availabilityCacheTime = parsed.ts;
        return parsed.data;
      }
    }
  } catch { /* ignore */ }
  const res = await apiFetch<{ sources: Record<string, SourceAvailability> }>('/api/v1/data/metadata/sources');
  const sources = res.ok && res.data?.sources ? res.data.sources : {};
  _availabilityCache = sources;
  _availabilityCacheTime = Date.now();
  try { sessionStorage.setItem('fin-source-avail', JSON.stringify({ ts: _availabilityCacheTime, data: sources })); } catch { /* ignore */ }
  return sources;
}

// ═══════════════════════════════════════════════════════════════════
// POLITICS & CONFLICT
// ═══════════════════════════════════════════════════════════════════

export interface UcdpEvent { event_id: string; event_type: string; conflict_name: string; country: string; country_code: string; region: string; latitude: number; longitude: number; date_start: string; date_end: string; deaths_best: number; deaths_low: number; deaths_high: number; side_a: string; side_b: string; }
export interface UcdpFilters { country?: string; event_type?: string; side_a?: string; start_date?: string; end_date?: string; limit?: number; }
export async function fetchUcdpEvents(f: UcdpFilters = {}): Promise<DataFetchResult<UcdpEvent>> {
  return dataFetch<UcdpEvent>('/api/v1/data/conflicts/ucdp' + qs({ country: f.country, event_type: f.event_type, side_a: f.side_a, start_date: f.start_date ?? defaultStartDate(), end_date: f.end_date, limit: f.limit ?? 500 }), 45_000);
}

export interface UcdpConflict { conflict_id: number; conflict_name: string; type_of_conflict: string; location: string; side_a: string; side_b: string; start_date: string; year: number; region: string; intensity_level: number; }
export interface UcdpConflictFilters { type_of_conflict?: string; region?: string; limit?: number; }
export async function fetchUcdpConflicts(f: UcdpConflictFilters = {}): Promise<DataFetchResult<UcdpConflict>> {
  return dataFetch<UcdpConflict>('/api/v1/data/conflicts/ucdp/summary' + qs({ type_of_conflict: f.type_of_conflict, region: f.region, limit: f.limit ?? 200 }), 30_000);
}

export interface AcledEvent { data_id: number; event_date: string; event_type: string; sub_event_type: string; actor1: string; actor2: string; country: string; admin1: string; admin2: string; latitude: number; longitude: number; fatalities: number; }
export interface AcledFilters { country?: string; event_type?: string; actor1?: string; start_date?: string; end_date?: string; limit?: number; }
export async function fetchAcledEvents(f: AcledFilters = {}): Promise<DataFetchResult<AcledEvent>> {
  return dataFetch<AcledEvent>('/api/v1/data/conflicts/acled' + qs({ country: f.country, event_type: f.event_type, actor1: f.actor1, start_date: f.start_date ?? defaultStartDate(), end_date: f.end_date, limit: f.limit ?? 500 }), 30_000);
}

export interface GdeltEvent { global_event_id: number; event_date: string; actor1_name: string; actor1_country: string; actor2_name: string; actor2_country: string; event_code: string; event_root_code: string; quad_class: string; goldstein_scale: number; num_mentions: number; num_sources: number; num_articles: number; avg_tone: number; action_geo_fullname: string; action_geo_country: string; action_geo_lat: number | null; action_geo_long: number | null; }
export interface GdeltFilters { actor1_country?: string; actor2_country?: string; event_code?: string; action_geo_country?: string; start_date?: string; end_date?: string; limit?: number; }
export async function fetchGdeltEvents(f: GdeltFilters = {}): Promise<DataFetchResult<GdeltEvent>> {
  return dataFetch<GdeltEvent>('/api/v1/data/conflicts/gdelt' + qs({ actor1_country: f.actor1_country, actor2_country: f.actor2_country, event_code: f.event_code, action_geo_country: f.action_geo_country, start_date: f.start_date ?? defaultStartDate(), end_date: f.end_date, limit: f.limit ?? 300 }), 45_000);
}

export interface GprEntry { date: string; gpr_value: number; gpr_threats: number; gpr_acts: number; }
export interface GprFilters { start_date?: string; end_date?: string; limit?: number; }
export async function fetchGprIndex(f: GprFilters = {}): Promise<DataFetchResult<GprEntry>> {
  return dataFetch<GprEntry>('/api/v1/data/esg/gpr' + qs({ start_date: f.start_date ?? defaultStartDate(), end_date: f.end_date, limit: f.limit ?? 100 }), 30_000);
}

// ═══════════════════════════════════════════════════════════════════
// NATURE & DISASTERS
// ═══════════════════════════════════════════════════════════════════

export interface EarthquakeEvent { event_id: string; event_time: string; latitude: number; longitude: number; depth_km: number; magnitude: number; magnitude_type: string; place: string; alert_level: string; sig: number; }
export interface EarthquakeFilters { min_magnitude?: number; start_date?: string; end_date?: string; limit?: number; }
export async function fetchEarthquakes(f: EarthquakeFilters = {}): Promise<DataFetchResult<EarthquakeEvent>> {
  return dataFetch<EarthquakeEvent>('/api/v1/data/earthquakes' + qs({ min_magnitude: f.min_magnitude, start_date: f.start_date ?? defaultStartDate(30), end_date: f.end_date, limit: f.limit ?? 200 }), 30_000);
}

export interface GdacsEvent { event_id: string; event_type: string; event_name: string; country: string; severity: number; alert_level: string; start_date: string; end_date: string; latitude: number; longitude: number; affected_population: number; }
export interface GdacsFilters { event_types?: string; alert_levels?: string; start_date?: string; limit?: number; }
export async function fetchGdacsEvents(f: GdacsFilters = {}): Promise<DataFetchResult<GdacsEvent>> {
  return dataFetch<GdacsEvent>('/api/v1/data/disasters/gdacs' + qs({ event_types: f.event_types, alert_levels: f.alert_levels, start_date: f.start_date ?? defaultStartDate(90), limit: f.limit ?? 100 }), 30_000);
}

export interface NoaaAlert { alert_id: string; event_type: string; headline: string; severity: string; urgency: string; certainty: string; effective_at: string; expires_at: string; area_desc: string; }
export interface NoaaFilters { severity?: string; event_types?: string; limit?: number; }
export async function fetchNoaaAlerts(f: NoaaFilters = {}): Promise<DataFetchResult<NoaaAlert>> {
  return dataFetch<NoaaAlert>('/api/v1/data/weather/alerts' + qs({ severity: f.severity, event_types: f.event_types, limit: f.limit ?? 100 }), 30_000);
}

export interface EmdatDisaster { disaster_no: string; disaster_type: string; disaster_subtype: string; country: string; iso: string; region: string; start_date: string; end_date: string; total_deaths: number; total_affected: number; total_damage_usd: number; }
export interface EmdatFilters { disaster_type?: string; country_code?: string; start_year?: number; end_year?: number; limit?: number; }
export async function fetchEmdatDisasters(f: EmdatFilters = {}): Promise<DataFetchResult<EmdatDisaster>> {
  return dataFetch<EmdatDisaster>('/api/v1/data/disasters/historical' + qs({ disaster_type: f.disaster_type, country_code: f.country_code, start_year: f.start_year, end_year: f.end_year, limit: f.limit ?? 200 }), 30_000);
}

// ═══════════════════════════════════════════════════════════════════
// MARITIME & FISHING
// ═══════════════════════════════════════════════════════════════════

export interface GfwEvent { event_id: string; event_type: string; start_time: string; end_time: string; latitude: number; longitude: number; vessel_id: string; vessel_name: string; vessel_flag: string; vessel_type: string; vessel_imo: string; vessel_mmsi: string; port_name: string; port_flag: string; }
export interface GfwFilters { event_type?: string; vessel_flag?: string; vessel_name?: string; port_name?: string; start_date?: string; end_date?: string; limit?: number; }
export async function fetchGfwEvents(f: GfwFilters = {}): Promise<DataFetchResult<GfwEvent>> {
  return dataFetch<GfwEvent>('/api/v1/data/maritime/events' + qs({ event_type: f.event_type, vessel_flag: f.vessel_flag, vessel_name: f.vessel_name, port_name: f.port_name, start_date: f.start_date ?? defaultStartDate(90), end_date: f.end_date, limit: f.limit ?? 300 }), 45_000);
}

// ═══════════════════════════════════════════════════════════════════
// ECONOMY & TRADE
// ═══════════════════════════════════════════════════════════════════

export interface FxRate { date: string; currency_from: string; currency_to: string; rate: number; frequency: string; }
export interface FxFilters { currency_from?: string; start_date?: string; end_date?: string; limit?: number; }
export async function fetchFxRates(f: FxFilters = {}): Promise<DataFetchResult<FxRate>> {
  return dataFetch<FxRate>('/api/v1/data/fx/rates' + qs({ currency_from: f.currency_from, start_date: f.start_date ?? defaultStartDate(90), end_date: f.end_date, limit: f.limit ?? 100 }), 30_000);
}

export interface CryptoPrice { coin_id: string; vs_currency: string; price: number; market_cap: number; volume_24h: number; price_change_24h: number; timestamp: string; }
export interface CryptoFilters { coin_ids?: string; vs_currency?: string; limit?: number; }
export async function fetchCryptoPrices(f: CryptoFilters = {}): Promise<DataFetchResult<CryptoPrice>> {
  return dataFetch<CryptoPrice>('/api/v1/data/crypto/prices' + qs({ coin_ids: f.coin_ids, vs_currency: f.vs_currency ?? 'usd', limit: f.limit ?? 50 }), 30_000);
}

export interface ImfIndicator { indicator_code: string; country_code: string; year: number; value: number; unit: string; scale: string; }
export interface ImfFilters { indicator_code?: string; country_code?: string; start_year?: number; end_year?: number; limit?: number; }
export async function fetchImfIndicators(f: ImfFilters = {}): Promise<DataFetchResult<ImfIndicator>> {
  return dataFetch<ImfIndicator>('/api/v1/data/economic/imf' + qs({ indicator_code: f.indicator_code, country_code: f.country_code, start_year: f.start_year, end_year: f.end_year, limit: f.limit ?? 100 }), 30_000);
}

export interface ComtradeFlow { reporter_code: string; partner_code: string; commodity_code: string; year: number; trade_flow: string; trade_value: number; net_weight: number; }
export interface ComtradeFilters { reporter_code?: string; partner_code?: string; year?: number; flow_code?: string; limit?: number; }
export async function fetchComtradeFlows(f: ComtradeFilters = {}): Promise<DataFetchResult<ComtradeFlow>> {
  return dataFetch<ComtradeFlow>('/api/v1/data/trade/flows' + qs({ reporter_code: f.reporter_code, partner_code: f.partner_code, year: f.year, flow_code: f.flow_code, limit: f.limit ?? 100 }), 30_000);
}

// ═══════════════════════════════════════════════════════════════════
// ENVIRONMENT & ESG
// ═══════════════════════════════════════════════════════════════════

export interface EpaFacility { facility_id: string; facility_name: string; city: string; state: string; zip_code: string; latitude: number; longitude: number; naics_code: string; }
export interface EpaFilters { state?: string; parent_company?: string; limit?: number; }
export async function fetchEpaFacilities(f: EpaFilters = {}): Promise<DataFetchResult<EpaFacility>> {
  return dataFetch<EpaFacility>('/api/v1/data/esg/facilities' + qs({ state: f.state, parent_company: f.parent_company, limit: f.limit ?? 100 }), 30_000);
}

// ═══════════════════════════════════════════════════════════════════
// Re-export GeoFetchResult as DataFetchResult alias for backward compat
// ═══════════════════════════════════════════════════════════════════
export type GeoFetchResult<T> = DataFetchResult<T>;
