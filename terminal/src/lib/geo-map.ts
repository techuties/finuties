/**
 * Geo-map utilities: world GeoJSON loader, ECharts geo helpers, and
 * ISO 3166-1 alpha-3 country centroid lookup.
 */
import { loadECharts } from './explore-sections';

// ─── GeoJSON Loader ──────────────────────────────────────────────────────────

/** Self-hosted GeoJSON (primary) with CDN fallback. */
const LOCAL_WORLD_JSON = '/data/world.json';
const CDN_WORLD_JSON = 'https://cdn.jsdelivr.net/npm/echarts/map/json/world.json';

let _worldPromise: Promise<void> | null = null;
let _worldRegistered = false;

/** Fetch with an AbortController timeout. */
async function fetchWithTimeout(url: string, timeoutMs = 15_000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Lazy-fetch world GeoJSON and register it with ECharts.
 * Tries the local /data/world.json first (fast, no CORS/CSP issues),
 * then falls back to the jsDelivr CDN.
 * Subsequent calls return the cached promise; failures clear the cache.
 */
export function loadWorldMap(): Promise<void> {
  if (_worldRegistered) return Promise.resolve();
  if (_worldPromise) return _worldPromise;
  _worldPromise = (async () => {
    const echarts = await loadECharts();

    let geojson: unknown = null;
    for (const url of [LOCAL_WORLD_JSON, CDN_WORLD_JSON]) {
      try {
        const resp = await fetchWithTimeout(url, 12_000);
        if (resp.ok) {
          geojson = await resp.json();
          break;
        }
      } catch {
        // Try next URL
      }
    }
    if (!geojson) throw new Error('Failed to load world GeoJSON from all sources');

    echarts.registerMap('world', geojson as any);
    _worldRegistered = true;
  })().catch((err) => {
    _worldPromise = null;
    throw err;
  });
  return _worldPromise;
}

/**
 * Convenience: load ECharts + world map, create and return a chart instance.
 * Attaches a ResizeObserver for automatic resize handling.
 */
export async function initGeoChart(
  el: HTMLElement,
  opts?: Record<string, unknown>,
): Promise<{ echarts: typeof import('echarts'); chart: ReturnType<typeof import('echarts')['init']>; resizeObserver: ResizeObserver }> {
  const [echarts] = await Promise.all([loadECharts(), loadWorldMap()]);
  const chart = echarts.init(el, 'dark');
  if (opts) chart.setOption(opts);
  const resizeObserver = new ResizeObserver(() => chart.resize());
  resizeObserver.observe(el);
  return { echarts, chart, resizeObserver };
}

// ─── ISO-3 Country Centroids ─────────────────────────────────────────────────

/**
 * Approximate [latitude, longitude] centroids for ISO 3166-1 alpha-3 codes.
 * Used to place GDELT events on the map when only country codes are available.
 */
export const ISO3_CENTROIDS: Record<string, [number, number]> = {
  AFG: [33.9, 67.7],   AGO: [-12.3, 17.9],  ALB: [41.2, 20.2],
  DZA: [28.0, 1.7],    AND: [42.5, 1.5],     ARE: [23.4, 53.8],
  ARG: [-38.4, -63.6],  ARM: [40.1, 45.0],   AUS: [-25.3, 133.8],
  AUT: [47.5, 14.6],   AZE: [40.1, 47.6],    BDI: [-3.4, 29.9],
  BEL: [50.5, 4.5],    BEN: [9.3, 2.3],      BFA: [12.2, -1.6],
  BGD: [23.7, 90.4],   BGR: [42.7, 25.5],    BHR: [26.0, 50.6],
  BHS: [25.0, -77.4],  BIH: [43.9, 17.7],    BLR: [53.7, 27.9],
  BLZ: [17.2, -88.5],  BOL: [-16.3, -63.6],  BRA: [-14.2, -51.9],
  BRN: [4.5, 114.7],   BTN: [27.5, 90.4],    BWA: [-22.3, 24.7],
  CAF: [6.6, 20.9],    CAN: [56.1, -106.3],  CHE: [46.8, 8.2],
  CHL: [-35.7, -71.5], CHN: [35.9, 104.2],   CIV: [7.5, -5.5],
  CMR: [7.4, 12.4],    COD: [-4.0, 21.8],    COG: [-0.2, 15.8],
  COL: [4.6, -74.3],   CRI: [10.0, -84.0],   CUB: [21.5, -78.0],
  CYP: [35.1, 33.4],   CZE: [49.8, 15.5],    DEU: [51.2, 10.5],
  DJI: [11.6, 43.1],   DNK: [56.3, 9.5],     DOM: [18.7, -70.2],
  ECU: [-1.8, -78.2],  EGY: [26.8, 30.8],
  ERI: [15.2, 39.8],   ESP: [40.5, -3.7],    EST: [58.6, 25.0],
  ETH: [9.1, 40.5],    FIN: [61.9, 25.7],    FJI: [-18.0, 175.0],
  FRA: [46.2, 2.2],    GAB: [-0.8, 11.6],    GBR: [55.4, -3.4],
  GEO: [42.3, 43.4],   GHA: [7.9, -1.0],     GIN: [9.9, -11.6],
  GMB: [13.4, -15.3],  GNB: [12.0, -15.2],   GNQ: [1.6, 10.3],
  GRC: [39.1, 21.8],   GTM: [15.8, -90.2],   GUY: [4.9, -58.9],
  HND: [15.2, -86.2],  HRV: [45.1, 15.2],    HTI: [19.1, -72.3],
  HUN: [47.2, 19.5],   IDN: [-0.8, 113.9],   IND: [20.6, 79.0],
  IRL: [53.1, -8.2],   IRN: [32.4, 53.7],    IRQ: [33.2, 44.0],
  ISL: [65.0, -18.0],  ISR: [31.0, 34.9],    ITA: [41.9, 12.6],
  JAM: [18.1, -77.3],  JOR: [30.6, 36.2],    JPN: [36.2, 138.3],
  KAZ: [48.0, 68.0],   KEN: [-0.0, 37.9],    KGZ: [41.2, 74.8],
  KHM: [12.6, 105.0],  KOR: [36.0, 128.0],   KWT: [29.3, 47.5],
  LAO: [19.9, 102.5],  LBN: [33.9, 35.9],    LBR: [6.4, -9.4],
  LBY: [26.3, 17.2],   LKA: [7.9, 80.8],     LSO: [-29.6, 28.2],
  LTU: [55.2, 23.9],   LUX: [49.8, 6.1],     LVA: [56.9, 24.1],
  MAR: [31.8, -7.1],   MDA: [47.4, 28.4],    MDG: [-18.8, 46.9],
  MEX: [23.6, -102.6], MKD: [41.5, 21.7],    MLI: [17.6, -4.0],
  MMR: [21.9, 96.0],   MNE: [42.7, 19.4],    MNG: [46.9, 103.8],
  MOZ: [-18.7, 35.5],  MRT: [21.0, -10.9],   MUS: [-20.3, 57.6],
  MWI: [-13.3, 34.3],  MYS: [4.2, 101.9],    NAM: [-22.9, 18.5],
  NER: [17.6, 8.1],    NGA: [9.1, 8.7],      NIC: [12.9, -85.2],
  NLD: [52.1, 5.3],    NOR: [60.5, 8.5],     NPL: [28.4, 84.1],
  NZL: [-40.9, 174.9], OMN: [21.5, 55.9],    PAK: [30.4, 69.3],
  PAN: [8.5, -80.8],   PER: [-9.2, -75.0],   PHL: [12.9, 122.0],
  PNG: [-6.3, 143.9],  POL: [52.0, 20.0],    PRK: [40.3, 127.5],
  PRT: [39.4, -8.2],   PRY: [-23.4, -58.4],  PSE: [31.9, 35.2],
  QAT: [25.4, 51.2],   ROU: [45.9, 24.9],    RUS: [61.5, 105.3],
  RWA: [-1.9, 29.9],   SAU: [23.9, 45.1],    SDN: [12.9, 30.2],
  SEN: [14.5, -14.5],  SGP: [1.4, 103.8],    SLE: [8.5, -11.8],
  SLV: [13.8, -88.9],  SOM: [5.2, 46.2],     SRB: [44.0, 21.0],
  SSD: [7.9, 30.2],    SUR: [3.9, -56.0],    SVK: [48.7, 19.7],
  SVN: [46.2, 15.0],   SWE: [60.1, 18.6],    SWZ: [-26.5, 31.5],
  SYR: [35.0, 38.5],   TCD: [15.5, 18.7],    TGO: [8.6, 1.2],
  THA: [15.9, 100.9],  TJK: [38.9, 71.3],    TKM: [39.0, 59.6],
  TLS: [-8.9, 126.0],  TTO: [10.7, -61.2],   TUN: [34.0, 9.5],
  TUR: [38.9, 35.2],   TWN: [23.7, 121.0],   TZA: [-6.4, 34.9],
  UGA: [1.4, 32.3],    UKR: [48.4, 31.2],    URY: [-32.5, -55.8],
  USA: [38.0, -97.0],  UZB: [41.4, 64.6],    VEN: [6.4, -66.6],
  VNM: [14.1, 108.3],  YEM: [15.6, 48.5],    ZAF: [-30.6, 22.9],
  ZMB: [-13.1, 28.0],  ZWE: [-19.0, 29.2],
  // Supranational / regional codes used by GDELT
  AFR: [0.0, 25.0],    EUR: [50.0, 10.0],    ASI: [34.0, 100.0],
};

/**
 * Resolve a country code to [lat, lon].  Returns null for unknown codes.
 */
export function centroidOf(iso3: string | undefined | null): [number, number] | null {
  if (!iso3) return null;
  return ISO3_CENTROIDS[iso3.toUpperCase()] ?? null;
}

// ─── Country Name Normalization ──────────────────────────────────────────────

/**
 * Map common UCDP / GDELT country name variants to the ECharts world.json
 * feature names.  The ECharts GeoJSON uses Natural Earth short names.
 */
const NAME_ALIASES: Record<string, string> = {
  'united states': 'United States of America',
  'united states of america': 'United States of America',
  'russia': 'Russia',
  'dr congo': 'Dem. Rep. Congo',
  'democratic republic of congo': 'Dem. Rep. Congo',
  'congo, dem. rep.': 'Dem. Rep. Congo',
  'republic of congo': 'Congo',
  'congo': 'Congo',
  'central african republic': 'Central African Rep.',
  'south sudan': 'S. Sudan',
  'ivory coast': "C\u00f4te d'Ivoire",
  "cote d'ivoire": "C\u00f4te d'Ivoire",
  'bosnia-herzegovina': 'Bosnia and Herz.',
  'bosnia and herzegovina': 'Bosnia and Herz.',
  'myanmar (burma)': 'Myanmar',
  'czech republic': 'Czech Rep.',
  'czechia': 'Czech Rep.',
  'north korea': 'North Korea',
  'south korea': 'South Korea',
  'north macedonia': 'Macedonia',
  'dominican republic': 'Dominican Rep.',
  'equatorial guinea': 'Eq. Guinea',
  'western sahara': 'W. Sahara',
  'solomon islands': 'Solomon Is.',
  'guinea-bissau': 'Guinea-Bissau',
  'trinidad and tobago': 'Trinidad and Tobago',
  'eswatini': 'eSwatini',
  'swaziland': 'eSwatini',
  'timor-leste': 'Timor-Leste',
  'east timor': 'Timor-Leste',
  'palestine': 'Palestine',
  'state of palestine': 'Palestine',
};

/**
 * ISO-3 code -> ECharts GeoJSON feature name.
 * Used for GDELT choropleth (actor1_country is ISO-3).
 */
const ISO3_TO_NAME: Record<string, string> = {
  AFG: 'Afghanistan', AGO: 'Angola', ALB: 'Albania', DZA: 'Algeria',
  ARE: 'United Arab Emirates', ARG: 'Argentina', ARM: 'Armenia',
  AUS: 'Australia', AUT: 'Austria', AZE: 'Azerbaijan', BDI: 'Burundi',
  BEL: 'Belgium', BEN: 'Benin', BFA: 'Burkina Faso', BGD: 'Bangladesh',
  BGR: 'Bulgaria', BHR: 'Bahrain', BIH: 'Bosnia and Herz.',
  BLR: 'Belarus', BOL: 'Bolivia', BRA: 'Brazil', CAF: 'Central African Rep.',
  CAN: 'Canada', CHE: 'Switzerland', CHL: 'Chile', CHN: 'China',
  CIV: "C\u00f4te d'Ivoire", CMR: 'Cameroon', COD: 'Dem. Rep. Congo',
  COG: 'Congo', COL: 'Colombia', CRI: 'Costa Rica', CUB: 'Cuba',
  CYP: 'Cyprus', CZE: 'Czech Rep.', DEU: 'Germany', DJI: 'Djibouti',
  DNK: 'Denmark', DOM: 'Dominican Rep.', ECU: 'Ecuador', EGY: 'Egypt',
  ERI: 'Eritrea', ESP: 'Spain', EST: 'Estonia', ETH: 'Ethiopia',
  FIN: 'Finland', FRA: 'France', GAB: 'Gabon', GBR: 'United Kingdom',
  GEO: 'Georgia', GHA: 'Ghana', GIN: 'Guinea', GRC: 'Greece',
  GTM: 'Guatemala', GUY: 'Guyana', HND: 'Honduras', HRV: 'Croatia',
  HTI: 'Haiti', HUN: 'Hungary', IDN: 'Indonesia', IND: 'India',
  IRL: 'Ireland', IRN: 'Iran', IRQ: 'Iraq', ISL: 'Iceland',
  ISR: 'Israel', ITA: 'Italy', JAM: 'Jamaica', JOR: 'Jordan',
  JPN: 'Japan', KAZ: 'Kazakhstan', KEN: 'Kenya', KGZ: 'Kyrgyzstan',
  KHM: 'Cambodia', KOR: 'South Korea', KWT: 'Kuwait', LAO: 'Lao PDR',
  LBN: 'Lebanon', LBR: 'Liberia', LBY: 'Libya', LKA: 'Sri Lanka',
  LTU: 'Lithuania', LUX: 'Luxembourg', LVA: 'Latvia', MAR: 'Morocco',
  MDA: 'Moldova', MDG: 'Madagascar', MEX: 'Mexico', MKD: 'Macedonia',
  MLI: 'Mali', MMR: 'Myanmar', MNG: 'Mongolia', MOZ: 'Mozambique',
  MRT: 'Mauritania', MWI: 'Malawi', MYS: 'Malaysia', NAM: 'Namibia',
  NER: 'Niger', NGA: 'Nigeria', NIC: 'Nicaragua', NLD: 'Netherlands',
  NOR: 'Norway', NPL: 'Nepal', NZL: 'New Zealand', OMN: 'Oman',
  PAK: 'Pakistan', PAN: 'Panama', PER: 'Peru', PHL: 'Philippines',
  PNG: 'Papua New Guinea', POL: 'Poland', PRK: 'North Korea',
  PRT: 'Portugal', PRY: 'Paraguay', PSE: 'Palestine', QAT: 'Qatar',
  ROU: 'Romania', RUS: 'Russia', RWA: 'Rwanda', SAU: 'Saudi Arabia',
  SDN: 'Sudan', SEN: 'Senegal', SGP: 'Singapore', SLE: 'Sierra Leone',
  SLV: 'El Salvador', SOM: 'Somalia', SRB: 'Serbia', SSD: 'S. Sudan',
  SVK: 'Slovakia', SVN: 'Slovenia', SWE: 'Sweden', SWZ: 'eSwatini',
  SYR: 'Syria', TCD: 'Chad', TGO: 'Togo', THA: 'Thailand',
  TJK: 'Tajikistan', TKM: 'Turkmenistan', TLS: 'Timor-Leste',
  TUN: 'Tunisia', TUR: 'Turkey', TWN: 'Taiwan', TZA: 'Tanzania',
  UGA: 'Uganda', UKR: 'Ukraine', URY: 'Uruguay',
  USA: 'United States of America', UZB: 'Uzbekistan', VEN: 'Venezuela',
  VNM: 'Vietnam', YEM: 'Yemen', ZAF: 'South Africa', ZMB: 'Zambia',
  ZWE: 'Zimbabwe',
};

/**
 * Normalize a country name from UCDP data to match the ECharts world GeoJSON.
 */
export function normalizeCountryName(name: string | undefined | null): string {
  if (!name) return '';
  const lower = name.trim().toLowerCase();
  return NAME_ALIASES[lower] ?? name.trim();
}

/**
 * Convert an ISO-3 code to the ECharts map feature name.
 */
export function iso3ToMapName(iso3: string | undefined | null): string {
  if (!iso3) return '';
  return ISO3_TO_NAME[iso3.toUpperCase()] ?? iso3;
}

/** Reverse map: ECharts display name -> ISO-3 code */
const NAME_TO_ISO3: Record<string, string> = {};
for (const [code, name] of Object.entries(ISO3_TO_NAME)) {
  NAME_TO_ISO3[name.toLowerCase()] = code;
}
const EXTRA_NAME_TO_ISO3: Record<string, string> = {
  'united states': 'USA',
  'united states of america': 'USA',
  'south korea': 'KOR',
  'north korea': 'PRK',
  'czech rep.': 'CZE',
  'dem. rep. congo': 'COD',
  'democratic republic of the congo': 'COD',
  'central african rep.': 'CAF',
  'dominican rep.': 'DOM',
  'bosnia and herz.': 'BIH',
  's. sudan': 'SSD',
  'south sudan': 'SSD',
  'lao pdr': 'LAO',
  'laos': 'LAO',
  'eswatini': 'SWZ',
  'ivory coast': 'CIV',
  "cote d'ivoire": 'CIV',
  "c\u00f4te d'ivoire": 'CIV',
  'timor-leste': 'TLS',
  'papua new guinea': 'PNG',
  'taiwan': 'TWN',
  'palestine': 'PSE',
};
for (const [n, c] of Object.entries(EXTRA_NAME_TO_ISO3)) {
  NAME_TO_ISO3[n.toLowerCase()] = c;
}

/**
 * Convert an ECharts map feature name to ISO-3 code.
 * Returns the original string if no match is found.
 */
export function mapNameToIso3(name: string | undefined | null): string {
  if (!name) return '';
  const lower = name.trim().toLowerCase();
  return NAME_TO_ISO3[lower] ?? name;
}
