/**
 * Smart Resolver -- unified search across entities, countries, datasets, and categories.
 *
 * Combines local matching (source registry, country list) with the
 * entity suggest API to produce ranked results for any query.
 *
 * Supports two modes:
 *  - `resolveSearch()` — awaits API + local, returns merged result.
 *  - `resolveSearchProgressive()` — fires local results immediately via callback,
 *     then augments with API results when they arrive (5 s timeout).
 */

import { apiFetch, getApiConfig } from '../api-client';
import { SOURCES, CATEGORIES } from '../source-registry';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ResolvedMatch {
  type: 'country' | 'entity' | 'dataset' | 'category' | 'vocabulary';
  label: string;
  description: string;
  href: string;
  icon: string;
  color: string;
  score: number;
  cik?: string;
  symbol?: string;
  iso3?: string;
  subTypes?: string[];
}

export interface ResolveResult {
  query: string;
  matches: ResolvedMatch[];
  best: ResolvedMatch | null;
  hasConflict: boolean;
  elapsed: number;
  /** True when this result only contains local matches (API pending or failed). */
  localOnly?: boolean;
}

// ─── Colors per match type ─────────────────────────────────────────────────

export const MATCH_COLORS: Record<string, string> = {
  country: 'bg-teal-500/20 text-teal-400',
  entity: 'bg-blue-500/20 text-blue-400',
  dataset: 'bg-pink-500/20 text-pink-400',
  category: 'bg-amber-500/20 text-amber-400',
  vocabulary: 'bg-purple-500/20 text-purple-400',
};

// ─── Icon SVG paths (24x24 stroke) ─────────────────────────────────────────

export const ICONS = {
  country: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3"/>',
  entity: '<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21"/>',
  dataset: '<path stroke-linecap="round" stroke-linejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375"/>',
  category: '<path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6z"/>',
  vocabulary: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25v14.25"/>',
};

// ─── Country list (ISO-3 → name) ──────────────────────────────────────────

