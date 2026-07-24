# New sources, endpoints, and scraping candidates

Last reviewed: 2026-07-24 UTC

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

**New in this review (2026-07-24):** Canada SEMA sanctions, Bank of England IADB CSV, RBA
exchange-rate CSV, Norges Bank, Sveriges Riksbank, Swiss National Bank, BCB PTAX, Chicago Fed
NFCI, Statistics Canada WDS, OpenFIGI, SAM.gov opportunities, and Elia Open Data. All prior P0
entry points were re-verified live without credentials.

## P0 — implement next

### 1. Canada SEMA consolidated sanctions *(new)*

- **Value:** official Canadian designations; fills the remaining G7-style gap beside existing US,
  EU, UN, and proposed UK sanctions coverage.
- **Entry point:** `GET https://www.international.gc.ca/world-monde/assets/office_docs/international_relations-relations_internationales/sanctions/sema-lmes.xml`
- **Docs / page:** https://www.international.gc.ca/world-monde/international-relations-relations-internationales/sanctions/index.aspx?lang=eng
- **Access:** no authentication; static XML snapshot (~1.85 MB on probe).
- **Implementation:** stream and checksum the XML, upsert by stable record identifiers, preserve
  aliases and country/regime fields, and skip unchanged snapshots.
- **Terms/risk:** carry Global Affairs Canada attribution and confirm reuse terms on the
  publication page. Do not replace a last-good snapshot with an empty parse.

### 2. UK Sanctions List

- **Value:** the official UK designation source; complements existing US, EU, and UN sanctions.
- **Entry point:** `GET https://sanctionslist.fcdo.gov.uk/docs/UK-Sanctions-List.csv`
- **Docs:** https://www.gov.uk/guidance/format-guide-for-the-uk-sanctions-list
- **Access:** no authentication; static CSV, XML, ODS, ODT, TXT, HTML, and PDF URLs.
- **Implementation:** stream the roughly 49 MB CSV, checksum snapshots, preserve aliases and
  identifiers, and upsert by the list's stable unique ID. Do not use the retired OFSI list.
- **Terms/risk:** carry the UK source attribution and confirm the publication page's reuse terms.
  A successful empty or sharply smaller snapshot must not replace the last good snapshot.

### 3. GLEIF legal entities and ownership

- **Value:** global LEIs, normalized legal names, addresses, registration status, mapped
  identifiers, and parent-child relationships.
- **Entry point:** `GET https://api.gleif.org/api/v1/lei-records?page[size]=1`
- **Docs:** https://www.gleif.org/en/lei-data/gleif-api/
- **Access:** no authentication; JSON:API. LEI data is available under CC0.
- **Implementation:** use API filters for lookup features and GLEIF Golden Copy files for full
  synchronization. Store LEI status and relationship validity intervals, not only current names.
- **Risk:** no official fixed request quota is published; throttle and use bulk files at scale.

### 4. OpenFIGI identifier mapping *(new)*

- **Value:** map tickers, CUSIPs, ISINs, and other market IDs to FIGI; pairs cleanly with GLEIF
  for entity and instrument resolution.
- **Entry point:** `POST https://api.openfigi.com/v3/mapping` with JSON body
  `[{"idType":"TICKER","idValue":"AAPL","exchCode":"US"}]`
- **Docs:** https://www.openfigi.com/api
- **Access:** anonymous mapping works without a key at a low request rate; a free key raises
  limits.
- **Implementation:** cache positive and negative mappings, batch requests, and store FIGI,
  composite FIGI, share class FIGI, and security type.
- **Risk:** anonymous throughput is limited. Prefer keyed access only if production QPS needs it;
  do not treat OpenFIGI as a full securities master.

### 5. Eurostat dissemination API

- **Value:** harmonized EU inflation, labor, trade, industry, population, energy, and fiscal data.
- **Entry point:** `GET https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/tec00114?geo=EU27_2020&sinceTimePeriod=2024`
- **Docs:** https://ec.europa.eu/eurostat/web/user-guides/data-browser/api-data-access/api-introduction
- **Access:** no authentication; JSON-stat, SDMX, TSV, and bulk downloads.
- **Implementation:** begin with a curated dataset allowlist and ingest code lists with observations.
  Keep flags, units, seasonal adjustment, frequency, and geo-version dimensions.
