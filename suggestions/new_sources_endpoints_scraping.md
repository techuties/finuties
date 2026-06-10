# New Sources, Endpoints, and Scraping Suggestions

This file reviews the current FinUties endpoint surface and lists new data
sources worth implementing, ordered from high-value immediate candidates to
sources that are useful but not immediate.

## Current coverage checked

- `terminal/src/lib/source-registry.ts` defines 52 registry-backed sources across
  politics/conflict, disasters, maritime, economy/trade, CFTC positioning, ESG,
  health, demographics, food/agriculture, development, climate, biodiversity,
  and sanctions.
- Dashboard cards also call additional FinUties endpoints for SEC filings,
  insider transactions, top holdings, calendar events, Treasury/Fed rates,
  macro series, and dashboard summaries.
- ACLED is currently marked as a placeholder in the registry, which is a useful
  signal that authenticated or licensed data sources should not be treated as
  immediate no-key wins.

Priority bias below favors:

1. free and directly accessible endpoints;
2. JSON or CSV over HTML scraping;
3. sources that add a new analytical surface instead of duplicating an existing
   registry entry;
4. stable public-sector or standards-based APIs.

## Immediate high-value candidates

These are the best first additions because they are free, directly accessible,
and returned usable responses during endpoint checks unless otherwise noted.

| Priority | Source | Proposed FinUties endpoint(s) | Direct source endpoint examples | Access | Why it is high value | Implementation notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | SEC XBRL Company Facts and Concepts | `/api/v1/sec/company-facts`, `/api/v1/sec/company-concepts`, `/api/v1/sec/xbrl/frames` | `https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json`, `https://data.sec.gov/api/xbrl/companyconcept/CIK0000320193/us-gaap/Revenues.json`, `https://data.sec.gov/api/xbrl/frames/us-gaap/Revenues/USD/CY2025Q4I.json` | Free, no key; compliant `User-Agent` required | Adds fundamentals, ratios, historical statements, and cross-company frames to the existing SEC filings/insider surface. | Normalize CIKs to 10 digits, cache aggressively, keep a curated concept allowlist first: revenue, net income, assets, liabilities, cash, operating cash flow, capex, shares. |
| 2 | SEC company ticker and CIK directory | `/api/v1/sec/company-tickers`, `/api/v1/search/sec-entities` | `https://www.sec.gov/files/company_tickers.json` | Free, no key; `User-Agent` recommended | Improves entity resolution, search suggestions, and links between ticker, CIK, filings, fundamentals, and holdings. | Refresh daily; use as a local search index backing `/api/v1/search/suggest`. |
| 3 | GLEIF LEI records | `/api/v1/entities/lei`, `/api/v1/entities/legal-entity-search` | `https://api.gleif.org/api/v1/lei-records?page%5Bsize%5D=1&filter%5Bentity.legalName%5D=Apple` | Free, no key | Adds legal entity identifiers, names, addresses, registration status, and relationship metadata for entity matching. | Start with name and LEI filters; map LEI to existing company/investor entities where possible. |
| 4 | CISA Known Exploited Vulnerabilities | `/api/v1/data/cyber/known-exploited-vulnerabilities` | `https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json` | Free, no key | Adds a timely cyber-risk alert stream for companies, sectors, vendors, and geopolitical risk workflows. | Small JSON catalog; refresh hourly/daily; fields include CVE, vendor, product, due date, ransomware-use flag. |
| 5 | NVD CVE API 2.0 | `/api/v1/data/cyber/cves` | `https://services.nvd.nist.gov/rest/json/cves/2.0?pubStartDate=2026-06-01T00:00:00.000&pubEndDate=2026-06-02T00:00:00.000&resultsPerPage=1` | Free, no key for low volume; stricter public rate limits without key | Complements CISA KEV with broader vulnerability metadata, CVSS scores, affected CPEs, and publication timestamps. | Use date windows and pagination; cache by CVE ID; provide filters for severity, vendor, product, and publication date. |
| 6 | Federal Register documents | `/api/v1/data/regulatory/federal-register` | `https://www.federalregister.gov/api/v1/documents.json?per_page=1&order=newest` | Free, no key | Adds US regulatory events, executive orders, rules, proposed rules, agency notices, and sector-relevant policy changes. | Start with newest documents plus agency/type filters; entity extraction can later connect to companies/sectors. |
| 7 | eCFR administrative and title APIs | `/api/v1/data/regulatory/ecfr-agencies`, `/api/v1/data/regulatory/ecfr-titles` | `https://www.ecfr.gov/api/admin/v1/agencies.json` | Free, no key | Adds structured US regulation metadata and current code-of-federal-regulations context. | Use metadata endpoints first; full-text diffs are a later phase because volume is larger. |
| 8 | Eurostat dissemination API | `/api/v1/data/economic/eurostat` | `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/une_rt_m?geo=DE&sex=T&age=Y15-74&s_adj=SA&unit=PC_ACT&time=2026-01` | Free, no key | Adds European country and regional macro indicators that are not covered by US-first macro endpoints. | Implement a curated dataset registry first: unemployment, HICP, industrial production, energy prices, population, trade. |
| 9 | BLS public API | `/api/v1/macro/bls-public-series` | `https://api.bls.gov/publicAPI/v2/timeseries/data/CES0000000001?startyear=2025&endyear=2026` | Free, no key for limited public usage; key optional for higher limits | Strengthens US labor and inflation coverage while staying directly accessible. | Existing macro cards reference BLS-like FinUties endpoints; this can be a backend source adapter or fallback. |
| 10 | ECB Data Portal API | `/api/v1/data/economic/ecb-series` | `https://data-api.ecb.europa.eu/service/data/EXR/D.USD.EUR.SP00.A?startPeriod=2026-06-01&format=csvdata` | Free, no key | Broadens the current ECB exchange-rate coverage into rates, monetary aggregates, bank lending, securities, and yield curve series. | Use SDMX/CSV parser; expose a curated `series_key` allowlist before generic passthrough. |
| 11 | World Bank WDI generic indicator API | `/api/v1/data/development/wdi-indicators` | `https://api.worldbank.org/v2/country/US/indicator/NY.GDP.MKTP.CD?format=json&per_page=2` | Free, no key | Current registry has specific World Bank-derived endpoints; a generic WDI adapter unlocks thousands of indicators with one pattern. | Add an indicator allowlist and metadata endpoint; avoid unbounded all-country/all-year requests. |
| 12 | OpenFDA enforcement and recall APIs | `/api/v1/data/health/fda-enforcement`, `/api/v1/data/health/fda-recalls` | `https://api.fda.gov/drug/enforcement.json?limit=1` | Free, no key for low volume; key optional for higher limits | Adds actionable health, supply-chain, and consumer-risk alerts. | Start with drug and food enforcement; normalize firm, product, recall reason, classification, country, and report date. |
| 13 | NOAA Space Weather Prediction Center | `/api/v1/data/space-weather/kp-index`, `/api/v1/data/space-weather/alerts` | `https://services.swpc.noaa.gov/json/planetary_k_index_1m.json` | Free, no key | Adds space-weather risk monitoring relevant to power grids, satellites, aviation, and communications. | Small JSON feeds; good candidate for alert card integration. |
| 14 | NOAA CO-OPS tides and water levels | `/api/v1/data/maritime/water-levels`, `/api/v1/data/maritime/tide-predictions` | `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=water_level&application=finuties&begin_date=20260609&end_date=20260610&datum=MLLW&station=9414290&time_zone=gmt&units=metric&format=json` | Free, no key | Adds port, coastal flood, maritime operations, and climate-impact signals. | US station coverage; add station metadata endpoint and station ID filters. |
| 15 | Open-Meteo forecast and historical APIs | `/api/v1/data/weather/open-meteo-forecast`, `/api/v1/data/weather/open-meteo-archive` | `https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&hourly=temperature_2m&forecast_days=1` | Free, no key under public fair-use limits | Adds global point weather without requiring NOAA-only geography. | Good for country/city drilldowns; enforce bounded variables and date ranges. |
| 16 | NASA EONET events | `/api/v1/data/disasters/eonet` | `https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=5` | Free, no key | Adds global natural event feeds: wildfires, volcanoes, storms, sea/lake ice, severe storms, and dust/haze. | One check initially returned 503 and a retry returned data, so implement retry/backoff and cache latest successful pull. |

