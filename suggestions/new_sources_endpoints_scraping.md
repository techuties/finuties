# New sources, endpoints, and scraping suggestions

Purpose: prioritize new FinUties data sources to implement after reviewing the current Terminal source registry and API consumers. Free, no-key, directly accessible upstreams are ranked highest.

## Baseline already covered

The current frontend registry already exposes internal endpoints for these areas:

- Politics/conflict: UCDP events and summaries, ACLED placeholder, GDELT events, geopolitical risk.
- Nature/disasters: USGS earthquakes, GDACS alerts, NOAA weather alerts, EM-DAT historical disasters.
- Maritime: Global Fishing Watch vessel events.
- Economy/trade: ECB FX, CoinGecko crypto, IMF indicators, UN Comtrade, CFTC COT report variants.
- Environment/ESG: EPA TRI facilities.
- Health: WHO indicators, WHO outbreaks, JMP water/sanitation.
- Demographics: UN population, UNHCR refugees, UN urbanization, IOM migration.
- Food/agriculture: FAO indicators, FAO price index, USDA WASDE, Aquastat, WFP hunger.
- Development: World Bank poverty/governance/education, UNDP HDI/MPI, UNESCO, ILO, ITU.
- Climate/biodiversity/sanctions: NASA/NOAA/NSIDC/ERA5/night lights, GBIF, IUCN, OFAC/EU/UN sanctions.

Additional frontend consumers already reference non-registry endpoints such as SEC filings/holdings/insider transactions, NY Fed rates, Treasury debt outstanding, BLS/BEA macro series, EIA energy, commodities prices, and economic calendar data. Prefer turning those into registry sources before duplicating similar routes.

## Priority scale

- P0: high value and immediate; no key, login, or scraping required.
- P1: high value but needs a polite app name, optional token, schema discovery, or more careful rate handling.
- P2: useful bulk/download/scraping-style source; implement after API-first wins.
- P3: not immediate; access, licensing, data size, or reliability makes it lower priority.

## P0 - immediate no-key APIs

| Source | Suggested internal endpoint | Upstream example | Why it is valuable | Implementation notes |
| --- | --- | --- | --- | --- |
| US Treasury FiscalData | `/api/v1/data/economic/treasury-fiscal` and `/api/v1/data/rates/treasury-auctions` | `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny?page[size]=1` | Direct federal debt, auctions, statements, rates-adjacent fiscal data. Complements the existing Treasury debt card. | Generic FiscalData adapter can accept dataset path, filters, sort, and page size. Normalize `record_date`, amount fields, and dataset name. |
| FDIC BankFind Suite | `/api/v1/data/banking/fdic-institutions`, `/api/v1/data/banking/fdic-failures` | `https://banks.data.fdic.gov/api/institutions?filters=ACTIVE:1&limit=1&format=json` | Bank reference data, failures, financials, locations; strong finance fit and fully public. | Add `banking` category or place under economy. Use FDIC `meta.total` for pagination and expose filters for state, asset size, active status. |
| GLEIF LEI API | `/api/v1/data/entities/lei-records` | `https://api.gleif.org/api/v1/lei-records?page[size]=1` | Legal entity identity, addresses, registration state, relationships; useful for company/investor enrichment. | JSON:API response shape. Store LEI, legal name, jurisdiction, status, entity category, parent links. |
| openFDA recalls/enforcement | `/api/v1/data/health/fda-recalls` | `https://api.fda.gov/food/enforcement.json?limit=1` | Food, drug, and device recall risk signals. Free and direct, key optional only for higher limits. | Start with food enforcement, then add drug/device variants behind a `product_type` filter. Respect `skip`/`limit` caps. |
| NASA EONET events | `/api/v1/data/disasters/eonet` | `https://eonet.gsfc.nasa.gov/api/v3/events?limit=1` | Near-real-time natural hazards with geometry; fills a gap between earthquakes/GDACS/weather alerts. | Map categories to hazard types; preserve GeoJSON geometry and emit representative lat/lon for map views. |
| Open-Meteo forecast/history/air quality | `/api/v1/data/weather/open-meteo`, `/api/v1/data/climate/weather-history` | `https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current=temperature_2m` | No-key global weather and climate time series for user-selected coordinates. | Coordinate-driven endpoint; do not pre-ingest globally. Cache by rounded lat/lon, variables, and date range. |
| USGS Water Services | `/api/v1/data/water/usgs-streamflow` | `https://waterservices.usgs.gov/nwis/iv/?format=json&sites=01646500&period=P1D&parameterCd=00060` | River gauge levels/flow, floods, drought signals; complements weather/disaster sources. | Start with site lookup plus instantaneous values. Normalize `site_no`, `datetime`, `parameter_cd`, value, unit, lat/lon. |
| Eurostat dissemination API | `/api/v1/data/economic/eurostat` | `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nama_10_gdp?geo=DE&na_item=B1GQ&unit=CP_MEUR&time=2023&lang=en` | EU macro, labor, energy, demographics, prices with official JSON-stat API. | Build a generic JSON-stat flattener and whitelist dataset IDs/indicators to keep responses bounded. |
| ECB Data Portal SDMX expansion | `/api/v1/data/rates/ecb-series` | `https://data-api.ecb.europa.eu/service/data/EXR/D.USD.EUR.SP00.A?lastNObservations=1` | Existing FX can expand to policy rates, money markets, yield curves, securities, balance sheets. | Reuse SDMX parser. Add series registry with human labels instead of free-form SDMX keys at first. |
| World Bank generic indicator router | `/api/v1/data/worldbank/indicator` | `https://api.worldbank.org/v2/country/all/indicator/NY.GDP.MKTP.CD?format=json&per_page=1` | Avoid adding one endpoint per World Bank topic; unlocks thousands of public indicators. | Keep existing curated endpoints, but add generic route with indicator allowlist, country, date range, pagination. |
| HDX CKAN dataset search | `/api/v1/data/humanitarian/hdx-datasets` | `https://data.humdata.org/api/3/action/package_search?q=food%20security&rows=5` | Humanitarian catalog discovery for OCHA/NGO datasets, resources, update cadence, country tags. | Start as metadata search, not automatic resource ingestion. Later allow selected CSV resources to become ingested datasets. |
| iNaturalist observations | `/api/v1/data/biodiversity/inaturalist-observations` | `https://api.inaturalist.org/v1/observations?per_page=1` | Complements GBIF with community observations, photos, conservation status, places. | Use filters for taxon, place, quality grade, date range, bounding box. Respect API pagination and attribution. |

