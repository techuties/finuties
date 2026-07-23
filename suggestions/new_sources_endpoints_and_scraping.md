# New sources, endpoints, and scraping candidates

Last reviewed: 2026-07-23 UTC

## Scope and ranking

This is an ingestion backlog for sources not already represented by the 51 entries in
`terminal/src/lib/source-registry.ts` or by the terminal's SEC, market, CFTC, BLS, BEA,
EIA, US Treasury, and New York Fed routes.

- **P0 — implement next:** high-value, credential-free, machine-readable, and verified live.
- **P1 — high value:** useful and generally free, but overlapping, changing, unusually complex,
  or requiring a terms/schema decision first.
- **P2 — investigate:** useful file feeds or scraping targets without a sufficiently stable
  machine contract.
- **P3 — not immediate:** gated, restrictive, duplicative, or too brittle for the current value.

HTTP 200 only proves anonymous technical access. Before production release, retain the source's
attribution and disclaimer, confirm redistribution rights, and add a source-specific rate policy.

## P0 — implement next

### 1. UK Sanctions List

- **Value:** the official UK designation source; complements existing US, EU, and UN sanctions.
- **Entry point:** `GET https://sanctionslist.fcdo.gov.uk/docs/UK-Sanctions-List.csv`
- **Docs:** https://www.gov.uk/guidance/format-guide-for-the-uk-sanctions-list
- **Access:** no authentication; static CSV, XML, ODS, ODT, TXT, HTML, and PDF URLs.
- **Implementation:** stream the roughly 49 MB CSV, checksum snapshots, preserve aliases and
  identifiers, and upsert by the list's stable unique ID. Do not use the retired OFSI list.
- **Terms/risk:** carry the UK source attribution and confirm the publication page's reuse terms.
  A successful empty or sharply smaller snapshot must not replace the last good snapshot.

### 2. GLEIF legal entities and ownership

- **Value:** global LEIs, normalized legal names, addresses, registration status, mapped
  identifiers, and parent-child relationships.
- **Entry point:** `GET https://api.gleif.org/api/v1/lei-records?page[size]=1`
- **Docs:** https://www.gleif.org/en/lei-data/gleif-api/
- **Access:** no authentication; JSON:API. LEI data is available under CC0.
- **Implementation:** use API filters for lookup features and GLEIF Golden Copy files for full
  synchronization. Store LEI status and relationship validity intervals, not only current names.
- **Risk:** no official fixed request quota is published; throttle and use bulk files at scale.

### 3. Eurostat dissemination API

- **Value:** harmonized EU inflation, labor, trade, industry, population, energy, and fiscal data.
- **Entry point:** `GET https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/tec00114?geo=EU27_2020&sinceTimePeriod=2024`
- **Docs:** https://ec.europa.eu/eurostat/web/user-guides/data-browser/api-data-access/api-introduction
- **Access:** no authentication; JSON-stat, SDMX, TSV, and bulk downloads.
- **Implementation:** begin with a curated dataset allowlist and ingest code lists with observations.
  Keep flags, units, seasonal adjustment, frequency, and geo-version dimensions.
- **Risk:** unconstrained multidimensional requests can be very large; prefer filtered or bulk pulls.

### 4. BIS Data Portal

- **Value:** central-bank policy rates, international banking, credit, debt securities,
  derivatives, property prices, and global liquidity.
- **Entry point:** `GET https://stats.bis.org/api/v2/data/dataflow/BIS/WS_CBPOL/1.0/?lastNObservations=1&format=csvfile`
- **Docs:** https://stats.bis.org/api-doc/v2/
- **Access:** no authentication; SDMX CSV, JSON, and XML.
- **Implementation:** ingest the dataflow and data-structure definitions before observations.
  Preserve all SDMX dimensions and use bulk downloads for broad history.
- **Terms/risk:** include BIS attribution and comply with
  https://www.bis.org/terms_statistics.htm. A malformed dimension key can return XML/HTML errors
  even when JSON was requested.

### 5. OFR Short-term Funding Monitor

- **Value:** US repo, money-market funds, Treasury yields, New York Fed reference rates, and
  primary-dealer series in one financial-stability source.
- **Entry point:** `GET https://data.financialresearch.gov/v1/series/timeseries?mnemonic=REPO-DVP_AR_G30-P`
- **Docs:** https://www.financialresearch.gov/short-term-funding-monitor/api/
- **Access:** no token or registration; JSON.
- **Implementation:** discover dataset and series mnemonics through `/v1/metadata/`, then perform
  daily incremental pulls. Preserve vintage/status metadata.