const COUNTRIES: Record<string, string> = {
  AFG:'Afghanistan',ALB:'Albania',DZA:'Algeria',AND:'Andorra',AGO:'Angola',ARG:'Argentina',
  ARM:'Armenia',AUS:'Australia',AUT:'Austria',AZE:'Azerbaijan',BHS:'Bahamas',BHR:'Bahrain',
  BGD:'Bangladesh',BRB:'Barbados',BLR:'Belarus',BEL:'Belgium',BLZ:'Belize',BEN:'Benin',
  BTN:'Bhutan',BOL:'Bolivia',BIH:'Bosnia',BWA:'Botswana',BRA:'Brazil',BRN:'Brunei',
  BGR:'Bulgaria',BFA:'Burkina Faso',BDI:'Burundi',KHM:'Cambodia',CMR:'Cameroon',CAN:'Canada',
  CPV:'Cape Verde',CAF:'Central African Republic',TCD:'Chad',CHL:'Chile',CHN:'China',
  COL:'Colombia',COM:'Comoros',COG:'Congo',COD:'DR Congo',CRI:'Costa Rica',HRV:'Croatia',
  CUB:'Cuba',CYP:'Cyprus',CZE:'Czechia',DNK:'Denmark',DJI:'Djibouti',DOM:'Dominican Republic',
  ECU:'Ecuador',EGY:'Egypt',SLV:'El Salvador',GNQ:'Equatorial Guinea',ERI:'Eritrea',
  EST:'Estonia',SWZ:'Eswatini',ETH:'Ethiopia',FJI:'Fiji',FIN:'Finland',FRA:'France',
  GAB:'Gabon',GMB:'Gambia',GEO:'Georgia',DEU:'Germany',GHA:'Ghana',GRC:'Greece',
  GTM:'Guatemala',GIN:'Guinea',GNB:'Guinea-Bissau',GUY:'Guyana',HTI:'Haiti',HND:'Honduras',
  HUN:'Hungary',ISL:'Iceland',IND:'India',IDN:'Indonesia',IRN:'Iran',IRQ:'Iraq',
  IRL:'Ireland',ISR:'Israel',ITA:'Italy',JAM:'Jamaica',JPN:'Japan',JOR:'Jordan',
  KAZ:'Kazakhstan',KEN:'Kenya',KWT:'Kuwait',KGZ:'Kyrgyzstan',LAO:'Laos',LVA:'Latvia',
  LBN:'Lebanon',LSO:'Lesotho',LBR:'Liberia',LBY:'Libya',LIE:'Liechtenstein',LTU:'Lithuania',
  LUX:'Luxembourg',MDG:'Madagascar',MWI:'Malawi',MYS:'Malaysia',MDV:'Maldives',MLI:'Mali',
  MLT:'Malta',MRT:'Mauritania',MUS:'Mauritius',MEX:'Mexico',MDA:'Moldova',MNG:'Mongolia',
  MNE:'Montenegro',MAR:'Morocco',MOZ:'Mozambique',MMR:'Myanmar',NAM:'Namibia',NPL:'Nepal',
  NLD:'Netherlands',NZL:'New Zealand',NIC:'Nicaragua',NER:'Niger',NGA:'Nigeria',
  PRK:'North Korea',MKD:'North Macedonia',NOR:'Norway',OMN:'Oman',PAK:'Pakistan',
  PAN:'Panama',PNG:'Papua New Guinea',PRY:'Paraguay',PER:'Peru',PHL:'Philippines',
  POL:'Poland',PRT:'Portugal',QAT:'Qatar',ROU:'Romania',RUS:'Russia',RWA:'Rwanda',
  SAU:'Saudi Arabia',SEN:'Senegal',SRB:'Serbia',SLE:'Sierra Leone',SGP:'Singapore',
  SVK:'Slovakia',SVN:'Slovenia',SLB:'Solomon Islands',SOM:'Somalia',ZAF:'South Africa',
  KOR:'South Korea',SSD:'South Sudan',ESP:'Spain',LKA:'Sri Lanka',SDN:'Sudan',
  SUR:'Suriname',SWE:'Sweden',CHE:'Switzerland',SYR:'Syria',TWN:'Taiwan',TJK:'Tajikistan',
  TZA:'Tanzania',THA:'Thailand',TLS:'Timor-Leste',TGO:'Togo',TTO:'Trinidad and Tobago',
  TUN:'Tunisia',TUR:'Turkey',TKM:'Turkmenistan',UGA:'Uganda',UKR:'Ukraine',
  ARE:'United Arab Emirates',GBR:'United Kingdom',USA:'United States',URY:'Uruguay',
  UZB:'Uzbekistan',VUT:'Vanuatu',VEN:'Venezuela',VNM:'Vietnam',YEM:'Yemen',
  ZMB:'Zambia',ZWE:'Zimbabwe',
};

const COUNTRY_NAME_TO_ISO3 = new Map<string, string>();
const COUNTRY_ENTRIES: [string, string][] = [];
for (const [iso3, name] of Object.entries(COUNTRIES)) {
  COUNTRY_NAME_TO_ISO3.set(name.toLowerCase(), iso3);
  COUNTRY_ENTRIES.push([iso3, name]);
}

// ─── API types ─────────────────────────────────────────────────────────────

interface SuggestEntity {
  name: string;
  types: string[];
  symbol?: string | null;
  cik?: string | null;
  exchange?: string | null;
}

// ─── Fuzzy matching helper ─────────────────────────────────────────────────

function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (t === q) return 100;
  if (t.startsWith(q)) return 95;
  if (t.includes(q)) return 75;

  const words = t.split(/[\s\-_./]+/);
  for (const w of words) {
    if (w.startsWith(q)) return 80;
  }

  const acronym = words.map(w => w[0] || '').join('');
  if (acronym === q) return 85;
  if (acronym.startsWith(q)) return 75;

  let qi = 0;
  let totalGap = 0;
  let lastPos = -1;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      if (lastPos >= 0) totalGap += (ti - lastPos - 1);
      lastPos = ti;
      qi++;
    }
  }
  if (qi < q.length) return 0;

  const avgGap = totalGap / Math.max(q.length - 1, 1);
  if (avgGap > 3) return 0;
  const density = Math.max(0, 1 - avgGap / 4);
  return Math.round(40 + density * 20);
}

// ─── Local matching (synchronous) ──────────────────────────────────────────

