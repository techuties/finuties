# New sources, endpoints, and scraping suggestions

Date: 2026-06-19

This file ranks new data sources for FinUties from high-value immediate
implementations to lower-priority or non-immediate options. The strongest
candidates are free, unauthenticated, directly accessible JSON or CSV sources
that fit the existing API-backed terminal model.

## Selection criteria

- High value: improves finance, macro, risk, geopolitical, compliance, or
  market-intelligence workflows.
- Access: free and directly reachable is preferred; free-with-key, bulk-only,
  or scrape-only sources are lower priority.
- Implementation fit: source can become a stable `/api/v1/...` endpoint and a
  source-registry entry without a large new subsystem.
- Refresh behavior: clear update cadence, cacheability, and incremental fetch
  path.
- Rights and reliability: official public API or official public file beats
  unofficial scraping.

## Existing coverage observed in this repository

The terminal already has a broad source registry and dashboard cards. Avoid
duplicating these unless the new source adds a distinct dataset or better
latency/coverage.

- Market and finance already present: SEC filings, 13F/top holdings, insider
  transactions, ECB FX, CoinGecko crypto, CFTC COT, EIA energy, Treasury debt,
  Fed rates, treasury yields, macro pulse, economic calendar.
- Macro and development already present: IMF, World Bank poverty/governance/
  education, UNDP HDI/MPI, UNESCO, ILO, ITU, UN population, UNHCR, IOM.
- Geopolitics and risk already present: UCDP, GDELT, GPR, sanctions from OFAC,
  EU, and UN, GDACS, USGS earthquakes, NOAA weather alerts.
- Climate, food, and biodiversity already present: NASA/NOAA/NSIDC/Copernicus/
  VIIRS climate sources, FAO, USDA WASDE, WFP hunger, GBIF, IUCN.
- Placeholders or sources to verify before expanding: ACLED is marked as a
  placeholder in the registry; some external APIs may require credentials or
  rate-limit handling even when metadata exists.

## Priority 1 - high value and immediate

These can be implemented first because they are official, free, and directly
accessible with simple HTTP requests.

### 1. SEC company facts, frames, and submissions expansion

- Value: very high for equity fundamentals, filing velocity, factor research,
  issuer profiles, and company-level time series.
- Access: free direct JSON; SEC requires a descriptive `User-Agent`.
- External endpoints:
  - `https://data.sec.gov/submissions/CIK0000320193.json`
  - `https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json`
  - `https://data.sec.gov/api/xbrl/companyconcept/CIK0000320193/us-gaap/Assets.json`
  - `https://data.sec.gov/api/xbrl/frames/us-gaap/Assets/USD/CY2024Q4I.json`
- Proposed FinUties endpoints:
  - `/api/v1/sec/submissions`
  - `/api/v1/sec/company-facts`
  - `/api/v1/sec/company-concepts`
  - `/api/v1/sec/xbrl/frames`
- Suggested source-registry entries:
  - `sec_company_facts`
  - `sec_company_concepts`
  - `sec_xbrl_frames`
- Implementation notes:
  - Reuse the existing SEC domain and company/filing explorer patterns.
  - Add a CIK/ticker resolver cache before exposing broad symbol filters.
  - Normalize XBRL units, fiscal periods, accession numbers, and form types.
  - Cache aggressively because company facts responses can be large.

### 2. GLEIF LEI records

- Value: high for entity resolution, issuer/counterparty enrichment, sanctions
  joins, ownership graph normalization, and institution search.
- Access: free direct JSON API.
- External endpoint:
  - `https://api.gleif.org/api/v1/lei-records?page[size]=1`
- Proposed FinUties endpoints:
  - `/api/v1/data/entities/lei-records`
  - `/api/v1/data/entities/lei-relationships`
- Suggested source-registry entries:
  - `gleif_lei_records`
  - `gleif_lei_relationships`