- **Risk:** the publisher says data update no more than daily; more frequent polling adds no value.

### 6. Bank of Canada Valet

- **Value:** Canadian FX, policy rates, bond yields, exchange-rate indices, and economic series.
- **Entry point:** `GET https://www.bankofcanada.ca/valet/observations/FXUSDCAD/json?recent=1`
- **Docs:** https://www.bankofcanada.ca/valet/docs
- **Access:** no authentication; JSON, CSV, and XML.
- **Implementation:** sync series/group metadata separately, then observations by date window.
  Retain decimal precision, frequency, and per-series labels.
- **Terms/risk:** carry Bank of Canada attribution and disclaimer; cache metadata and avoid polling
  faster than the series update frequency.

### 7. ENTSOG gas transparency

- **Value:** European gas flows, capacities, nominations, interruptions, balancing, and storage
  signals with point/operator geography.
- **Entry point:** `GET https://transparency.entsog.eu/api/v1/operationaldatas?limit=1`
- **Docs:** https://transparency.entsog.eu/api/archiveDirectories/8/api-manual/ENTSOG_TP_API_UserManual_v3.0.pdf
- **Access:** the v1 read endpoint is anonymously accessible; JSON/XML/CSV variants exist.
- **Implementation:** always bound date, operator, point direction, and indicator. Use cursor/page
  semantics where available and normalize gas-day timestamps to UTC.
- **Risk:** queries time out after 60 seconds. Use a conservative maximum of six calls/minute for
  anonymous v1 access, back off on 429, and re-check ENTSOG terms before redistribution.

### 8. California CEC MIDAS v2

- **Value:** retail electricity rates, greenhouse-gas signals, and California Flex Alerts for
  demand-response and grid-cost analysis.
- **Entry point:** `GET https://midasapi.energy.ca.gov/api/valuedata?SignalType=2`
- **Contract:** https://midasapi.energy.ca.gov/openapi.json
- **Access:** public GETs are unauthenticated as of MIDAS v2, released 2026-06-22.
- **Implementation:** first retrieve the RIN inventory, then query selected IDs with `QueryType`.
  Store all wire times as UTC and preserve interval boundaries.
- **Risk:** v2 changed response shapes and changed the GHG unit from `kg/kWh CO2` to
  `g/kWh CO2`; do not reuse v1 parsers or silently rescale values.

### 9. EU TED procurement notices

- **Value:** EU tender, award, buyer, supplier, CPV, value, deadline, and amendment data.
- **Entry point:** `POST https://api.ted.europa.eu/v3/notices/search`
- **Docs:** https://docs.ted.europa.eu/api/latest/search.html
- **Access:** published-notice search is anonymous; JSON request/response with XML bulk retrieval.
- **Minimal request:**

  ```json
  {
    "query": "buyer-country=DEU",
    "fields": ["publication-number", "notice-title", "buyer-country"],
    "limit": 1,
    "scope": "ACTIVE"
  }
  ```

- **Implementation:** use iteration pagination for large syncs, upsert publication number plus
  notice version, and retain raw multilingual fields.
- **Risk:** submission and unpublished-notice APIs require a key; only the published Search API is P0.

### 10. UK Find a Tender OCDS

- **Value:** UK planning, tender, and award notices already normalized to OCDS 1.1.5.
- **Entry point:** `GET https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages?limit=1`
- **Docs:** https://www.find-tender.service.gov.uk/Developer/Documentation
- **Access:** the publication GET returned anonymous OCDS JSON. The payload declares Open Government
  Licence v3; authenticated CDP/submission APIs are a separate concern.
- **Implementation:** increment by `updatedFrom`/`updatedTo`, follow the returned cursor, and upsert
  by `ocid` plus release ID. Keep extension fields and release tags.
- **Risk:** some generic API guidance discusses CDP keys. Add an anonymous-read probe so a future
  policy change fails visibly rather than dropping notices.

### 11. Elexon Insights Solution

- **Value:** near-real-time and historical GB electricity generation, demand, balancing,
  settlement, forecasts, and BM unit data.
- **Entry point:** `GET https://data.elexon.co.uk/bmrs/api/v1/generation/outturn/current`
- **Docs:** https://developer.data.elexon.co.uk/
- **Access:** all read APIs are public and require no key; JSON, CSV, and XML.
- **Implementation:** use `/datasets` endpoints for full-resolution ingestion and summary endpoints
  only for UI snapshots. Use settlement date and period as the natural key.
