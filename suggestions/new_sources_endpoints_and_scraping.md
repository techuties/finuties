# New sources, endpoints, and scraping candidates

Last checked: **2026-07-22**

This is the implementation backlog for upstream data not already represented in the FinUties source registry. It ranks stable, free, directly machine-readable sources above feeds that require registration, licensing review, or scraping.

## Selection rules

Priority increases when a source is:

1. directly accessible without credentials;
2. published by the primary authority;
3. structured as JSON, CSV, GeoJSON, SDMX, or a documented REST service;
4. useful for financial, geopolitical, or operational-risk analysis; and
5. additive to the current catalog rather than another copy of existing data.

`Direct / no auth` means a live request succeeded without credentials on the date recorded below. It does not remove the need to comply with attribution, rate-limit, privacy, and redistribution terms.

## Existing coverage checked

The audit used `terminal/src/lib/source-registry.ts`, `terminal/src/lib/global-data-api.ts`, dashboard cards, explorer sections, and notebooks. The registry contains 51 sources across conflict, disasters, maritime, economy, environment, health, demographics, food, development, climate, biodiversity, and sanctions.

Do not duplicate the existing UCDP, GDELT, USGS earthquakes, GDACS, NOAA US alerts, EM-DAT, Global Fishing Watch, ECB FX, CoinGecko, IMF WEO, UN Comtrade, CFTC, EPA TRI, WHO, UN, World Bank, FAO, WFP, NASA climate, NOAA climate, Copernicus ERA5, GBIF, IUCN, OFAC, EU, or UN sanctions integrations.

### Finish exposing existing FinUties endpoints first

These routes are already consumed somewhere in the client but are absent from the global source registry. They are low-effort catalog work, not new upstream integrations.

| Existing endpoint | Action |
| --- | --- |
| `/api/v1/data/economic/energy` | Add an energy source/category entry or place it under economy. |
| `/api/v1/data/commodities/prices` | Add to the economy catalog with commodity and date filters. |
| `/api/v1/data/macro/series` | Expose the already-used macro series in the data catalog. |
| `/api/v1/data/economy/indicators` | Add the explorer's economic indicators to the source registry. |
| `/api/v1/data/economy/calendar` and `/api/v1/calendar/events` | Choose one canonical route and deprecate the duplicate path. |

## Added in this check

- **UK Find a Tender OCDS** and **World Bank Projects & Operations** are new P0 candidates: both returned bounded JSON without credentials and add procurement or development-finance data not present in the current registry.
- **OECD Data Explorer**, the broader **ECB Data Portal**, **NASA POWER**, and **CPSC recalls** are new P1 candidates. They are directly accessible but overlap existing macro/climate coverage or are narrower in scope.
- **AEMO NEMWeb** is documented under P2 despite anonymous file access because AEMO says the data is for information only and is not intended for commercial use.
- The World Bank debarment list is added to the scraping queue. Its official table remains valuable, but a previously used undocumented `all.json` URL now returns the Operations Search HTML application rather than JSON.

## P0 — high value, implement next

All P0 entry points returned HTTP 200 without credentials on 2026-07-22.