- Implementation notes:
  - Start with `lei`, legal name, jurisdiction, status, addresses, and parent
    relationship fields.
  - Add filters for legal name, LEI, jurisdiction, registration status, and
    entity category.
  - This is a good backbone for joining SEC, sanctions, and macro entity data.

### 3. US Treasury Fiscal Data - cash, auctions, and deficit detail

- Value: high for rates, liquidity, funding, TGA, debt issuance, and fiscal
  dashboards.
- Access: free direct JSON API.
- External endpoints:
  - `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/upcoming_auctions?page[size]=1`
  - `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/dts/deposits_withdrawals_operating_cash?sort=-record_date&page[size]=1`
  - `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/debt_to_penny?sort=-record_date&page[size]=1`
- Proposed FinUties endpoints:
  - `/api/v1/rates/treasury-upcoming-auctions`
  - `/api/v1/rates/treasury-daily-statement`
  - `/api/v1/rates/treasury-debt-to-penny`
- Suggested source-registry entries:
  - `treasury_upcoming_auctions`
  - `treasury_daily_statement`
  - `treasury_debt_to_penny`
- Implementation notes:
  - Current Treasury debt card suggests Treasury coverage already exists; this
    extends it into short-term liquidity and issuance.
  - Keep fields in Treasury API units and add display metadata rather than
    converting everything at ingestion.

### 4. BLS public data API

- Value: high for CPI, PPI, employment, wages, productivity, and US macro
  surprises.
- Access: free direct API for basic volume; API key is optional for larger use.
- External endpoint:
  - `https://api.bls.gov/publicAPI/v2/timeseries/data/CUUR0000SA0?latest=true`
- Proposed FinUties endpoints:
  - `/api/v1/data/macro/bls-series`
  - `/api/v1/data/macro/bls-latest`
- Suggested source-registry entry:
  - `bls_series`
- Implementation notes:
  - Seed with a curated list of high-value series: CPI headline/core, payrolls,
    unemployment rate, average hourly earnings, PPI, JOLTS openings.
  - Store a series metadata table so terminal users are not forced to know BLS
    series IDs.
  - Add revision-aware historical refresh.

### 5. Cyber risk feeds - CISA KEV, NVD CVE, GitHub advisories

- Value: high for cyber/geopolitical risk, sector exposure, vendor risk, and
  operational alerts.
- Access: free direct APIs. NVD and GitHub are unauthenticated at low volume,
  but both need rate-limit handling; NVD offers optional API keys.
- External endpoints:
  - `https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json`
  - `https://services.nvd.nist.gov/rest/json/cves/2.0?pubStartDate=2026-06-18T00:00:00.000&pubEndDate=2026-06-19T00:00:00.000`
  - `https://api.github.com/advisories?per_page=1`
- Proposed FinUties endpoints:
  - `/api/v1/data/cyber/known-exploited-vulnerabilities`
  - `/api/v1/data/cyber/cves`
  - `/api/v1/data/cyber/github-advisories`
- Suggested source-registry entries:
  - `cisa_kev`
  - `nvd_cves`
  - `github_advisories`
- Implementation notes:
  - Add a new `cyber` or `risk` category if the product wants these visible in
    Explore; otherwise start as dashboard cards and API endpoints.
  - Normalize CVSS scores, CWE, CPE/vendor/product names, exploit status, and
    publication/update timestamps.

### 6. Eurostat dissemination API

- Value: high for EU macro, demographics, labor, inflation, industry, energy,
  migration, and regional analysis.
- Access: free direct JSON API.
- External endpoint:
  - `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/demo_pjan?geo=DE&sex=T&age=TOTAL&time=2024`
- Proposed FinUties endpoints:
  - `/api/v1/data/macro/eurostat-series`
  - `/api/v1/data/demographics/eurostat-population`
  - `/api/v1/data/economic/eurostat-energy`
