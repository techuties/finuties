# New sources, endpoints, and scraping suggestions

Last reviewed: 2026-06-25

## Scope and selection criteria

This list is based on the current Terminal Community endpoint coverage in
`terminal/src/lib/source-registry.ts`, card modules, and explore sections. The
existing app already covers many high-value feeds: UCDP, ACLED placeholder,
GDELT, GPR, USGS earthquakes, GDACS, NOAA alerts, EM-DAT, Global Fishing Watch,
ECB FX, CoinGecko, IMF, UN Comtrade, CFTC COT, EPA TRI, WHO/JMP, UN population,
UNHCR/IOM, FAO/USDA/WFP, World Bank/UNDP/UNESCO/ILO/ITU, NASA/NOAA climate,
GBIF/IUCN, OFAC/EU/UN sanctions, SEC filings/insiders/holdings/financials,
market stocks/prices, BLS/BEA macro, Treasury yields/debt, NY Fed rates, and
economic calendar data.

Priority favors sources that are:

1. Free and directly accessible without API keys.
2. JSON, CSV, SDMX, or stable file feeds rather than brittle HTML scraping.
3. Useful across the FinUties macro, market, risk, entity, and global-monitoring
   workflows.
4. Additive to existing endpoints rather than duplicates.

## High value, immediate candidates

These should be first implementation targets because they are free, directly
reachable, and live endpoint checks succeeded from this environment.

### 1. U.S. Treasury Fiscal Data API

- Access: free, no key, direct JSON/CSV/XML.
- Base: `https://api.fiscaldata.treasury.gov/services/api/fiscal_service`
- Candidate FinUties endpoints:
  - `/api/v1/data/treasury/auctions`
  - `/api/v1/data/treasury/upcoming-auctions`
  - `/api/v1/data/treasury/daily-statement`
  - `/api/v1/data/treasury/monthly-statement`
  - `/api/v1/data/treasury/interest-expense`
- Source endpoints:
  - `/v1/accounting/od/auctions_query`
  - `/v1/accounting/od/upcoming_auctions`
  - `/v1/accounting/dts/operating_cash_balance`
  - `/v1/accounting/dts/deposits_withdrawals_operating_cash`
  - `/v1/accounting/mts/mts_table_5`
  - `/v2/accounting/od/interest_expense`
- Why it matters: current coverage includes Treasury yields and debt, but not
  auction demand, operating cash, monthly receipts/outlays, or interest expense.
- Implementation notes: normalize numeric strings to numbers, expose `fields`,
  `filter`, `sort`, `limit`, and date filters; cache daily/monthly tables longer
  than auction/upcoming endpoints.
- Live check: `auctions_query?sort=-auction_date&page[size]=1` returned HTTP 200.

### 2. Eurostat Statistics API

- Access: free, no key, direct JSON-stat/SDMX/TSV; CORS supported.
- Base: `https://ec.europa.eu/eurostat/api/dissemination`
- Candidate FinUties endpoints:
  - `/api/v1/data/economic/eurostat`
  - `/api/v1/data/europe/indicators`
  - `/api/v1/data/europe/energy`
- Source endpoint pattern:
  - `/statistics/1.0/data/{datasetCode}?format=JSON&lang=EN&{filters}`
- Useful datasets to start:
  - `prc_hicp_midx` for HICP inflation.
  - `une_rt_m` for unemployment.
  - `nama_10_gdp` for GDP.
  - `nrg_pc_204` or related energy price datasets.
- Why it matters: fills EU macro/energy/labor gaps that IMF/World Bank data does
  not cover at comparable frequency.
- Implementation notes: add a JSON-stat flattener once and reuse it for Eurostat
  and other JSON-stat sources; allow dataset allowlisting to avoid arbitrary
  heavy pulls.
- Live check: sample `DEMO_R_D3DENS` query returned HTTP 200.

### 3. OECD Data Explorer SDMX API

- Access: free, no auth, direct SDMX-CSV/SDMX-JSON, rate limited.
- Base: `https://sdmx.oecd.org/public/rest`
- Candidate FinUties endpoints:
  - `/api/v1/data/economic/oecd`
  - `/api/v1/data/economic/oecd-leading-indicators`
  - `/api/v1/data/economic/oecd-prices`
