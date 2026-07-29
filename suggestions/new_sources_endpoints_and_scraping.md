# New sources, endpoints, and scraping candidates

Last reviewed: 2026-07-29 UTC

## Scope and ranking

This is an ingestion backlog for sources not already represented by the 51 entries in
`terminal/src/lib/source-registry.ts` or by the terminal's SEC, market, CFTC, BLS, BEA,
EIA, US Treasury Fiscal Data, and New York Fed reference-rate routes.

- **P0 — implement next:** high-value, credential-free, machine-readable, and verified live.
- **P1 — high value:** useful and generally free, but overlapping, changing, unusually complex,
  or requiring a terms/schema decision first.
- **P2 — investigate:** useful file feeds or scraping targets without a sufficiently stable
  machine contract.
- **P3 — not immediate:** gated, restrictive, duplicative, or too brittle for the current value.

HTTP 200 only proves anonymous technical access. Before production release, retain the source's
attribution and disclaimer, confirm redistribution rights, and add a source-specific rate policy.

**New in this review (2026-07-29):** ECB Data Portal (EXR + policy rate + yield curve CSV),
Federal Register documents API, FDIC BankFind institutions/failures, CFPB Consumer Complaint
search API, OpenFEMA disaster declarations, Statistics Sweden SCB PxWeb CPI, OECD SDMX CLI,
NOAA PSL climate indices (ONI/SOI/PDO), USGS monitored volcanoes, VoteView NOMINATE CSVs,
National Bank of Kazakhstan FX RSS, Central Bank of Azerbaijan daily FX XML, Bank Negara
Malaysia Open API (FX + rates), Statistics Estonia API, Statistics Slovenia SURS PxWeb,
Slovakia SOSR JSON-stat, Latvia CSB PxWeb, Atlanta Fed GDPNow workbook (new media path),
HDX CKAN package search, and DeFiLlama historical TVL. Prior P0 anchors (Canada SEMA, GLEIF,
ESMA FIRDS/FITRS, NASDAQ Trader, TreasuryDirect, FINRA CNMS 2026-07-28, Eurostat, BIS, BoC
Valet, OpenFIGI) were re-verified live. **BanRep Colombia `consultaMercadoCambiario` now serves
maintenance HTML** — keep in backlog but treat as offline until restored. INFORM scores path
confirmed as `.../countries/Scores?WorkflowId=514`. Swiss SECO still XHTML interstitial; ASX
short-sale CSV still bot-challenge HTML; Destatis guest catalogue/data still not usable here.

## P0 — implement next

### 1. Canada SEMA consolidated sanctions

- **Value:** official Canadian designations; fills the remaining G7-style gap beside existing US,
  EU, UN, and proposed UK sanctions coverage.
- **Entry point:** `GET https://www.international.gc.ca/world-monde/assets/office_docs/international_relations-relations_internationales/sanctions/sema-lmes.xml`
- **Docs / page:** https://www.international.gc.ca/world-monde/international-relations-relations-internationales/sanctions/index.aspx?lang=eng
- **Access:** no authentication; static XML snapshot (~1.85 MB).
- **Implementation:** stream and checksum the XML, upsert by stable record identifiers, preserve
  aliases and country/regime fields, and skip unchanged snapshots.
- **Terms/risk:** carry Global Affairs Canada attribution and confirm reuse terms. Do not replace
  a last-good snapshot with an empty parse.

### 2. UK Sanctions List

- **Value:** the official UK designation source; complements existing US, EU, and UN sanctions.
- **Entry point:** `GET https://sanctionslist.fcdo.gov.uk/docs/UK-Sanctions-List.csv`
- **Docs:** https://www.gov.uk/guidance/format-guide-for-the-uk-sanctions-list
- **Access:** no authentication; static CSV (~49 MB) plus XML/ODS/ODT/TXT/HTML/PDF.
- **Implementation:** stream the CSV, checksum snapshots, preserve aliases and identifiers, and
  upsert by the list's stable unique ID. Do not use the retired OFSI list.
- **Terms/risk:** carry UK attribution; a successful empty or sharply smaller snapshot must not
  replace the last good snapshot.

### 3. GLEIF legal entities and ownership

- **Value:** global LEIs, normalized legal names, addresses, registration status, mapped
  identifiers, and parent-child relationships.
- **Entry point:** `GET https://api.gleif.org/api/v1/lei-records?page%5Bsize%5D=1`
- **Golden Copy index:** `GET https://leidata-preview.gleif.org/api/v2/golden-copies/publishes`
- **Docs:** https://www.gleif.org/en/lei-data/gleif-api/
- **Access:** no authentication; JSON:API; LEI data under CC0.
- **Implementation:** URL-encode JSON:API bracket query params. Use API filters for lookup and
  Golden Copy files for full synchronization. Store LEI status and relationship validity intervals.
- **Risk:** no official fixed request quota; throttle and prefer bulk files at scale.

### 4. OpenFIGI identifier mapping

- **Value:** map tickers, CUSIPs, ISINs, and other market IDs to FIGI; pairs with GLEIF and
  NASDAQ Trader directories for instrument resolution.
- **Entry point:** `POST https://api.openfigi.com/v3/mapping` with JSON body
  `[{"idType":"TICKER","idValue":"AAPL","exchCode":"US"}]`
- **Docs:** https://www.openfigi.com/api
- **Access:** anonymous mapping works without a key at a low request rate; a free key raises limits.
- **Implementation:** cache positive and negative mappings, batch requests, and store FIGI,
  composite FIGI, share class FIGI, and security type.
- **Risk:** anonymous throughput is limited. Do not treat OpenFIGI as a full securities master.

### 5. ESMA FIRDS instrument reference data

- **Value:** EU MiFIR instrument reference data (ISIN, trading venue, CFI, notional currency,
  issuer LEI). Highest-value free securities master expansion after GLEIF/OpenFIGI.
- **Discovery:** `GET https://registers.esma.europa.eu/solr/esma_registers_firds_files/select?q=file_type:FULINS&rows=1&wt=json&sort=publication_date%20desc`
- **Download host:** `https://firds.esma.europa.eu/firds/`
- **Docs:** https://www.esma.europa.eu/publications-and-data/data/financial-instruments-reference-data-system-firds
- **Access:** no authentication; Solr JSON index plus daily ZIP files with MD5 checksums.
- **Implementation:** poll Solr, download new `FULINS` / delta files, verify checksum, unpack XML,
  upsert by ISIN + trading venue MIC + validity dates.
- **Risk:** full dumps are multi-file and large. Prefer deltas after first sync.

### 6. ESMA FITRS trading volumes

- **Value:** EU MiFIR trading volume / transparency reference files that complement FIRDS
  instrument master data (non-equity and equity full/delta packages).
- **Discovery:** `GET https://registers.esma.europa.eu/solr/esma_registers_fitrs_files/select?q=*&rows=1&wt=json`
- **Download example:** `https://fitrs.esma.europa.eu/fitrs/FULNCR_20260725_E_1of2.zip`
- **Docs:** https://www.esma.europa.eu/publications-and-data/data/financial-instruments-transparency-system-fitrs
- **Access:** no authentication; Solr index (~31k file docs on probe) with `download_link`,
  `file_name`, `instrument_type`, and `file_type`.
- **Implementation:** same pattern as FIRDS — poll index, download new ZIPs, checksum, parse, and
  upsert with file-level provenance. Start with a non-equity or equity allowlist.
- **Risk:** multi-part daily ZIPs; confirm ESMA redistribution terms.

### 7. NASDAQ Trader symbol directories

- **Value:** free US listing/traded-symbol master (ticker, security name, exchange, ETF flag,
  test-issue, financial status). Pairs with OpenFIGI and SEC CIK mapping.
- **Entry points:**
  - `GET https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt`
  - `GET https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqtraded.txt`
  - `GET https://www.nasdaqtrader.com/dynamic/SymDir/otherlisted.txt`
- **Docs:** https://www.nasdaqtrader.com/Trader.aspx?id=symbollookup
- **Access:** no authentication; pipe-delimited text (~0.3–1.0 MB each).
- **Implementation:** daily sync, skip `Test Issue=Y`, preserve listing exchange and ETF flags,
  and soft-delete symbols that disappear.
- **Risk:** confirm NASDAQ Trader redistribution terms; treat as reference data, not quotes.

### 8. HKEX List of Securities

- **Value:** Hong Kong listed-security master (equity, ETF, bonds, etc.) as an Asia venue
  complement to NASDAQ Trader / ESMA FIRDS.
- **Entry point:** `GET https://www.hkex.com.hk/eng/services/trading/securities/securitieslists/ListOfSecurities.xlsx`
- **Access:** no authentication; XLSX (~1.4 MB on probe).
- **Implementation:** checksum workbook, parse listing sheets, upsert by stock code + product type.
- **Terms/risk:** confirm HKEX terms; schema/sheet names can shift with exchange notices.

### 9. TreasuryDirect Auction API

- **Value:** official US Treasury auction announcements and results (CUSIP, term, rates,
  offering amount, auction/issue/maturity dates). Complements existing yield/debt series with
  auction microstructure.
- **Entry points:**
  - `GET https://www.treasurydirect.gov/TA_WS/securities/auctioned?format=json&pagesize=2`
  - `GET https://www.treasurydirect.gov/TA_WS/securities/search?format=json&pagesize=1&type=Bill`
- **Docs:** https://www.treasurydirect.gov/webapis/
- **Access:** no authentication; JSON.
- **Implementation:** incremental pull by `auctionDate` / CUSIP; store announcement vs result
  fields separately. Prefer `auctioned` over unbounded `search` (search can return very large bodies).
- **Risk:** large unfiltered search responses; always page and filter by security type/date.

### 10. FINRA daily Reg SHO short volume

- **Value:** daily exchange short-volume and total-volume by symbol — high-signal equity
  positioning complement to CFTC futures COT already in the terminal.
- **Entry point pattern:** `GET https://cdn.finra.org/equity/regsho/daily/CNMSshvolYYYYMMDD.txt`
- **Example verified:** `https://cdn.finra.org/equity/regsho/daily/CNMSshvol20260724.txt`
- **Docs:** https://www.finra.org/finra-data/browse-catalog/short-sale-volume-data
- **Access:** no authentication; pipe-delimited text (~0.5 MB/day).
- **Implementation:** discover previous business day file, parse Date/Symbol/ShortVolume/
  ShortExemptVolume/TotalVolume/Market, upsert by date+symbol.
