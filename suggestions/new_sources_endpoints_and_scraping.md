# New sources, endpoints, and scraping candidates

Last reviewed: 2026-07-25 UTC

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

**New in this review (2026-07-25):** National Bank of Poland, Czech National Bank daily FX,
Danmarks Nationalbank FX XML, NBU Ukraine FX, BCRA Argentina FX, HKMA Open API exchange rates,
Deutsche Bundesbank SDMX, ABS Australia Data API, ESMA FIRDS (promoted from P2 after stable
Solr + ZIP verification), FHFA House Price Index, Freddie Mac PMMS, UK Land Registry Price Paid
JSON API, and SingStat Table Builder. Prior P0 entry points were re-verified live without
credentials. GLEIF JSON:API works when query brackets are URL-encoded; the Golden Copy publish
index also remains anonymous.

## P0 — implement next

### 1. Canada SEMA consolidated sanctions

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
- **Entry point:** `GET https://api.gleif.org/api/v1/lei-records?page%5Bsize%5D=1`
- **Golden Copy index:** `GET https://leidata-preview.gleif.org/api/v2/golden-copies/publishes`
- **Docs:** https://www.gleif.org/en/lei-data/gleif-api/
- **Access:** no authentication; JSON:API. LEI data is available under CC0.
- **Implementation:** URL-encode JSON:API bracket query params. Use API filters for lookup
  features and GLEIF Golden Copy files for full synchronization. Store LEI status and
  relationship validity intervals, not only current names.
- **Risk:** no official fixed request quota is published; throttle and use bulk files at scale.

### 4. OpenFIGI identifier mapping

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

### 5. ESMA FIRDS instrument reference data *(new / promoted)*

- **Value:** EU MiFIR instrument reference data (ISIN, trading venue, CFI, notional currency,
  issuer LEI). Highest-value free securities master expansion after GLEIF/OpenFIGI.
- **Discovery:** `GET https://registers.esma.europa.eu/solr/esma_registers_firds_files/select?q=file_type:FULINS&rows=1&wt=json&sort=publication_date%20desc`
- **Download example:** `https://firds.esma.europa.eu/firds/FULINS_C_20260725_01of01.zip`
- **Docs:** https://www.esma.europa.eu/publications-and-data/data/financial-instruments-reference-data-system-firds
- **Access:** no authentication; Solr JSON index plus daily ZIP files with MD5 checksums.
- **Implementation:** poll the Solr index, download new `FULINS` / delta files, verify checksum,
  unpack XML, and upsert by ISIN + trading venue MIC + validity dates. Keep file-level
  provenance.
- **Risk:** full dumps are multi-file and large. Prefer delta files after the first sync. Confirm
  ESMA redistribution terms and retain the published checksum.

### 6. Eurostat dissemination API

- **Value:** harmonized EU inflation, labor, trade, industry, population, energy, and fiscal data.
- **Entry point:** `GET https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/tec00114?geo=EU27_2020&sinceTimePeriod=2024`
- **Docs:** https://ec.europa.eu/eurostat/web/user-guides/data-browser/api-data-access/api-introduction
- **Access:** no authentication; JSON-stat, SDMX, TSV, and bulk downloads.
- **Implementation:** begin with a curated dataset allowlist and ingest code lists with observations.
  Keep flags, units, seasonal adjustment, frequency, and geo-version dimensions.
- **Risk:** unconstrained multidimensional requests can be very large; prefer filtered or bulk pulls.

### 7. BIS Data Portal

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

### 8. OFR Short-term Funding Monitor

- **Value:** US repo, money-market funds, Treasury yields, New York Fed reference rates, and
  primary-dealer series in one financial-stability source.
- **Entry point:** `GET https://data.financialresearch.gov/v1/series/timeseries?mnemonic=REPO-DVP_AR_G30-P`
- **Docs:** https://www.financialresearch.gov/short-term-funding-monitor/api/
- **Access:** no token or registration; JSON.
- **Implementation:** discover dataset and series mnemonics through `/v1/metadata/`, then perform
  daily incremental pulls. Preserve vintage/status metadata.
- **Risk:** the publisher says data update no more than daily; more frequent polling adds no value.

### 9. Chicago Fed National Financial Conditions Index

- **Value:** weekly NFCI / ANFCI and risk, credit, and leverage sub-indices; a compact systemic
  stress signal that complements OFR and New York Fed rates.
- **Entry point:** `GET https://www.chicagofed.org/-/media/publications/nfci/nfci-data-series-csv.csv`
- **Docs:** https://www.chicagofed.org/research/data/nfci/current-data
- **Access:** no authentication; static CSV (~148 KB).
- **Implementation:** checksum the CSV on the Fed's weekly publication cadence, parse
  `Friday_of_Week` as the observation date, and store all published columns.
- **Risk:** the media path can move. Keep a canary on URL and header drift; do not scrape the HTML
  article when the CSV is available.

### 10. Bank of Canada Valet

- **Value:** Canadian FX, policy rates, bond yields, exchange-rate indices, and economic series.
- **Entry point:** `GET https://www.bankofcanada.ca/valet/observations/FXUSDCAD/json?recent=1`
- **Docs:** https://www.bankofcanada.ca/valet/docs
- **Access:** no authentication; JSON, CSV, and XML.
- **Implementation:** sync series/group metadata separately, then observations by date window.
  Retain decimal precision, frequency, and per-series labels.
- **Terms/risk:** carry Bank of Canada attribution and disclaimer; cache metadata and avoid polling
  faster than the series update frequency.

### 11. Bank of England Statistical Database (IADB)

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

### 12. Reserve Bank of Australia exchange rates

