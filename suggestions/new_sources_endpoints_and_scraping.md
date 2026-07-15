# New sources, endpoints, and scraping candidates

Last checked: **2026-07-15**

This is the implementation backlog for upstream data not already represented in the FinUties source registry. It ranks stable, free, directly machine-readable sources above feeds that require registration, licensing review, or scraping.

## Selection rules

Priority increases when a source is:

1. directly accessible without credentials;
2. published by the primary authority;
3. structured as JSON, CSV, GeoJSON, SDMX, or a documented REST service;
4. useful for financial, geopolitical, or operational-risk analysis; and
5. additive to the current catalog rather than another copy of existing data.

`Direct / no auth` means a live request succeeded without credentials on the date above. It does not remove the need to comply with attribution, rate-limit, and redistribution terms.

## Existing coverage checked

The audit used `terminal/src/lib/source-registry.ts`, `terminal/src/lib/global-data-api.ts`, dashboard cards, explorer sections, and notebooks. The registry already contains 51 sources across conflict, disasters, maritime, economy, environment, health, demographics, food, development, climate, biodiversity, and sanctions.

Do not propose duplicate ingestion for the existing UCDP, GDELT, USGS earthquakes, GDACS, NOAA US alerts, EM-DAT, Global Fishing Watch, ECB FX, CoinGecko, IMF WEO, UN Comtrade, CFTC, EPA TRI, WHO, UN, World Bank, FAO, WFP, NASA climate, NOAA climate, Copernicus ERA5, GBIF, IUCN, OFAC, EU, or UN sanctions integrations.

### Finish exposing these existing FinUties endpoints first

These are already consumed somewhere in the client but are absent from the global source registry. They are low-effort catalog additions, not new upstream integrations.

| Existing endpoint | Action |
| --- | --- |
| `/api/v1/data/economic/energy` | Add an energy source/category entry or place it under economy. |
| `/api/v1/data/commodities/prices` | Add to the economy catalog with commodity and date filters. |
| `/api/v1/data/macro/series` | Expose the already-used macro series in the data catalog. |
| `/api/v1/data/economy/calendar` and `/api/v1/calendar/events` | Choose one canonical route and deprecate the duplicate path. |

## P0 — high value, implement next

All P0 sources are direct and credential-free.