- **Risk:** unconstrained multidimensional requests can be very large; prefer filtered or bulk pulls.

### 6. BIS Data Portal

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

### 7. OFR Short-term Funding Monitor

- **Value:** US repo, money-market funds, Treasury yields, New York Fed reference rates, and
  primary-dealer series in one financial-stability source.
- **Entry point:** `GET https://data.financialresearch.gov/v1/series/timeseries?mnemonic=REPO-DVP_AR_G30-P`
- **Docs:** https://www.financialresearch.gov/short-term-funding-monitor/api/
- **Access:** no token or registration; JSON.
- **Implementation:** discover dataset and series mnemonics through `/v1/metadata/`, then perform
  daily incremental pulls. Preserve vintage/status metadata.
- **Risk:** the publisher says data update no more than daily; more frequent polling adds no value.

### 8. Chicago Fed National Financial Conditions Index *(new)*

- **Value:** weekly NFCI / ANFCI and risk, credit, and leverage sub-indices; a compact systemic
  stress signal that complements OFR and New York Fed rates.
- **Entry point:** `GET https://www.chicagofed.org/-/media/publications/nfci/nfci-data-series-csv.csv`
- **Docs:** https://www.chicagofed.org/research/data/nfci/current-data
- **Access:** no authentication; static CSV (~148 KB).
- **Implementation:** checksum the CSV on the Fed's weekly publication cadence, parse
  `Friday_of_Week` as the observation date, and store all published columns.
- **Risk:** the media path can move. Keep a canary on URL and header drift; do not scrape the HTML
  article when the CSV is available.

### 9. Bank of Canada Valet

- **Value:** Canadian FX, policy rates, bond yields, exchange-rate indices, and economic series.
- **Entry point:** `GET https://www.bankofcanada.ca/valet/observations/FXUSDCAD/json?recent=1`
- **Docs:** https://www.bankofcanada.ca/valet/docs
- **Access:** no authentication; JSON, CSV, and XML.
- **Implementation:** sync series/group metadata separately, then observations by date window.
  Retain decimal precision, frequency, and per-series labels.
- **Terms/risk:** carry Bank of Canada attribution and disclaimer; cache metadata and avoid polling
  faster than the series update frequency.

### 10. Bank of England Statistical Database (IADB) *(new)*

- **Value:** UK Bank Rate, SONIA, gilt yields, money and credit, and FX series via official CSV
  export.
- **Entry point:**
  `GET https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp?csv.x=yes&Datefrom=01/Jul/2026&Dateto=now&SeriesCodes=IUDBEDR&CSVF=TN&UsingCodes=Y&VPD=Y`
- **Docs:** https://www.bankofengland.co.uk/boeapps/database/Help.asp
- **Access:** no authentication; CSV. Up to about 300 series codes per request.
- **Implementation:** maintain a curated series-code allowlist, use `CSVF=TN` or columnar formats,
  and treat HTML bodies returned with HTTP 200 as hard failures.
- **Risk:** dates use `DD/Mon/YYYY`. Prefer the documented `_iadb-fromshowcolumns.asp` path and pin
  series codes rather than scraping the browse UI.

### 11. Reserve Bank of Australia exchange rates *(new)*

- **Value:** AUD cross rates and the trade-weighted index from an official static CSV.
- **Entry point:** `GET https://www.rba.gov.au/statistics/tables/csv/f11.1-data.csv`
- **Docs:** https://www.rba.gov.au/statistics/tables/
- **Access:** no authentication; CSV (~133 KB on probe).
- **Implementation:** parse the F11.1 workbook-style CSV, preserve column titles, and update on the
  RBA business-day cadence.
- **Risk:** table codes and CSV layouts can change with statistical releases. Checksum and header
  canaries are required.