- **Value:** AUD cross rates and the trade-weighted index from an official static CSV.
- **Entry point:** `GET https://www.rba.gov.au/statistics/tables/csv/f11.1-data.csv`
- **Docs:** https://www.rba.gov.au/statistics/tables/
- **Access:** no authentication; CSV (~133 KB on probe).
- **Implementation:** parse the F11.1 workbook-style CSV, preserve column titles, and update on the
  RBA business-day cadence.
- **Risk:** table codes and CSV layouts can change with statistical releases. Checksum and header
  canaries are required.

### 13. ABS Australia Data API *(new)*

- **Value:** official Australian CPI and broader ABS SDMX-JSON; pairs with RBA FX for AU macro.
- **Entry point:** `GET https://data.api.abs.gov.au/rest/data/CPI/1.10001.10.50.Q?startPeriod=2024&format=jsondata`
- **Dataflow catalog:** `GET https://data.api.abs.gov.au/rest/dataflow/ALL?format=json`
- **Docs:** https://www.abs.gov.au/about/data-services/application-programming-interfaces-apis/data-api-user-guide
- **Access:** no authentication; SDMX-JSON.
- **Implementation:** pin dataflow IDs from the catalog, then pull bounded keys. Preserve units,
  seasonal adjustment, and observation status.
- **Risk:** dataflow/DSD identifiers change across ABS redesigns. Fail closed on unknown structure
  versions rather than guessing keys.

### 14. Norges Bank data API

- **Value:** Norwegian FX and related SDMX series; extends FX coverage beyond ECB/BoC.
- **Entry point:** `GET https://data.norges-bank.no/api/data/EXR/B.USD.NOK.SP?format=sdmx-json&lastNObservations=1&locale=en`
- **Docs:** https://data.norges-bank.no/
- **Access:** no authentication; SDMX-JSON.
- **Implementation:** discover dataflows first, then pull bounded observation windows. Preserve
  dimensions and units.
- **Risk:** SDMX keys are brittle; validate structure definitions before observations.

### 15. Sveriges Riksbank SWEA API

- **Value:** Swedish policy rate, FX, and market series with a simple JSON observations API.
- **Entry point:** `GET https://api.riksbank.se/swea/v1/Observations/SEKUSDPMI/2026-07-20`
- **Series catalog:** `GET https://api.riksbank.se/swea/v1/Series`
- **Docs:** https://www.riksbank.se/en-gb/statistics/open-data-and-api/
- **Access:** no authentication; JSON.
- **Implementation:** sync the series catalog, then incremental observations by series ID and date.
- **Risk:** confirm attribution/disclaimer text and cache the series list; do not poll idle series
  more often than they update.

### 16. Swiss National Bank data portal

- **Value:** Swiss FX, interest-rate, and macroeconomic cubes in JSON.
- **Entry point:** `GET https://data.snb.ch/api/cube/devkua/data/json/en`
- **Docs:** https://data.snb.ch/
- **Access:** no authentication; JSON cubes.
- **Implementation:** start with FX and interest-rate cubes, store cube/version metadata, and
  preserve dimension items and scales.
- **Risk:** cube identifiers are opaque. Maintain an allowlist and detect empty/partial cubes.

### 17. Deutsche Bundesbank SDMX *(new)*

- **Value:** German and euro-area rates, FX, banking, and capital-market series from the euro-area
  national central bank with the deepest open SDMX store after ECB/BIS.
- **Entry point:** `GET https://api.statistiken.bundesbank.de/rest/data/BBEX3/D.USD.EUR.BB.AC.000?lastNObservations=1`
  with `Accept: application/vnd.sdmx.data+json;version=1.0.0`
- **Docs:** https://www.bundesbank.de/en/statistics/time-series-databases/time-series-databases
- **Access:** no authentication; SDMX-JSON and XML.
- **Implementation:** sync dataflow/DSD metadata, then curated series keys. Prefer JSON Accept
  headers; preserve observation attributes.
- **Risk:** default responses may be XML. Always set Accept and validate series keys before broad
  history pulls.

### 18. National Bank of Poland FX *(new)*

- **Value:** official PLN FX table A/B/C JSON; simple high-quality EM/EU FX print.
- **Entry point:** `GET https://api.nbp.pl/api/exchangerates/rates/a/usd/?format=json`
- **Tables:** `GET https://api.nbp.pl/api/exchangerates/tables/a?format=json`
- **Docs:** https://api.nbp.pl/
- **Access:** no authentication; JSON or XML via `format`.
- **Implementation:** daily table ingest keyed by `effectiveDate` + currency code; keep mid/bid/ask
  where present.
- **Risk:** weekends/holidays omit tables. Empty holiday responses must not wipe history.

### 19. Czech National Bank daily FX *(new)*

- **Value:** official CZK fixing sheet as plain text; trivial parse and high reliability.
- **Entry point:** `GET https://www.cnb.cz/en/financial-markets/foreign-exchange-market/central-bank-exchange-rate-fixing/central-bank-exchange-rate-fixing/daily.txt`
- **Docs:** https://www.cnb.cz/en/financial-markets/foreign-exchange-market/central-bank-exchange-rate-fixing/
- **Access:** no authentication; pipe-delimited text.
- **Implementation:** parse header date/`#NNN`, then `Country|Currency|Amount|Code|Rate` rows.
  Store rate divided by amount.
- **Risk:** URL and English/Czech path variants can move. Keep a canary; prefer the published daily
  file over HTML scraping.

### 20. Danmarks Nationalbank FX *(new)*

