# New Sources / Endpoints / Scraping Suggestions

This file was prepared after checking currently wired endpoints in:
- `terminal/src/lib/source-registry.ts`
- `terminal/src/lib/global-data-api.ts`
- other `/api/v1/...` usages in `terminal/src/lib/**`

Goal: prioritize free and directly accessible datasets first, then move to key-gated and finally scraping-heavy sources.

## Priority A - High value and immediate (free + directly accessible)

| Rank | Source | External endpoint (example) | Proposed internal endpoint | Why high value | Access |
|---|---|---|---|---|---|
| A1 | US Treasury FiscalData (Debt + Deficit) | `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/debt_to_the_penny?fields=record_date,tot_pub_debt_out_amt` | `/api/v1/data/economic/us-debt` | Strong macro/rates context, reliable official source, easy time-series ingestion | Free, no key |
| A2 | NASA EONET Natural Events | `https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=100` | `/api/v1/data/disasters/eonet` | Complements USGS/GDACS with wildfire/storm/volcanic events and clean geo payloads | Free, no key |
| A3 | Open-Meteo Weather + Air Quality | `https://api.open-meteo.com/v1/forecast?latitude=40.71&longitude=-74.00&current=temperature_2m,wind_speed_10m` | `/api/v1/data/climate/open-meteo` | High-demand real-time weather and air metrics for alerting overlays | Free, no key |
| A4 | OpenSky Flight States | `https://opensky-network.org/api/states/all` | `/api/v1/data/mobility/flights` | Adds live aviation mobility/risk signal for geopolitical and logistics views | Free, no key (rate-limited) |
| A5 | Eurostat Dissemination API | `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/DEMO_R_D3DENS?lang=EN` | `/api/v1/data/economic/eurostat` | High-quality EU socio-economic indicators with stable dataset codes | Free, no key |
| A6 | OECD SDMX-JSON | `https://stats.oecd.org/SDMX-JSON/data/MEI_CLI/LOLITOAA.STSA...M/all?startPeriod=2018` | `/api/v1/data/economic/oecd` | Broad macro indicators (CLI, inflation, labor, productivity) with global coverage | Free, no key |
| A7 | USGS Volcano Hazards (HANS) | `https://volcanoes.usgs.gov/hans-public/api/volcano/getElevatedVolcanoes` | `/api/v1/data/disasters/volcanoes` | Fills a current hazard gap: eruption alerts + aviation impact | Free, no key |
| A8 | Stooq Historical Prices (CSV) | `https://stooq.com/q/d/l/?s=^spx&i=d` | `/api/v1/data/market/stooq-prices` | Fast, direct historical market series for baseline analytics without auth friction | Free, no key |
| A9 | HDX CKAN Dataset Search | `https://data.humdata.org/api/3/action/package_search?q=food%20security` | `/api/v1/data/humanitarian/hdx-catalog` | Rapid humanitarian discovery layer; useful for downstream joins and source expansion | Free, no key |

## Priority B - High value, but not immediate (free with auth/registration friction)

| Rank | Source | External endpoint (example) | Proposed internal endpoint | Friction | Value |
|---|---|---|---|---|---|
| B1 | EIA Open Data v2 | `https://api.eia.gov/v2/seriesid/...?api_key=...` | `/api/v1/data/economic/eia-energy` | Free API key required | Strong energy pricing, stocks, generation data |
| B2 | ReliefWeb Reports API | `https://api.reliefweb.int/v2/reports?appname=approved-appname` | `/api/v1/data/humanitarian/reliefweb-reports` | Approved `appname` required | High-signal humanitarian and conflict situation updates |
| B3 | OpenAQ v3 | `https://api.openaq.org/v3/countries` | `/api/v1/data/environment/openaq` | API key required | Air-quality network data with global environmental relevance |
| B4 | Alpha Vantage | `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=IBM&apikey=...` | `/api/v1/data/market/alpha-vantage` | Free key + tight rate limits | Simple market/fx fallback source |
| B5 | FRED API | `https://api.stlouisfed.org/fred/series/observations?series_id=CPIAUCSL&api_key=...&file_type=json` | `/api/v1/data/economic/fred` | API key required | Best-in-class US macro series catalog and metadata |

## Priority C - Not immediate (scraping or unstable/unstructured sources)

| Rank | Source area | Candidate URL(s) | Proposed internal endpoint | Why later |
|---|---|---|---|---|
| C1 | Port congestion dashboards | Major port authority pages (LA/LB, Rotterdam, Singapore) | `/api/v1/data/logistics/port-congestion` | Mostly HTML dashboards, inconsistent formats, anti-bot risk |
| C2 | Commodity export restrictions trackers | Government ministry notices + WTO notification pages | `/api/v1/data/trade/export-restrictions` | Unstructured policy text, requires robust NLP/entity extraction |
| C3 | Central bank speech and minutes trackers | Fed, ECB, BoE publication pages | `/api/v1/data/monetary/policy-text-feed` | Mixed RSS/HTML/PDF parsing and change-detection maintenance |
| C4 | National grid outage maps | Utility operator map pages and status dashboards | `/api/v1/data/infrastructure/grid-outages` | Interactive map scraping + geocoding normalization complexity |

## Recommended implementation sequence

1. Build A1-A4 first (highest user-visible value, low integration friction).
2. Add A5-A7 as the next wave for macro + risk depth.
3. Keep A8-A9 for quick catalog and market backfill.
4. Defer B-tier until key/registration workflow is in place.
5. Treat C-tier as separate projects with legal and reliability review.

## Notes for integration consistency

- Reuse the existing envelope pattern: `{ source, count, items, cached }`.
- Keep new IDs and endpoint paths additive and backward-compatible.
- Prefer `geoType: point/country` whenever possible for map readiness.
- For CSV sources, normalize to typed records before exposing to UI.