- **Terms/risk:** confirm FINRA data terms; files appear on a T+1 cadence and 404 before publish.

### 11. Eurostat dissemination API

- **Value:** harmonized EU inflation, labor, trade, industry, population, energy, and fiscal data.
- **Entry point:** `GET https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/tec00114?geo=EU27_2020&sinceTimePeriod=2024`
- **Docs:** https://ec.europa.eu/eurostat/web/user-guides/data-browser/api-data-access/api-introduction
- **Access:** no authentication; JSON-stat, SDMX, TSV, and bulk downloads.
- **Implementation:** curated dataset allowlist; ingest code lists with observations; keep flags,
  units, seasonal adjustment, frequency, and geo-version dimensions.
- **Risk:** unconstrained multidimensional requests can be huge.

### 12. BIS Data Portal

- **Value:** central-bank policy rates, international banking, credit, debt securities,
  derivatives, property prices, and global liquidity.
- **Entry point:** `GET https://stats.bis.org/api/v2/data/dataflow/BIS/WS_CBPOL/1.0/?lastNObservations=1&format=csvfile`
- **Docs:** https://stats.bis.org/api-doc/v2/
- **Access:** no authentication; SDMX CSV, JSON, and XML.
- **Implementation:** ingest dataflow/DSD before observations; preserve SDMX dimensions; use bulk
  downloads for broad history.