- **Value:** official DKK exchange rates XML from Danmarks Nationalbank.
- **Entry point:** `GET https://www.nationalbanken.dk/api/currencyratesxml?lang=en`
- **Docs:** https://www.nationalbanken.dk/en/statistics/find-statistics/exchange-rates
- **Access:** no authentication; XML.
- **Implementation:** parse `dailyrates/@id` as observation date and currency `rate`/`code`
  attributes; upsert by date + currency.
- **Risk:** the newer `api.nationalbanken.dk` JSON host was unreachable from this environment;
  pin the working XML URL and monitor for migration.

### 21. NBU Ukraine FX *(new)*

- **Value:** official UAH exchange rates JSON; high geopolitical and EM-macro relevance.
- **Entry point:** `GET https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json`
- **Docs:** https://bank.gov.ua/en/statistic/default
- **Access:** no authentication; JSON (XML also available).
- **Implementation:** upsert by `exchangedate` + `cc`/`r030`; preserve Ukrainian and English
  labels when both endpoints are used.
- **Risk:** confirm redistribution/attribution. Treat date format `dd.MM.yyyy` explicitly.

### 22. BCRA Argentina FX *(new)*

- **Value:** official Argentine FX quotations JSON after the deprecated v3 monetarias API.
- **Entry point:** `GET https://api.bcra.gob.ar/estadisticascambiarias/v1.0/Cotizaciones`
- **Docs:** https://www.bcra.gob.ar/Catalogo/apis.asp
- **Access:** no authentication; JSON.
- **Implementation:** ingest `results.fecha` plus per-currency `tipoCotizacion` / `tipoPase`.
  Do not call the retired `/estadisticas/v3.0/Monetarias` path (HTTP 410).
- **Risk:** API versions are renamed frequently. Keep a version canary and fixture snapshots.

### 23. HKMA Open API exchange rates *(new)*

- **Value:** Hong Kong official USD peg / EERI and related daily exchange-rate statistics.
- **Entry point:** `GET https://api.hkma.gov.hk/public/market-data-and-statistics/monthly-statistical-bulletin/er-ir/er-eeri-daily?offset=0&pagesize=1`
- **Docs:** https://apidocs.hkma.gov.hk/
- **Access:** no authentication; JSON envelope with `header.success`.
- **Implementation:** page with `offset`/`pagesize`, fail closed when `header.success` is false,
  and store `end_of_day` as the observation date.
- **Risk:** dataset path segments are long and can be renamed. Prefer the documented dataset codes
  over scraping the bulletin HTML.

### 24. Banco Central do Brasil PTAX

- **Value:** official Brazilian USD PTAX reference rates; high-value EM FX print.
- **Entry point:**
  `GET https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?@dataInicial='07-20-2026'&@dataFinalCotacao='07-24-2026'&$format=json`
- **Docs:** https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/aplicacao#!/recursos
- **Access:** no authentication; OData JSON.
- **Implementation:** pull buy/sell/PTAX quotes by date window and upsert by quotation date plus
  rate type. Dates in the path use `MM-DD-YYYY`.
- **Risk:** weekends/holidays return empty `value` arrays; that is normal and must not clear
  history.

### 25. Statistics Canada Web Data Service

- **Value:** Canadian CPI, labour, GDP, and trade vectors as JSON; pairs with Bank of Canada Valet.
- **Entry point:**
  `POST https://www150.statcan.gc.ca/t1/wds/rest/getDataFromVectorsAndLatestNPeriods`
  with body `[{"vectorId":3561201,"latestN":1}]`
- **Docs:** https://www.statcan.gc.ca/en/developers/wds
- **Access:** no authentication; JSON.
- **Implementation:** maintain a vector-ID allowlist, ingest metadata separately, and preserve
  reference periods, scalars, and status codes.
- **Risk:** vector IDs are stable but opaque. Fail closed when `status` is not `SUCCESS`.

### 26. SingStat Table Builder *(new)*

- **Value:** Singapore CPI, labour, trade, and national-accounts tables as JSON; Asia macro gap
  closer beside HKMA.
- **Discovery:** `GET https://tablebuilder.singstat.gov.sg/api/table/resourceid?keyword=cpi&searchOption=all`
- **Data:** `GET https://tablebuilder.singstat.gov.sg/api/table/tabledata/{resourceId}`
- **Docs:** https://tablebuilder.singstat.gov.sg/
- **Access:** no authentication; JSON.
- **Implementation:** resolve resource IDs through search, then pull tabledata. Preserve footnote,
  unit, and frequency metadata.
- **Risk:** resource IDs are opaque. Reject unknown query parameters; the API returns HTTP 400 for
  undocumented extras.

### 27. FHFA House Price Index *(new)*

- **Value:** official US house-price indices by geography and flavor; core housing/macro risk
  series with no API key.
- **Entry point:** `GET https://www.fhfa.gov/hpi/download/monthly/hpi_master.csv`
- **Docs:** https://www.fhfa.gov/data/hpi
- **Access:** no authentication; large CSV (~19 MB on probe).
- **Implementation:** stream and checksum; upsert by place/frequency/year/period and flavor.
  Prefer purchase-only seasonally adjusted national/division series for terminal defaults.
- **Risk:** master file is wide and historical. Use checksum skip-unchanged and partition by
  geography if storage pressure appears.

### 28. Freddie Mac PMMS *(new)*

- **Value:** Primary Mortgage Market Survey weekly 30-year / 15-year mortgage rates; the standard
  US mortgage-rate print.
- **Entry point:** `GET https://www.freddiemac.com/pmms/docs/historicalweeklydata.xlsx`
- **Docs:** https://www.freddiemac.com/pmms
- **Access:** no authentication; XLSX (~218 KB).
- **Implementation:** checksum the workbook, parse the historical weekly sheet, and store rate,
  points, and as-of week ending date.