export function resolveSearchLocal(query: string): ResolvedMatch[] {
  const q = query.trim();
  if (q.length < 2) return [];
  const ql = q.toLowerCase();
  const matches: ResolvedMatch[] = [];

  for (const [iso3, name] of COUNTRY_ENTRIES) {
    const score = iso3.toLowerCase() === ql ? 100 : fuzzyScore(ql, name);
    if (score >= 60) {
      matches.push({
        type: 'country', label: name, description: 'Country \u00B7 ISO3: ' + iso3,
        href: '/explore?mode=data&country=' + iso3,
        icon: ICONS.country, color: MATCH_COLORS.country, score, iso3,
      });
    }
  }

  for (const src of SOURCES) {
    const best = Math.max(
      fuzzyScore(ql, src.id),
      fuzzyScore(ql, src.label),
      fuzzyScore(ql, src.shortLabel),
    );
    if (best >= 60) {
      matches.push({
        type: 'dataset', label: src.label, description: src.description,
        href: '/explore?mode=data&source=' + src.id,
        icon: ICONS.dataset, color: MATCH_COLORS.dataset, score: best,
      });
    }
  }

  for (const cat of CATEGORIES) {
    const best = Math.max(fuzzyScore(ql, cat.id), fuzzyScore(ql, cat.label), fuzzyScore(ql, cat.shortLabel));
    if (best >= 60) {
      matches.push({
        type: 'category', label: cat.label, description: 'Data category',
        href: '/explore?mode=data&category=' + cat.id,
        icon: ICONS.category, color: MATCH_COLORS.category, score: best,
      });
    }
  }

  matches.sort((a, b) => b.score - a.score);
  return matches.slice(0, 10);
}

// ─── Entity suggest (same-origin first, then cross-origin fallback) ────────

const SUGGEST_TIMEOUT = 8_000;

function suggestPath(q: string): string {
  return '/api/v1/search/suggest?q=' + encodeURIComponent(q) + '&limit=8';
}

async function fetchSuggest(q: string, signal?: AbortSignal): Promise<SuggestEntity[]> {
  const path = suggestPath(q);
  const cfg = getApiConfig();
  const token = cfg?.token || '';

  // Race same-origin vs cross-origin in parallel — first non-empty wins
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SUGGEST_TIMEOUT);
  if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true });

  const sameOrigin = fetch(path, {
    headers: { Authorization: 'Bearer ' + token },
    signal: controller.signal,
  }).then(async (res) => {
    if (!res.ok) return [] as SuggestEntity[];
    const json = await res.json();
    return (json?.suggestions as SuggestEntity[]) || [];
  }).catch(() => [] as SuggestEntity[]);

  const crossOrigin = apiFetch<{ suggestions: SuggestEntity[] }>(path, {
    timeout: SUGGEST_TIMEOUT, signal: controller.signal,
  }).then(r => (r.ok && r.data?.suggestions) ? r.data.suggestions : [] as SuggestEntity[])
    .catch(() => [] as SuggestEntity[]);

  // Return whichever resolves first with actual results
  try {
    const result = await Promise.any([
      sameOrigin.then(r => r.length > 0 ? r : Promise.reject('empty')),
      crossOrigin.then(r => r.length > 0 ? r : Promise.reject('empty')),
    ]);
    clearTimeout(timer);
    return result;
  } catch {
    // Both returned empty — wait for either to finish and return whatever we got
    clearTimeout(timer);
    const [s, c] = await Promise.all([sameOrigin, crossOrigin]);
    return s.length > 0 ? s : c;
  }
}

// ─── Shared merge/score helpers ────────────────────────────────────────────