### 12. Norges Bank data API *(new)*

- **Value:** Norwegian FX and related SDMX series; extends FX coverage beyond ECB/BoC.
- **Entry point:** `GET https://data.norges-bank.no/api/data/EXR/B.USD.NOK.SP?format=sdmx-json&lastNObservations=1&locale=en`
- **Docs:** https://data.norges-bank.no/
- **Access:** no authentication; SDMX-JSON.
- **Implementation:** discover dataflows first, then pull bounded observation windows. Preserve
  dimensions and units.
- **Risk:** SDMX keys are brittle; validate structure definitions before observations.

### 13. Sveriges Riksbank SWEA API *(new)*

- **Value:** Swedish policy rate, FX, and market series with a simple JSON observations API.
- **Entry point:** `GET https://api.riksbank.se/swea/v1/Observations/SEKUSDPMI/2026-07-20`
- **Series catalog:** `GET https://api.riksbank.se/swea/v1/Series`
- **Docs:** https://www.riksbank.se/en-gb/statistics/open-data-and-api/
- **Access:** no authentication; JSON.
- **Implementation:** sync the series catalog, then incremental observations by series ID and date.
- **Risk:** confirm attribution/disclaimer text and cache the series list; do not poll idle series
  more often than they update.

### 14. Swiss National Bank data portal *(new)*

- **Value:** Swiss FX, interest-rate, and macroeconomic cubes in JSON.
- **Entry point:** `GET https://data.snb.ch/api/cube/devkua/data/json/en`
- **Docs:** https://data.snb.ch/
- **Access:** no authentication; JSON cubes.
- **Implementation:** start with FX and interest-rate cubes, store cube/version metadata, and
  preserve dimension items and scales.
- **Risk:** cube identifiers are opaque. Maintain an allowlist and detect empty/partial cubes.

### 15. Banco Central do Brasil PTAX *(new)*

- **Value:** official Brazilian USD PTAX reference rates; high-value EM FX print.
- **Entry point:**
  `GET https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?@dataInicial='07-20-2026'&@dataFinalCotacao='07-23-2026'&$format=json`
- **Docs:** https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/aplicacao#!/recursos
- **Access:** no authentication; OData JSON.
- **Implementation:** pull buy/sell/PTAX quotes by date window and upsert by quotation date plus
  rate type. Dates in the path use `MM-DD-YYYY`.
- **Risk:** weekends/holidays return empty `value` arrays; that is normal and must not clear
  history.

### 16. Statistics Canada Web Data Service *(new)*

- **Value:** Canadian CPI, labour, GDP, and trade vectors as JSON; pairs with Bank of Canada Valet.
- **Entry point:**
  `POST https://www150.statcan.gc.ca/t1/wds/rest/getDataFromVectorsAndLatestNPeriods`
  with body `[{"vectorId":3561201,"latestN":1}]`
- **Docs:** https://www.statcan.gc.ca/en/developers/wds
- **Access:** no authentication; JSON.
- **Implementation:** maintain a vector-ID allowlist, ingest metadata separately, and preserve
  reference periods, scalars, and status codes.
- **Risk:** vector IDs are stable but opaque. Fail closed when `status` is not `SUCCESS`.

### 17. ENTSOG gas transparency

- **Value:** European gas flows, capacities, nominations, interruptions, balancing, and storage
  signals with point/operator geography.
- **Entry point:** `GET https://transparency.entsog.eu/api/v1/operationaldatas?limit=1`
- **Docs:** https://transparency.entsog.eu/api/archiveDirectories/8/api-manual/ENTSOG_TP_API_UserManual_v3.0.pdf
- **Access:** the v1 read endpoint is anonymously accessible; JSON/XML/CSV variants exist.
- **Implementation:** always bound date, operator, point direction, and indicator. Use cursor/page
  semantics where available and normalize gas-day timestamps to UTC.
- **Risk:** queries time out after 60 seconds. Use a conservative maximum of six calls/minute for
  anonymous v1 access, back off on 429, and re-check ENTSOG terms before redistribution.