- **Risk:** sheet names/columns can drift. Add a workbook fixture and header canary; do not scrape
  the marketing page HTML.

### 29. UK Land Registry Price Paid *(new)*

- **Value:** official England/Wales residential transaction prices; high-value UK housing market
  microstructure.
- **JSON API:** `GET https://landregistry.data.gov.uk/data/ppi/transaction-record.json?_page=1&_pageSize=1`
- **CSV export:** `GET https://landregistry.data.gov.uk/app/ppd/ppd_data.csv?limit=1`
- **Docs:** https://landregistry.data.gov.uk/
- **Access:** no authentication; Linked Data API JSON and CSV under OGL.
- **Implementation:** prefer the JSON PPI API for incremental pages; use bulk Price Paid CSV for
  backfill. Store transaction ID, price, date, tenure, and LSOA/postcode fields.
- **Risk:** full history is large. Page politely and respect OGL attribution.

### 30. ENTSOG gas transparency

- **Value:** European gas flows, capacities, nominations, interruptions, balancing, and storage
  signals with point/operator geography.
- **Entry point:** `GET https://transparency.entsog.eu/api/v1/operationaldatas?limit=1`
- **Docs:** https://transparency.entsog.eu/api/archiveDirectories/8/api-manual/ENTSOG_TP_API_UserManual_v3.0.pdf
- **Access:** the v1 read endpoint is anonymously accessible; JSON/XML/CSV variants exist.
- **Implementation:** always bound date, operator, point direction, and indicator. Use cursor/page
  semantics where available and normalize gas-day timestamps to UTC.
- **Risk:** queries time out after 60 seconds. Use a conservative maximum of six calls/minute for
  anonymous v1 access, back off on 429, and re-check ENTSOG terms before redistribution.

### 31. California CEC MIDAS v2

- **Value:** retail electricity rates, greenhouse-gas signals, and California Flex Alerts for
  demand-response and grid-cost analysis.
- **Entry point:** `GET https://midasapi.energy.ca.gov/api/valuedata?SignalType=2`
- **Contract:** https://midasapi.energy.ca.gov/openapi.json
- **Access:** public GETs are unauthenticated as of MIDAS v2, released 2026-06-22.
- **Implementation:** first retrieve the RIN inventory, then query selected IDs with `QueryType`.
  Store all wire times as UTC and preserve interval boundaries.
- **Risk:** v2 changed response shapes and changed the GHG unit from `kg/kWh CO2` to
  `g/kWh CO2`; do not reuse v1 parsers or silently rescale values.

### 32. EU TED procurement notices

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

- **Implementation:** incremental search by publication date, then fetch notice XML for canonical
  fields. Store notice ID, buyer, CPV, values, and amendment links.
- **Risk:** submission APIs are keyed; only use the published search/API surface. Bound result
  windows to avoid huge scans.

### 33. UK Find a Tender OCDS

- **Value:** UK public-procurement releases in OCDS JSON.
- **Entry point:** `GET https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages?limit=1`
- **Docs:** https://www.find-tender.service.gov.uk/API
- **Access:** anonymous OCDS under OGL v3.
- **Implementation:** page by `updatedFrom` / `updatedTo`, store release OCID + date, and preserve
  awards/tender/parties blocks.
- **Risk:** releases can be large. Prefer update windows and store raw packages for replay.

### 34. SAM.gov opportunities

- **Value:** US federal opportunities feed; complements TED and Find a Tender for procurement
  coverage.
- **Entry point:** `GET https://sam.gov/api/prod/sgs/v1/search/?index=opp&page=0&sort=-modifiedDate&size=1&mode=search`
- **Docs:** https://open.gsa.gov/api/get-opportunities-public-api/
- **Access:** anonymous HAL+JSON search works on probe for public opportunity index data.
- **Implementation:** page by modified date, map opportunity IDs, titles, departments, and
  response deadlines. Confirm whether production volume requires a registered API key.
- **Risk:** SAM.gov has multiple APIs and key policies. Re-check the public opportunities docs
  before building high-volume sync.

### 35. Elexon Insights Solution

- **Value:** GB electricity balancing, generation by fuel, demand, and pricing.
- **Entry point:** `GET https://data.elexon.co.uk/bmrs/api/v1/reference/fueltypes/all`
- **Docs:** https://developer.data.elexon.co.uk/
- **Access:** no authentication for Insights public GETs.
- **Implementation:** start with fuel-mix / demand / settlement endpoints; normalize settlement
  periods and UK local time carefully.
- **Risk:** endpoint families are numerous. Curate a small allowlist before expanding.

### 36. Energinet Energi Data Service

- **Value:** Danish power and gas market open data with a stable CKAN-like JSON API.
- **Entry point:** `GET https://api.energidataservice.dk/dataset/ElectricityProdex5MinRealtime?limit=1`
- **Docs:** https://www.energidataservice.dk/
- **Access:** no authentication; JSON.
- **Implementation:** dataset-by-dataset ingestion with declared licenses from the portal metadata.
- **Risk:** some datasets are high-frequency. Downsample or store aggregates for terminal defaults.

### 37. Elia Open Data

- **Value:** Belgian transmission-system open data catalog and timeseries.
- **Entry point:** `GET https://opendata.elia.be/api/explore/v2.1/catalog/datasets?limit=1`
- **Docs:** https://opendata.elia.be/
- **Access:** no authentication; Opendatasoft JSON.
- **Implementation:** select a few high-value datasets (load, generation, imbalance) and pin
  dataset IDs.
