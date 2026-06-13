# New Source, Endpoint, and Scraping Suggestions

Generated: 2026-06-13

## Scope

This file reviews the current FinUties endpoint surface and proposes new public data sources to implement. Priority favors sources that are:

1. Free and directly accessible without API keys.
2. High value for finance, macro, geopolitical, climate, health, cyber, and operational risk workflows.
3. Structured enough to normalize into the existing source registry pattern.
4. Low-risk for licensing, rate limits, and ongoing maintenance.

## Current endpoint coverage checked

The current terminal source registry contains 51 source endpoints across:

- Politics and conflict: UCDP, ACLED placeholder, GDELT, GPR.
- Nature and disasters: USGS earthquakes, GDACS, NOAA weather alerts, EM-DAT.
- Maritime: Global Fishing Watch vessel events.
- Economy and trade: ECB FX, CoinGecko, IMF, UN Comtrade, CFTC COT.
- Environment and ESG: EPA TRI facilities.
- Health: WHO indicators/outbreaks, JMP water and sanitation.
- Demographics: UN population, UNHCR, urbanization, IOM migration.
- Food and agriculture: FAO, FAO price index, USDA WASDE, Aquastat, WFP hunger.
- Development: World Bank, UNDP, UNESCO, ILO, ITU.
- Climate: NASA temperature, NOAA greenhouse gas, coral reef, sea level, sea ice, ERA5, VIIRS night lights.
- Biodiversity: GBIF, IUCN.
- Sanctions: OFAC, EU, UN.

Other client usage also references SEC, market, rates, macro, account, auth, search, and data-collection endpoints. Suggestions below avoid obvious duplicates unless the proposed source is a distinct enrichment surface.

## Validation notes

Representative upstream URLs were probed from the cloud-agent VM on 2026-06-13. A source marked "probe: 200" returned HTTP 200 with JSON or another usable structured response. Some attractive sources were moved to later priority because the probe showed auth, access, or format issues.

## P0 - High value and immediate

These sources are free, direct, structured, and useful enough to implement first.

| Priority | Proposed source id | Proposed FinUties endpoint | Upstream example | Probe | Why high value | Implementation notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `cisa_kev` | `/api/v1/data/cyber/known-exploited-vulnerabilities` | `https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json` | 200 JSON | Adds exploited-vulnerability risk coverage for company, sector, vendor, and infrastructure monitoring. | Daily ingest. Key fields: CVE, vendorProject, product, vulnerabilityName, dateAdded, dueDate, requiredAction, notes. |
| 2 | `nvd_cves` | `/api/v1/data/cyber/cves` | `https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=1` | 200 JSON | Complements CISA KEV with broader vulnerability disclosure volume, CVSS scores, CPEs, and publication dates. | No key required but rate-limited. Cache aggressively and paginate by `pubStartDate`/`pubEndDate`. |
| 3 | `gleif_lei_records` | `/api/v1/data/entities/lei-records` | `https://api.gleif.org/api/v1/lei-records?page[size]=1` | 200 JSON:API | High-value entity master data for issuers, banks, counterparties, parent relationships, legal jurisdictions, and entity status. | Normalize LEI, legalName, jurisdiction, entityStatus, registrationStatus, headquarters, legalAddress, directParent, ultimateParent. |
| 4 | `treasury_fiscaldata_debt` | `/api/v1/data/economy/treasury/debt-to-penny` | `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny?page[size]=1` | 200 JSON | Direct US public debt time series with official Treasury source and no auth. | Start with debt-to-penny; expand later to auctions, daily treasury statement, savings bonds, and debt outstanding by holder. |
| 5 | `federal_register_documents` | `/api/v1/data/governance/federal-register` | `https://www.federalregister.gov/api/v1/documents.json?per_page=1&order=newest` | 200 JSON | Captures new US rules, sanctions notices, tariffs, trade actions, agency rules, and regulatory risk. | Filter by agency, topic, publication_date, type, CFR, effective_date. Link to document HTML/PDF. |
| 6 | `openfda_enforcement` | `/api/v1/data/health/fda-enforcement` | `https://api.fda.gov/drug/enforcement.json?limit=1` | 200 JSON | Adds product recalls and enforcement events affecting healthcare, pharma, supply chains, and consumer safety. | Start with drug enforcement. Later add food, device, adverse events, and shortages if terms remain acceptable. |
| 7 | `noaa_swpc_kp_index` | `/api/v1/data/climate/space-weather/kp-index` | `https://services.swpc.noaa.gov/json/planetary_k_index_1m.json` | 200 JSON | Space weather can affect satellites, power grids, aviation, GNSS, maritime positioning, and communications. | Poll recent JSON feeds. Include Kp index, observed time, estimated Kp, NOAA scale mappings. |
| 8 | `nasa_eonet_events` | `/api/v1/data/disasters/eonet` | `https://eonet.gsfc.nasa.gov/api/v3/events?limit=1` | 200 structured feed | Complements GDACS/USGS with wildfire, storm, volcano, iceberg, dust, and other natural-event monitoring. | The endpoint returned a structured feed body. Normalize event id, title, categories, geometry, closed date, sources. |
| 9 | `noaa_coops_water_levels` | `/api/v1/data/maritime/tides/water-levels` | `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=today&station=8724580&product=water_level&datum=MLLW&time_zone=gmt&units=metric&format=json` | 200 JSON | Direct port, coastal flood, tide, and storm-surge observations for maritime and infrastructure risk. | Start with station metadata and water levels. Add currents, predictions, air gap, meteorological observations later. |
| 10 | `open_meteo_forecast` | `/api/v1/data/weather/open-meteo-forecast` | `https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&hourly=temperature_2m&forecast_days=1` | 200 JSON | No-key global weather forecasts for assets, ports, cities, crops, and operations. | Good candidate for on-demand fetch with cache by lat/lon/time variables. Respect non-commercial/open license constraints. |
| 11 | `eurostat_indicators` | `/api/v1/data/economy/eurostat` | `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/une_rt_m?geo=EU27_2020&sex=T&age=TOTAL&s_adj=SA&unit=PC_ACT&time=2024-01` | 200 JSON | Adds official EU macro, labor, inflation, energy, demographics, and trade indicators beyond global IMF/WB coverage. | Implement a generic Eurostat adapter with dataset id, dimensions, time, and geo filters. |
| 12 | `hdx_datasets` | `/api/v1/data/humanitarian/hdx-datasets` | `https://data.humdata.org/api/3/action/package_search?rows=1&q=food%20security` | 200 JSON | Indexes humanitarian datasets for food security, displacement, health, logistics, and disaster response. | Start as metadata/search endpoint. Resource files are heterogeneous and should be promoted one dataset at a time. |