### 18. California CEC MIDAS v2

- **Value:** retail electricity rates, greenhouse-gas signals, and California Flex Alerts for
  demand-response and grid-cost analysis.
- **Entry point:** `GET https://midasapi.energy.ca.gov/api/valuedata?SignalType=2`
- **Contract:** https://midasapi.energy.ca.gov/openapi.json
- **Access:** public GETs are unauthenticated as of MIDAS v2, released 2026-06-22.
- **Implementation:** first retrieve the RIN inventory, then query selected IDs with `QueryType`.
  Store all wire times as UTC and preserve interval boundaries.
- **Risk:** v2 changed response shapes and changed the GHG unit from `kg/kWh CO2` to
  `g/kWh CO2`; do not reuse v1 parsers or silently rescale values.

### 19. EU TED procurement notices

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

### 20. UK Find a Tender OCDS

- **Value:** UK planning, tender, and award notices already normalized to OCDS 1.1.5.
- **Entry point:** `GET https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages?limit=1`
- **Docs:** https://www.find-tender.service.gov.uk/Developer/Documentation
- **Access:** the publication GET returned anonymous OCDS JSON. The payload declares Open Government
  Licence v3; authenticated CDP/submission APIs are a separate concern.
- **Implementation:** increment by `updatedFrom`/`updatedTo`, follow the returned cursor, and upsert
  by `ocid` plus release ID. Keep extension fields and release tags.
- **Risk:** some generic API guidance discusses CDP keys. Add an anonymous-read probe so a future
  policy change fails visibly rather than dropping notices.

### 21. SAM.gov opportunities *(new)*

- **Value:** US federal solicitation and opportunity metadata; complements USAspending awards with
  forward-looking procurement signal.
- **Entry point:** `GET https://sam.gov/api/prod/sgs/v1/search/?index=opp&page=0&sort=-modifiedDate&size=1&mode=search`
- **Docs:** https://open.gsa.gov/api/get-opportunities-public-api/
- **Access:** anonymous search returned HAL+JSON on probe.
- **Implementation:** page by modified date, upsert opportunity ID, and retain status, NAICS, set-
  aside, and response deadlines.
- **Risk:** SAM surface area is broad and versioned. Pin the public search contract and confirm
  current GSA terms before bulk historical backfill. Prefer opportunity search first; entity
  extraction APIs may differ.

### 22. Elexon Insights Solution

- **Value:** near-real-time and historical GB electricity generation, demand, balancing,
  settlement, forecasts, and BM unit data.
- **Entry point:** `GET https://data.elexon.co.uk/bmrs/api/v1/generation/outturn/current`
- **Docs:** https://developer.data.elexon.co.uk/
- **Access:** all read APIs are public and require no key; JSON, CSV, and XML.
- **Implementation:** use `/datasets` endpoints for full-resolution ingestion and summary endpoints
  only for UI snapshots. Use settlement date and period as the natural key.
- **Risk:** obsolete and summary endpoints can disappear or be down-sampled; generate the client
  from the published OpenAPI contract and pin dataset IDs.

### 23. Energinet Energi Data Service

- **Value:** Danish and Nordic spot prices, generation, consumption, balancing, gas, and CO2 data.
- **Entry point:** `GET https://api.energidataservice.dk/dataset/Elspotprices?limit=1`
- **Docs:** https://www.energidataservice.dk/guides/api-guides
- **Access:** no authentication; JSON, CSV, and XLSX. Data is CC BY 4.0.
- **Implementation:** begin with Elspotprices and production/consumption datasets, preserve local
  and UTC timestamps, and credit `Energinet (www.energidataservice.dk)`.
- **Risk:** rate limits differ by dataset and can change. Poll at the documented update cadence and
  honor the 429 `Retry-After` value.

### 24. Elia Open Data *(new)*

- **Value:** Belgian transmission-system load, generation, imbalance, and grid datasets via
  Opendatasoft.