- **Risk:** catalog visibility fields vary. Only ingest datasets with redistributable licenses.

### 38. USAspending

- **Value:** US federal awards, agencies, and spending analytics.
- **Entry point:** `GET https://api.usaspending.gov/api/v2/references/toptier_agencies/`
- **Docs:** https://api.usaspending.gov/docs/
- **Access:** no authentication; JSON.
- **Implementation:** use `toptier_agencies` (not the removed `/references/agency/` route), then
  award/spending endpoints with bounded filters.
- **Risk:** some documentation examples are stale. Probe routes before coding adapters.

### 39. World Bank Projects & Operations

- **Value:** project commitments, regions, statuses, and sectors for development-finance monitoring.
- **Entry point:** `GET https://search.worldbank.org/api/v2/projects?format=json&rows=1`
- **Docs:** https://datahelpdesk.worldbank.org/knowledgebase/articles/898599-api-project-queries
- **Access:** no authentication; JSON.
- **Implementation:** page through projects and store project IDs, commitments, and status fields.
- **Risk:** search semantics differ from indicator APIs already in the registry; keep this as a
  projects source, not another WDI wrapper.

### 40. CISA Known Exploited Vulnerabilities

- **Value:** authoritative exploited-vulnerability catalog for cyber-risk overlays.
- **Entry point:** `GET https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json`
- **Docs:** https://www.cisa.gov/known-exploited-vulnerabilities-catalog
- **Access:** no authentication; JSON snapshot.
- **Implementation:** checksum the catalog, upsert by CVE ID, and retain `dateAdded` /
  `dueDate` / ransomware fields.
- **Risk:** replace-by-checksum only. Catalog version on 2026-07-25 probe: `2026.07.24`.

### 41. FIRST EPSS

- **Value:** exploit-prediction scores that enrich CISA KEV and CVE inventories.
- **Entry point:** `GET https://api.first.org/data/v1/epss?cve=CVE-2021-44228`
- **Daily dump:** prefer the compressed CSV for full syncs.
- **Docs:** https://www.first.org/epss/api
- **Access:** no authentication; JSON and CSV.
- **Implementation:** daily score sync keyed by CVE; keep percentile and model version.
- **Risk:** point queries are fine for canaries; full history should use the daily file.

### 42. NASA EONET v3

- **Value:** global natural-event geospatial feed that complements GDACS and EM-DAT.
- **Entry point:** `GET https://eonet.gsfc.nasa.gov/api/v3/events?limit=1`
- **Docs:** https://eonet.gsfc.nasa.gov/docs/v3
- **Access:** no authentication; JSON.
- **Implementation:** ingest events, categories, geometries, and closed/open status.
- **Risk:** responses may be mislabeled as `application/rss+xml` while being JSON. Parse by body,
  not content-type.

## P1 — high value after P0