function entitiesToMatches(entities: SuggestEntity[], q: string): ResolvedMatch[] {
  const ql = q.toLowerCase();
  const out: ResolvedMatch[] = [];
  for (const ent of entities) {
    const typeList = ent.types || ['company'];
    const mainType = typeList.includes('company') ? 'company' : typeList[0];
    const qps: string[] = ['type=' + mainType];
    if (ent.cik) qps.push('cik=' + ent.cik);
    if (ent.symbol) qps.push('symbol=' + ent.symbol);
    qps.push('name=' + encodeURIComponent(ent.name));

    const nameLower = ent.name.toLowerCase();
    let score = nameLower === ql ? 100 : nameLower.startsWith(ql) ? 85 : nameLower.includes(ql) ? 70 : 50;
    if (ent.symbol && ent.symbol.toLowerCase() === ql) score = 95;

    out.push({
      type: 'entity', label: ent.name,
      description: typeList.join(', ') + (ent.symbol ? ' \u00B7 ' + ent.symbol : '') + (ent.exchange ? ' \u00B7 ' + ent.exchange : ''),
      href: '/explore?' + qps.join('&'),
      icon: ICONS.entity, color: MATCH_COLORS.entity, score,
      cik: ent.cik || undefined, symbol: ent.symbol || undefined,
      subTypes: typeList,
    });
  }
  return out;
}

function mergeAndScore(entityMatches: ResolvedMatch[], local: ResolvedMatch[]): { matches: ResolvedMatch[]; best: ResolvedMatch | null; hasConflict: boolean } {
  const seen = new Set<string>();
  const all: ResolvedMatch[] = [];
  for (const m of [...entityMatches, ...local]) {
    const key = m.type + ':' + m.label.toLowerCase() +
      (m.cik ? ':' + m.cik : '') + (m.symbol ? ':' + m.symbol : '');
    if (seen.has(key)) continue;
    seen.add(key);
    all.push(m);
  }
  all.sort((a, b) => b.score - a.score);
  const matches = all.slice(0, 15);
  const best = matches[0] || null;
  const hasConflict = matches.length >= 2 && best !== null && (
    (matches[1].score >= best.score * 0.85 && matches[0].type !== matches[1].type) ||
    (matches[1].score >= best.score * 0.95 && matches[0].type === matches[1].type &&
     matches[0].label.toLowerCase() !== matches[1].label.toLowerCase())
  );
  return { matches, best, hasConflict };
}

// ─── Full resolver (blocking, 5 s suggest timeout) ─────────────────────────

export async function resolveSearch(query: string): Promise<ResolveResult> {
  const t0 = performance.now();
  const q = query.trim();
  if (q.length < 2) {
    return { query: q, matches: [], best: null, hasConflict: false, elapsed: 0 };
  }

  const local = resolveSearchLocal(q);
  const entities = await fetchSuggest(q);
  const entityMatches = entitiesToMatches(entities, q);
  const { matches, best, hasConflict } = mergeAndScore(entityMatches, local);

  return { query: q, matches, best, hasConflict, elapsed: Math.round(performance.now() - t0) };
}

// ─── Progressive resolver (callback-driven, non-blocking) ──────────────────

export interface ProgressiveCallbacks {
  /** Fires immediately with local-only results. */
  onLocal: (result: ResolveResult) => void;
  /** Fires when API responds (or times out) with merged results. */
  onFull: (result: ResolveResult) => void;
}

/**
 * Progressive search: fires `onLocal` immediately with local-only results,
 * then fires `onFull` once the entity API responds (max 5 s) with merged results.
 * Returns a cancel function to abort the in-flight API call.
 */
export function resolveSearchProgressive(query: string, cbs: ProgressiveCallbacks): () => void {
  const t0 = performance.now();
  const q = query.trim();
  if (q.length < 2) {
    const empty: ResolveResult = { query: q, matches: [], best: null, hasConflict: false, elapsed: 0 };
    cbs.onLocal(empty);
    cbs.onFull(empty);
    return () => {};
  }

  const local = resolveSearchLocal(q);
  const localMerged = mergeAndScore([], local);
  cbs.onLocal({ query: q, ...localMerged, elapsed: Math.round(performance.now() - t0), localOnly: true });

  const ac = new AbortController();
  fetchSuggest(q, ac.signal).then(entities => {
    if (ac.signal.aborted) return;
    const entityMatches = entitiesToMatches(entities, q);
    const merged = mergeAndScore(entityMatches, local);
    cbs.onFull({ query: q, ...merged, elapsed: Math.round(performance.now() - t0), localOnly: entities.length === 0 });
  }).catch(() => {
    if (ac.signal.aborted) return;
    cbs.onFull({ query: q, ...localMerged, elapsed: Math.round(performance.now() - t0), localOnly: true });
  });

  return () => ac.abort();
}