- **Risk:** obsolete and summary endpoints can disappear or be down-sampled; generate the client
  from the published OpenAPI contract and pin dataset IDs.

### 12. Energinet Energi Data Service

- **Value:** Danish and Nordic spot prices, generation, consumption, balancing, gas, and CO2 data.
- **Entry point:** `GET https://api.energidataservice.dk/dataset/Elspotprices?limit=1`
- **Docs:** https://www.energidataservice.dk/guides/api-guides
- **Access:** no authentication; JSON, CSV, and XLSX. Data is CC BY 4.0.
- **Implementation:** begin with Elspotprices and production/consumption datasets, preserve local
  and UTC timestamps, and credit `Energinet (www.energidataservice.dk)`.
- **Risk:** rate limits differ by dataset and can change. Poll at the documented update cadence and
  honor the 429 `Retry-After` value.

### 13. USAspending

- **Value:** US federal awards, contracts, grants, agencies, recipients, places, and spending trends.
- **Entry point:** `GET https://api.usaspending.gov/api/v2/references/toptier_agencies/`
- **Docs:** https://github.com/fedspendingtransparency/usaspending-api
- **Access:** no authentication; JSON GET discovery and POST search endpoints.
- **Implementation:** discover agencies from `toptier_agencies` and use bounded award-search POSTs.
  Partition by action date and agency, then upsert award IDs and transactions.
- **Risk:** `/api/v2/references/agency/` is stale and returns 404. Search responses can be expensive,
  so do not request unbounded fields or time ranges.

### 14. World Bank Projects & Operations

- **Value:** active, pipeline, and closed projects, commitments, sectors, themes, countries,
  approval dates, and project documents.
- **Entry point:** `GET https://search.worldbank.org/api/v3/projects?format=json&fl=id,project_name,countryname,status&rows=1`
- **Docs:** https://datahelpdesk.worldbank.org/knowledgebase/articles/889386-developer-information-overview
- **Access:** no authentication; bounded JSON/XML queries.
- **Implementation:** use an explicit field allowlist, page with `rows` and `os`, and upsert project
  ID. Keep financial amounts with currency and approval/fiscal dates.
- **Risk:** the search API is older and loosely documented. Contract-test selected fields and retain
  raw responses for parser recovery.

### 15. CISA Known Exploited Vulnerabilities

- **Value:** authoritative catalog of vulnerabilities confirmed exploited in the wild, with due
  dates and required actions.
- **Entry point:** `GET https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json`
- **Docs:** https://www.cisa.gov/known-exploited-vulnerabilities-catalog
- **Access:** no authentication; JSON and CSV.
- **Implementation:** checksum the full catalog daily, upsert by CVE, and retain `dateAdded`,
  `dueDate`, ransomware-use status, and required action.
- **Risk:** this is a current-state snapshot; create change history locally instead of overwriting it.

### 16. FIRST EPSS

- **Value:** daily exploit probability and percentile for CVEs; directly complements CISA KEV.
- **Entry point:** `GET https://api.first.org/data/v1/epss?cve=CVE-2021-44228`
- **Bulk:** `https://epss.empiricalsecurity.com/epss_scores-YYYY-MM-DD.csv.gz`
- **Docs:** https://www.first.org/epss/api
- **Access:** no authentication; free use with requested attribution.
- **Implementation:** use the compressed daily CSV for full syncs and the API only for targeted
  lookups. Natural key is CVE plus score date; retain model/version context when published.
- **Risk:** scores change daily and after model updates. Do not present EPSS as proof of exploitation.

### 17. NASA EONET v3

- **Value:** curated near-real-time wildfires, storms, volcanoes, floods, sea/lake ice, and other
  natural events with geometries and source links.
- **Entry point:** `GET https://eonet.gsfc.nasa.gov/api/v3/events?limit=1`
- **Docs:** https://eonet.gsfc.nasa.gov/docs/v3
- **Access:** no authentication on the EONET endpoint; JSON and GeoJSON.
- **Implementation:** poll open events, then reconcile closures by event ID. Store geometry
  timestamps because event shapes and positions evolve.
- **Risk:** the endpoint currently returns a JSON body with `application/rss+xml`; detect format
  from the body rather than trusting `Content-Type`.

## P1 — high value after P0