| Candidate | Representative endpoint or docs | Why it is not P0 |
|---|---|---|
| ECB Data Portal beyond FX | `https://data-api.ecb.europa.eu/service/data/EXR/D.USD.EUR.SP00.A?lastNObservations=3&format=csvdata` | Existing registry already has ECB FX. CSV EXR is live anonymously; add monetary aggregates, securities, rates, payments, or balance-sheet datasets only after a dataflow allowlist is chosen. |
| Banque de France Webstat *(new)* | `https://webstat.banque-france.fr/api/explore/v2.1/catalog/datasets?limit=1` | Large Opendatasoft catalog (~42k datasets) is anonymous, but dataset IDs are opaque and many series overlap ECB/Bundesbank. Curate a short allowlist first. |
| db.nomics *(new)* | `https://api.db.nomics.world/v22/providers` | Excellent free aggregator across official publishers, but prefer primary publishers in P0 when the same series exists upstream. Use for discovery and gap-fill. |
| ISO 10383 MIC list *(new)* | `https://www.iso20022.org/sites/default/files/ISO10383_MIC/ISO10383_MIC.xls` | Market Identifier Codes pair with ESMA FIRDS venue fields. File is anonymous XLS (~1.7 MB); confirm ISO/Swift redistribution terms before shipping. |
| Bank of Russia daily FX *(new)* | `https://www.cbr.ru/scripts/XML_daily.asp` | Anonymous XML works, but redistribution/compliance review is required before productizing Russian official prints. |
| UK ONS Open Geography / datasets *(new)* | `https://api.beta.ons.gov.uk/v1/datasets` | Beta datasets API is live; the old timeseries API is decommissioned. Pick concrete dataset IDs and versioned editions before ingestion. |
| Germany SMARD chart API *(new)* | `https://www.smard.de/app/chart_data/410/DE/index_quarterhour.json` | Anonymous power data JSON works, but the path looks UI-oriented. Confirm license/stability versus Fraunhofer Energy-Charts / ENTSO-E alternatives. |
| Zillow Research ZHVI *(new)* | `https://files.zillowstatic.com/research/public_csvs/zhvi/Metro_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv` | Convenient housing CSV, but commercial reuse terms need review; FHFA/Freddie should lead. |
| FDIC BankFind Suite | `https://api.fdic.gov/banks/institutions?limit=1&format=json` | Anonymous and live now, but the official site announces a September 8 API-key requirement. The retrieved notice does not state the year; resolve that transition before building a no-key adapter. |
| IMF PortWatch | `https://portwatch.imf.org/api/search/v1/catalog` | The anonymous OGC Records API is a catalog. The adapter must discover and pin the underlying ArcGIS feature services and confirm each dataset's reuse terms. |
| OECD Data Explorer | `https://sdmx.oecd.org/public/rest/v1/data/` | Excellent SDMX coverage, but substantial overlap with existing IMF/World Bank/ILO series. Select differentiated datasets before ingestion. |
| NASA POWER | `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M&community=RE&longitude=0&latitude=51.5&start=20260720&end=20260722&format=JSON` | No-key and live; high-dimensional point/region requests need caching and a clear use case to avoid duplicating ERA5. |
| Federal Register | `https://www.federalregister.gov/api/v1/documents.json?per_page=1&order=newest` | Strong regulatory-event feed, but normalized API text is informational; legal views must link to the official govinfo edition. |
| CFPB Consumer Complaint Database | `https://www.consumerfinance.gov/data-research/consumer-complaints/search/api/v1/?size=1` | Useful consumer-risk signal, but narratives can contain sensitive claims and the search response is unexpectedly large even with `size=1`; use the official bulk dataset after privacy review. |
| CPSC recalls | `https://www.saferproducts.gov/RestWebServices/Recall?format=json` | Useful supply-chain/product-risk events, but narrower financial relevance and unusual paging/filter behavior. |
| openFDA enforcement | `https://api.fda.gov/drug/enforcement.json?limit=1` | Anonymous access works with low daily ceilings; a free key raises limits. Useful drug/device/food recall signal after privacy and disclaimer handling. |
| NHTSA recalls | `https://api.nhtsa.gov/recalls/recallsByVehicle?make=acura&model=rdx&modelYear=2012` | Free vehicle-recall API; needs make/model/year catalog design and is narrower than financial-core sources. |
| NVD CVE 2.0 | `https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=CVE-2021-44228` | Live without a key on probe, but NVD strongly prefers an API key and enforces tight rate limits. Use after CISA KEV + EPSS, not instead of them. |
| OSV.dev | `https://api.osv.dev/v1/vulns/CVE-2021-44228` | Anonymous vulnerability enrichment; ecosystem-package oriented and overlaps the cyber slice. |
| Google deps.dev *(new)* | `https://api.deps.dev/v3/systems/npm/packages/react` | Strong package-security graph; useful after OSV/KEV, not a financial-core source. |
| OpenSanctions bulk | `https://data.opensanctions.org/datasets/latest/default/index.json` | Metadata and bulk entity dumps are anonymously reachable, but the default dump is multi-GB and aggregates many sources with mixed licensing. Prefer official national lists in P0 first. |
| DefiLlama | `https://api.llama.fi/v2/chains` | Free TVL/protocol JSON that complements CoinGecko prices; confirm ToS/redistribution and schema stability. |
| Alternative.me Fear & Greed | `https://api.alternative.me/fng/?limit=1` | Tiny sentiment series; easy but low unique analytical value. |
| CoinPaprika *(new)* | `https://api.coinpaprika.com/v1/tickers/btc-bitcoin` | Free crypto ticker JSON; overlaps existing CoinGecko-backed `crypto` source. |
| mempool.space *(new)* | `https://mempool.space/api/v1/fees/recommended` | Simple Bitcoin fee market signal; niche versus broad crypto prices. |
| GB Carbon Intensity | `https://api.carbonintensity.org.uk/intensity` | Easy real-time grid signal, but overlaps with Elexon and is GB-only. Prefer it only if the forecasted intensity model is needed. |
| NOAA CO-OPS | `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=latest&station=9414290&product=water_level&datum=MLLW&time_zone=gmt&units=metric&format=json` | Strong port/flood signal, but requires station/product catalog design and datum-aware normalization. |
| NOAA Aviation Weather Center | `https://aviationweather.gov/api/data/metar?ids=KJFK&format=json` | Direct and live, but needs strict cache/request-window rules and airport geospatial joins. |
| Open-Meteo *(new)* | `https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current=temperature_2m` | Excellent no-key weather API; overlaps NOAA alerts / ERA5 unless used for specific commodity-weather overlays. |
| USGS Waterservices *(new)* | `https://waterservices.usgs.gov/nwis/iv/?format=json&sites=01646500&parameterCd=00060&siteStatus=all` | Free hydrology timeseries; useful for physical-risk overlays after station catalog design. |
| eCFR | `https://www.ecfr.gov/api/versioner/v1/versions/title-12.json` | Valuable regulatory history, but full-title content is hierarchical and legal status/version semantics need dedicated modeling. |
| Fintraffic Digitraffic | `https://tie.digitraffic.fi/api/weather/v1/stations/data` | Good Finland transport telemetry; send `Digitraffic-User`, a descriptive user agent, and gzip, and cache large metadata responses. |
| Fraunhofer Energy-Charts | `https://api.energy-charts.info/public_power?country=de` | Valuable European power data, but validate endpoint-specific licensing, schema stability, and overlap with ENTSOG/Elexon/Energinet/Elia/SMARD first. |
| ClinicalTrials.gov v2 | `https://clinicaltrials.gov/api/v2/studies?pageSize=1` | High value for biotech/pharma research, but requires sponsor/entity resolution and careful interpretation of trial status. |
| OpenFEMA | `https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?$top=1` | No-key and stable, but US-only and partly overlaps GDACS/EM-DAT/EONET. Prioritize assistance and claims datasets, not another event list. |
| RTE eco2mix | `https://odre.opendatasoft.com/api/explore/v2.1/catalog/datasets/eco2mix-national-cons-def/records?limit=1` | Direct French power mix data; first confirm the Opendatasoft dataset identifier, license, and revision behavior as part of the contract. |
| CAISO OASIS | `https://oasis.caiso.com/oasisapi/SingleZip` | High-value California LMP, demand, and grid data, but responses are query-specific ZIP files and require DST-safe market-interval keys and source-terms review. |
| HDX CKAN | `https://data.humdata.org/api/3/action/package_search?q=refugees&rows=1` | Strong humanitarian catalog, but each resource has its own format and license; select specific datasets rather than ingesting the catalog wholesale. |
| FINRA OTC weekly summary | `https://api.finra.org/data/group/otcMarket/name/weeklySummary` | Anonymous GET returned market-participant weekly data; confirm FINRA API terms, field dictionary, and whether POST filters are required for production sync. |
| Statistics Sweden SCB *(new)* | `https://api.scb.se/OV0104/v1/doris/en/ssd` | PxWeb tree is anonymous; useful Nordic macro, but needs table-ID allowlisting and overlaps Riksbank for market series. |