| Rank | Source and direct entry point | Coverage and value | Suggested FinUties route | Implementation notes |
| ---: | --- | --- | --- | --- |
| 1 | **IMF PortWatch** — [daily chokepoint ArcGIS query](https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/Daily_Chokepoints_Data/FeatureServer/0/query?where=1%3D1&outFields=%2A&outSR=4326&f=json) | Daily vessel transits, port calls, and trade-disruption indicators. This directly addresses the current one-source maritime category. | `/api/v1/data/maritime/portwatch` | ArcGIS JSON; paginate with `resultOffset` because layers cap a response at 1,000 rows. Cache daily data and retain the source layer/object ID. Confirm IMF/ArcGIS redistribution terms before mirroring full history. |
| 2 | **UK Sanctions List** — [static CSV](https://sanctionslist.fcdo.gov.uk/docs/UK-Sanctions-List.csv) | UK designations, including people, entities, and ships. It fills the largest obvious gap beside the existing US, EU, and UN lists. | `/api/v1/data/governance/sanctions/uk` | Static official URL, CSV, no discovery scraper needed. The former OFSI consolidated list closed on 2026-01-28; ingest only the FCDO UK Sanctions List. Preserve aliases and designation IDs. |
| 3 | **GLEIF LEI API** — [LEI records](https://api.gleif.org/api/v1/lei-records?page%5Bsize%5D=10) | Global legal entities, registration status, BIC/ISIN mappings, and direct/ultimate parent relationships. Strong fit with SEC, holdings, and sanctions entity resolution. | `/api/v1/data/entities/lei` | JSON:API with pagination and relationship links. Cache records by LEI; normalize names and addresses without discarding the raw record. |
| 4 | **Eurostat Statistics API** — [sample GDP query](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nama_10_gdp?format=JSON&lang=EN&geo=DE&time=2024) | European macro, labor, prices, trade, population, energy, and regional statistics. It adds substantial depth beyond ECB FX and IMF WEO. | `/api/v1/data/economic/eurostat` | JSON-stat 2.0, CORS, no key. Start with a curated indicator allowlist; unrestricted dataset queries can be very large. Store dataset code, dimensions, unit, and observation status. |
| 5 | **BIS Statistics API v2** — [dataflow discovery](https://stats.bis.org/api/v2/structure/dataflow/all/all/latest) | Cross-border banking, global liquidity, credit, debt securities, property prices, effective exchange rates, and policy rates. High-value financial-stability coverage. | `/api/v1/data/economic/bis` | SDMX REST v2.1. Discover dataflows first, then implement small explicit series sets. Support CSV/JSON where offered and retain SDMX dimension codes. |
| 6 | **Elexon Insights** — [current generation by fuel](https://data.elexon.co.uk/bmrs/api/v1/generation/outturn/current) | Production-grade Great Britain electricity generation, demand, imbalance prices, outages, forecasts, and REMIT events. Useful real-time energy and market-risk data. | `/api/v1/data/energy/elexon` | JSON, no key. Use the [OpenAPI document](https://data.elexon.co.uk/swagger/v1/swagger.json) rather than scraping the portal. Attribution and use must follow the BMRS Data Licence and API Terms. |
| 7 | **CISA Known Exploited Vulnerabilities** — [official JSON](https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json) | Authoritative, frequently updated vulnerabilities confirmed as exploited in the wild. Adds cyber operational risk for companies, infrastructure, and governments. | `/api/v1/data/cyber/known-exploited` | Full JSON snapshot with a published schema and stable CVE IDs. Upsert by CVE and retain `dateAdded`, `dueDate`, ransomware status, and catalog version. |
| 8 | **NASA EONET v3** — [open events](https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=200) | Curated, near-real-time global wildfires, storms, volcanoes, floods, landslides, droughts, dust storms, and ice events with geometry and source links. | `/api/v1/data/disasters/eonet` | JSON body, no key, filters by category/source/status/days. Deduplicate overlap with GDACS using source IDs and time/geometry, not title alone. The service currently labels the default response `application/rss+xml` even though the body is JSON, so parse by content rather than trusting that header. |

## P1 — valuable after P0

| Source | Access | Why it is useful | Reason it follows P0 |
| --- | --- | --- | --- |
| [Federal Register API](https://www.federalregister.gov/api/v1/documents.json?per_page=20) | Direct / no auth / JSON | US rules, proposed rules, notices, agencies, topics, and publication dates; useful for regulatory-event calendars. | US-only and document classification is needed before it becomes a clean signal. |
| [NOAA Space Weather JSON](https://services.swpc.noaa.gov/json/planetary_k_index_1m.json) | Direct / no auth / JSON | Geomagnetic, solar-radiation, radio-blackout, aviation, satellite, power-grid, and communications risk. | Important but narrower than terrestrial hazards and economic data. |
| [geoBoundaries API](https://www.geoboundaries.org/api/current/gbOpen/USA/ADM1/) | Direct / no auth / JSON plus GeoJSON links | Open CC BY 4.0 administrative boundaries for map joins and subnational normalization. | Primarily platform enrichment rather than a new event or indicator stream. |
| [Copernicus EMS activation API](https://mapping.emergency.copernicus.eu/activations/api/activations/) | Direct / no auth / JSON | Emergency mapping activations, areas of interest, products, imagery metadata, and ArcGIS layers. | Some overlap with GDACS and EONET; best added after a shared hazard deduplication model exists. |
| [MeteoAlarm country feeds](https://feeds.meteoalarm.org/api/v1/warnings/feeds-germany) | Direct / no auth / CAP-structured JSON | Official severe-weather warnings from 30+ European meteorological services. | The richer OGC EDR interface requires a token; country feed discovery and cross-country normalization add work. |
| [USGS Water Data OGC API](https://api.waterdata.usgs.gov/ogcapi/v0/collections/daily/items?limit=1) | Direct at low volume; free key raises limits / GeoJSON | Continuous sensors, daily values, field measurements, and monitoring locations for drought, flood, and industrial water risk. | US-only and the OGC API is explicitly alpha, so it should not yet be a hard production dependency. |
| [OECD Data Explorer API](https://sdmx.oecd.org/public/rest/dataflow/all/all/latest?references=none) | Direct / no auth / SDMX | Leading indicators, national accounts, trade, productivity, tax, housing, and social statistics. | High overlap with World Bank, Eurostat, IMF, and ILO; curate only unique series. Current service guidance limits downloads. |
| [HDX CKAN API](https://data.humdata.org/api/3/action/package_search?rows=10) | Direct / no auth / JSON metadata | Discovery and download links for humanitarian datasets, including displacement, needs, infrastructure, and food security. | Resource schemas, update schedules, and licenses vary by publisher. Build per-resource adapters rather than treating HDX as one uniform dataset. |
| [Our World in Data Chart API](https://ourworldindata.org/grapher/death-rate-ambient-air-pollution.metadata.json?v=1) | Direct / no auth / CSV and JSON metadata | Easy access to well-documented derived indicators and source metadata. | It is an aggregator and may duplicate primary sources; licensing can differ by chart. Use only when no reliable primary API exists. |
| [ECB Data Portal SDMX API](https://data-api.ecb.europa.eu/service/data/EXR/D.USD.EUR.SP00.A?lastNObservations=3&format=csvdata) | Direct / no auth / SDMX and CSV | Monetary aggregates, banking, securities holdings, payments, and central-bank balance-sheet series beyond existing FX data. | This expands an existing upstream rather than adding a new source; coordinate it with the macro-series catalog. |

## P2 — not immediate

These sources are useful but fail at least one “free and directly accessible” preference.

| Source | Barrier | Reconsider when |
| --- | --- | --- |
| **Open-Meteo hosted API** | No key for the free endpoint, but hosted free use is non-commercial, attribution is required, and there is no uptime guarantee. | Commercial-use terms are approved, a paid plan is accepted, or FinUties self-hosts the AGPL service with a license review. |
| **OpenAQ v3** | Requires a registered API key; standard limits are 60 requests/minute and 2,000/hour. | Secret management and quota monitoring are available. |
| **NASA FIRMS** | Excellent near-real-time fire points, but requires a free `MAP_KEY` and has transaction limits. | A service key can be provisioned and rotation/quota handling is implemented. |
| **ReliefWeb API v2** | Since 2025-11-01, every client needs a pre-approved `appname`. | An application name has been approved and stored in configuration. |
| **ACLED** | Already a placeholder in the registry; access requires an account/token and compliance with ACLED licensing. | Credentials and permitted redistribution are confirmed. |
| **OpenSanctions** | Bulk files are open for non-commercial use, but commercial use requires a license; hosted matching/search is metered. | A commercial data license or hosted API budget is approved. |
| **Australian DFAT Consolidated List** | Official data is a changing XLSX asset linked from a landing page, not a stable documented API. | A lightweight asset-discovery job and XLSX schema-drift tests are accepted. |
| **UNCTAD maritime indicators** | Valuable liner-shipping connectivity data is exposed through an interactive data center and manual bulk exports, without a documented stable API. | UNCTAD publishes a stable bulk URL/API, or a permitted download workflow is confirmed. |
| **Canadian autonomous sanctions** | No single official consolidated CSV/XML list; records are spread across multiple regulations and schedules. | A legally reviewed multi-source parser and change-monitoring process is justified. |
| **Commercial AIS sites** | MarineTraffic, VesselFinder, and similar sites restrict automated access and offer paid APIs. | A licensed API is purchased. Do not scrape their sites. |

## Scraping and file-discovery queue

Scraping is a fallback, not the default. Prefer official APIs and stable files. Where an official page links a changing asset, scrape only to discover the current official download URL, then ingest the file directly.

| Priority | Target | Technique | Required safeguards |
| --- | --- | --- | --- |
| 1 | [Australian DFAT Consolidated List landing page](https://www.dfat.gov.au/international-relations/security/sanctions/consolidated-list) | Parse the official XLSX link, download it, and normalize rows. | Detect header changes, preserve primary/alias relationships, record source timestamp and checksum, and alert on a missing link. |
| 2 | UNCTAD liner-shipping connectivity bulk export | Prefer a stable bulk request discovered from the official data center; use browser automation only if terms permit and no direct request exists. | Pin indicator IDs, archive metadata, rate-limit requests, and stop on layout/schema changes rather than silently emitting partial data. |
| 3 | Canadian sanctions regulations | Monitor the official legislation XML index, identify sanctions regulations, and parse designation schedules. | Legal review, bilingual-name handling, amendment tracking, deterministic entity IDs, and strong regression fixtures are mandatory. |

Do not scrape a source merely to bypass authentication, payment, robots controls, rate limits, or license restrictions.

## Recommended delivery order

1. **Maritime and compliance:** IMF PortWatch, UK Sanctions List, and GLEIF.
2. **Macro and energy:** Eurostat, BIS, and Elexon.
3. **Operational risk:** CISA KEV and NASA EONET.
4. Add P1 feeds only after measuring duplication and defining category ownership.

For every new adapter:

- ingest upstream data server-side and expose the standard `{ source, count, items, cached }` envelope;
- keep raw upstream identifiers and provenance;
- use conditional requests, bounded pagination, caching, retries with jitter, and an explicit user agent;
- add freshness, row-count, parse-failure, and schema-drift monitoring;
- document upstream attribution and redistribution requirements;
- add the stable FinUties route to `source-registry.ts` only after the backend route returns production data; and
- mark a source unavailable instead of serving stale or partially parsed data without disclosure.

## Live verification record

On 2026-07-15, unauthenticated requests returned HTTP 200 for the P0 entry points above. HTTP 200 was also confirmed for the listed Federal Register, NOAA SWPC, geoBoundaries, Copernicus EMS, MeteoAlarm, USGS Water, OECD, HDX CKAN, OWID, and ECB examples. Endpoint availability is evidence of technical access, not blanket permission to redistribute the data.
