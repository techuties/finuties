# Endpoint expansion backlog (free-first)

## Scope checked
- Existing registry reviewed: `terminal/src/lib/source-registry.ts`
- Current source count: 63
- Implementation gap seen in current list: `acled` is marked `placeholder: true`
- Priority rule used here: free + directly accessible first, then low-friction gated, then scraping-only

## Tier 1 - High value and immediate (free, directly accessible)

| Priority | Proposed internal endpoint | External endpoint (example) | Access | Why high value | Implementation notes |
|---|---|---|---|---|---|
| P0 | `/api/v1/data/fiscal/us-debt` | `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/debt/mspd/mspd_table_1?page%5Bsize%5D=1` | Free, no key | Adds sovereign debt and treasury financing signal not covered today | Normalize `record_date`, debt buckets, units (USD millions vs USD) |
| P0 | `/api/v1/data/fiscal/us-fx-rates` | `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/rates_of_exchange?page%5Bsize%5D=1` | Free, no key | Strong complement to ECB FX source with US Treasury rates dataset | Reconcile currency code standards with existing `fx` source |
| P0 | `/api/v1/data/filings/sec-submissions` | `https://data.sec.gov/submissions/CIK0000320193.json` | Free, no key (User-Agent required) | Direct corporate filing flow improves market risk nowcasting | Add required `User-Agent` header and CIK normalization |
| P0 | `/api/v1/data/filings/sec-companyfacts` | `https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json` | Free, no key (User-Agent required) | Adds structured fundamentals without third-party vendors | Start with top issuers only, cache heavily |
| P1 | `/api/v1/data/weather/global-forecast` | `https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current=temperature_2m` | Free (non-commercial limits), no key | Global weather shock context for commodities, logistics, and risk | Build parameterized lat/lon endpoints plus country centroid presets |
| P1 | `/api/v1/data/maritime/tides-water-level` | `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=water_level&application=finuties&begin_date=20260301&end_date=20260302&datum=MLLW&station=9414290&time_zone=gmt&units=metric&format=json` | Free, no key | Useful for port disruption and coastal hazard monitoring | Station map table required for user-friendly selection |
| P1 | `/api/v1/data/disasters/nasa-eonet` | `https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=20` | Free, no key | Real-time global natural events (wildfire, storms, volcanoes) with geojson | Good map-native fit; merge category taxonomy with existing disaster tags |
| P1 | `/api/v1/data/economy/eurostat` | `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/DEMO_R_D3DENS?format=JSON&lang=EN` | Free, no key | High-quality EU regional/macroeconomic detail missing from WB/IMF-only coverage | JSON-stat parser needed (dimension/value cube format) |
| P1 | `/api/v1/data/economy/oecd-sdmx` | `https://sdmx.oecd.org/public/rest/dataflow` | Free, no key | Broad OECD macro/sector datasets for developed-market signal depth | Implement SDMX adapter once and reuse across datasets |
| P1 | `/api/v1/data/labor/us-bls` | `https://api.bls.gov/publicAPI/v2/timeseries/data/LNS14000000` | Free, no key | Adds labor market nowcast feed (unemployment, participation, wages) | Respect daily query caps and batch series requests |
| P1 | `/api/v1/data/economy/owid-series` | `https://ourworldindata.org/grapher/life-expectancy.csv` | Free, no key | Fast way to onboard curated indicator time series via stable slugs | Build slug allowlist + CSV schema mapper |
| P2 | `/api/v1/data/aviation/opensky-live` | `https://opensky-network.org/api/states/all` | Free anonymous access | Live aviation movement can proxy trade/logistics stress | Anonymous mode has constraints; aggressive rate limiting and caching needed |
| P2 | `/api/v1/data/security/nvd-cves` | `https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=1` | Free, no key | Cyber risk is a material geopolitical/economic spillover channel | Without key: low throughput, so poll incrementally |
| P2 | `/api/v1/data/security/cisa-kev` | `https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json` | Free, no key | High signal "actively exploited" vulnerability list | Very low integration effort; good candidate for first cyber card |

## Tier 2 - High value but not fully immediate (light gating or policy friction)

| Priority | Proposed internal endpoint | External source | Friction | Why still valuable | Next step |
|---|---|---|---|---|---|
| P2 | `/api/v1/data/humanitarian/reliefweb-reports` | `https://api.reliefweb.int/v2/reports` | Requires approved `appname` (requests without approved appname fail) | Strong crisis/displacement signal and narrative context | Submit appname request and implement after approval |
| P2 | `/api/v1/data/conflicts/acled` (complete) | ACLED API | Registration/token and terms constraints | Already in registry as placeholder, high user value if completed | Confirm license/terms and add key-based ingestion path |
| P3 | `/api/v1/data/disasters/nasa-firms` | NASA FIRMS wildfire APIs | Free but requires registration key | High-value wildfire activity and smoke risk | Add optional key support in backend connector |

## Tier 3 - Valuable but not immediate (scraping-first or unstable interfaces)

| Priority | Proposed internal endpoint | Source type | Why deferred | Scraping strategy |
|---|---|---|---|---|
| P3 | `/api/v1/data/policy/central-bank-press` | ECB/Fed/BoE press release pages and calendars | Heterogeneous HTML, changing markup | Start RSS where available; fallback to resilient HTML selectors |
| P3 | `/api/v1/data/shipping/port-disruptions` | Port authority notices and terminal advisories | No unified global API | Country-by-country scraper adapters with per-source parsers |
| P3 | `/api/v1/data/food/spot-price-bulletins` | Public ministry bulletins and exchange pages | Often PDF/HTML without stable APIs | Build PDF table extraction pipeline and provenance metadata |

## Recommended implementation order (next 2 sprints)
1. FiscalData debt + rates
2. SEC submissions + companyfacts
3. NASA EONET
4. Open-Meteo forecast
5. Eurostat adapter
6. CISA KEV + NVD (new cyber track)

## Notes for implementation quality
- Keep source IDs and internal endpoints stable once published.
- Add explicit source-level rate-limit metadata (requests/minute) in registry.
- For all new feeds, store original source URL and fetch timestamp for traceability.