- **Entry point:** `GET https://opendata.elia.be/api/explore/v2.1/catalog/datasets?limit=1`
- **Docs:** https://opendata.elia.be/
- **Access:** no authentication; JSON catalog and dataset records.
- **Implementation:** pick a small allowlist (system load, fuel mix, imbalance prices), then use
  `/records` with bounded time filters. Store dataset IDs and license fields from the catalog.
- **Risk:** dataset identifiers and schemas can change. Overlaps Elexon/Energinet regionally but
  adds Belgium-specific real-time grid coverage.

### 25. USAspending

- **Value:** US federal awards, contracts, grants, agencies, recipients, places, and spending trends.
- **Entry point:** `GET https://api.usaspending.gov/api/v2/references/toptier_agencies/`
- **Docs:** https://github.com/fedspendingtransparency/usaspending-api
- **Access:** no authentication; JSON GET discovery and POST search endpoints.
- **Implementation:** discover agencies from `toptier_agencies` and use bounded award-search POSTs.
  Partition by action date and agency, then upsert award IDs and transactions.
- **Risk:** `/api/v2/references/agency/` is stale and returns 404. Search responses can be expensive,
  so do not request unbounded fields or time ranges.

### 26. World Bank Projects & Operations

- **Value:** active, pipeline, and closed projects, commitments, sectors, themes, countries,
  approval dates, and project documents.
- **Entry point:** `GET https://search.worldbank.org/api/v3/projects?format=json&fl=id,project_name,countryname,status&rows=1`
- **Docs:** https://datahelpdesk.worldbank.org/knowledgebase/articles/889386-developer-information-overview
- **Access:** no authentication; bounded JSON/XML queries.
- **Implementation:** use an explicit field allowlist, page with `rows` and `os`, and upsert project
  ID. Keep financial amounts with currency and approval/fiscal dates.
- **Risk:** the search API is older and loosely documented. Contract-test selected fields and retain
  raw responses for parser recovery.

### 27. CISA Known Exploited Vulnerabilities

- **Value:** authoritative catalog of vulnerabilities confirmed exploited in the wild, with due
  dates and required actions.
- **Entry point:** `GET https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json`
- **Docs:** https://www.cisa.gov/known-exploited-vulnerabilities-catalog
- **Access:** no authentication; JSON and CSV.
- **Implementation:** checksum the full catalog daily, upsert by CVE, and retain `dateAdded`,
  `dueDate`, ransomware-use status, and required action.
- **Risk:** this is a current-state snapshot; create change history locally instead of overwriting it.

### 28. FIRST EPSS

- **Value:** daily exploit probability and percentile for CVEs; directly complements CISA KEV.
- **Entry point:** `GET https://api.first.org/data/v1/epss?cve=CVE-2021-44228`
- **Bulk:** `https://epss.empiricalsecurity.com/epss_scores-YYYY-MM-DD.csv.gz`
- **Docs:** https://www.first.org/epss/api
- **Access:** no authentication; free use with requested attribution.
- **Implementation:** use the compressed daily CSV for full syncs and the API only for targeted
  lookups. Natural key is CVE plus score date; retain model/version context when published.
- **Risk:** scores change daily and after model updates. Do not present EPSS as proof of exploitation.