## P2 — investigate or scrape carefully

| Candidate | Access path | Investigation needed |
|---|---|---|
| World Bank debarred firms | https://www.worldbank.org/en/projects-operations/procurement/debarred-firms | The historical `wp-content/cache/developer/json/v2/all.json` URL now serves the Operations Search HTML application, not JSON. Discover an official current file; scrape only if robots/terms allow it and add a DOM fixture. |
| CBO budget and economic projections | https://www.cbo.gov/data/budget-economic-data | Official structured XLSX/CSV files and RSS are useful, but release-file discovery and workbook schemas change. Use checksum-based file ingestion rather than page-table scraping. |
| EBA risk dashboard and transparency data | https://www.eba.europa.eu/risk-and-data-analysis/risk-analysis/risk-monitoring/risk-dashboard | Valuable EU bank-risk files, but workbook and archive discovery need schema/version handling. |
| UK Department for Business and Trade statistics | https://www.gov.uk/government/organisations/department-for-business-and-trade/about/statistics | Select a stable official bulk/API product; do not scrape publication prose when CSV/ODS attachments are available. |
| AEMO NEMWeb | https://nemweb.com.au/ | Anonymous files are technically accessible, but AEMO says NEMWeb data is not intended for commercial use. Obtain a terms decision before implementation. |
| Swiss SECO sanctions XML | `https://www.sesam.search.admin.ch/sesam-search-web/pages/downloadXmlGesamtliste.xhtml?lang=en&type=swiss` | Endpoint still returned XHTML rather than a sanctions XML payload on 2026-07-25. Find the current official file URL before adapter work. |
| Australia DFAT consolidated list | https://www.dfat.gov.au/international-relations/security/sanctions/consolidated-list | High-value sanctions file, but HTTPS fetches from this environment timed out / failed; retry with alternate transport and pin the current XLSX/CSV URL. |
| Atlanta Fed GDPNow / Cleveland Fed nowcasts | Atlanta Fed and Cleveland Fed indicator pages | Useful nowcasts, but current download links often resolve to HTML/JS shells rather than workbooks. Prefer an official structured file once a stable URL is confirmed. |
| Our World in Data grapher CSV | `https://ourworldindata.org/grapher/<slug>.csv` | Convenient CSVs, but chart slugs and columns are presentation-oriented. Prefer primary statistical publishers when the same series exists upstream. |
| Redfin Data Center weekly housing *(new)* | S3 public TSV under `redfin-public-data` | Object exists and is huge; confirm schema, update cadence, and ToS before any sync. FHFA/Land Registry/Freddie are cleaner first housing sources. |
| OCC equity options volume *(new)* | `https://marketdata.theocc.com/volume-query` | Endpoint answers, but required query parameters were not documented clearly from probes. Capture the official parameter matrix before building. |
| Open Ownership / BODS *(new)* | register and BODS bulk hosts | Cloudflare or HTML interstitial blocked clean anonymous JSON from this environment. Revisit with documented bulk dumps and ToS. |
| MAS Singapore APIs *(new)* | `eservices.mas.gov.sg` API portal paths | Prior SORA/exchange-rate paths returned portal HTML 404s. Discover the current API directory and pin working routes. |
| RBNZ / SARB statistical files *(new)* | RBNZ and SARB statistics portals | RBNZ returned site-unavailable HTML; SARB selected-rates XLSX path 404ed. Re-find current official file URLs. |
| Yahoo Finance chart API *(new)* | `https://query1.finance.yahoo.com/v8/finance/chart/AAPL` | Anonymous JSON works, but it is unofficial and ToS-hostile for redistribution. Do not use while official/licensed market data paths exist. |
| Stooq daily CSV *(new)* | `https://stooq.com/q/d/l/?s=aapl.us&i=d` | Bot-challenge HTML on probe. Unsuitable until a stable non-JS machine interface exists. |

Scraping rules:

1. Prefer an official API, RSS/Atom feed, static CSV/JSON/XML, or structured workbook.
2. Save the source URL, retrieval time, checksum, content type, and publisher timestamp.
3. Respect robots.txt, terms, caching headers, and a source-specific minimum interval.
4. Parse from retained raw snapshots so schema fixes do not require re-scraping.
5. Add a fixture and a canary for selector/column drift; never replace good data with an empty parse.

## P3 — not immediate

- **Key-required statistical APIs:** FRED, BEA, EIA, Banxico SIE, Ember Energy, OpenAQ v3,
  Congress.gov, GovInfo, CourtListener, Companies House, IATI Datastore, Japanese e-Stat
  (app ID), and the US Census International Trade API. They may still be free, but they do not
  meet the preferred zero-credential deployment path.
- **GIE AGSI+ / ALSI:** European gas storage and LNG are valuable, but registration and an `x-key`
  header are mandatory even though the service is free of charge.
- **ENTSO-E Transparency Platform:** valuable electricity data, but production access requires a
  security token; first exploit the no-key regional sources in P0/P1.