## P1 - high value, but not as frictionless

| Source | Suggested internal endpoint | Access notes | Why/next step |
| --- | --- | --- | --- |
| SEC EDGAR direct APIs | `/api/v1/sec/companyfacts`, `/api/v1/sec/submissions`, `/api/v1/sec/frames` | No key, but requires clear User-Agent and rate discipline. | Existing SEC UI endpoints can be expanded with direct company facts and frames for standardized fundamentals. |
| ReliefWeb v2 | `/api/v1/data/humanitarian/reliefweb-reports`, `/api/v1/data/humanitarian/reliefweb-disasters` | Free API, but since late 2025 requires a pre-approved `appname`; old `/v1` endpoint returns gone. | Valuable humanitarian reports/disaster metadata. Implement after acquiring/setting approved app name config. |
| CDC/HealthData.gov Socrata | `/api/v1/data/health/cdc-socrata` | Public read often works without a token, but app token is recommended for production. | Good for public health surveillance, mortality, vaccination, hospital data. Start with a curated dataset allowlist. |
| Federal Reserve Data Download | `/api/v1/data/rates/frb-h15` | Direct CSV/XML, awkward series selection. | H.15 rates, yield curve, exchange rates; useful alongside NY Fed rates. Build fixed series definitions first. |
| BLS public API expansion | `/api/v1/data/macro/bls-public-series` | No key for limited requests; registered key improves quotas. | Employment, CPI/PPI, wages. Existing macro card can become registry-backed. |
| OpenAlex | `/api/v1/data/research/openalex` | No key; polite pool requires email in query/config. | Research institutions, works, funders, topics; useful for company/university knowledge graph enrichment. |
| Wikidata SPARQL | `/api/v1/data/knowledge/wikidata-query` | No key, strict fair-use; queries must be curated. | Entity enrichment and country/company metadata. Only expose prebuilt query templates. |
| OpenStreetMap Overpass | `/api/v1/data/geo/osm-overpass` | No key, shared public servers with rate/fair-use limits. | Infrastructure, ports, factories, hospitals, boundaries. Use curated and geographically bounded queries only. |
| NOAA CO-OPS tides/water levels | `/api/v1/data/marine/noaa-coops` | No key, query limits by station/date/product. | Ports, storm surge, sea level, tides; useful for maritime and climate. |
| FINRA market transparency | `/api/v1/data/market/finra-short-interest` | Public endpoints vary and may require extra headers/schema discovery. | Short interest, OTC/ATS transparency. Verify stable endpoint contract first. |

## P2 - bulk downloads and scraping-style sources