- Source endpoint patterns:
  - `/data/{agency},{dataset},{version}/{selection}?format=csvfilewithlabels`
  - `/dataflow/all` for dataset discovery.
- Useful first datasets:
  - Composite leading indicators.
  - PPP/exchange-rate comparisons.
  - CPI, labor, productivity, and national accounts for OECD members.
- Why it matters: strong macro complement to IMF/BLS/BEA with cross-country
  developed-market coverage.
- Implementation notes: enforce caching and request budgets; OECD documents a
  low public limit, so avoid unbounded catalog crawls.

### 4. GLEIF LEI API

- Access: free, no key, direct JSON:API.
- Base: `https://api.gleif.org/api/v1`
- Candidate FinUties endpoints:
  - `/api/v1/data/entities/lei-records`
  - `/api/v1/data/entities/lei-relationships`
  - `/api/v1/search/lei`
- Source endpoints:
  - `/lei-records/{lei}`
  - `/lei-records?filter[entity.legalName]={name}`
  - `/lei-records?filter[lei]={commaSeparatedLeiList}`
- Why it matters: adds canonical legal entity identity, addresses, status, and
  parent relationship data that can enrich SEC, holdings, sanctions, and search.
- Implementation notes: keep a 24-hour cache per LEI/name search; map LEI
  countries to existing country utilities; surface lapsed/retired status.
- Live check: legal-name search for Apple returned HTTP 200.

### 5. Open-Meteo weather and air quality APIs

- Access: free for non-commercial use, no key, direct JSON.
- Bases:
  - `https://api.open-meteo.com/v1/forecast`
  - `https://archive-api.open-meteo.com/v1/archive`
  - `https://air-quality-api.open-meteo.com/v1/air-quality`
  - `https://geocoding-api.open-meteo.com/v1/search`
- Candidate FinUties endpoints:
  - `/api/v1/data/weather/open-meteo`
  - `/api/v1/data/weather/history`
  - `/api/v1/data/environment/air-quality`
- Why it matters: existing weather coverage is mostly U.S. alerts; Open-Meteo
  adds global current/forecast/history, air quality, solar, wind, and soil data.
- Implementation notes: require either coordinates or a known place lookup; cap
  variables and date ranges; cache geocoding results separately.
- Live check: Berlin current forecast query returned HTTP 200.

### 6. NASA EONET natural events

- Access: free, no key for normal use, direct feed/API.
- Base: `https://eonet.gsfc.nasa.gov/api/v3`
- Candidate FinUties endpoints:
  - `/api/v1/data/disasters/eonet`
  - `/api/v1/data/disasters/eonet-geojson`
- Source endpoints:
  - `/events?status=open&limit={n}`
  - `/events?category=wildfires,severeStorms&days={n}`
  - `/events/geojson?...`
- Why it matters: complements GDACS/USGS/NOAA with curated near-real-time
  wildfire, storm, volcano, dust, sea/lake ice, and image-linked events.
- Implementation notes: prefer the GeoJSON variant for map layers; flatten latest
  geometry per event but keep source URLs for drill-down.
- Live check: open-events query returned HTTP 200.

### 7. CISA Known Exploited Vulnerabilities catalog

- Access: free, no key, direct JSON/CSV file.
- Source URL:
  - `https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json`
- Candidate FinUties endpoints:
  - `/api/v1/data/cyber/known-exploited-vulnerabilities`
  - `/api/v1/data/cyber/kev`
- Why it matters: opens a new cyber-risk category with high signal and low
  implementation cost; can power vendor/product risk cards.
- Implementation notes: store `catalogVersion`, `dateReleased`, and
  `vulnerabilities`; filter by CVE, vendor, product, date added, due date, and
  ransomware flag.
- Live check: JSON feed returned HTTP 200.

### 8. World Bank generic indicators wrapper