- **ReliefWeb API:** since November 2025, use requires a pre-approved `appname`; GDACS, EONET,
  OpenFEMA, and existing disaster sources cover the immediate need.
- **WTO Stats / Timeseries API:** subscription key required on probe.
- **UCDP / ACLED upstream APIs:** token-gated at source; the terminal already exposes FinUties
  hosted UCDP/ACLED routes, so upstream keys are not new-source work here.
- **Commercial or unofficial market-data aggregators:** do not ingest merely because an endpoint
  answers anonymously. Require explicit redistribution rights and a stable publisher contract.
- **HTML-only news and search-result pages:** too volatile and legally ambiguous while official
  feeds, filings, notices, and datasets remain available.
- **Duplicates of current coverage:** SEC EDGAR (including `company_tickers.json`), US Treasury
  Fiscal Data (`api.fiscaldata.treasury.gov`), New York Fed Markets, BLS, USGS earthquakes, NOAA
  weather alerts, OFAC, CFTC, CoinGecko, UN Comtrade (registry `comtrade`), IMF indicator families
  already mapped by registry `imf`, and the existing World Bank indicator families are already
  represented and are not new-source work. Treasury Fiscal and NY Fed SOFR still returned
  anonymous HTTP 200 on 2026-07-25; that is maintenance of existing sources, not backlog.

## Suggested delivery slices

1. **Compliance and entity identity:** Canada SEMA + UK Sanctions List + GLEIF + OpenFIGI + ESMA FIRDS.
2. **Financial conditions and macro:** BIS + OFR + Chicago Fed NFCI + Bank of Canada + Bank of
   England + Eurostat + Statistics Canada + ABS + Bundesbank + SingStat.
3. **Global FX prints:** RBA + Norges Bank + Riksbank + SNB + BCB PTAX + NBP + CNB + Danmarks
   Nationalbank + NBU + BCRA + HKMA.
4. **Housing and credit:** FHFA HPI + Freddie Mac PMMS + UK Land Registry Price Paid.
5. **Power and gas:** Elexon + ENTSOG + MIDAS + Energinet + Elia.
6. **Procurement and public spending:** TED + Find a Tender + SAM.gov + USAspending + World Bank
   Projects.
7. **Cyber and physical event risk:** CISA KEV + FIRST EPSS + NASA EONET.

For each adapter, expose source metadata, health, last successful observation/publisher time,
row counts, and parser failures before adding the source to the terminal registry.

## Verification record

These representative calls used a descriptive user agent, followed redirects, sent no credentials,
and downloaded the response body on 2026-07-25 UTC.

| Source | HTTP | Response type / observation |
|---|---:|---|
| Canada SEMA sanctions | 200 | `text/xml`; ~1,850,424 bytes |
| UK Sanctions List | 200 / 206 | `application/octet-stream`; CSV ~49,278,504 bytes; range request OK |
| GLEIF | 200 | `application/vnd.api+json` with URL-encoded `page%5Bsize%5D` |
| GLEIF Golden Copy index | 200 | `application/json` publish list |
| OpenFIGI mapping | 200 | anonymous JSON POST mapping |
| ESMA FIRDS Solr | 200 | JSON index with `download_link` + checksum |
| ESMA FIRDS ZIP | 200 | `application/octet-stream`; example FULINS ZIP ~3.5 MB |
| Eurostat | 200 | `application/json` |
| BIS | 200 | `text/csv`; v2 dataflow query |
| OFR STFM | 200 | `application/json` |
| Chicago Fed NFCI | 200 | `text/csv` |
| Bank of Canada Valet | 200 | `application/json` |
| Bank of England IADB | 200 | CSV Bank Rate sample |
| RBA F11.1 | 200 | CSV exchange-rate table |
| ABS CPI | 200 | SDMX-JSON |
| Norges Bank | 200 | SDMX-JSON FX observation |
| Sveriges Riksbank | 200 | `application/json` observations |
| Swiss National Bank | 200 | `application/json` cube |
| Deutsche Bundesbank | 200 | SDMX-JSON with Accept header |
| NBP Poland | 200 | `application/json` FX |
| CNB Czech daily | 200 | pipe-delimited text fixings |
| Danmarks Nationalbank | 200 | FX XML |
| NBU Ukraine | 200 | `application/json` FX |
| BCRA Cotizaciones | 200 | `application/json` FX |
| HKMA ER daily | 200 | `application/json` envelope |
| BCB PTAX | 200 | OData JSON |
| Statistics Canada WDS | 200 | JSON vector POST |
| SingStat tabledata | 200 | CPI table JSON |
| FHFA HPI master | 200 | `text/csv`; ~18.9 MB |
| Freddie Mac PMMS | 200 | XLSX ~218 KB |
| UK Land Registry PPI | 200 | Linked Data JSON |
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
| CISA KEV | 200 | `application/json`; catalogVersion `2026.07.24` |
| FIRST EPSS | 200 | `application/json` |
| NASA EONET | 200 | JSON body (content-type may be mislabeled) |
| ECB EXR CSV | 200 | `text/csv` (kept P1 as expansion beyond existing FX) |
| ISO 10383 MIC XLS | 200 | Excel composite document ~1.7 MB |
| Bank of Russia XML | 200 | `text/xml` daily FX (kept P1 for compliance review) |
| SMARD index/chart | 200 | JSON power series (kept P1 for contract/license review) |
| Swiss SECO sanctions | 200 | XHTML interstitial, not sanctions XML |
| Australia DFAT XLSX | timeout / fail | no usable file body in this environment |

Re-run these probes before implementation because anonymous-access and version policies can change.