| Source | Suggested internal endpoint | Access notes | Implementation notes |
| --- | --- | --- | --- |
| OpenSanctions bulk data | `/api/v1/data/governance/sanctions/opensanctions` | Direct bulk downloads, no API key; free for non-commercial use, commercial license required. | Prefer selected small datasets first, e.g. `un_sc_sanctions`, `us_ofac_sdn`, maritime subset. Avoid loading multi-GB default collection initially. |
| UK OFSI consolidated sanctions | `/api/v1/data/governance/sanctions/uk` | Government-published consolidated list, direct XLS/CSV/XML downloads. | Add as sanctions registry peer to OFAC/EU/UN. Track publication date and regime fields. |
| Switzerland SECO sanctions | `/api/v1/data/governance/sanctions/ch` | Direct official XML/CSV-style downloads. | Useful coverage gap for sanctions screening. Normalize entities, programs, aliases, addresses. |
| Australia DFAT sanctions | `/api/v1/data/governance/sanctions/au` | Direct official consolidated list downloads. | Similar parser to UK/Swiss lists; lower complexity than OpenSanctions full graph. |
| Canada sanctions lists | `/api/v1/data/governance/sanctions/ca` | Direct government pages/downloads; formats can change. | Treat as scraper/download source with robust format checks. |
| OurAirports CSV | `/api/v1/data/transport/airports` | Direct CSV from GitHub-backed public data. | Airports, runways, navaids, regions. Easy static download with geospatial map value. |
| Natural Earth datasets | `/api/v1/data/geo/natural-earth` | Direct zipped shapefiles/GeoJSON mirrors. | Use as enrichment/reference data rather than a user-facing time series. |
| OCHA common operational datasets via HDX | `/api/v1/data/humanitarian/ocha-cods` | Resource URLs discovered through HDX, often CSV/GeoJSON. | Implement only selected countries/themes; keep metadata provenance from HDX. |
| Stooq market CSV | `/api/v1/data/market/stooq-prices` | Direct CSV, unofficial/free public service. | Useful fallback for equities/indices/FX history; mark source reliability lower than official APIs. |
| FRED/ALFRED bulk-like series | `/api/v1/data/macro/fred-series` | Free but requires API key for official API; CSV downloads exist for individual series. | Not immediate unless a shared key/config decision exists. |

## P3 - not immediate

- OpenAQ v3 air quality: valuable, but current API requires `X-API-Key`; only implement if project is willing to manage a free key.
- EIA v2: valuable energy coverage, but official API requires a key; existing energy card suggests some backend support already exists.
- NOAA NCEI climate data: useful, but token requirements and dataset complexity make it slower than Open-Meteo/NOAA CO-OPS.
- OpenSky Network: unauthenticated aircraft state endpoint exists but is heavily rate-limited and may be unreliable for production without credentials.
- Copernicus CDS/ERA5 operational pulls: high value but account/license workflow and heavy downloads make it a batch pipeline, not an immediate API.
- Satellite STAC catalogs such as Microsoft Planetary Computer and Element 84 Earth Search: metadata is accessible, but meaningful analytics need asset selection, signing/COG reads, and geospatial processing.
- Commercial or restricted financial feeds such as Nasdaq Data Link premium datasets, Refinitiv, Bloomberg, MarineTraffic, Spire, and most AIS feeds should stay out of the free/direct backlog.

## Recommended implementation order

1. Convert existing non-registry frontend consumers into registry sources where appropriate: EIA energy, Treasury debt, NY Fed rates, BLS/BEA macro series, economic calendar, commodities prices.
2. Add P0 sources with strong finance/geopolitical fit: Treasury FiscalData, FDIC, GLEIF, NASA EONET, openFDA.
3. Add generic adapters that unlock many datasets safely: World Bank indicator router, Eurostat JSON-stat, ECB SDMX, HDX CKAN search.
4. Expand mapped/geospatial feeds: USGS Water, Open-Meteo, iNaturalist, NOAA CO-OPS.
5. Add official sanctions download parsers: UK OFSI, Swiss SECO, Australia DFAT, Canada, then selected OpenSanctions bulk subsets.

## Implementation checklist for each new source

- Add a backend ingestion/fetch adapter with upstream timeout, pagination, cache TTL, and rate-limit handling.
- Normalize output to the existing envelope: `{ source, count, items, cached }`.
- Add a `SourceDef` registry entry with category, endpoint, geo fields, columns, filters, default limit, and default lookback.
- Keep source IDs and internal endpoints stable once exposed.
- Add focused tests for parser normalization and route query parameters.
- For large/bulk sources, store upstream metadata: source URL, retrieved timestamp, license/caveat, and publication date.

## Live access spot-checks

Representative no-key endpoints were checked from the development environment and returned HTTP 200: Treasury FiscalData, Open-Meteo, FDIC, GLEIF, openFDA, World Bank, USGS Water Services, iNaturalist, ECB Data API, and Eurostat. NASA EONET returned a successful JSON payload with an XML-ish content type. ReliefWeb `/v1/disasters` returned HTTP 410, so use `/v2` with a pre-approved `appname`.