| Rank | Source and direct entry point | Coverage and value | Suggested FinUties route | Implementation notes |
| ---: | --- | --- | --- | --- |
| 1 | **IMF PortWatch** — [daily chokepoint query](https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/Daily_Chokepoints_Data/FeatureServer/0/query?where=1%3D1&outFields=date%2Cportid%2Cn_total&resultRecordCount=10&f=json) | Daily vessel transits, port calls, and trade-disruption indicators. This directly strengthens the current one-source maritime category. | `/api/v1/data/maritime/portwatch` | ArcGIS JSON; paginate with `resultOffset`, cache daily data, retain layer/object IDs, and confirm redistribution terms before mirroring full history. |
| 2 | **UK Sanctions List** — [official CSV](https://sanctionslist.fcdo.gov.uk/docs/UK-Sanctions-List.csv) | UK designations for people, entities, ships, and aircraft; the largest obvious gap beside the existing US, EU, and UN lists. | `/api/v1/data/governance/sanctions/uk` | Stream the large snapshot, preserve aliases/designation IDs, and skip unchanged files by checksum. The former OFSI consolidated list closed on 2026-01-28. |
| 3 | **GLEIF LEI API** — [LEI records](https://api.gleif.org/api/v1/lei-records?page%5Bsize%5D=10) | Global legal entities, registration status, BIC/ISIN mappings, and parent relationships. Strong fit with SEC, holdings, and sanctions entity resolution. | `/api/v1/data/entities/lei` | JSON:API with pagination and relationship links. Cache by LEI and retain raw names, addresses, and provenance. |
| 4 | **FDIC BankFind Suite** — [institutions API](https://banks.data.fdic.gov/api/institutions?limit=1) | US insured institutions, branches, quarterly financials, deposits, structural changes, and failures. | `/api/v1/data/banking/fdic` | A key is currently optional. Start with institutions and failures, use field allowlists, then join financials on the FDIC certificate number. |
| 5 | **Eurostat Statistics API** — [sample GDP query](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nama_10_gdp?format=JSON&lang=EN&geo=DE&time=2024&na_item=B1GQ&unit=CP_MEUR) | European macro, labor, prices, trade, population, energy, and regional statistics. | `/api/v1/data/economic/eurostat` | JSON-stat, CORS, no key. Use a curated indicator allowlist because unrestricted dataset queries can be very large. |
| 6 | **BIS Statistics API v2** — [dataflow discovery](https://stats.bis.org/api/v2/structure/dataflow/all/all/latest) | Cross-border banking, global liquidity, credit, debt securities, property prices, exchange rates, and policy rates. | `/api/v1/data/economic/bis` | SDMX REST. Discover dataflows first, implement explicit series sets, and retain dimension codes and units. |
| 7 | **OFR Short-term Funding Monitor** — [repo sample series](https://data.financialresearch.gov/v1/series/full?mnemonic=REPO-TRIV1_AR_OO-P) | US repo, money-market funds, primary-dealer activity, reference rates, and Treasury funding composition. | `/api/v1/data/economic/short-term-funding` | Maintain an explicit mnemonic allowlist and increment observations by date. |
| 8 | **Bank of Canada Valet API** — [USD/CAD sample](https://www.bankofcanada.ca/valet/observations/FXUSDCAD/json?recent=1) | Policy rates, bond markets, banking statistics, economic series, and staff projections. | `/api/v1/data/economic/bank-of-canada` | Start with Canada-only series not duplicated by ECB FX or existing macro routes; retain labels and units. |
| 9 | **ENTSOG Transparency Platform** — [sample physical-flow query](https://transparency.entsog.eu/api/v1/operationaldatas?indicator=Physical%20Flow&from=2026-07-20&to=2026-07-21&limit=1) | European gas nominations, allocations, physical flows, capacities, interruptions, gas quality, operators, and interconnection points. High-value energy-security and supply-disruption coverage. | `/api/v1/data/energy/european-gas-flows` | Public JSON/XML/CSV/XLSX API. Stay below six requests/minute, query bounded windows, use `pointDirection` and operator filters, and cache referential metadata. |
| 10 | **California CEC MIDAS v2** — [active signal list](https://midasapi.energy.ca.gov/api/valuedata?SignalType=0) | Time-varying electricity rates, California Flex Alerts, and 5-minute marginal GHG signals. Version 2 made public GETs credential-free on 2026-06-22. | `/api/v1/data/energy/california-grid-signals` | Use `ID` plus `QueryType` for 72-hour realtime or 90-day windows and `/api/historicaldata/{rate_id}` for older ranges. Values are UTC; GHG units are now `g/kWh CO2`. |
| 11 | **EU TED Search API** — [official documentation](https://docs.ted.europa.eu/api/latest/search.html) | EU procurement notices, buyers, suppliers, CPV sectors, values, deadlines, and awards. | `/api/v1/data/procurement/eu-ted` | Anonymous JSON POST to `/v3/notices/search`; use explicit fields and expert queries, paginate with iteration tokens, and separate awards from calls for tender. |
| 12 | **UK Find a Tender OCDS** — [recent release packages](https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages?limit=1&updatedFrom=2026-07-21T00%3A00%3A00) | UK procurement planning, tenders, awards, buyers, suppliers, CPV sectors, values, and contract periods. | `/api/v1/data/procurement/uk-tenders` | Public OCDS 1.1 JSON under OGL v3. Increment with `updatedFrom`/`updatedTo`, follow cursor links, and preserve `ocid`, release IDs, stages, and party IDs. Authentication documented for submission APIs is not required by this publication endpoint. |
| 13 | **Elexon Insights** — [current generation by fuel](https://data.elexon.co.uk/bmrs/api/v1/generation/outturn/current) | Great Britain generation, demand, imbalance prices, outages, forecasts, and REMIT events. | `/api/v1/data/energy/elexon` | Use the OpenAPI contract rather than scraping the portal; follow the BMRS Data Licence and API Terms. |
| 14 | **USAspending.gov** — [current agency reference](https://api.usaspending.gov/api/v2/references/toptier_agencies/) | US federal contracts, grants, loans, recipients, agencies, places of performance, and transaction history. | `/api/v1/data/procurement/us-awards` | Advanced award search uses structured POST requests. Increment by action date, preserve award/recipient IDs, and distinguish obligations from potential award values. |
| 15 | **World Bank Projects & Operations** — [bounded projects query](https://search.worldbank.org/api/v2/projects?format=json&rows=1&fl=id%2Cproject_name%2Ccountryname%2Cstatus%2Ctotalamt%2Cboardapprovaldate) | Public records for active, pipeline, and closed World Bank lending projects from 1947 onward, including countries, sectors, commitments, status, and document links. | `/api/v1/data/development/projects` | Use an explicit field list and bounded `rows`/`os` pagination; upsert by project ID and retain commitment currency, approval dates, status, and links to contracts and documents. |
| 16 | **CISA Known Exploited Vulnerabilities** — [official JSON](https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json) | Authoritative vulnerabilities confirmed as exploited in the wild. | `/api/v1/data/cyber/known-exploited` | Upsert the full snapshot by CVE and retain `dateAdded`, `dueDate`, ransomware status, and catalog version. |
| 17 | **FIRST EPSS** — [public API](https://api.first.org/data/v1/epss?limit=1) | Daily 30-day exploitation probabilities and percentiles for CVEs. It prioritizes the broader vulnerability universe around CISA KEV. | `/api/v1/data/cyber/exploit-probability` | The API needs no authentication and allows 1,000 requests/minute, but is marked beta. Prefer the daily compressed CSV for full syncs; use the API for CVE batches and recent time series. |
| 18 | **NASA EONET v3** — [open events](https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=200) | Near-real-time global wildfires, storms, volcanoes, floods, landslides, droughts, dust storms, and ice events with geometry. | `/api/v1/data/disasters/eonet` | Deduplicate overlap with GDACS by source ID and time/geometry. The endpoint currently labels its JSON body as `application/rss+xml`, so parse by content. |

## P1 — valuable after P0

These sources are directly accessible but are narrower, overlapping, region-specific, or require more curation than P0.

| Source | Access | Why it is useful | Reason it follows P0 |
| --- | --- | --- | --- |
| [OECD Data Explorer SDMX API](https://sdmx.oecd.org/public/rest/v1/dataflow/all/all/latest?detail=allstubs) | Direct / no auth / SDMX-XML, SDMX-JSON, and CSV | Cross-country prices, national accounts, labor, productivity, trade, taxation, environment, and social indicators. | It substantially overlaps IMF, World Bank, Eurostat, BIS, and existing macro routes. Start only with OECD-specific series and never request the full 1+ MB dataflow catalog per user query. |
| [ECB Data Portal SDMX API](https://data-api.ecb.europa.eu/service/data/EXR/M.USD.EUR.SP00.A?startPeriod=2026-01&endPeriod=2026-01&format=csvdata) | Direct / no auth / SDMX and CSV | Euro-area banking, monetary aggregates, payments, securities, rates, balance sheets, and supervisory statistics. | ECB FX is already integrated and much macro coverage overlaps BIS and Eurostat; extend the existing ECB adapter with curated non-FX flows instead of adding a duplicate source. |
| [NASA POWER daily API](https://power.larc.nasa.gov/api/temporal/daily/point?start=20260701&end=20260702&latitude=37&longitude=-76&community=RE&parameters=T2M&format=JSON) | Direct / no auth / JSON, CSV, NetCDF, and ASCII | Analysis-ready global solar, temperature, precipitation, wind, and meteorological time series for energy, agriculture, and physical-risk models. | Point and regional requests require spatial/date curation and overlap ERA5 and existing NASA climate data. Limit concurrency to five and cache repeated coordinates. |
| [US CPSC recalls](https://www.saferproducts.gov/RestWebServices/Recall?format=json&RecallID=1) | Direct / no auth / JSON, XML, and delimited exports | Product recalls with companies, hazards, injuries, remedies, retailers, countries of manufacture, UPCs, and images. | US-only and narrower than the immediate finance/geopolitics backlog; use recall ID/date filters because an unbounded request is tens of megabytes. |
| [GB Carbon Intensity](https://api.carbonintensity.org.uk/intensity) | Direct / no auth / JSON and XML / CC BY 4.0 | Current and forecast national/regional carbon intensity plus generation mix. | It overlaps Elexon and is Great Britain-only, but offers a much simpler emissions signal. |
| [NOAA CO-OPS](https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=latest&station=9414290&product=water_level&datum=MLLW&units=metric&time_zone=gmt&format=json&application=FinUties) | Direct / no auth / JSON, CSV, XML | Coastal and Great Lakes water levels, currents, tides, winds, visibility, and flood-level metadata. | US-only and station metadata must be joined before observations become map-ready. |
| [NOAA Aviation Weather Center](https://aviationweather.gov/api/data/metar?ids=KMCI&format=json) | Direct / no auth / JSON, GeoJSON, CSV, XML | Worldwide METARs, TAFs, SIGMETs, pilot reports, airports, and navigation features. | Operationally valuable but domain-specific. Use minute-updated cache files for full datasets and keep API traffic below 100 requests/minute. |
| [eCFR API](https://www.ecfr.gov/api/versioner/v1/titles.json) | Direct API / no auth / JSON and XML | Current and historical US regulatory structure and full text by title/date. | Regulations are document-heavy and need change extraction and entity/topic classification. The web documentation may show anti-bot challenges even when API routes remain available. |
| [UK Department for Business and Trade Data API](https://data.api.trade.gov.uk/v1/datasets?format=json) | Direct / no auth / JSON and bulk files | UK tariffs, quotas, market barriers, export controls, regulations, and contract opportunities. | Large assets and overlap with Comtrade, sanctions, and procurement require dataset-level selection. |
| [Fintraffic Digitraffic maritime](https://www.digitraffic.fi/en/marine-traffic/) | Direct / no auth / REST and MQTT | Finnish AIS positions, vessels, port calls, winter navigation, sea state, and navigation faults. | Regional overlap with Global Fishing Watch. Identify the application and cache large metadata responses. |
| [Fraunhofer Energy-Charts](https://api.energy-charts.info/) | Direct / no auth / JSON; mostly CC BY 4.0 | European electricity generation, load, prices, cross-border flows, and capacity. | Source-market coverage varies and overlaps Elexon; add after defining a common energy schema. |
| [ClinicalTrials.gov API v2](https://clinicaltrials.gov/api/v2/studies?pageSize=1&format=json) | Direct / no auth / JSON | Trial sponsors, interventions, phases, status, locations, dates, and results. | Deeply nested records and sponsor/entity matching need careful normalization. |
| [OpenFEMA](https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?$top=1) | Direct / no auth / JSON and CSV | US declarations, assistance, insurance, mitigation, and grants. | Its additive value is financial loss/assistance context, not another global event feed. |
| [US Treasury Fiscal Data](https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/dts/operating_cash_balance?sort=-record_date&page%5Bsize%5D=1) | Direct / no auth / JSON, CSV, XML | Daily Treasury cash, receipts, outlays, debt, and interest costs. | Existing cards already expose Treasury yields and debt; ingest only net-new fiscal-flow tables. |
| [Federal Register API](https://www.federalregister.gov/api/v1/documents.json?per_page=20) | Direct / no auth / JSON | US rules, proposed rules, notices, agencies, topics, and publication dates. | Document classification is needed before it becomes a useful event signal. |
| [NIST NVD CVE API 2.0](https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=1) | Direct anonymously / JSON; low anonymous limit | Full CVE records, CVSS metrics, weaknesses, affected configurations, and references. | Much larger and noisier than KEV plus EPSS; requires modified-date incremental sync. |
| [openFDA enforcement reports](https://api.fda.gov/drug/enforcement.json?limit=1) | Direct anonymously / JSON; 1,000 requests/day/IP | Drug, device, and food recall/enforcement signals. | US-only; a free key is recommended for production volume. |
| [NOAA Space Weather JSON](https://services.swpc.noaa.gov/json/planetary_k_index_1m.json) | Direct / no auth / JSON | Geomagnetic, solar-radiation, aviation, satellite, grid, and communications risk. | Important but narrower than terrestrial hazards and economic data. |
| [USGS Water Data OGC API](https://api.waterdata.usgs.gov/ogcapi/v0/collections/daily/items?limit=1) | Direct at low volume / GeoJSON; free key raises limits | Sensors, daily values, field measurements, and locations for drought, flood, and water risk. | US-only and the OGC API is explicitly alpha. |
| [HDX CKAN API](https://data.humdata.org/api/3/action/package_search?rows=10) | Direct / no auth / JSON metadata | Discovery links for displacement, needs, infrastructure, and food-security datasets. | Resource schemas, schedules, and licenses vary; build per-resource adapters. |

## P2 — not immediate

These sources are useful but fail at least one “free and directly accessible” preference.

| Source | Barrier | Reconsider when |
| --- | --- | --- |
| **IATI Datastore v3** | Global development and humanitarian transactions are valuable, but every API request requires a free developer-portal subscription key in `Ocp-Apim-Subscription-Key`. | Secret management exists and a bounded activity/transaction model is defined. |
| **FRED API** | Free, but every request requires a registered key and much content overlaps primary sources. | A curated set of FRED-only series and service-key handling exist. |
| **US EIA API v2** | Free API key registration is mandatory; public bulk files are large. | A service key and quota monitoring are available, or a narrow bulk adapter is justified. |
| **Global Forest Watch Data API** | Queries require an account plus API key or access token. | Credentials and redistribution terms are confirmed. |
| **UK Companies House API** | Free company data, but every request requires an application key via HTTP Basic authentication. | Key/quota handling and company-to-LEI/SEC matching are ready. |
| **Open-Meteo hosted API** | The no-key hosted free endpoint is non-commercial, requires attribution, and has no uptime guarantee. | Commercial terms are approved or the AGPL service is self-hosted after license review. |
| **OpenAQ v3** | Requires a registered API key. | Secret management and quota monitoring are available. |
| **NASA FIRMS** | Near-real-time fire points require a free `MAP_KEY` and have transaction limits. | A service key and quota handling can be provisioned. |
| **ReliefWeb API v2** | Since 2025-11-01, every client needs a pre-approved `appname`. | An application name has been approved and configured. |
| **ACLED** | Already a placeholder; access requires an account/token and license compliance. | Credentials and permitted redistribution are confirmed. |
| **OpenSanctions** | Bulk files are non-commercial; commercial use and hosted matching require payment. | A commercial data license or hosted API budget is approved. |
| **AEMO NEMWeb** | Current and archived Australian National Electricity Market CSV/ZIP files are anonymously accessible, but AEMO states the data is for information only and is not intended for commercial use. The 2026 platform migration also made HTTPS and URL case exactness mandatory. | Legal approves the intended use and an adapter can handle directory discovery, case-sensitive file names, rolling current windows, and monthly archives. |
| **US Census International Trade API** | Detailed monthly US import/export data is high value, but all API queries now require a registered key and overlap UN Comtrade. | A service key is available and a narrow, timelier US trade slice justifies the duplicate coverage. |
| **Commercial AIS sites** | MarineTraffic, VesselFinder, and peers restrict automated access and sell APIs. | A licensed API is purchased; do not scrape these sites. |

## Scraping and file-discovery queue

Scraping is a fallback. When an official page links a changing asset, scrape only to discover the current official download URL, then fetch the asset directly.

| Priority | Target | Technique | Required safeguards |
| --- | --- | --- | --- |
| 1 | [Australian DFAT Consolidated List](https://www.dfat.gov.au/international-relations/security/sanctions/consolidated-list) | Discover the official XLSX link and normalize the downloaded rows. | Detect header changes, preserve aliases, record timestamp/checksum, and alert on a missing link. |
| 2 | [World Bank debarred firms and individuals](https://www.worldbank.org/en/projects-operations/procurement/debarred-firms) | Parse the official table or discover a documented export; do not depend on the old undocumented `wp-content/cache/developer/json/v2/all.json` path, which now serves HTML. | Preserve names, addresses, countries, grounds, ineligibility dates, and cross-debarment notes; use deterministic IDs and schema-change fixtures. |
| 3 | UNCTAD liner-shipping connectivity export | Prefer a stable bulk request discovered from the official data center. | Pin indicator IDs, archive metadata, rate-limit, and stop on schema/layout changes. |
| 4 | Canadian sanctions regulations | Monitor official legislation XML and parse designation schedules. | Require legal review, bilingual names, amendment tracking, deterministic IDs, and regression fixtures. |

Do not scrape to bypass authentication, payment, robots controls, rate limits, or license restrictions.

## Recommended delivery order

1. **Maritime and compliance:** IMF PortWatch, UK Sanctions List, and GLEIF.
2. **Banking and funding risk:** FDIC, OFR, Bank of Canada, and BIS.
3. **Energy security:** ENTSOG, MIDAS, and Elexon.
4. **Macro, procurement, and development finance:** Eurostat, EU TED, Find a Tender, USAspending, and World Bank Projects.
5. **Operational risk:** CISA KEV, FIRST EPSS, and NASA EONET.
6. Add P1 feeds only after measuring overlap and defining category ownership.

For every new adapter:

- ingest upstream data server-side and expose `{ source, count, items, cached }`;
- keep raw upstream identifiers, units, and provenance;
- use bounded pagination, caching, conditional requests, retries with jitter, and an explicit user agent;
- add freshness, row-count, parse-failure, and schema-drift monitoring;
- document attribution and redistribution requirements;
- add the stable route to `source-registry.ts` only after the backend returns production data; and
- mark a source unavailable instead of silently serving stale or partial data.

## Live verification record

On 2026-07-22, unauthenticated requests returned HTTP 200 for all 18 P0 entry points. EU TED was verified with an anonymous JSON POST. Find a Tender returned an OCDS 1.1 release package with an OGL v3 license link, and World Bank Projects returned a bounded JSON project set. The new OECD, ECB, NASA POWER, and CPSC P1 examples also returned HTTP 200; the CPSC query returned one structured JSON recall when filtered by `RecallID`.

The AEMO NEMWeb report directory also returned HTTP 200 anonymously, but it remains P2 because of the stated use restriction. The historical World Bank debarment `all.json` path returned HTTP 200 with `text/html` and the Operations Search application, so it is not a working JSON API. NASA EONET still returned JSON with an incorrect `application/rss+xml` content type.

Endpoint availability is evidence of technical access, not blanket permission to redistribute the data.