| Candidate | Representative endpoint or docs | Why it is not P0 |
|---|---|---|
| FDIC BankFind Suite | `https://api.fdic.gov/banks/institutions?limit=1&format=json` | Anonymous and live now, but the official site announces a September 8 API-key requirement. The retrieved notice does not state the year; resolve that transition before building a no-key adapter. |
| IMF PortWatch | `https://portwatch.imf.org/api/search/v1/catalog` | The anonymous OGC Records API is a catalog. The adapter must discover and pin the underlying ArcGIS feature services and confirm each dataset's reuse terms. |
| OECD Data Explorer | `https://sdmx.oecd.org/public/rest/v1/data/` | Excellent SDMX coverage, but substantial overlap with existing IMF/World Bank/ILO series. Select differentiated datasets before ingestion. |
| ECB Data Portal beyond FX | `https://data-api.ecb.europa.eu/service/data/` | Existing registry already has ECB FX. Add monetary aggregates, securities, rates, payments, or balance-sheet datasets only after a dataflow allowlist is chosen. |
| NASA POWER | `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M&community=RE&longitude=0&latitude=51.5&start=20260720&end=20260722&format=JSON` | No-key and live; high-dimensional point/region requests need caching and a clear use case to avoid duplicating ERA5. |
| Federal Register | `https://www.federalregister.gov/api/v1/documents.json?per_page=1&order=newest` | Strong regulatory-event feed, but normalized API text is informational; legal views must link to the official govinfo edition. |
| CFPB Consumer Complaint Database | `https://www.consumerfinance.gov/data-research/consumer-complaints/search/api/v1/?size=1` | Useful consumer-risk signal, but narratives can contain sensitive claims and the search response is unexpectedly large even with `size=1`; use the official bulk dataset after privacy review. |
| CPSC recalls | `https://www.saferproducts.gov/RestWebServices/Recall?format=json` | Useful supply-chain/product-risk events, but narrower financial relevance and unusual paging/filter behavior. |
| GB Carbon Intensity | `https://api.carbonintensity.org.uk/intensity` | Easy real-time grid signal, but overlaps with Elexon and is GB-only. Prefer it only if the forecasted intensity model is needed. |
| NOAA CO-OPS | `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=latest&station=9414290&product=water_level&datum=MLLW&time_zone=gmt&units=metric&format=json` | Strong port/flood signal, but requires station/product catalog design and datum-aware normalization. |
| NOAA Aviation Weather Center | `https://aviationweather.gov/api/data/metar?ids=KJFK&format=json` | Direct and live, but needs strict cache/request-window rules and airport geospatial joins. |
| eCFR | `https://www.ecfr.gov/api/versioner/v1/versions/title-12.json` | Valuable regulatory history, but full-title content is hierarchical and legal status/version semantics need dedicated modeling. |
| Fintraffic Digitraffic | `https://tie.digitraffic.fi/api/weather/v1/stations/data` | Good Finland transport telemetry; send `Digitraffic-User`, a descriptive user agent, and gzip, and cache large metadata responses. |
| Fraunhofer Energy-Charts | `https://api.energy-charts.info/` | Valuable European power data, but validate endpoint-specific licensing, schema stability, and overlap with ENTSOG/Elexon/Energinet first. |
| ClinicalTrials.gov v2 | `https://clinicaltrials.gov/api/v2/studies?pageSize=1` | High value for biotech/pharma research, but requires sponsor/entity resolution and careful interpretation of trial status. |
| OpenFEMA | `https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?$top=1` | No-key and stable, but US-only and partly overlaps GDACS/EM-DAT/EONET. Prioritize assistance and claims datasets, not another event list. |
| RTE eco2mix | `https://odre.opendatasoft.com/api/explore/v2.1/catalog/datasets/eco2mix-national-cons-def/records?limit=1` | Direct French power mix data; first confirm the Opendatasoft dataset identifier, license, and revision behavior as part of the contract. |
| CAISO OASIS | `https://oasis.caiso.com/oasisapi/SingleZip` | High-value California LMP, demand, and grid data, but responses are query-specific ZIP files and require DST-safe market-interval keys and source-terms review. |

The NASA POWER, Federal Register, CFPB, CPSC, GB Carbon Intensity, NOAA CO-OPS,
Aviation Weather, eCFR, ClinicalTrials.gov, OpenFEMA, RTE, and CAISO examples above
returned HTTP 200 without credentials on 2026-07-23.

## P2 — investigate or scrape carefully