- Access: free, no key, direct JSON/XML/JSON-stat.
- Base: `https://api.worldbank.org/v2`
- Candidate FinUties endpoints:
  - `/api/v1/data/worldbank/indicators`
  - `/api/v1/data/worldbank/countries`
- Source endpoint pattern:
  - `/country/{country}/indicator/{indicator}?format=json&per_page={n}`
- Why it matters: existing code exposes several curated World Bank-derived
  themes, but a generic allowlisted wrapper would unlock many indicators without
  adding one endpoint per theme.
- Implementation notes: use an allowlist of indicator codes and sources; support
  semicolon-separated countries/indicators only within URL-length and result-size
  limits.
- Live check: U.S. GDP indicator query returned HTTP 200.

## High value, useful after the immediate list

These are valuable, but they need extra care because of rate limits, environment
blocking, headers, or overlap with existing sections.

### 9. SEC EDGAR XBRL frames and company concepts

- Access: free, no key; User-Agent header required; no CORS from `data.sec.gov`.
- Base: `https://data.sec.gov`
- Candidate FinUties endpoints:
  - `/api/v1/sec/xbrl/company-concept`
  - `/api/v1/sec/xbrl/frames`
  - `/api/v1/sec/xbrl/company-facts`
- Source endpoints:
  - `/api/xbrl/companyconcept/CIK{cik}/{taxonomy}/{concept}.json`
  - `/api/xbrl/frames/{taxonomy}/{concept}/{units}/CY{year}{period}.json`
  - `/api/xbrl/companyfacts/CIK{cik}.json`
- Why it matters: existing financial statement views parse XBRL-like facts, but
  frames would enable cross-company concept screens, sector medians, and market
  wide fundamentals from the SEC itself.
- Implementation notes: route through the backend because SEC requires
  identifying headers and does not support browser CORS; cache aggressively.

### 10. NVD CVE API 2.0

- Access: public without key at low rate; optional free key raises limits.
- Base: `https://services.nvd.nist.gov/rest/json`
- Candidate FinUties endpoints:
  - `/api/v1/data/cyber/cves`
  - `/api/v1/data/cyber/vendor-vulnerabilities`
- Source endpoint:
  - `/cves/2.0?cveId={cve}`
  - `/cves/2.0?lastModStartDate={iso}&lastModEndDate={iso}`
- Why it matters: pairs well with CISA KEV for vulnerability monitoring, but KEV
  should ship first because it is simpler and higher signal.
- Implementation notes: enforce sleeps/backoff and incremental sync windows; use
  optional `NVD_API_KEY` only when configured.
- Live check: sampled CVE request timed out from this environment, so treat as
  second wave.

### 11. OpenSky Network live aircraft states

- Access: anonymous public access exists but is rate limited; OAuth is needed for
  higher resolution and history.
- Base: `https://opensky-network.org/api`
- Candidate FinUties endpoints:
  - `/api/v1/data/aviation/states`
  - `/api/v1/data/aviation/flights`
- Source endpoint:
  - `/states/all?lamin={latMin}&lomin={lonMin}&lamax={latMax}&lomax={lonMax}`
- Why it matters: fills an aviation/global logistics gap analogous to existing
  maritime coverage.
- Implementation notes: start with bounding-box live state snapshots only; cache
  for at least 10 seconds; add OAuth support later for history.
- Live check: connection reset from this environment, so verify from production
  egress before committing implementation.

### 12. OpenAlex or Crossref research metadata

- Access: free, no key required for basic use; polite email recommended.
- Candidate FinUties endpoints:
  - `/api/v1/data/research/openalex-works`
  - `/api/v1/data/research/institutions`
- Why it matters: can measure innovation, universities, grants, and company
  research activity; useful for entity intelligence but outside current core
  finance/macro views.
- Implementation notes: add only if a research/innovation card or entity section
  is planned; cache queries and avoid bulk crawling.

## High value, not immediate

These are worth tracking, but they do not satisfy the preferred "free and
directly accessible" constraint as cleanly.

### FRED API

- Access: free key required for reliable official API access; unauthenticated CSV
  fallback has mixed reliability and should not be assumed for backend services.