## Useful next, but lower than immediate

These are valuable, but either overlap existing coverage, require more parsing
work, had environment-specific probe issues, or need tighter scoping before
being exposed as product endpoints.

| Priority | Source | Proposed FinUties endpoint(s) | Direct source endpoint examples | Access | Why not immediate |
| --- | --- | --- | --- | --- | --- |
| 17 | Treasury Fiscal Data API | `/api/v1/rates/treasury-fiscal-series`, `/api/v1/data/fiscal/debt` | `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny?sort=-record_date&page[size]=1` | Free, no key | High value, but endpoint probes from this environment reset the connection. Re-verify with production networking before scheduling. |
| 18 | OECD SDMX API | `/api/v1/data/economic/oecd-series` | `https://sdmx.oecd.org/public/rest/data/OECD.SDD.STES,DSD_STES@DF_CLI/.M.LI...AA...H?startPeriod=2023-02&dimensionAtObservation=AllDimensions&format=csvfilewithlabels` | Free, no key | Very valuable but SDMX dimensions are complex. Start after ECB/Eurostat parser patterns exist. |
| 19 | BIS SDMX API | `/api/v1/data/financial/bis-series` | `https://stats.bis.org/api/v1` or newer BIS SDMX routes | Free, no key | Valuable for credit, property prices, effective exchange rates, and central bank policy rates; needs SDMX adapter and curated series keys. |
| 20 | OSV.dev vulnerability API | `/api/v1/data/cyber/osv-vulnerabilities` | `https://api.osv.dev/v1/query` | Free, no key | Useful for software package risk, but it is POST-oriented and package-ecosystem specific; add after CISA/NVD. |
| 21 | Our World in Data Grapher downloads | `/api/v1/data/development/owid-series` | `https://ourworldindata.org/grapher/{slug}.csv` | Free, no key | Broad and easy CSV access, but each useful dataset needs a stable slug and attribution check. |
| 22 | Wikidata SPARQL/entity API | `/api/v1/entities/wikidata-search`, `/api/v1/entities/wikidata-enrichment` | `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=Apple&language=en&format=json` | Free, no key | Powerful entity enrichment, but rate limits and data cleanliness require careful caching and source ranking. |
| 23 | UK FCDO/OFSI sanctions source files | `/api/v1/data/governance/sanctions/uk` | UK government consolidated sanctions file downloads | Free official files | Complements existing US/EU/UN sanctions. Needs source-file format check and license review. |
| 24 | OFAC consolidated non-SDN lists | `/api/v1/data/governance/sanctions/us-consolidated` | OFAC consolidated XML/CSV downloads | Free official files | Existing OFAC SDN coverage is likely higher priority; non-SDN lists are additive but narrower. |
| 25 | OpenSky Network state vectors | `/api/v1/data/aviation/states` | `https://opensky-network.org/api/states/all` | Anonymous access historically available but limited | Probe reset in this environment, and anonymous limits/availability vary. Useful only after requirements for aviation risk are clearer. |
| 26 | MarineCadastre AIS archives | `/api/v1/data/maritime/ais-archive` | US MarineCadastre AIS bulk downloads | Free public data | Useful maritime history, but it is bulk/archive-oriented rather than immediate live API work. |