- **Terms/risk:** include BIS attribution (https://www.bis.org/terms_statistics.htm).

### 13. OFR Short-term Funding Monitor

- **Value:** US repo, money-market funds, Treasury yields, New York Fed reference rates, and
  related short-term funding series in one JSON API.
- **Entry point:** `GET https://data.financialresearch.gov/v1/series/full?mnemonic=REPO-DVP_AR_OO-P`
- **Docs:** https://www.financialresearch.gov/short-term-funding-monitor/api/
- **Access:** no authentication.
- **Implementation:** mnemonic allowlist; store vintage/as-of metadata.
- **Risk:** mnemonic catalog changes; pin series IDs.

### 14. Chicago Fed National Financial Conditions Index

- **Value:** weekly NFCI / ANFCI financial-conditions composite.
- **Entry point:** `GET https://www.chicagofed.org/~/media/publications/nfci/nfci-data-series-csv.csv`
- **Docs:** https://www.chicagofed.org/research/data/nfci/current-data
- **Access:** no authentication; CSV.
- **Implementation:** checksum CSV; parse date + index columns; keep revisions.
- **Risk:** URL path uses sharepoint-style redirects; pin final URL after redirect.

### 15. Philadelphia Fed ADS business conditions

- **Value:** Aruoba-Diebold-Scotti daily real-activity index — high-frequency US macro pulse
  that is not covered by existing BLS/BEA routes.
- **Entry point:** `GET https://www.philadelphiafed.org/-/media/frbp/assets/surveys-and-data/ads/ads_index_most_current_vintage.xlsx`
- **Docs:** https://www.philadelphiafed.org/surveys-and-data/real-time-data-research/ads
- **Access:** no authentication; XLSX (~0.78 MB).
- **Implementation:** checksum workbook; parse date/index columns; retain vintage filename/date.
- **Risk:** workbook layout can change; add a fixture/canary.

### 16. Bank of Canada Valet

- **Value:** Canadian FX, rates, and macro series via a clean JSON API.
- **Entry point:** `GET https://www.bankofcanada.ca/valet/observations/FXUSDCAD/json?recent=3`
- **Docs:** https://www.bankofcanada.ca/valet-docs/
- **Access:** no authentication.
- **Implementation:** series allowlist; store observations with `d` date keys.
- **Risk:** polite rate limiting; cache series metadata.

### 17. Bank of England Statistical Database (IADB)

- **Value:** UK Bank Rate and broad BoE statistical series as CSV.
- **Entry point:** `GET https://www.bankofengland.co.uk/boeapps/iadb/fromshowcolumns.asp?csv.x=yes&Datefrom=01/Jan/2024&Dateto=01/Jul/2026&SeriesCodes=IUDBEDR&CSVF=TN&UsingCodes=Y&VPD=Y&VFD=N`
- **Docs:** https://www.bankofengland.co.uk/statistics
- **Access:** no authentication; CSV via `_iadb-fromshowcolumns.asp` (date format `DD/Mon/YYYY`,
  up to ~300 series codes).
- **Implementation:** treat HTML bodies with HTTP 200 as failures; parse true CSV only.
- **Risk:** parameter fragility; pin series codes.

### 18. Reserve Bank of Australia exchange rates

- **Value:** official AUD cross rates.
- **Entry point:** `GET https://www.rba.gov.au/statistics/tables/csv/f11.1-data.csv`
- **Docs:** https://www.rba.gov.au/statistics/exchange-rates/
- **Access:** no authentication; CSV.
- **Implementation:** checksum; normalize wide date columns.
- **Risk:** table codes can rename; watch RBA statistical-table notices.

### 19. ABS Australia Data API

- **Value:** Australian CPI and broader ABS economic statistics via SDMX-JSON.
- **Entry point:** `GET https://api.data.abs.gov.au/data/CPI/1.10001.10.5.Q?startPeriod=2023`
- **Docs:** https://www.abs.gov.au/about/data-services/application-programming-interfaces-apis/data-api-user-guide
- **Access:** no authentication.
- **Implementation:** dataflow allowlist; preserve SDMX dimensions.
- **Risk:** large unfiltered queries; prefer filtered pulls.

### 20. Norges Bank data API

- **Value:** NOK FX and Norwegian central-bank statistics (SDMX-JSON).
- **Entry point:** `GET https://data.norges-bank.no/api/data/EXR/B.USD.NOK.SP?format=sdmx-json&lastNObservations=3`
- **Docs:** https://www.norges-bank.no/en/topics/Statistics/open-data/
- **Access:** no authentication.
- **Implementation:** start with EXR; expand to selected macro dataflows later.

### 21. Sveriges Riksbank SWEA API

- **Value:** SEK FX and Swedish policy/market series.
- **Entry point:** `GET https://api.riksbank.se/swea/v1/Observations/SEKUSDPMI/2024-01-01`
- **Docs:** https://www.riksbank.se/en-gb/statistics/api/
- **Access:** no authentication; JSON.
- **Implementation:** series-ID allowlist; handle missing holidays.

### 22. Swiss National Bank data portal

- **Value:** CHF FX and Swiss macro cubes.
- **Entry point:** `GET https://data.snb.ch/api/cube/devgoa/data/json/en`
- **Docs:** https://data.snb.ch/en
- **Access:** no authentication; JSON cubes.
- **Implementation:** cube allowlist; preserve dimensions.

### 23. Deutsche Bundesbank SDMX

- **Value:** German/euro-area rates, prices, banking, and FX via SDMX-JSON.
- **Entry point:** `GET https://api.statistiken.bundesbank.de/rest/data/BBVK1/D.B10.EUR.BBK.S.W.DISCLIMA?lastNObservations=3` with `Accept: application/vnd.sdmx.data+json;version=1.0.0`
- **Docs:** https://www.bundesbank.de/en/statistics/time-series-databases
- **Access:** no authentication when Accept header is set correctly.
- **Implementation:** pin dataflow/key; store attributes and obs status.

### 24. National Bank of Poland FX

- **Value:** PLN fixings as simple JSON.
- **Entry point:** `GET https://api.nbp.pl/api/exchangerates/tables/A?format=json`
- **Docs:** https://api.nbp.pl/
- **Access:** no authentication.
- **Implementation:** tables A/B/C; store effective date + mid rates.

### 25. Czech National Bank daily FX

- **Value:** CZK daily fixings as pipe-delimited text.
- **Entry point:** `GET https://www.cnb.cz/en/financial-markets/foreign-exchange-market/central-bank-exchange-rate-fixing/central-bank-exchange-rate-fixing/daily.txt`
- **Docs:** https://www.cnb.cz/en/financial-markets/foreign-exchange-market/central-bank-exchange-rate-fixing/
- **Access:** no authentication.
- **Implementation:** parse header date + `|`-delimited rows; skip weekends/holidays cleanly.

### 26. Danmarks Nationalbank FX

- **Value:** DKK FX XML.
- **Entry point:** `GET https://www.nationalbanken.dk/api/currencyratesxml?lang=en`
- **Docs:** https://www.nationalbanken.dk/en/statistics
- **Access:** no authentication. Note: `api.nationalbanken.dk` JSON host was previously unreachable.
- **Implementation:** parse XML currencies; store date + rate + code.

### 27. NBU Ukraine FX

- **Value:** UAH official rates JSON.
- **Entry point:** `GET https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json`
- **Docs:** https://bank.gov.ua/en/statistic/sector-external
- **Access:** no authentication.
- **Implementation:** daily upsert by `cc` currency code + `exchangedate`.

### 28. BCRA Argentina FX

- **Value:** ARS official quotations.
- **Entry point:** `GET https://api.bcra.gob.ar/estadisticascambiarias/v1.0/Cotizaciones`
- **Docs:** https://www.bcra.gob.ar/Catalogo/apis.asp
- **Access:** no authentication.
- **Implementation:** use Cotizaciones v1.0; do **not** use deprecated
  `/estadisticas/v3.0/Monetarias` (HTTP 410).

### 29. HKMA Open API *(path change — re-pin)*

- **Value:** Hong Kong monetary and market statistics.
- **Working probe (2026-07-26):** `GET https://api.hkma.gov.hk/public/market-data-and-statistics/daily-monetary-statistics/daily-figures-monetary-base?pagesize=1`
- **Broken prior ER path:** `.../er/er-st-exchange-rates-daily` now returns `E00001` API not found.
- **Docs:** https://www.hkma.gov.hk/eng/data-publications/data/open-data/
- **Access:** no authentication for public Open API routes.
- **Implementation:** rediscover the current exchange-rate dataset path via HKMA open-data
  catalog; until then ingest monetary-base / still-listed endpoints only.
- **Risk:** dataset path churn — store path IDs in config, not hard-coded forever.

### 30. Banco Central do Brasil PTAX

- **Value:** official BRL PTAX FX.
- **Entry point:** `GET https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?@dataInicial='07-01-2026'&@dataFinalCotacao='07-24-2026'&$format=json`
- **Docs:** https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/documentacao
- **Access:** no authentication; OData JSON. Path dates use `MM-DD-YYYY`.
- **Implementation:** empty holiday windows are normal; do not treat as outage.

### 31. Banca d'Italia FX

- **Value:** official EUR cross rates from Banca d'Italia (172 currencies on probe) with an
  explicit non-benchmark disclaimer — strong euro-area FX print beside ECB.
- **Entry points:**
  - `GET https://tassidicambio.bancaditalia.it/terzevalute-wf-web/rest/v1.0/latestRates?lang=en`
  - `GET https://tassidicambio.bancaditalia.it/terzevalute-wf-web/rest/v1.0/dailyRates?referenceDate=2026-07-24&currencyIsoCode=USD&lang=en`
- **Docs:** https://tassidicambio.bancaditalia.it/
- **Access:** no authentication; JSON (`Accept: application/json`).
- **Implementation:** store `latestRates` / daily observations with Banca d'Italia notices; do not
  present as a Regulation (EU) 2016/1011 benchmark.
- **Risk:** rates are indicative with publication lag; retain the portal disclaimer.

### 32. National Bank of Romania FX

- **Value:** RON official FX XML.
- **Entry point:** `GET https://www.bnr.ro/nbrfxrates.xml`
- **Docs:** https://www.bnr.ro/Exchange-rates-15191.aspx
- **Access:** no authentication; compact XML.
- **Implementation:** parse `Cube` date + currency rates; daily upsert.

### 33. Bank of Lithuania FxRates

- **Value:** EUR FX web-service XML (current and historical).
- **Entry point:** `GET https://www.lb.lt/webservices/FxRates/FxRates.asmx/getCurrentFxRates?tp=EU`
- **Docs:** https://www.lb.lt/en/lb-api
- **Access:** no authentication; XML.
- **Implementation:** parse `FxRate` nodes (`Dt`, `Ccy`, `Amt`); support historical method for backfill.

### 34. Bank of Latvia FX

- **Value:** Latvian FX XML aligned with ECB reference publication.
- **Entry point:** `GET https://www.bank.lv/vk/ecb.xml`
- **Access:** no authentication; XML (`windows-1257` charset on probe).
- **Implementation:** decode charset correctly; upsert by date + currency.

### 35. Taiwan BOT daily FX CSV

- **Value:** TWD cash/spot FX from Bank of Taiwan (widely used Taiwan FX print).
- **Entry point:** `GET https://rate.bot.com.tw/xrt/flcsv/0/day`
- **Access:** no authentication; CSV.
- **Implementation:** parse tenor columns; store currency + bid/ask / spot fields; timezone = Asia/Taipei.
- **Risk:** confirm BOT redistribution terms; CSV header layout can change.

### 36. Statistics Canada Web Data Service

- **Value:** Canadian CPI, labour, trade, and national accounts vectors.
- **Entry point:** `POST https://www150.statcan.gc.ca/t1/wds/rest/getDataFromVectorsAndLatestNPeriods` with JSON body `[{"vectorId":41690914,"latestN":3}]`
- **Docs:** https://www.statcan.gc.ca/en/developers/wds
- **Access:** no authentication.
- **Implementation:** vector allowlist; store vector IDs and release metadata.

### 37. SingStat Table Builder

- **Value:** Singapore CPI and national statistics JSON.
- **Entry point:** `GET https://tablebuilder.singstat.gov.sg/api/table/tabledata/M212881`
- **Docs:** https://tablebuilder.singstat.gov.sg/
- **Access:** no authentication.
- **Implementation:** table-ID allowlist; preserve nested series keys.

### 38. Statistics Netherlands CBS OData

- **Value:** Dutch CPI, housing, labour, and trade tables via OData.
- **Entry point:** `GET https://opendata.cbs.nl/ODataApi/odata/83765NED`
- **Docs:** https://www.cbs.nl/en-gb/our-services/open-data
- **Access:** no authentication; OData JSON catalog + TypedDataSet.
- **Implementation:** pin table IDs; page TypedDataSet; store catalog metadata versions.

### 39. INSEE BDM SDMX

- **Value:** French official macro series (prices, labour, production) via SDMX.
- **Entry point:** `GET https://bdm.insee.fr/series/sdmx/data/SERIES_BDM/001688370?lastNObservations=3`
- **Docs:** https://www.insee.fr/en/information/2867888
- **Access:** no authentication; SDMX-ML.
- **Implementation:** series allowlist; parse StructureSpecificData; keep units/freq.

### 40. Statistics Norway SSB PxWeb

- **Value:** Norwegian housing prices, CPI, labour, and trade tables.
- **Entry point:** `GET https://data.ssb.no/api/v0/en/table/07241` (metadata); POST same URL with
  PxWeb JSON query for data.
- **Docs:** https://www.ssb.no/en/api
- **Access:** no authentication.
- **Implementation:** table-ID allowlist; POST bounded queries; avoid full-cube dumps.

### 41. Statistics Finland PxWeb

- **Value:** Finnish CPI, housing, and national accounts via PxWeb tree/API.
- **Entry point:** `GET https://pxdata.stat.fi/PxWeb/api/v1/en/StatFin/`
- **Docs:** https://stat.fi/en/statistics-finland
- **Access:** no authentication; JSON topic tree + table queries.
- **Implementation:** allowlist tables under `StatFin`; same PxWeb POST pattern as SSB/SCB.

### 42. INE Spain Tempus API

- **Value:** Spanish official statistics operations and table data JSON.
- **Entry point:** `GET https://servicios.ine.es/wstempus/js/EN/OPERACIONES_DISPONIBLES`
- **Docs:** https://www.ine.es/en/index.htm
- **Access:** no authentication; JSON.
- **Implementation:** discover operation IDs, then pull `DATOS_TABLA` / series endpoints for a
  curated CPI/labour/housing set.
- **Risk:** Spanish path names and operation IDs need fixtures; some table URLs 404 if IDs drift.

### 43. CSO Ireland PxStat housing

- **Value:** Irish residential property price/volume statistics (JSON-stat).
- **Entry point:** `GET https://ws.cso.ie/public/api.restful/PxStat.Data.Cube_API.ReadDataset/HPA02/JSON-stat/2.0/en`
- **Docs:** https://www.cso.ie/en/statistics/
- **Access:** no authentication; JSON-stat (~1.2 MB for HPA02 on probe).
- **Implementation:** start with HPA02; add CPI/labour cubes later; parse JSON-stat dimensions.

### 44. FHFA House Price Index

- **Value:** US house-price indices (purchase-only and broader measures).
- **Entry point:** `GET https://www.fhfa.gov/data/pmi/hpi_master.csv` (or current master CSV URL from FHFA data page)
- **Docs:** https://www.fhfa.gov/data/house-price-index
- **Access:** no authentication; large CSV (~19 MB).
- **Implementation:** stream + checksum; upsert by frequency/geo/index type.

### 45. Freddie Mac PMMS

- **Value:** US mortgage rate survey (30y/15y) widely used in housing/credit models.
- **Entry point:** current PMMS XLSX from https://www.freddiemac.com/pmms
- **Access:** no authentication; XLSX.
- **Implementation:** checksum; parse weekly history sheet; retain vintage.

### 46. UK Land Registry Price Paid

- **Value:** transaction-level UK residential prices (Linked Data JSON API + monthly files).
- **Entry point:** `GET http://landregistry.data.gov.uk/data/ppi/transaction-record.json?_pageSize=10`
- **Docs:** https://www.gov.uk/government/statistical-data-sets/price-paid-data-downloads
- **Access:** no authentication.
- **Implementation:** prefer monthly PPD files for bulk; use API for incremental queries.

### 47. ENTSOG gas transparency

- **Value:** European gas flow, point, and operator transparency data.
- **Entry point:** `GET https://transparency.entsog.eu/api/v1/operationaldatas?limit=1`
- **Docs:** https://transparency.entsog.eu/#/api
- **Access:** no authentication.
- **Implementation:** bounded point/operator queries; conservative rate limits.

### 48. California CEC MIDAS v2

- **Value:** California retail electricity rates and GHG intensity (`g/kWh CO2`).
- **Entry point:** public MIDAS v2 GET routes (no auth on probe).
- **Docs:** https://midas.energydata.cloud/
- **Access:** no authentication for public GETs.
- **Implementation:** pin signal IDs; store unit metadata.

### 49. EU TED procurement notices

- **Value:** EU public-procurement notices (eForms) via Search API.
- **Entry point:** anonymous JSON `POST` to TED Search API (publication/search).
- **Docs:** https://ted.europa.eu/
- **Access:** published Search API remains anonymous; submission APIs are keyed.
- **Implementation:** bounded date windows; store notice IDs and CPV/buyer fields.

### 50. UK Find a Tender OCDS

- **Value:** UK public contracts as OCDS JSON under OGL v3.
- **Entry point:** anonymous publication GET routes on Find a Tender.
- **Docs:** https://www.find-tender.service.gov.uk/
- **Access:** no authentication for publication GET.
- **Implementation:** OCDS release packages; incremental by `date` / `ocid`.

### 51. SAM.gov opportunities

- **Value:** US federal contract opportunities (GET opportunities API).
- **Entry point:** `GET https://sam.gov/api/prod/opps/v2/search?limit=1` (HAL+JSON)
- **Docs:** https://open.gsa.gov/api/get-opportunities-public-api/
- **Access:** public search works anonymously on probe; some routes may later require an API key —
  re-check before production.
- **Implementation:** page results; store notice ID, NAICS, department, posted date.

### 52. Grants.gov search API

- **Value:** US federal grant opportunities — complements SAM.gov contracts with assistance awards.
- **Entry point:** `POST https://api.grants.gov/v1/api/search2` with JSON body `{}` (or filtered params)
- **Docs:** https://www.grants.gov/api
- **Access:** no authentication on probe; returns JSON opportunity hits.
- **Implementation:** poll with date filters; store opportunity number, agency, CFDA, close date.
- **Risk:** confirm ToS and field stability; response includes a session token field — treat as opaque.

### 53. Elexon Insights Solution

- **Value:** GB electricity balancing, generation, and pricing.
- **Entry point:** Insights Solution public JSON routes.
- **Docs:** https://bmrs.elexon.co.uk/
- **Access:** no authentication for many public GETs.
- **Implementation:** pin dataset paths; respect rate limits.

### 54. Energinet Energi Data Service

- **Value:** Danish power/gas open data.
- **Entry point:** Energi Data Service OData/JSON catalog and datasets.
- **Docs:** https://www.energidataservice.dk/
- **Access:** no authentication.
- **Implementation:** dataset allowlist; page OData results.

### 55. Elia Open Data

- **Value:** Belgian transmission open data catalog + datasets.
- **Entry point:** Elia Open Data API catalog JSON.
- **Docs:** https://opendata.elia.be/
- **Access:** no authentication.
- **Implementation:** select load/generation/imbalance datasets first.

### 56. REE Spain electricity API

- **Value:** Spanish peninsular demand and electricity system series (JSON).
- **Entry point:** `GET https://apidatos.ree.es/en/datos/demanda/evolucion?start_date=2026-07-01T00:00&end_date=2026-07-02T00:00&time_trunc=day`
- **Docs:** https://www.ree.es/en/apidatos
- **Access:** no authentication.
- **Implementation:** bounded date windows; store indicator IDs and `last-update` timestamps.
- **Risk:** confirm REE terms; do not unbounded-pull high-resolution series.

### 57. USAspending

- **Value:** US federal award spending and agency references.
- **Entry point:** `GET https://api.usaspending.gov/api/v2/references/toptier_agencies/`
- **Docs:** https://api.usaspending.gov/docs/
- **Access:** no authentication. Note: `/api/v2/references/agency/` remains 404 — use `toptier_agencies`.
- **Implementation:** awards/spending endpoints with date filters; cache agency reference data.

### 58. World Bank Projects & Operations

- **Value:** World Bank project-level financing and status.
- **Entry point:** `GET https://search.worldbank.org/api/v2/projects?format=json&rows=1`
- **Docs:** https://datahelpdesk.worldbank.org/
- **Access:** no authentication.
- **Implementation:** incremental by `boardapprovaldate` / project ID.

### 59. Finnish PRH open company data

- **Value:** Finnish Trade Register / Business Information System companies — free Nordic
  entity master that complements GLEIF.
- **Entry point:** `GET https://avoindata.prh.fi/opendata-ytj-api/v3/companies?totalResults=true&maxResults=1`
- **Docs:** https://avoindata.prh.fi/
- **Access:** no authentication; JSON (~822k companies on probe).
- **Implementation:** page with `maxResults`; upsert by `businessId`; store names/status history.
- **Terms/risk:** confirm PRH open-data license; throttle bulk syncs.

### 60. Norwegian Brreg Enhetsregisteret

- **Value:** Norwegian legal-entity register (organizations, forms, links) as free JSON:API-like HAL.
- **Entry point:** `GET https://data.brreg.no/enhetsregisteret/api/enheter?size=1`
- **Docs:** https://data.brreg.no/
- **Access:** no authentication.
- **Implementation:** page `enheter`; follow `_links`; store organisasjonsnummer as primary key.
- **Terms/risk:** Brreg has published rate-limit expectations — cache and back off.

### 61. CISA Known Exploited Vulnerabilities

- **Value:** authoritative exploited-CVE catalog for cyber-risk overlays.
- **Entry point:** `GET https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json`
- **Docs:** https://www.cisa.gov/known-exploited-vulnerabilities-catalog
- **Access:** no authentication; JSON.
- **Implementation:** checksum catalog; upsert by CVE ID; retain `catalogVersion`.

### 62. FIRST EPSS

- **Value:** exploit-prediction scores for CVEs; pairs with CISA KEV.
- **Entry point:** `GET https://api.first.org/data/v1/epss?cve=CVE-2021-44228`
- **Bulk:** prefer daily compressed CSV for full syncs.
- **Docs:** https://www.first.org/epss/
- **Access:** no authentication.
- **Implementation:** daily bulk CSV + on-demand API enrichment.

### 63. NASA EONET v3

- **Value:** natural-event tracking (wildfires, storms, volcanoes) as GeoJSON-like JSON.
- **Entry point:** `GET https://eonet.gsfc.nasa.gov/api/v3/events?limit=5`
- **Docs:** https://eonet.gsfc.nasa.gov/docs/v3
- **Access:** no authentication. Content-Type may be mislabeled; parse JSON body anyway.
- **Implementation:** upsert by event ID; store geometries and categories.

### 64. Climate TRACE v6 emissions

- **Value:** independent country / sector greenhouse-gas emissions estimates — complements
  existing NOAA GHG concentration series with inventory-style CO2e totals.
- **Entry points:**
  - `GET https://api.climatetrace.org/v6/country/emissions`
  - `GET https://api.climatetrace.org/v6/country/emissions?countries=USA,CHN,DEU`
  - `GET https://api.climatetrace.org/v6/definitions/sectors`
- **Docs:** https://climatetrace.org/
- **Access:** no authentication; JSON.
- **Implementation:** pull country totals + sector definitions; store co2/ch4/n2o/co2e fields and ranks.
- **Terms/risk:** confirm Climate TRACE license/attribution; values are estimates, not UNFCCC inventories.

### 65. Bank of Portugal BPstat *(new)*

- **Value:** official Portuguese financial accounts, monetary/banking, and macro statistics via a
  documented JSON API — Mediterranean/euro-area complement to Eurostat, ECB, and INE Spain.
- **Entry points:**
  - `GET https://bpstat.bportugal.pt/data/v1/domains/?lang=EN`
  - `GET https://bpstat.bportugal.pt/data/v1/domains/{domain_id}/datasets/?lang=EN`
  - `GET https://bpstat.bportugal.pt/data/v1/domains/{domain_id}/datasets/{dataset_id}?lang=EN`
    (JSON-stat cube with `value` observations)
  - `GET https://bpstat.bportugal.pt/data/v1/series/?series_ids={id}&lang=EN` (series metadata)
- **Docs / portal:** https://bpstat.bportugal.pt/
- **Access:** no authentication; JSON / JSON-stat.
- **Implementation:** cache domain→dataset catalog; sync allowlisted datasets via JSON-stat cubes;
  store `obs_updated_at` for incremental refresh. Prefer dataset cubes over per-series polling.
- **Risk:** some deep path probes hit WAF HTML rejects; stick to the catalog/dataset/series routes
  above. Confirm Bank of Portugal redistribution terms.

### 66. BanRep Colombia FX market *(offline 2026-07-29 — keep for restore)*

- **Value:** real-time Colombian peso (TRM-style) FX market prints from Banco de la República —
  LatAm FX coverage beyond BCRA/BCB.
- **Entry point:** `GET https://totoro.banrep.gov.co/opendata/consultaMercadoCambiario`
  (alternate path previously used under `estadisticas-economicas/rest/...`).
- **Access:** no authentication when healthy; JSON array of `[epoch_ms, rate]` pairs (~1.1k points
  on 2026-07-27).
- **Implementation:** append-only ingest keyed by timestamp; downsample to OHLC for storage if
  needed; keep raw ticks for microstructure.
- **Risk:** on 2026-07-29 the endpoint returned maintenance HTML (`Sitio en Mantenimiento`). Keep
  adapter dark until JSON returns; pin path and add a canary that rejects HTML bodies.

### 67. BCRP Peru exchange-rate series *(new)*

- **Value:** official Peruvian sol interbank FX series from Banco Central de Reserva del Perú.
- **Entry points:**
  - `GET https://estadisticas.bcrp.gob.pe/estadisticas/series/api/PD04637PD/json` (USD buy)
  - `GET https://estadisticas.bcrp.gob.pe/estadisticas/series/api/PD04638PD/json/{start}/{end}` (USD sell)
- **Docs / portal:** https://estadisticas.bcrp.gob.pe/estadisticas/series/
- **Access:** no authentication; JSON body (Content-Type may be `text/html` — parse JSON anyway).
- **Implementation:** map series codes from the BCRP catalog; store buy/sell separately; date-range
  path for incremental pulls.
- **Risk:** Content-Type mismatch; series codes are opaque — keep a code→label dictionary.

### 68. Bank of Israel Edge SDMX FX *(new)*

- **Value:** official ILS cross rates via BOI Fusion Edge SDMX 2.x (CSV/JSON).
- **Entry point:** `GET https://edge.boi.gov.il/FusionEdgeServer/sdmx/v2/data/dataflow/BOI.STATISTICS/EXR/1.0?c%5BTIME_PERIOD%5D=ge%3A2026-07-20&format=csv`
- **Access:** no authentication; SDMX CSV with `SERIES_CODE`, `BASE_CURRENCY`, `COUNTER_CURRENCY`,
  `TIME_PERIOD`, `OBS_VALUE`.
- **Implementation:** URL-encode filter brackets; sync daily by `TIME_PERIOD`; upsert by series code
  + date. Prefer CSV for bulk, JSON for targeted keys once series keys are pinned.
- **Risk:** overly broad queries return large multi-currency CSVs — always filter by period/currency.

### 69. Croatian National Bank FX *(new)*

- **Value:** daily mid/bid/ask EUR-based FX table for Croatia (euro-area member).
- **Entry points:**
  - `GET https://api.hnb.hr/tecajn-eur/v3`
  - `GET https://api.hnb.hr/tecajn-eur/v3?datum=YYYY-MM-DD`
- **Docs:** https://api.hnb.hr/
- **Access:** no authentication; JSON array with `valuta`, `srednji_tecaj`, buy/sell fields.
- **Implementation:** daily snapshot; parse European decimal commas; upsert by date + currency ISO.
- **Risk:** numbers use comma decimals; date query may return latest if holiday — validate `datum_primjene`.

### 70. Statistics Denmark Statbank *(new)*

- **Value:** free JSON/JSON-stat/CSV API covering Danish macro tables, including Danmarks Nationalbank
  daily FX (`DNVALD`) and policy/interest rates (`DNRENTD`) hosted in Statbank.
- **Entry points:**
  - `GET https://api.statbank.dk/v1/subjects?lang=en`
  - `GET https://api.statbank.dk/v1/tables?lang=en`
  - `GET https://api.statbank.dk/v1/tableinfo/DNVALD?lang=en`
  - `POST https://api.statbank.dk/v1/data` with JSON body selecting table + variable codes
- **Docs:** https://www.dst.dk/en/Statistik/brug-statistikken/muligheder-i-statistikbanken/api
- **Access:** no authentication.
- **Implementation:** allowlist tables (`DNVALD`, `DNRENTD`, CPI/national accounts as needed);
  POST for extracts; store variable codes with labels from `tableinfo`.
- **Risk:** some older PRIS* CPI tables are inactive — discover active table IDs via `/tables`.
  Complements (does not replace) the existing Danmarks Nationalbank FX XML P0.

### 71. IBGE SIDRA Brazil *(new)*

- **Value:** Brazil's official statistical API (inflation, national accounts, labor, etc.) —
  complements BCB PTAX FX already in the backlog.
- **Entry point example:** `GET https://apisidra.ibge.gov.br/values/t/1737/n1/all/v/all/p/last%201?formato=json`
- **Docs:** https://apisidra.ibge.gov.br/
- **Access:** no authentication; JSON tables.
- **Implementation:** pin table IDs (IPCA `1737`, etc.); map territorial/variable codes; prefer
  `last N` / period filters over full history pulls.
- **Risk:** table IDs and parameter letters are SIDRA-specific — keep fixtures per table.

### 72. Argentina datos.gob.ar series API *(new)*

- **Value:** open Argentine time-series API (FX and macro) that pairs with BCRA FX prints.
- **Entry point:** `GET https://apis.datos.gob.ar/series/api/series/?ids=168.1_T_CAMBIOR_D_0_0_26&limit=3&format=json`
- **Docs:** https://apis.datos.gob.ar/series/
- **Access:** no authentication; JSON with `data` and series `meta`.
- **Implementation:** maintain an allowlist of series IDs; incremental by last observed date;
  join metadata catalog for titles/units.
- **Risk:** series IDs are long opaque strings — version the allowlist.

### 73. INE Portugal JSON indicators *(new)*

- **Value:** Statistics Portugal indicator JSON for trade, prices, and national accounts —
  complements Bank of Portugal BPstat.
- **Entry point:** `GET https://www.ine.pt/ine/json_indicador/pindica.jsp?op=2&varcd=0001739&lang=EN`
- **Access:** no authentication; JSON with `Dados` by year/geo.
- **Implementation:** pin `varcd` indicator codes from INE BDD; validate `Sucesso`/`Falso` error
  envelopes; upsert by indicator + geo + period.
- **Risk:** indicator codes go stale (`Cod:1` when missing); dimension codes (`Dim1`) must match
  the indicator meta. Prefer recent active indicators over discontinued trade series.

### 74. Swiss FSO PxWeb *(new)*

- **Value:** Federal Statistical Office Switzerland open PxWeb API (jobs, prices, accounts).
- **Entry points:**
  - `GET https://www.pxweb.bfs.admin.ch/api/v1/en/`
  - table meta under `.../api/v1/en/{dbid}`
- **Access:** no authentication; JSON PxWeb 2.0.
- **Implementation:** same PxWeb pattern as SSB/StatFin — discover tables, POST queries for
  selected cubes, cache metadata.
- **Risk:** table IDs (`px-x-...`) rotate with publications; pin allowlist + canary.

### 75. Statistics Iceland PxWeb *(new)*

- **Value:** Icelandic national accounts, prices, and external trade via PxWeb.
- **Entry point:** `GET https://px.hagstofa.is/pxen/api/v1/en/` (topic tree includes `Efnahagur`)
- **Access:** no authentication; JSON.
- **Implementation:** allowlist under `Efnahagur` (prices, national accounts, external trade);
  standard PxWeb POST extracts.
- **Risk:** Icelandic/English topic labels mixed — store both `id` and `text`.

### 76. Poland GUS Local Data Bank API *(new)*

- **Value:** Polish Central Statistical Office BDL REST API for national/regional indicators.
- **Entry points:**
  - `GET https://bdl.stat.gov.pl/api/v1/subjects?lang=en&page-size=1&format=json`
  - `GET https://bdl.stat.gov.pl/api/v1/data/by-variable/{id}?unit-level=0&year=2023&page-size=1&format=json&lang=en`
- **Docs:** https://api.stat.gov.pl/
- **Access:** no authentication for basic use; JSON HAL-style paging.
- **Implementation:** map subject→variable IDs; national `unit-level=0` first; page through results.
- **Risk:** some advanced endpoints may later require a free registered key — start with public
  routes verified here. Complements NBP FX already in P0.

### 77. ERCOT public power dashboards *(new)*

- **Value:** Texas grid real-time system conditions, fuel mix, and pricing dashboards — US ISO
  coverage without PJM/ISO-NE keys.
- **Entry points:**
  - `GET https://www.ercot.com/api/1/services/read/dashboards/daily-prc.json`
  - `GET https://www.ercot.com/api/1/services/read/dashboards/fuel-mix.json`
- **Access:** no authentication; JSON (~100 KB+).
- **Implementation:** poll on a short cadence with caching; store `lastUpdated`, condition state,
  fuel mix by type, and PRC fields. Treat as operational snapshots, not settlement-grade.
- **Terms/risk:** confirm ERCOT redistribution/display terms; schema is UI-oriented and can drift.

### 78. INFORM Risk Index *(new)*

- **Value:** JRC INFORM country risk scores (hazard, vulnerability, coping capacity) — geopolitics /
  country-overview enrichment beyond conflict event feeds.
- **Entry points:**
  - `GET https://drmkc.jrc.ec.europa.eu/inform-index/API/InformAPI/workflows`
  - `GET https://drmkc.jrc.ec.europa.eu/inform-index/API/InformAPI/countries/Scores?WorkflowId={id}&IndicatorId=INFORM`
- **Docs:** https://drmkc.jrc.ec.europa.eu/inform-index/
- **Access:** no authentication; JSON (scores payload ~2 MB).
- **Implementation:** resolve latest workflow (e.g. INFORM Risk 2026), pull country scores, map
  Iso3 codes carefully (API uses numeric/custom Iso3 fields — join via INFORM geography tables).
- **Risk:** Iso3 field is not always ISO-3166 alpha-3; keep INFORM's geography mapping table.

### 79. Climate Watch NDC content *(new)*

- **Value:** WRI Climate Watch structured NDC policy indicators by country — climate policy layer
  beside Climate TRACE emissions.
- **Entry point:** `GET https://www.climatewatchdata.org/api/v1/data/ndc_content?per_page=1`
- **Docs:** https://www.climatewatchdata.org/
- **Access:** no authentication; JSON (`data` + `meta`).
- **Implementation:** page through `ndc_content`; store `iso_code3`, indicator, category, value;
  join to country dimension. Historical emissions endpoints need correct `source_ids` from
  `/api/v1/data/historical_emissions/data_sources` before promoting that sub-API.
- **Terms/risk:** confirm WRI terms; NDC text fields can be long — normalize/truncate for tables.

### 80. Companies House free company data product *(new)*

- **Value:** full UK company master bulk dump without the key-gated Companies House REST API —
  pairs with GLEIF, PRH Finland, and Brreg Norway for entity coverage.
- **Entry points:**
  - Index: `https://download.companieshouse.gov.uk/en_output.html`
  - Snapshot example: `GET https://download.companieshouse.gov.uk/BasicCompanyDataAsOneFile-2026-07-01.zip`
  - Split parts: `BasicCompanyData-YYYY-MM-DD-part{n}_7.zip`
- **Access:** no authentication; ZIP of CSV (monthly snapshot naming).
- **Implementation:** scrape index for newest dated ZIP, stream download, checksum, upsert by
  company number; soft-delete dissolved companies on snapshot diff.
- **Terms/risk:** large files; follow Companies House free data product terms. Prefer bulk product
  over the key-required REST API (still P3).

### 81. LittleSis entity network *(new)*

- **Value:** free CC BY-SA entity/relationship graph (firms, funds, people) useful for ownership
  and influence overlays next to GLEIF/SEC holders.
- **Entry points:**
  - `GET https://littlesis.org/api/entities/{id}`
  - `GET https://littlesis.org/api/entities/search?q={query}`
- **Docs:** https://littlesis.org/api
- **Access:** no authentication; JSON API v2.
- **Implementation:** search→entity cache; store relationships with license attribution; do not
  treat as a complete securities master.
- **Terms/risk:** CC BY-SA share-alike obligations; rate-limit politely; coverage is US-centric and
  incomplete vs GLEIF.

### 82. World Bank International Debt Statistics *(new)*

- **Value:** external debt stocks and related IDS indicators — distinct from existing FinUties
  World Bank poverty/governance/education routes and from World Bank Projects (P0 #58).
- **Entry point:** `GET https://api.worldbank.org/v2/country/all/indicator/DT.DOD.DECT.CD?format=json&per_page=1&date=2022`
- **Docs:** https://datahelpdesk.worldbank.org/knowledgebase/articles/889392
- **Access:** no authentication; JSON.
- **Implementation:** allowlist IDS indicators (`DT.*`); pull by country/year; skip empty series
  (advanced economies often return null totals).
- **Risk:** sparse coverage for non-IDS reporters; keep indicator allowlist tight.


### 83. ECB Data Portal (EXR, policy rates, yield curve) *(new)*

- **Value:** official euro-area FX, key ECB interest rates, and yield-curve points via SDMX CSV —
  broader than the existing registry FX snapshot and free of credentials.
- **Entry points:**
  - `GET https://data-api.ecb.europa.eu/service/data/EXR/D.USD.EUR.SP00.A?lastNObservations=3&format=csvdata`
  - `GET https://data-api.ecb.europa.eu/service/data/FM/D.U2.EUR.4F.KR.MRR_FR.LEV?lastNObservations=3&format=csvdata`
  - `GET https://data-api.ecb.europa.eu/service/data/YC/B.U2.EUR.4F.G_N_A.SV_C_YM.SR_10Y?lastNObservations=3&format=csvdata`
- **Docs:** https://data.ecb.europa.eu/help/api/overview
- **Access:** no authentication; SDMX-CSV / XML / JSON.
- **Implementation:** curated dataflow allowlist (start with `EXR`, `FM`, `YC`); store KEY dimensions
  and `TIME_PERIOD`/`OBS_VALUE`; throttle and cache dataflow metadata.
- **Risk:** unconstrained queries are large; do not mirror the whole warehouse.

### 84. Federal Register API *(new)*

- **Value:** US federal rules, proposed rules, and notices — regulatory event feed that pairs with
  SEC/sanctions monitoring.
- **Entry points:**
  - `GET https://www.federalregister.gov/api/v1/documents.json?per_page=1&order=newest`
  - `GET https://www.federalregister.gov/api/v1/public-inspection-documents.json?per_page=1`
- **Docs:** https://www.federalregister.gov/developers/documentation/api/v1
- **Access:** no authentication; JSON.
- **Implementation:** incremental pull by `publication_date` / `document_number`; store agency,
  type, title, abstract, and HTML/PDF/full-text URLs. Link to GovInfo editions for legal text.
- **Risk:** high volume; filter by agency/type allowlist for first release.

### 85. FDIC BankFind Suite *(new)*

- **Value:** US bank institutions and historical failures — entity/risk coverage beyond SEC filings.
- **Entry points:**
  - `GET https://banks.data.fdic.gov/api/institutions?filters=STNAME:%22New%20York%22&fields=NAME,CERT,CITY,STALP,ACTIVE&limit=1&format=json`
  - `GET https://banks.data.fdic.gov/api/failures?fields=NAME,CERT,FAILDATE,COST&sort_by=FAILDATE&sort_order=DESC&limit=2&format=json`
- **Docs:** https://banks.data.fdic.gov/
- **Access:** no authentication today; JSON.
- **Implementation:** upsert institutions by `CERT`; sync failures incrementally by `FAILDATE`.
- **Risk:** FDIC has announced a future API-key transition — design the adapter so a key header
  can be added without schema changes.

### 86. CFPB Consumer Complaint Database *(new)*

- **Value:** structured US consumer finance complaints (product, issue, company, state, dates) —
  retail-finance stress signal.
- **Entry point:** `GET https://www.consumerfinance.gov/data-research/consumer-complaints/search/api/v1/?size=1&frm=0&no_aggs=true`
- **Bulk:** https://www.consumerfinance.gov/data-research/consumer-complaints/#download-the-data
- **Docs:** https://cfpb.github.io/api/ccdb/
- **Access:** no authentication; search JSON plus bulk CSV.
- **Implementation:** prefer bulk CSV for backfill; use search API for incremental updates. Store
  complaint ID, product, issue, company, state, date received/sent.
- **Terms/risk:** public dataset, but retain CFPB attribution and avoid republishing narrative text
  beyond what the bulk schema provides if privacy policy tightens.

### 87. OpenFEMA disaster declarations *(new)*

- **Value:** official US presidential disaster declarations — complements GDACS/EM-DAT with
  domestic incident metadata.
- **Entry point:** `GET https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?$top=1`
- **Docs:** https://www.fema.gov/about/openfema/api
- **Access:** no authentication; OData-style JSON.
- **Implementation:** upsert by `disasterNumber` + state; keep `declarationDate`, `incidentType`,
  and title fields. URL-encode `$` query params.
- **Risk:** US-only; some OpenFEMA datasets carry deprecation notices — pin v2 entity names.

### 88. Statistics Sweden SCB PxWeb *(new)*

- **Value:** Swedish CPI and broader official statistics via the same PxWeb pattern as Finland /
  Norway / Iceland already on the backlog.
- **Entry points:**
  - `GET https://api.scb.se/OV0104/v1/doris/en/ssd`
  - `GET https://api.scb.se/OV0104/v1/doris/en/ssd/PR/PR0101/PR0101A/KPI2020M` (table metadata)
  - `POST` same URL with JSON query (`ContentsCode` + recent `Tid`) → JSON data rows
- **Docs:** https://www.scb.se/en/services/open-data-api/
- **Access:** no authentication.
- **Implementation:** allowlist tables (start with CPI `KPI2020M`); POST for observations; store
  month keys and values. Verified sample: 2026M06 CPI fixed index `125.56`.
- **Risk:** table IDs/contents codes change — keep metadata canaries.

### 89. OECD SDMX (CLI / STES) *(new)*

- **Value:** OECD composite leading indicators and short-term economic statistics that differentiate
  from IMF/World Bank indicator families already in the terminal.
- **Entry points:**
  - `GET https://sdmx.oecd.org/public/rest/dataflow/OECD.SDD.STES/DSD_STES@DF_CLI?references=none`
  - `GET https://sdmx.oecd.org/public/rest/data/OECD.SDD.STES,DSD_STES@DF_CLI,/USA.M.LI...AA...H?startPeriod=2024&dimensionAtObservation=AllDimensions&format=csvfilewithlabels`
- **Docs:** https://www.oecd.org/en/data/insights/data-explainers/2024/09/api.html
- **Access:** no authentication; SDMX CSV/XML.
- **Implementation:** pin dataflow + key template; store labelled CSV columns; expand allowlist
  slowly.
- **Risk:** key length must match DSD dimensions (short keys return HTTP 422).

### 90. NOAA PSL climate indices *(new)*

- **Value:** ENSO/oceanic climate indices (ONI, SOI, PDO) as compact text series — high-signal
  climate context beyond temperature/sea-ice already in the registry.
- **Entry points:**
  - `GET https://psl.noaa.gov/data/correlation/oni.data`
  - `GET https://psl.noaa.gov/data/correlation/soi.data`
  - `GET https://psl.noaa.gov/data/correlation/pdo.data`
- **Docs:** https://psl.noaa.gov/data/climateindices/
- **Access:** no authentication; fixed-width / whitespace text.
- **Implementation:** checksum each file; parse year × month grids; treat `-99.99` as missing.
- **Risk:** layout is research-text, not JSON — add a strict parser fixture.

### 91. USGS monitored volcanoes *(new)*

- **Value:** current US volcano alert levels and aviation color codes — nature/disaster overlay
  beyond earthquakes and GDACS.
- **Entry point:** `GET https://volcanoes.usgs.gov/hans-public/api/volcano/getMonitoredVolcanoes`
- **Docs:** https://volcanoes.usgs.gov/hans-public/
- **Access:** no authentication; JSON array (~46 KB).
- **Implementation:** upsert by volcano number/`vnum`; store alert level, color code, lat/lon,
  and `sent_utc`.
- **Risk:** US-focused monitoring set; pair with GDACS for global coverage.

### 92. VoteView NOMINATE ideology series *(new)*

- **Value:** long-run US congressional ideology / party scores — political-economy context that
  is not covered by conflict feeds.
- **Entry points:**
  - `GET https://voteview.com/static/data/out/members/HSall_members.csv` (~6.2 MB)
  - `GET https://voteview.com/static/data/out/parties/HSall_parties.csv`
- **Docs:** https://voteview.com/data
- **Access:** no authentication; CSV.
- **Implementation:** checksum CSVs; upsert members by `icpsr` + congress; store nominate dims
  and party codes.
- **Terms/risk:** academic dataset — retain citation (Lewis et al. / Voteview).

### 93. National Bank of Kazakhstan FX RSS *(new)*

- **Value:** official KZT exchange-rate print for a large Central Asian market missing from the
  current FX backlog.
- **Entry point:** `GET https://nationalbank.kz/rss/rates_all.xml`
- **Access:** no authentication; RSS/XML (~17 KB).
- **Implementation:** parse RSS items into date × currency mid rates; daily upsert.
- **Risk:** RSS schema can drift; keep last-good snapshot.

### 94. Central Bank of Azerbaijan daily FX XML *(new)*

- **Value:** official AZN FX table as dated XML.
- **Entry point pattern:** `GET https://www.cbar.az/currencies/DD.MM.YYYY.xml`
- **Example verified:** `https://www.cbar.az/currencies/29.07.2026.xml`
- **Access:** no authentication; XML.
- **Implementation:** request previous business day if today is empty; parse `Valute` nodes;
  upsert by date + code.
- **Risk:** date-in-path discovery; weekends/holidays may 404 or reuse prior day.

### 95. Bank Negara Malaysia Open API *(new)*

- **Value:** Malaysian FX, base rates, interbank rates, and swaps via a versioned public JSON API.
- **Entry points** (send `Accept: application/vnd.BNM.API.v1+json`):
  - `GET https://api.bnm.gov.my/public/exchange-rate`
  - `GET https://api.bnm.gov.my/public/base-rate`
  - `GET https://api.bnm.gov.my/public/interest-rate`
  - `GET https://api.bnm.gov.my/public/interbank-swap`
- **Docs:** https://apikijangportal.bnm.gov.my/
- **Access:** no authentication; JSON with vendor media type.
- **Implementation:** require the Accept header; sync FX daily and rates snapshots; store
  buying/selling/middle rates by currency.
- **Risk:** path/version changes; some older path guesses 404 without the Accept header.

### 96. Statistics Estonia API *(new)*

- **Value:** Estonian official statistics tree (economy, population, environment) for Baltic
  macro coverage beside Bank of Estonia FX via ECB.
- **Entry point:** `GET https://andmed.stat.ee/api/v1/en/stat`
- **Docs:** https://www.stat.ee/en/find-statistics/open-data
- **Access:** no authentication; PxWeb-style JSON.
- **Implementation:** allowlist a small economy/CPI set; POST for observations like other PxWeb
  adapters.
- **Risk:** Estonian/English tree differences; pin table IDs.

### 97. Statistics Slovenia SURS PxWeb *(new)*

- **Value:** Slovenian official statistics tables via PxWeb JSON.
- **Entry point:** `GET https://pxweb.stat.si/SiStatData/api/v1/en/Data`
- **Access:** no authentication; large table index JSON (~900 KB).
- **Implementation:** do not ingest the full index daily — pin a short allowlist of macro tables
  and POST data queries.
- **Risk:** very large discovery payloads; cache the index infrequently.

### 98. Slovakia SOSR JSON-stat API *(new)*

- **Value:** Slovak official statistics as JSON-stat datasets.
- **Entry points:**
  - `GET https://data.statistics.sk/api/v2/collection?lang=en` (~668 datasets)
  - dataset example: `GET https://data.statistics.sk/api/v2/dataset/as1001rs/...`
- **Access:** no authentication; JSON-stat 2.0.
- **Implementation:** curated dataset allowlist; store update timestamps from dataset metadata.
- **Risk:** long nested dataset URLs; prefer collection-driven discovery then pin.

### 99. Latvia CSB PxWeb *(new)*

- **Value:** Latvian official statistics (population, labour, prices, etc.) completing Baltic
  coverage with Estonia and Bank of Latvia FX already listed.
- **Entry point:** `GET https://data.stat.gov.lv/api/v1/en/OSP_PUB`
- **Access:** no authentication; PxWeb JSON topic tree.
- **Implementation:** allowlist CPI/labour/population tables; standard PxWeb POST for data.
- **Risk:** same PxWeb contents-code fragility as other NSIs.

### 100. Atlanta Fed GDPNow *(new path)*

- **Value:** high-frequency US real-GDP nowcast workbook — pairs with Philadelphia Fed ADS already
  in P0.
- **Entry point:** `GET https://www.atlantafed.org/-/media/Project/Atlanta/FRBA/Documents/cqer/researchcq/gdpnow/GDPTrackingModelDataAndForecasts.xlsx`
- **Docs / page:** https://www.atlantafed.org/cqer/research/gdpnow
- **Access:** no authentication; XLSX (~10.8 MB on 2026-07-29).
- **Implementation:** checksum workbook; parse the nowcast/history sheet; retain vintage date
  from HTTP headers or filename.
- **Risk:** Atlanta Fed moved the media path under `/Project/Atlanta/FRBA/...` — monitor page
  links; old `/Documents/cqer/...` URLs 404.

### 101. HDX CKAN package API *(new)*

- **Value:** Humanitarian Data Exchange discovery API for crisis/refugee/food-security datasets
  that complement UNHCR/WFP registry sources with additional publisher files.
- **Entry points:**
  - `GET https://data.humdata.org/api/3/action/package_search?q=conflict&rows=1`
  - `GET https://data.humdata.org/api/3/action/package_show?id=<package_name>`
- **Docs:** https://docs.humdata.org/
- **Access:** no authentication; CKAN JSON.
- **Implementation:** do **not** mirror HDX wholesale — maintain an allowlist of package IDs and
  ingest their resource URLs (CSV/GeoJSON) with checksum skip-unchanged.
- **Risk:** heterogeneous schemas and licenses per dataset; enforce per-resource terms.

### 102. DeFiLlama historical chain TVL *(new)*

- **Value:** free DeFi TVL history as a crypto-market complement to the existing CoinGecko-backed
  `crypto` prices route.
- **Entry points:**
  - `GET https://api.llama.fi/v2/historicalChainTvl/Ethereum`
  - `GET https://api.llama.fi/protocols` (large protocol catalog)
- **Docs:** https://defillama.com/docs/api
- **Access:** no authentication; JSON.
- **Implementation:** start with a small chain allowlist (Ethereum, Bitcoin/sidechains as
  published); store `date` epoch + `tvl`; avoid daily full `/protocols` dumps.
- **Terms/risk:** confirm DefiLlama terms; `/protocols` is multi-MB — cache rarely.

## P1 — high value after P0

| Candidate | Representative endpoint or docs | Why it is not P0 |
|---|---|---|
| Banque de France Webstat | `https://webstat.banque-france.fr/api/explore/v2.1/catalog/datasets?limit=1` | Catalog live (~42k datasets) but many series return empty `records`; curate working dataset IDs / alternate export paths before P0. |
| Destatis GENESIS REST | `https://www-genesis.destatis.de/genesisWS/rest/2020/` | Guest paths currently return HTML app shells / redirects here; still needs a documented token/header fixture. |
| db.nomics | `https://api.db.nomics.world/v22/providers` | Prefer primary publishers in P0; use for discovery/gap-fill. |
| ISO 10383 MIC list | `https://www.iso20022.org/sites/default/files/ISO10383_MIC/ISO10383_MIC.xls` | Anonymous XLS; confirm ISO/Swift redistribution terms. |
| Bank of Russia daily FX | `https://www.cbr.ru/scripts/XML_daily.asp` | Anonymous XML works; compliance/authorization review required first. |
| Bulgarian National Bank FX | `https://www.bnb.bg/...` XML download | XML body works with TLS verify disabled here previously; fix trust-store before P0. |
| MNB Hungary SOAP FX | `https://www.mnb.hu/arfolyamok.asmx?WSDL` | Needs a dedicated SOAP client fixture. |
| UK ONS datasets beta | `https://api.beta.ons.gov.uk/v1/datasets` | Beta API live; pick concrete dataset IDs/editions first. |
| Germany SMARD chart API | `https://www.smard.de/app/chart_data/410/DE/index_quarterhour.json` | Anonymous JSON works but looks UI-oriented; confirm license/stability. |
| Zillow Research ZHVI | Zillow public research CSVs | Commercial reuse terms need review; FHFA/Freddie/CSO should lead. |
| IMF PortWatch | `https://portwatch.imf.org/api/search/v1/catalog` | Catalog-first; pin underlying ArcGIS feature services. |
| NASA POWER | `https://power.larc.nasa.gov/api/temporal/daily/point?...` | No-key; needs caching and a clear use case vs ERA5. |
| CPSC recalls | `https://www.saferproducts.gov/RestWebServices/Recall?format=json` | Narrower financial relevance; unusual paging. |
| openFDA enforcement | `https://api.fda.gov/drug/enforcement.json?limit=1` | Anonymous low ceilings; free key raises limits. |
| NHTSA recalls | `https://api.nhtsa.gov/recalls/recallsByVehicle?...` | Needs make/model/year catalog design. |
| NVD CVE 2.0 | `https://services.nvd.nist.gov/rest/json/cves/2.0?...` | Prefers API key / tight rate limits; after KEV+EPSS. |
| OSV.dev / deps.dev | `https://api.osv.dev/v1/vulns/...`, `https://api.deps.dev/v3/...` | Package-security enrichment after KEV. |
| OpenSanctions bulk | `https://data.opensanctions.org/datasets/latest/default/entities.ftm.json` | Multi-GB mixed-license NDJSON aggregate (~verified reachable); prefer official national lists first. |
| Fear & Greed / mempool.space / CoinPaprika | `https://api.alternative.me/fng/?limit=3`, `https://mempool.space/api/v1/fees/recommended` | Verified live; useful crypto sentiment/fees after DeFiLlama TVL P0. Confirm ToS. |
| GB Carbon Intensity | `https://api.carbonintensity.org.uk/intensity` | Easy GB-only signal; overlaps Elexon. |
| NOAA CO-OPS / Aviation Weather / Open-Meteo / USGS Waterservices | various | Strong physical overlays after station/product catalog design. |
| eCFR | `https://www.ecfr.gov/api/versioner/v1/versions/title-12.json` | Hierarchical legal modeling required. |
| Fintraffic Digitraffic | `https://tie.digitraffic.fi/api/weather/v1/stations/data` | Send `Digitraffic-User` + gzip; cache metadata. |
| Fraunhofer Energy-Charts | `https://api.energy-charts.info/public_power?country=de` | Validate licensing vs ENTSOG/Elexon/Energinet/Elia/SMARD/REE. |
| ClinicalTrials.gov v2 | `https://clinicaltrials.gov/api/v2/studies?pageSize=1` | Needs sponsor/entity resolution. |
| RTE eco2mix | Opendatasoft eco2mix datasets | Confirm dataset ID/license/revision behavior. |
| CAISO OASIS | `https://oasis.caiso.com/oasisapi/SingleZip` | ZIP-per-query; DST-safe keys; terms review. |
| FINRA OTC weekly summary | `https://api.finra.org/data/group/otcMarket/name/weeklySummary` | Confirm FINRA API terms/field dictionary; daily Reg SHO short volume is higher-priority P0. |
| FEC OpenFEC | `https://api.open.fec.gov/v1/candidates/?per_page=1&api_key=DEMO_KEY` | Works with public `DEMO_KEY`, but still a key-shaped auth model — register a production key before scale. |
| ECDC open data (COVID historical) | `https://opendata.ecdc.europa.eu/covid19/nationalcasedeath/json/` | Anonymous multi-MB JSON still live; lower incremental value post-emergency — niche health backfill. |
| Frankfurter ECB redistributor | `https://api.frankfurter.app/latest?from=USD&to=EUR,GBP` | Convenient, but prefer primary ECB Data Portal P0. |

## P2 — investigate or scrape carefully

| Candidate | Access path | Investigation needed |
|---|---|---|
| World Bank debarred firms | https://www.worldbank.org/en/projects-operations/procurement/debarred-firms | Historical JSON URL now serves HTML app. Find official current file or allowed scrape. |
| CBO budget/economic projections | https://www.cbo.gov/data/budget-economic-data | Captcha interstitial on probe (2026-07-29); structured XLSX/CSV + RSS when reachable. |
| EBA risk dashboard / transparency | https://www.eba.europa.eu/.../risk-dashboard | Workbook/archive discovery and version handling. |
| UK DBT statistics | https://www.gov.uk/government/organisations/department-for-business-and-trade/about/statistics | Prefer CSV/ODS attachments over prose scraping. |
| AEMO NEMWeb DispatchIS | `https://nemweb.com.au/Reports/Current/DispatchIS_Reports/` | Directory listing + ZIP files reachable (~577 files); AEMO terms may restrict commercial use — legal review before scrape. |
| Swiss SECO sanctions XML | `https://www.sesam.search.admin.ch/sesam-search-web/pages/downloadXmlGesamtliste.xhtml?lang=en&type=sanction` | Still returned XHTML interstitial on 2026-07-29, not sanctions XML. |
| Australia DFAT consolidated list | https://www.dfat.gov.au/.../consolidated-list | High value, but HTTPS fetch still failed/reset in this environment; data.gov.au search did not surface a clean DFAT resource. |
| Cleveland Fed inflation / yield-curve nowcasts | Fed indicator pages | Useful companions to GDPNow/ADS; pin durable file URLs. |
| Our World in Data grapher CSV | `https://ourworldindata.org/grapher/<slug>.csv` | Presentation-oriented; prefer primary publishers. |
| Redfin Data Center weekly housing | S3 `redfin-public-data` | Huge objects; confirm schema/ToS; FHFA/Land Registry/Freddie/CSO first. |
| OCC equity options volume | `https://marketdata.theocc.com/volume-query` | Still requires undocumented `reportAction`/params. |
| Open Ownership / BODS | register/BODS hosts | Cloudflare HTML interstitial blocked anonymous JSON. |
| MAS Singapore APIs | `eservices.mas.gov.sg` | SORA/FX paths still portal HTML 404s — rediscover current API directory. |
| RBNZ / SARB statistical files | RBNZ / SARB portals | RBNZ site-unavailable HTML; SARB selected-rates path 404. |
| ASX short sales file | `https://www.asx.com.au/data/shorts/ASXShortSelling.csv` / `shortsell.txt` | Bot-challenge HTML on probe. |
| HKMA ER daily path rediscovery | former `er/er-st-exchange-rates-daily` | ER dataset path previously `E00001`; monetary-base flaky — find replacement in HKMA catalog. |
| Banco de España statistics API | BDE API docs page | Docs HTML reachable; interactive series endpoints rejected/unavailable from this environment. |
| Yahoo Finance chart API | `https://query1.finance.yahoo.com/v8/finance/chart/AAPL` | Unofficial / ToS-hostile for redistribution. |
| Stooq daily CSV | `https://stooq.com/q/d/l/?s=spy.us&i=d` | Bot-challenge HTML. |

Scraping rules:

1. Prefer an official API, RSS/Atom feed, static CSV/JSON/XML, or structured workbook.
2. Save the source URL, retrieval time, checksum, content type, and publisher timestamp.
3. Respect robots.txt, terms, caching headers, and a source-specific minimum interval.
4. Parse from retained raw snapshots so schema fixes do not require re-scraping.
5. Add a fixture and a canary for selector/column drift; never replace good data with an empty parse.

## P3 — not immediate

- **Key-required statistical APIs:** FRED, BEA, EIA (`API_KEY_MISSING` confirmed 2026-07-26; still gated),
  Banxico SIE (token required), Ember Energy, OpenAQ v3, Congress.gov, GovInfo, CourtListener,
  Companies House REST API (bulk free data product is P0 instead), IATI Datastore, Japanese e-Stat (app ID), US Census International Trade
  (`Missing Key`), Fingrid Open Data (subscription key), PJM Data Miner, and ISO-NE web services.
  They may still be free, but they do not meet the preferred zero-credential deployment path.
- **GIE AGSI+ / ALSI:** European gas storage/LNG need registration + `x-key`.
- **ENTSO-E Transparency Platform:** production access needs a security token; exploit no-key
  regional sources (Elexon, Energinet, Elia, REE, MIDAS) first.
- **ReliefWeb API:** pre-approved `appname` required since November 2025.
- **WTO Stats / Timeseries API:** subscription key required.
- **UCDP / ACLED upstream APIs:** token-gated at source; terminal already exposes FinUties routes.
- **Commercial or unofficial market-data aggregators:** require explicit redistribution rights.
- **HTML-only news/search pages:** too volatile while official feeds remain available.
- **Duplicates of current coverage:** SEC EDGAR (including `company_tickers.json` and anonymous `data.sec.gov` companyfacts/XBRL — already in the terminal SEC stack), US Treasury
  Fiscal Data, New York Fed Markets reference rates, BLS (anonymous CPI probe still succeeds but
  is already wired), USGS earthquakes, NOAA weather alerts, OFAC, CFTC, CoinGecko, UN Comtrade,
  IMF indicator families mapped by registry `imf`, and existing World Bank indicator families.

## Suggested delivery slices

1. **Compliance and entity identity:** Canada SEMA + UK Sanctions + GLEIF + OpenFIGI + ESMA FIRDS
   + ESMA FITRS + NASDAQ Trader dirs + HKEX securities + PRH Finland + Brreg Norway + Companies
   House free data product + LittleSis + Federal Register.
2. **US markets microstructure & banking:** TreasuryDirect auctions + FINRA Reg SHO short volume +
   OFR + Chicago Fed NFCI + Philadelphia Fed ADS + Atlanta Fed GDPNow + FDIC BankFind + CFPB
   complaints.
3. **Financial conditions and macro stats:** ECB Data Portal + BIS + Eurostat + OECD CLI +
   Statistics Canada + ABS + Bundesbank + SingStat + CBS Netherlands + INSEE + SSB + StatFin +
   INE Spain + CSO Ireland + DST Denmark + Swiss FSO + Statistics Iceland + GUS Poland + IBGE
   SIDRA + INE Portugal + BPstat + datos.gob.ar + World Bank IDS + SCB Sweden + Statistics
   Estonia/Latvia/Slovenia/Slovakia.
4. **Global FX prints:** RBA + Norges Bank + Riksbank + SNB + BCB PTAX + NBP + CNB + Danmarks
   Nationalbank (+ DST `DNVALD`) + NBU + BCRA + Banca d'Italia + NBR Romania + Bank of Lithuania
   + Bank of Latvia + Taiwan BOT + BCRP Peru + Bank of Israel + HNB Croatia + NBK Kazakhstan +
   CBAR Azerbaijan + BNM Malaysia (+ BanRep Colombia when restored; rediscovered HKMA ER when
   available).
5. **Housing and credit:** FHFA HPI + Freddie Mac PMMS + UK Land Registry + CSO Ireland HPA02.
6. **Power and gas:** Elexon + ENTSOG + MIDAS + Energinet + Elia + REE Spain + ERCOT dashboards
   (+ AEMO only after terms clearance).
7. **Procurement and public spending:** TED + Find a Tender + SAM.gov + Grants.gov + USAspending
   + World Bank Projects.
8. **Cyber, physical, climate, and country risk:** CISA KEV + FIRST EPSS + NASA EONET + USGS
   volcanoes + NOAA PSL indices + Climate TRACE + Climate Watch NDC + INFORM Risk + OpenFEMA +
   HDX allowlisted packages + VoteView.
9. **Crypto market structure (free):** DeFiLlama chain TVL (+ Fear & Greed / mempool fees as P1
   follow-ons).

For each adapter, expose source metadata, health, last successful observation/publisher time,
row counts, and parser failures before adding the source to the terminal registry.

## Verification record

These representative calls used a descriptive user agent, followed redirects, sent no credentials,
and downloaded the response body on 2026-07-29 UTC (anchors re-checked; prior 2026-07-27 notes
retained where still accurate).

| Source | HTTP | Response type / observation |
|---|---:|---|
| Canada SEMA sanctions | 200 | `text/xml`; ~1.85 MB |
| GLEIF lei-records | 200 | JSON:API; ~3.39M LEIs in pagination meta |
| ESMA FIRDS Solr | 200 | JSON index with `download_link` |
| ESMA FITRS Solr | 200 | JSON index; `numFound` ~31605 |
| NASDAQ listed | 200 | pipe-delimited text ~345 KB |
| TreasuryDirect auctioned | 200 | JSON |
| FINRA CNMS short volume (2026-07-28) | 200 | pipe text ~534 KB |
| Eurostat tec00114 | 200 | JSON-stat |
| BIS WS_CBPOL CSV | 200 | SDMX CSV |
| Bank of Canada Valet FXUSDCAD | 200 | JSON |
| OpenFIGI mapping POST | 200 | JSON FIGI for AAPL |
| UK Sanctions List CSV | 200 | HEAD OK |
| ECB EXR / FM / YC CSV *(new)* | 200 | SDMX CSV |
| Federal Register documents *(new)* | 200 | JSON |
| FDIC institutions / failures *(new)* | 200 | JSON |
| CFPB complaints search *(new)* | 200 | JSON (~16.7M hits meta) |
| OpenFEMA DisasterDeclarationsSummaries *(new)* | 200 | JSON |
| SCB KPI2020M POST *(new)* | 200 | JSON; 2026M06=125.56 |
| OECD CLI USA CSV *(new)* | 200 | labelled SDMX CSV |
| NOAA PSL ONI/SOI/PDO *(new)* | 200 | text grids |
| USGS monitored volcanoes *(new)* | 200 | JSON ~46 KB |
| VoteView HSall_members *(new)* | 200 | CSV ~6.2 MB |
| NBK Kazakhstan FX RSS *(new)* | 200 | RSS/XML ~17 KB |
| CBAR Azerbaijan FX XML *(new)* | 200 | XML for 29.07.2026 |
| BNM exchange-rate *(new)* | 200 | JSON; 27 currencies with Accept header |
| Statistics Estonia root *(new)* | 200 | JSON topic tree |
| SURS Slovenia Data index *(new)* | 200 | JSON ~900 KB |
| SOSR Slovakia collection *(new)* | 200 | JSON-stat collection; 668 datasets |
| Latvia CSB OSP_PUB *(new)* | 200 | JSON topic tree |
| Atlanta Fed GDPNow XLSX *(new)* | 200 | XLSX ~10.8 MB (new media path) |
| HDX package_search *(new)* | 200 | CKAN JSON |
| DeFiLlama historicalChainTvl *(new)* | 200 | JSON history |
| Alternative.me FNG / mempool fees *(P1)* | 200 | JSON |
| INFORM Workflows + countries/Scores | 200 | JSON; workflow 514 |
| Bank of Portugal BPstat domains | 200 | JSON catalog |
| ERCOT fuel-mix | 200 | JSON dashboard |
| World Bank IDS DT.DOD.DECT.CD | 200 | JSON (country+date filter) |
| Companies House BasicCompanyData ZIP | 200 | HEAD OK (2026-07-01 snapshot) |
| LittleSis search | 200 | JSON API v2 |
| CISA KEV | 200 | JSON catalog 2026.07.27 |
| FIRST EPSS | 200 | JSON |
| Climate TRACE v6 country emissions | 200 | JSON |
| BanRep consultaMercadoCambiario | 200 | **maintenance HTML** (was JSON on 2026-07-27) |
| Destatis guest logincheck | 200 | HTML app shell / redirect — not usable JSON API here |
| Swiss SECO sanctions | 200 | XHTML interstitial, not sanctions XML |
| ASX short-sale CSV/txt | 200 | bot-challenge HTML |
| Stats NZ open data root | 502 | Azure gateway error |
| Stooq daily CSV | 200 | bot-challenge HTML |
| OpenSky states/all | err/empty | unreachable this run |
| DFAT consolidated list | err/empty | TLS/reset from this environment |

Re-run these probes before implementation because anonymous-access and version policies can change.