- Candidate endpoint: `/api/v1/data/fred/series`
- Why useful: broad U.S. macro and financial time series.
- Why not immediate: current app already has BLS, BEA, Treasury, NY Fed, and
  rates coverage; adding FRED should wait for a secure `FRED_API_KEY` path and
  series allowlisting.

### SAM.gov contract opportunities

- Access: free API key required.
- Source endpoint: `https://api.sam.gov/opportunities/v2/search`
- Candidate endpoint: `/api/v1/data/procurement/sam-opportunities`
- Why useful: U.S. federal contract pipeline and vendor intelligence.
- Why not immediate: key management and daily quota constraints.

### Companies House

- Access: free account/API key required via HTTP Basic auth.
- Base: `https://api.company-information.service.gov.uk`
- Candidate endpoint: `/api/v1/data/entities/companies-house`
- Why useful: UK corporate profiles, officers, persons with significant control,
  charges, and filing history.
- Why not immediate: requires API key and rate-limit handling.

### OpenCorporates

- Access: API token required; free access is limited to permitted/open-data use
  cases and licensing constraints.
- Base: `https://api.opencorporates.com/v0.4`
- Candidate endpoint: `/api/v1/data/entities/opencorporates`
- Why useful: broad jurisdictional company registry search.
- Why not immediate: licensing and usage model need explicit product approval.

### OpenAQ

- Access: useful air-quality API, but recent versions commonly require an API key.
- Candidate endpoint: `/api/v1/data/environment/openaq`
- Why useful: station-level air-quality observations.
- Why not immediate: Open-Meteo air quality is easier for no-key first coverage.

## Scraping or semi-structured watchlist

Prefer these only when official APIs or downloadable feeds are absent.

1. Central bank speeches, statements, and calendars
   - Targets: Federal Reserve, ECB, Bank of England, Bank of Japan, BIS.
   - Use case: event risk, policy language, speech embeddings.
   - Approach: prefer RSS/sitemaps where available; scrape HTML only as a last
     resort; store canonical URL, published time, speaker, title, and source.

2. Exchange trading calendars and market holidays
   - Targets: NYSE/Nasdaq, Eurex, LSE, JPX, HKEX.
   - Use case: trading-day logic and event calendars.
   - Approach: official CSV/ICS/PDF if available; otherwise scrape published
     tables with snapshot tests because pages change slowly but formats vary.

3. Regulator enforcement and litigation releases
   - Targets: SEC litigation releases, CFTC enforcement, DOJ antitrust, EU
     competition press releases.
   - Use case: entity risk and compliance event cards.
   - Approach: prefer official RSS/search endpoints; enrich matched companies
     later through CIK/LEI/name resolution.

4. Commodity and logistics notices
   - Targets: CME notices, ICE circulars, port authority advisories.
   - Use case: commodity supply chain and market microstructure context.
   - Approach: scrape only narrowly scoped lists; avoid broad crawling.

## Suggested implementation order

1. Treasury Fiscal Data API.
2. Eurostat Statistics API with reusable JSON-stat flattener.
3. GLEIF LEI API for entity enrichment.
4. CISA KEV cyber feed and a small cyber category.
5. Open-Meteo weather/air-quality wrapper.
6. NASA EONET GeoJSON disaster layer.
7. OECD SDMX wrapper with strict caching/rate controls.
8. World Bank generic indicator wrapper.
9. SEC XBRL frames/company concepts.
10. NVD and OpenSky after rate/egress behavior is confirmed.

## Common implementation guidance

- Add new public data sources through the source registry when they should appear
  in Global/Explore; use card-only endpoints only for dashboard summaries.
- Keep backend route names stable and provider-neutral where possible, but store
  the upstream source name in metadata.
- Prefer allowlisted dataset/indicator codes over arbitrary pass-through URLs.
- Normalize all external payloads into `{ items, meta }` shapes with source,
  retrieved timestamp, upstream URL, and license/attribution notes.
- Cache direct public feeds to avoid abusive request patterns, especially OECD,
  OpenSky, SEC, NVD, and Open-Meteo.
- Keep API-key sources behind optional environment variables and never make them
  prerequisites for the free/default terminal experience.