## Scraping or not-immediate candidates

Avoid making these first unless a product requirement specifically depends on
them.

| Source | Reason to defer | Possible path later |
| --- | --- | --- |
| ACLED | Current registry marks ACLED as placeholder; structured API access typically needs registration and terms review. | Keep placeholder until credentials/license are approved, or use GDELT/UCDP for open conflict coverage. |
| Global live AIS vendors | Most global AIS APIs require API keys, reciprocal feeds, or paid tiers. Truly no-key sources are regional or unreliable. | Use NOAA CO-OPS and MarineCadastre first; evaluate AISStream or vendor free tiers only if keys are acceptable. |
| EIA API | Valuable energy data, but API-key requirements make it less attractive than no-key sources. | Add only if a managed key strategy exists; otherwise use already available energy endpoints. |
| FRED API | High-quality macro data but requires an API key. | Prefer BLS, ECB, Eurostat, World Bank, and Treasury direct endpoints first. |
| Premium market data APIs | Equities, options, and real-time prices are usually licensed or rate-limited behind keys. | Favor SEC XBRL, SEC filings, CFTC, ECB, and public macro data unless licensing is solved. |
| Website-only scraping for news/social media | Fragile, terms-sensitive, and costly to maintain. | Use GDELT, Federal Register, official RSS/API feeds, and provider APIs instead. |
| PDF-only report scraping | Often valuable but schema quality varies and extraction is brittle. | Treat as a later ingestion pipeline with source-specific parsers and human validation. |

## Suggested implementation order

1. Add source adapters for SEC company tickers, SEC XBRL company facts, CISA KEV,
   Federal Register, and GLEIF LEI records.
2. Register user-facing sources/cards for cyber risk, regulatory events, and
   entity fundamentals.
3. Add generic SDMX/CSV parser support using ECB first, then reuse it for
   Eurostat, OECD, and BIS.
4. Add weather/ocean operational feeds: NOAA SWPC, NOAA CO-OPS, Open-Meteo, and
   NASA EONET.
5. Revisit key-required or scrape-heavy sources only after no-key endpoints are
   exhausted.

## Endpoint checks performed

The following checks returned HTTP 200 in this environment:

- SEC company tickers JSON.
- SEC company facts JSON.
- World Bank WDI JSON.
- USGS significant earthquakes GeoJSON.
- NVD CVE API JSON.
- Open-Meteo forecast JSON.
- Eurostat dissemination JSON.
- Federal Register documents JSON.
- eCFR agencies JSON.
- NOAA CO-OPS water-level JSON.
- CISA KEV JSON.
- NASA EONET retry response.
- OpenFDA enforcement JSON.
- NOAA SWPC K-index JSON.
- BLS public API JSON.
- ECB Data Portal CSV.
- GLEIF LEI records JSON API.

Checks that need follow-up before implementation:

- Treasury Fiscal Data reset the connection from this environment.
- OpenSky reset the connection from this environment.
- ReliefWeb returned 403/410 for tested variants.
- A sanctions.network sample returned HTTP 200 but with `text/html`, so it is not
  listed as an immediate clean JSON source.