### 29. NASA EONET v3

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
| ECB Data Portal beyond FX | `https://data-api.ecb.europa.eu/service/data/` | Existing registry already has ECB FX. Add monetary aggregates, securities, rates, payments, or balance-sheet datasets only after a dataflow allowlist is chosen. Broad BSI pulls are multi-megabyte. |
| NASA POWER | `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M&community=RE&longitude=0&latitude=51.5&start=20260720&end=20260722&format=JSON` | No-key and live; high-dimensional point/region requests need caching and a clear use case to avoid duplicating ERA5. |
| Federal Register | `https://www.federalregister.gov/api/v1/documents.json?per_page=1&order=newest` | Strong regulatory-event feed, but normalized API text is informational; legal views must link to the official govinfo edition. |
| CFPB Consumer Complaint Database | `https://www.consumerfinance.gov/data-research/consumer-complaints/search/api/v1/?size=1` | Useful consumer-risk signal, but narratives can contain sensitive claims and the search response is unexpectedly large even with `size=1`; use the official bulk dataset after privacy review. |
| CPSC recalls | `https://www.saferproducts.gov/RestWebServices/Recall?format=json` | Useful supply-chain/product-risk events, but narrower financial relevance and unusual paging/filter behavior. |
| openFDA enforcement *(new)* | `https://api.fda.gov/drug/enforcement.json?limit=1` | Anonymous access works with low daily ceilings; a free key raises limits. Useful drug/device/food recall signal after privacy and disclaimer handling. |
| NHTSA recalls *(new)* | `https://api.nhtsa.gov/recalls/recallsByVehicle?make=acura&model=rdx&modelYear=2012` | Free vehicle-recall API; needs make/model/year catalog design and is narrower than financial-core sources. |
| NVD CVE 2.0 *(new)* | `https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=CVE-2021-44228` | Live without a key on probe, but NVD strongly prefers an API key and enforces tight rate limits. Use after CISA KEV + EPSS, not instead of them. |
| OSV.dev *(new)* | `https://api.osv.dev/v1/vulns/{id}` | Anonymous vulnerability enrichment; ecosystem-package oriented and overlaps the cyber slice. |
| OpenSanctions bulk *(new)* | `https://data.opensanctions.org/datasets/latest/default/index.json` | Metadata and bulk entity dumps are anonymously reachable, but the default dump is multi-GB and aggregates many sources with mixed licensing. Prefer official national lists in P0 first. |
| DefiLlama *(new)* | `https://api.llama.fi/v2/chains` | Free TVL/protocol JSON that complements CoinGecko prices; confirm ToS/redistribution and schema stability. |
| Alternative.me Fear & Greed *(new)* | `https://api.alternative.me/fng/?limit=1` | Tiny sentiment series; easy but low unique analytical value. |
| GB Carbon Intensity | `https://api.carbonintensity.org.uk/intensity` | Easy real-time grid signal, but overlaps with Elexon and is GB-only. Prefer it only if the forecasted intensity model is needed. |
| NOAA CO-OPS | `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=latest&station=9414290&product=water_level&datum=MLLW&time_zone=gmt&units=metric&format=json` | Strong port/flood signal, but requires station/product catalog design and datum-aware normalization. |
| NOAA Aviation Weather Center | `https://aviationweather.gov/api/data/metar?ids=KJFK&format=json` | Direct and live, but needs strict cache/request-window rules and airport geospatial joins. |
| eCFR | `https://www.ecfr.gov/api/versioner/v1/versions/title-12.json` | Valuable regulatory history, but full-title content is hierarchical and legal status/version semantics need dedicated modeling. |
| Fintraffic Digitraffic | `https://tie.digitraffic.fi/api/weather/v1/stations/data` | Good Finland transport telemetry; send `Digitraffic-User`, a descriptive user agent, and gzip, and cache large metadata responses. |
| Fraunhofer Energy-Charts | `https://api.energy-charts.info/` | Valuable European power data, but validate endpoint-specific licensing, schema stability, and overlap with ENTSOG/Elexon/Energinet/Elia first. |
| ClinicalTrials.gov v2 | `https://clinicaltrials.gov/api/v2/studies?pageSize=1` | High value for biotech/pharma research, but requires sponsor/entity resolution and careful interpretation of trial status. |
| OpenFEMA | `https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?$top=1` | No-key and stable, but US-only and partly overlaps GDACS/EM-DAT/EONET. Prioritize assistance and claims datasets, not another event list. |
| RTE eco2mix | `https://odre.opendatasoft.com/api/explore/v2.1/catalog/datasets/eco2mix-national-cons-def/records?limit=1` | Direct French power mix data; first confirm the Opendatasoft dataset identifier, license, and revision behavior as part of the contract. |
| CAISO OASIS | `https://oasis.caiso.com/oasisapi/SingleZip` | High-value California LMP, demand, and grid data, but responses are query-specific ZIP files and require DST-safe market-interval keys and source-terms review. |
| HDX CKAN *(new)* | `https://data.humdata.org/api/3/action/package_search?q=refugees&rows=1` | Strong humanitarian catalog, but each resource has its own format and license; select specific datasets rather than ingesting the catalog wholesale. |
| FINRA OTC weekly summary *(new)* | `https://api.finra.org/data/group/otcMarket/name/weeklySummary` | Anonymous GET returned market-participant weekly data; confirm FINRA API terms, field dictionary, and whether POST filters are required for production sync. |