- Suggested source-registry entries:
  - `eurostat_series`
  - `eurostat_population`
  - `eurostat_energy`
- Implementation notes:
  - Start with curated datasets instead of a fully generic Eurostat query UI.
  - Flatten SDMX/JSON-stat dimensions into tabular rows with explicit dimension
    labels.
  - Cache dataset metadata separately from observations.

### 7. Open-Meteo weather and climate forecast API

- Value: high for commodity, energy, disaster, logistics, and agriculture
  overlays.
- Access: free direct JSON API, no key for common use.
- External endpoint:
  - `https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&hourly=temperature_2m,wind_speed_10m&forecast_days=1`
- Proposed FinUties endpoints:
  - `/api/v1/data/weather/forecast`
  - `/api/v1/data/weather/agriculture`
  - `/api/v1/data/weather/air-quality`
- Suggested source-registry entries:
  - `open_meteo_forecast`
  - `open_meteo_agriculture`
  - `open_meteo_air_quality`
- Implementation notes:
  - Useful as a coordinate-based endpoint rather than a country table.
  - Add server-side parameter allowlists to prevent unbounded user queries.
  - Pair with existing GDACS, USGS, NOAA, climate, and food sources.

### 8. NOAA SWPC space weather products

- Value: medium-high for satellite, power grid, aviation, GPS, defense, and
  communications risk monitoring.
- Access: free direct JSON files.
- External endpoint:
  - `https://services.swpc.noaa.gov/products/alerts.json`
- Proposed FinUties endpoints:
  - `/api/v1/data/space-weather/alerts`
  - `/api/v1/data/space-weather/solar-wind`
  - `/api/v1/data/space-weather/geomagnetic`
- Suggested source-registry entries:
  - `noaa_swpc_alerts`
  - `noaa_swpc_solar_wind`
  - `noaa_swpc_geomagnetic`
- Implementation notes:
  - Start with alerts because the payload is simple and operationally useful.
  - Add a compact dashboard card for active warnings and latest Kp/solar wind
    conditions.

### 9. NASA EONET natural events

- Value: medium-high as a direct complement to USGS earthquakes and GDACS,
  especially for wildfire, volcano, severe storm, sea/lake ice, and dust/smoke
  event mapping.
- Access: free direct API.
- External endpoint:
  - `https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=100`
- Proposed FinUties endpoint:
  - `/api/v1/data/disasters/eonet-events`
- Suggested source-registry entry:
  - `nasa_eonet_events`
- Implementation notes:
  - Normalize geometries to point/line/polygon summaries for the current map UI.
  - Keep source URLs and category IDs for traceability.

### 10. OpenAlex and Crossref research/intelligence feeds

- Value: medium-high for research trend monitoring, technology diffusion,
  climate/health/AI papers, institution mapping, and early thematic signals.
- Access: free direct APIs.
- External endpoints:
  - `https://api.openalex.org/works?filter=from_publication_date:2026-06-18&per-page=1`
  - `https://api.crossref.org/works?filter=from-pub-date:2026-06-18&rows=1`
- Proposed FinUties endpoints:
  - `/api/v1/data/research/openalex-works`
  - `/api/v1/data/research/crossref-works`
- Suggested source-registry entries:
  - `openalex_works`
  - `crossref_works`
- Implementation notes:
  - This likely needs a new `research` category or a hidden API-first launch.
  - Filter by topic concepts, funder, institution, country, and publication
    date to keep queries useful.

### 11. Wikidata SPARQL entity enrichment

- Value: medium-high for entity labels, aliases, relationships, country codes,
  industry/category enrichment, and linking public datasets.
- Access: free direct SPARQL endpoint with fair-use limits.
- External endpoint:
  - `https://query.wikidata.org/sparql?query=ASK%20%7B%20wd%3AQ42%20wdt%3AP31%20%3Ftype%20%7D&format=json`
- Proposed FinUties endpoint:
  - `/api/v1/data/entities/wikidata`