## P1 - Valuable and likely direct, but needs schema/discovery work

These are good next candidates, but need additional adapter design, dimension discovery, or fair-use safeguards.

| Priority | Proposed source id | Proposed FinUties endpoint | Upstream | Readiness | Notes |
| --- | --- | --- | --- | --- | --- |
| 13 | `ons_time_series` | `/api/v1/data/economy/ons` | `https://api.beta.ons.gov.uk/` | Direct API; probe needs full dimensions | UK official inflation, labor, GDP, population, and trade. Requires dataset-specific dimension discovery before generic querying. |
| 14 | `ecb_sdmx_series` | `/api/v1/data/economy/ecb-sdmx` | `https://data-api.ecb.europa.eu/service/` | Direct SDMX | Extend beyond current ECB FX to euro area rates, yield curves, monetary aggregates, balance sheets, and securities. |
| 15 | `bis_sdmx_series` | `/api/v1/data/economy/bis` | `https://stats.bis.org/` | Direct SDMX | High-value cross-border banking, credit, property prices, exchange rates, and derivatives. Needs SDMX key builder and caching. |
| 16 | `oecd_indicators` | `/api/v1/data/economy/oecd` | OECD Data Explorer APIs | Direct, schema-heavy | Useful for country comparisons, productivity, trade, business confidence, education, taxation. Needs modern OECD API contract verification. |
| 17 | `data_gov_datasets` | `/api/v1/data/governance/data-gov-datasets` | `https://catalog.data.gov/api/3/action/package_search` | Direct CKAN | Good metadata/search endpoint for discovering US public datasets; promote selected resources separately. |
| 18 | `wikidata_entities` | `/api/v1/data/entities/wikidata` | `https://query.wikidata.org/sparql` | Direct but rate-sensitive | Useful for entity enrichment, country metadata, exchanges, ports, companies, and identifier crosswalks. Keep query templates narrow. |
| 19 | `overpass_osm_assets` | `/api/v1/data/geospatial/osm-assets` | `https://overpass-api.de/api/interpreter` | Direct but fair-use sensitive | Infrastructure points such as hospitals, ports, airports, power plants, pipelines, refineries. Needs bounding boxes, caching, and strict limits. |
| 20 | `iso_mic_codes` | `/api/v1/data/markets/mic-codes` | ISO 10383 MIC list download | Direct file | Market identifier reference data for exchanges and trading venues. Binary Excel parsing needed. |
| 21 | `nasdaq_symbol_directory` | `/api/v1/data/markets/nasdaq-symbols` | Nasdaq Trader symbol directory files | Direct text download expected | Useful for listed symbol reference and ETF flags. Probe should verify raw text access from production, since some sources vary by user agent. |

## P2 - Good ideas, but not immediate

These sources are useful but should wait until auth, rate-limit, license, or operational issues are resolved.