## P2 — investigate or scrape carefully

| Candidate | Access path | Investigation needed |
|---|---|---|
| World Bank debarred firms | https://www.worldbank.org/en/projects-operations/procurement/debarred-firms | The historical `wp-content/cache/developer/json/v2/all.json` URL now serves the Operations Search HTML application, not JSON. Discover an official current file; scrape only if robots/terms allow it and add a DOM fixture. |
| CBO budget and economic projections | https://www.cbo.gov/data/budget-economic-data | Official structured XLSX/CSV files and RSS are useful, but release-file discovery and workbook schemas change. Use checksum-based file ingestion rather than page-table scraping. |
| ESMA registers and data files | https://www.esma.europa.eu/publications-and-data/databases-and-registers | High regulatory value, but each register has separate file formats, terms, and publication behavior. Choose one register and confirm a stable download URL first. |
| EBA risk dashboard and transparency data | https://www.eba.europa.eu/risk-and-data-analysis/risk-analysis/risk-monitoring/risk-dashboard | Valuable EU bank-risk files, but workbook and archive discovery need schema/version handling. |
| UK Department for Business and Trade statistics | https://www.gov.uk/government/organisations/department-for-business-and-trade/about/statistics | Select a stable official bulk/API product; do not scrape publication prose when CSV/ODS attachments are available. |
| AEMO NEMWeb | https://nemweb.com.au/ | Anonymous files are technically accessible, but AEMO says NEMWeb data is not intended for commercial use. Obtain a terms decision before implementation. |
| Swiss SECO sanctions XML | `https://www.sesam.search.admin.ch/sesam-search-web/pages/downloadXmlGesamtliste.xhtml?lang=en&type=swiss` | Endpoint returned XHTML rather than a sanctions XML payload on 2026-07-24. Find the current official file URL before adapter work. |
| Australia DFAT consolidated list | https://www.dfat.gov.au/international-relations/security/sanctions/consolidated-list | High-value sanctions file, but HTTPS/2 fetches from this environment failed; retry with alternate transport and pin the current XLSX/CSV URL. |
| Atlanta Fed GDPNow / Cleveland Fed nowcasts | Atlanta Fed and Cleveland Fed indicator pages | Useful nowcasts, but current download links often resolve to HTML shells or page apps. Prefer an official structured file once a stable URL is confirmed. |
| Our World in Data grapher CSV | `https://ourworldindata.org/grapher/<slug>.csv` | Convenient CSVs, but chart slugs and columns are presentation-oriented. Prefer primary statistical publishers when the same series exists upstream. |

Scraping rules:

1. Prefer an official API, RSS/Atom feed, static CSV/JSON/XML, or structured workbook.
2. Save the source URL, retrieval time, checksum, content type, and publisher timestamp.
3. Respect robots.txt, terms, caching headers, and a source-specific minimum interval.
4. Parse from retained raw snapshots so schema fixes do not require re-scraping.
5. Add a fixture and a canary for selector/column drift; never replace good data with an empty parse.

## P3 — not immediate

- **Key-required statistical APIs:** FRED, BEA, EIA, Banxico SIE, Ember Energy, OpenAQ v3,
  Congress.gov, GovInfo, CourtListener, Companies House, and the US Census International Trade API.
  They may still be free, but they do not meet the preferred zero-credential deployment path.
- **GIE AGSI+ / ALSI:** European gas storage and LNG are valuable, but registration and an `x-key`
  header are mandatory even though the service is free of charge.
- **ENTSO-E Transparency Platform:** valuable electricity data, but production access requires a
  security token; first exploit the no-key regional sources in P0/P1.