- Suggested source-registry entry:
  - `wikidata_entities`
- Implementation notes:
  - Do not expose arbitrary SPARQL directly to users at first.
  - Implement curated server-side queries for identifiers and relationships.
  - Cache responses and respect Wikidata rate guidance.

## Priority 2 - high value but not as immediate

These are valuable, but need credentials, SDMX discovery, larger ingestion, or
access checks before implementation.

### FRED and ALFRED

- Value: very high for US macro, market rates, recession indicators, revisions,
  and historical vintages.
- Access: free API key required.
- Candidate endpoints:
  - `/api/v1/data/macro/fred-series`
  - `/api/v1/data/macro/alfred-vintages`
- Why not immediate: key management and terms/rate handling are needed.

### OECD Data Explorer / SDMX

- Value: high for international macro, trade, productivity, prices, and labor.
- Access: public API, but dataset discovery and SDMX dimension handling are
  more complex than single-purpose JSON APIs.
- Candidate endpoint:
  - `/api/v1/data/macro/oecd-series`
- Why not immediate: needs robust SDMX metadata flattening and curated dataset
  selection.

### BIS statistics

- Value: high for credit, banking, FX, derivatives, property prices, and policy
  rates.
- Access: public SDMX-style API, but query construction should be validated.
- Candidate endpoint:
  - `/api/v1/data/financial/bis-series`
- Why not immediate: needs SDMX metadata discovery and careful dimension
  normalization.

### BEA API

- Value: high for US GDP, NIPA, regional accounts, trade, and industry data.
- Access: free key normally required.
- Candidate endpoints:
  - `/api/v1/data/macro/bea-nipa`
  - `/api/v1/data/macro/bea-regional`
- Why not immediate: free but not directly accessible without key setup.

### Census API

- Value: high for US demographics, income, housing, employment, and county/state
  enrichment.
- Access: public API, but keyless access and content type should be checked per
  dataset and query.
- Candidate endpoints:
  - `/api/v1/data/demographics/census-acs`
  - `/api/v1/data/demographics/census-cbp`
- Why not immediate: field selection, geography handling, and metadata mapping
  need careful design.

### OpenSky Network aircraft states

- Value: medium-high for logistics, aviation, geopolitical event monitoring,
  airport congestion, and conflict-zone anomaly detection.
- Access: public endpoint exists, but unauthenticated reliability varies.
- Candidate endpoint:
  - `/api/v1/data/aviation/opensky-states`
- Why not immediate: access was connection-reset in the current probe; needs
  retry/auth strategy and rate-limit validation.

### ReliefWeb / OCHA humanitarian data

- Value: medium-high for disasters, humanitarian crises, appeals, and country
  event context.
- Access: public API is documented, but current direct probe returned 403 in
  this environment.
- Candidate endpoints:
  - `/api/v1/data/humanitarian/reliefweb-disasters`
  - `/api/v1/data/humanitarian/reliefweb-reports`
- Why not immediate: verify required headers/appname behavior and rate limits.

### OpenAQ

- Value: medium for air quality, city risk, health, and environmental overlays.
- Access: public API availability and version policy should be confirmed before
  committing to implementation.
- Candidate endpoints:
  - `/api/v1/data/environment/air-quality`
  - `/api/v1/data/environment/air-quality-locations`
- Why not immediate: API access policy has changed over time; validate current
  free direct access and quotas.

## Priority 3 - scraping or bulk-file backlog

These can add value but should wait until direct APIs above are done. Each needs
more governance around terms of use, parsing stability, and monitoring.

### Central bank speeches, minutes, and calendars

- Sources: Federal Reserve, ECB, BoE, BoJ, BIS speech pages.
- Candidate endpoints:
  - `/api/v1/data/central-banks/speeches`
  - `/api/v1/data/central-banks/minutes`
  - `/api/v1/data/central-banks/calendar`