| Candidate | Desired endpoint | Blocker found or expected | Recommendation |
| --- | --- | --- | --- |
| OpenAQ air quality v3 | `/api/v1/data/environment/air-quality` | Probe returned 401 and requires `X-API-Key`. | Implement only after key management and license review. |
| US Census API | `/api/v1/data/demographics/census` | Probe returned a "Missing Key" HTML page. | Treat as key-required in current environment; revisit with approved Census key strategy. |
| ReliefWeb API | `/api/v1/data/humanitarian/reliefweb` | v1 returned 410; v2 returned 403 for appname/access during probe. | Revisit if a registered app name or approved access path is available. |
| OpenSky Network states | `/api/v1/data/aviation/open-sky-states` | Anonymous probe reset the connection. | Not reliable enough for immediate ingestion; consider authenticated or partner access. |
| Stooq daily market CSV | `/api/v1/data/markets/stooq-prices` | Probe returned HTML rather than CSV. | Treat as scraping/non-immediate unless a stable documented CSV path is confirmed. |
| EIA energy data | `/api/v1/data/energy/eia` | API key is generally required. | High value, but implement after secrets/key governance. |
| NOAA NCEI climate data | `/api/v1/data/climate/ncei` | Many NOAA climate APIs require tokens or bulk-download workflows. | Use later for curated datasets, not immediate generic API. |
| Companies House | `/api/v1/data/entities/companies-house` | API key required. | High value for UK entities, but not direct/free in the desired sense. |
| OpenCorporates | `/api/v1/data/entities/open-corporates` | API access and licensing are not direct enough for immediate use. | Revisit after license/API access review. |
| FRED/ALFRED | `/api/v1/data/economy/fred` | API key required for standard API. | Use only if key management is approved; many rates may already exist via Treasury/NY Fed endpoints. |

## P3 - Scraping or bulk-ingest candidates

These may be valuable but are not API-first. They should be implemented only with explicit scraping policy, robots/terms checks, backoff, and source-specific parsers.

| Candidate | Target endpoint | Value | Scraping or bulk concern |
| --- | --- | --- | --- |
| Central bank policy calendars and statements | `/api/v1/data/governance/central-bank-statements` | Monetary-policy event risk and NLP over statements. | Many pages are HTML/PDF and vary by central bank. |
| Exchange holiday calendars | `/api/v1/data/markets/exchange-holidays` | Trading-day logic and market operations. | Often HTML/PDF, inconsistent by venue. |
| Port authority vessel schedules and disruptions | `/api/v1/data/maritime/port-disruptions` | Supply-chain and shipping risk. | Many port sites lack stable APIs and have local terms. |
| Government procurement awards | `/api/v1/data/governance/procurement-awards` | Fiscal flows, company revenue signals, corruption risk. | Jurisdiction-specific portals, pagination, HTML/PDF documents. |
| Trade remedy and tariff notices | `/api/v1/data/trade/trade-remedies` | Tariffs, anti-dumping, countervailing duties, customs risk. | Some direct feeds exist, but broad coverage needs scraping. |
| Food security bulletins and crop reports | `/api/v1/data/food/crop-bulletins` | Agriculture and commodity risk. | Many reports are PDF; OCR and table extraction may be needed. |
| Shipping casualty reports | `/api/v1/data/maritime/casualties` | Insurance, sanctions evasion, route risk. | Public reports are fragmented and often PDF/HTML. |
| Satellite-derived raster products | `/api/v1/data/geospatial/satellite-products` | Night lights, flood maps, fire intensity, vegetation. | Bulk raster processing, storage, tiling, and attribution required. |

## Suggested implementation order

1. Add a cyber risk category with CISA KEV and NVD CVEs.
2. Add entity reference data with GLEIF LEI records.
3. Add official US public finance and regulatory event feeds: Treasury FiscalData and Federal Register.
4. Add openFDA enforcement for healthcare/product-risk coverage.
5. Add operational risk feeds: NOAA SWPC, NOAA CO-OPS, NASA EONET, and Open-Meteo.
6. Add Eurostat as the first generic regional SDMX-style adapter.
7. Add HDX as a metadata discovery endpoint, then promote selected HDX resources into dedicated normalized sources.

## Proposed registry categories to add

- `cyber`: CISA KEV, NVD CVEs.
- `entities`: GLEIF LEI records, Wikidata entity crosswalks, later Companies House/OpenCorporates if approved.
- `governance`: Federal Register, data.gov dataset search, procurement, policy statements.
- `aviation`: OpenSky or other flight/airport sources when reliable access is available.
- `geospatial`: OSM/Overpass infrastructure and selected satellite products.

## Minimum acceptance criteria for adding a source

- Upstream terms permit the intended use.
- A representative no-key request succeeds from the backend environment, or the source is explicitly marked key-required.
- The adapter has bounded pagination and deterministic cache keys.
- The registry entry includes category, label, endpoint, geo type, default limits, and primary columns.
- The endpoint returns the existing data envelope shape: `{ source, count, items, cached }`.
- Heavy or rate-sensitive upstreams have backoff, TTL caching, and limit caps.