- **ReliefWeb API:** since November 2025, use requires a pre-approved `appname`; GDACS, EONET,
  OpenFEMA, and existing disaster sources cover the immediate need.
- **WTO Stats / Timeseries API:** subscription key required on probe.
- **Commercial or unofficial market-data aggregators:** do not ingest merely because an endpoint
  answers anonymously. Require explicit redistribution rights and a stable publisher contract.
- **HTML-only news and search-result pages:** too volatile and legally ambiguous while official
  feeds, filings, notices, and datasets remain available.
- **Duplicates of current coverage:** SEC EDGAR, US Treasury Fiscal Data, New York Fed Markets,
  BLS, USGS earthquakes, NOAA weather alerts, OFAC, CFTC, CoinGecko, UN Comtrade (registry
  `comtrade`), and the existing World Bank indicator families are already represented in the
  repository and are not new-source work. The anonymous Comtrade public preview still returned
  HTTP 200 on 2026-07-24, but that is maintenance of an existing source, not a backlog item.

## Suggested delivery slices

1. **Compliance and entity identity:** Canada SEMA + UK Sanctions List + GLEIF + OpenFIGI.
2. **Financial conditions and macro:** BIS + OFR + Chicago Fed NFCI + Bank of Canada + Bank of
   England + Eurostat + Statistics Canada.
3. **Global FX prints:** RBA + Norges Bank + Riksbank + SNB + BCB PTAX.
4. **Power and gas:** Elexon + ENTSOG + MIDAS + Energinet + Elia.
5. **Procurement and public spending:** TED + Find a Tender + SAM.gov + USAspending + World Bank
   Projects.
6. **Cyber and physical event risk:** CISA KEV + FIRST EPSS + NASA EONET.

For each adapter, expose source metadata, health, last successful observation/publisher time,
row counts, and parser failures before adding the source to the terminal registry.

## Verification record

These representative calls used a descriptive user agent, followed redirects, sent no credentials,
and downloaded the response body on 2026-07-24 UTC.

| Source | HTTP | Response type / observation |
|---|---:|---|
| Canada SEMA sanctions | 200 | `text/xml`; ~1,850,424 bytes |
| UK Sanctions List | 200 | `application/octet-stream`; CSV snapshot, 49,275,065 bytes |
| GLEIF | 200 | `application/vnd.api+json` |
| OpenFIGI mapping | 200 | anonymous JSON POST mapping |
| Eurostat | 200 | `application/json` |
| BIS | 200 | `text/csv`; v2 dataflow query |
| OFR STFM | 200 | `application/json` |
| Chicago Fed NFCI | 200 | `text/csv` |
| Bank of Canada Valet | 200 | `application/json` |
| Bank of England IADB | 200 | `application/csv`; Bank Rate sample |
| RBA F11.1 | 200 | CSV exchange-rate table |
| Norges Bank | 200 | SDMX-JSON FX observation |
| Sveriges Riksbank | 200 | `application/json` observations |
| Swiss National Bank | 200 | `application/json` cube |
| BCB PTAX | 200 | OData JSON |
| Statistics Canada WDS | 200 | JSON vector POST/GET |
| ENTSOG | 200 | `application/json` |
| CEC MIDAS | 200 | `application/json`; public GHG query |
| EU TED | 200 | anonymous JSON POST search |
| Find a Tender | 200 | `application/json`; anonymous OCDS publication GET |
| SAM.gov opportunities | 200 | `application/hal+json` |
| Elexon | 200 | `application/json` |
| Energinet | 200 | `application/json` |
| Elia Open Data | 200 | `application/json` catalog |
| USAspending | 200 | `application/json` |
| World Bank Projects | 200 | `application/json` |
| CISA KEV | 200 | `application/json`; catalogVersion `2026.07.23` |
| FIRST EPSS | 200 | `application/json` |
| NASA EONET | 200 | JSON body mislabeled `application/rss+xml` |

Re-run these probes before implementation because anonymous-access and version policies can change.