| Candidate | Access path | Investigation needed |
|---|---|---|
| World Bank debarred firms | https://www.worldbank.org/en/projects-operations/procurement/debarred-firms | The historical `wp-content/cache/developer/json/v2/all.json` URL now serves the Operations Search HTML application, not JSON. Discover an official current file; scrape only if robots/terms allow it and add a DOM fixture. |
| CBO budget and economic projections | https://www.cbo.gov/data/budget-economic-data | Official structured XLSX/CSV files and RSS are useful, but release-file discovery and workbook schemas change. Use checksum-based file ingestion rather than page-table scraping. |
| ESMA registers and data files | https://www.esma.europa.eu/publications-and-data/databases-and-registers | High regulatory value, but each register has separate file formats, terms, and publication behavior. Choose one register and confirm a stable download URL first. |
| EBA risk dashboard and transparency data | https://www.eba.europa.eu/risk-and-data-analysis/risk-analysis/risk-monitoring/risk-dashboard | Valuable EU bank-risk files, but workbook and archive discovery need schema/version handling. |
| UK Department for Business and Trade statistics | https://www.gov.uk/government/organisations/department-for-business-and-trade/about/statistics | Select a stable official bulk/API product; do not scrape publication prose when CSV/ODS attachments are available. |
| AEMO NEMWeb | https://nemweb.com.au/ | Anonymous files are technically accessible, but AEMO says NEMWeb data is not intended for commercial use. Obtain a terms decision before implementation. |

Scraping rules:

1. Prefer an official API, RSS/Atom feed, static CSV/JSON/XML, or structured workbook.
2. Save the source URL, retrieval time, checksum, content type, and publisher timestamp.
3. Respect robots.txt, terms, caching headers, and a source-specific minimum interval.
4. Parse from retained raw snapshots so schema fixes do not require re-scraping.
5. Add a fixture and a canary for selector/column drift; never replace good data with an empty parse.

## P3 — not immediate

- **Key-required statistical APIs:** FRED, BEA, EIA, and the US Census International Trade API.
  They may still be free, but they do not meet the preferred zero-credential deployment path.
- **ENTSO-E Transparency Platform:** valuable electricity data, but production access requires a
  security token; first exploit the no-key regional sources in P0/P1.
- **ReliefWeb API:** since November 2025, use requires a pre-approved `appname`; GDACS, EONET,
  OpenFEMA, and existing disaster sources cover the immediate need.
- **Commercial or unofficial market-data aggregators:** do not ingest merely because an endpoint
  answers anonymously. Require explicit redistribution rights and a stable publisher contract.
- **HTML-only news and search-result pages:** too volatile and legally ambiguous while official
  feeds, filings, notices, and datasets remain available.
- **Duplicates of current coverage:** SEC EDGAR, US Treasury Fiscal Data, New York Fed Markets,
  BLS, USGS earthquakes, NOAA weather alerts, OFAC, CFTC, CoinGecko, and the existing World Bank
  indicator families are already represented in the repository and are not new-source work.

## Suggested delivery slices

1. **Compliance and entity identity:** UK Sanctions List + GLEIF.
2. **Financial stability and macro:** BIS + OFR + Bank of Canada + Eurostat.
3. **Power and gas:** Elexon + ENTSOG + MIDAS + Energinet.
4. **Procurement and public spending:** TED + Find a Tender + USAspending + World Bank Projects.
5. **Cyber and physical event risk:** CISA KEV + FIRST EPSS + NASA EONET.

For each adapter, expose source metadata, health, last successful observation/publisher time,
row counts, and parser failures before adding the source to the terminal registry.

## Verification record

These representative calls used a descriptive user agent, followed redirects, sent no credentials,
and downloaded the response body on 2026-07-23 UTC.

| Source | HTTP | Response type / observation |
|---|---:|---|
| UK Sanctions List | 200 | `application/octet-stream`; CSV snapshot, 49,267,453 bytes |
| GLEIF | 200 | `application/vnd.api+json` |
| Eurostat | 200 | `application/json` |
| BIS | 200 | `text/csv`; v2 dataflow query |
| OFR STFM | 200 | `application/json` |
| Bank of Canada Valet | 200 | `application/json` |
| ENTSOG | 200 | `application/json` |
| CEC MIDAS | 200 | `application/json`; public GHG query |
| EU TED | 200 | anonymous JSON POST search |
| Find a Tender | 200 | `application/json`; anonymous OCDS publication GET |
| Elexon | 200 | `application/json` |
| Energinet | 200 | `application/json` |
| USAspending | 200 | `application/json` |
| World Bank Projects | 200 | `application/json` |
| CISA KEV | 200 | `application/json` |
| FIRST EPSS | 200 | `application/json` |
| NASA EONET | 200 | JSON body mislabeled `application/rss+xml` |

Re-run these probes before implementation because anonymous-access and version policies can change.