- Notes: high text-analysis value, but HTML/RSS/PDF parsing will need source-
  specific adapters.

### Additional sanctions lists

- Sources: UK OFSI, Switzerland SECO, Canada sanctions, Australia DFAT, Japan
  MOFA.
- Candidate endpoints:
  - `/api/v1/data/governance/sanctions/uk`
  - `/api/v1/data/governance/sanctions/switzerland`
  - `/api/v1/data/governance/sanctions/canada`
  - `/api/v1/data/governance/sanctions/australia`
- Notes: useful because OFAC/EU/UN already exist, but file formats and stable
  download URLs vary.

### Exchange notices and market structure bulletins

- Sources: SEC market structure releases, FINRA notices, CFTC advisories,
  exchange circulars.
- Candidate endpoints:
  - `/api/v1/data/market-structure/notices`
  - `/api/v1/data/regulatory/market-bulletins`
- Notes: good for event intelligence, but many sources are HTML/PDF and need
  deduplication.

### Public company investor-relations feeds

- Sources: company IR RSS feeds, press releases, earnings calendars, event
  pages.
- Candidate endpoints:
  - `/api/v1/data/company/news`
  - `/api/v1/data/company/events`
- Notes: high value when joined to SEC/company data, but source coverage and
  terms vary by issuer.

### Commodity and shipping HTML/PDF reports

- Sources: port authority updates, river levels, canal authority notices, USDA
  PDFs, exchange warehouse reports.
- Candidate endpoints:
  - `/api/v1/data/logistics/port-notices`
  - `/api/v1/data/commodities/warehouse-stocks`
  - `/api/v1/data/commodities/shipping-disruptions`
- Notes: valuable for commodity and supply-chain workflows, but scraping and PDF
  extraction make this non-immediate.

## Probe evidence from this pass

The following public endpoints were probed successfully from the cloud
environment or via web fetch:

- SEC submissions: HTTP 200, JSON.
- SEC company facts: HTTP 200, JSON.
- GLEIF LEI records: HTTP 200, JSON API.
- Treasury upcoming auctions: HTTP 200, JSON.
- Treasury daily statement: successful via web fetch; one Python probe saw a
  remote disconnect, so add retry handling.
- BLS CPI latest: HTTP 200, JSON.
- CISA KEV: HTTP 200, JSON.
- NVD CVEs: HTTP 200, JSON.
- GitHub advisories: HTTP 200, JSON.
- Eurostat population example: HTTP 200, JSON-stat.
- Open-Meteo forecast: HTTP 200, JSON.
- NOAA SWPC alerts: HTTP 200, JSON.
- NASA EONET: HTTP 200.
- OpenAlex works: HTTP 200, JSON.
- Crossref works: HTTP 200, JSON.
- Wikidata SPARQL: HTTP 200, SPARQL JSON.

Access checks needing follow-up:

- OpenSky unauthenticated states reset the connection in this environment.
- ReliefWeb returned 403 via web fetch and should be checked with official
  headers/appname usage.
- Census returned HTTP 200 but with `text/html` content in the quick probe;
  validate query encoding and dataset-specific behavior before implementation.
- UK OFSI CSV URL probed here returned 404; use the official current download
  page or API metadata rather than hard-coding that URL.

## Suggested implementation order

1. SEC company facts/submissions expansion.
2. GLEIF LEI entity enrichment.
3. Treasury Fiscal Data cash and auctions.
4. BLS macro series.
5. Cyber risk feeds: CISA KEV, NVD CVE, GitHub advisories.
6. Eurostat curated macro/demographic series.
7. Open-Meteo forecast/agriculture/weather overlays.
8. NOAA SWPC space weather alerts.
9. NASA EONET events.
10. OpenAlex/Crossref research feeds.
11. Wikidata curated entity enrichment.
12. Then revisit free-key, SDMX, bulk-file, and scraping backlog sources.
