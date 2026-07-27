# New sources, endpoints, and scraping candidates

Last reviewed: 2026-07-27 UTC

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

**New in this review (2026-07-27):** Bank of Portugal BPstat, BanRep Colombia FX market, BCRP Peru
series API, Bank of Israel Edge SDMX FX, Croatian National Bank FX API, Statistics Denmark Statbank
(`DNVALD`/`DNRENTD`), IBGE SIDRA, Argentina datos.gob.ar series, INE Portugal JSON indicators,
Swiss FSO PxWeb, Statistics Iceland PxWeb, Poland GUS BDL API, ERCOT public dashboards, INFORM
Risk Index, Climate Watch NDC content, Companies House free company data product, LittleSis entity
API, and World Bank International Debt Statistics. Prior P0 anchors (Canada SEMA, UK Sanctions,
GLEIF, OpenFIGI, ESMA FIRDS/FITRS, NASDAQ Trader, TreasuryDirect, FINRA short volume, and several
FX/power/stats sources) were re-verified live. **HKMA monetary-base timed out** on this run (still
treat as flaky/re-pin). Swiss SECO sanctions still XHTML interstitial; ASX `shortsell.txt` still
bot-challenge HTML.

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

### 66. BanRep Colombia FX market *(new)*

- **Value:** real-time Colombian peso (TRM-style) FX market prints from Banco de la República —
  LatAm FX coverage beyond BCRA/BCB.
- **Entry point:** `GET https://totoro.banrep.gov.co/estadisticas-economicas/rest/consultaDatosService/consultaMercadoCambiario`
- **Access:** no authentication; JSON array of `[epoch_ms, rate]` pairs (~1.1k points on probe).
- **Implementation:** append-only ingest keyed by timestamp; downsample to OHLC for storage if
  needed; keep raw ticks for microstructure.
- **Risk:** undocumented REST surface under `totoro.banrep.gov.co` — pin path and add a canary.

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

## P1 — high value after P0

| Candidate | Representative endpoint or docs | Why it is not P0 |
|---|---|---|
| ECB Data Portal beyond FX | `https://data-api.ecb.europa.eu/service/data/EXR/D.USD.EUR.SP00.A?lastNObservations=3&format=csvdata` | Existing registry already has ECB FX. Expand monetary aggregates / securities only after a dataflow allowlist. |
| Banque de France Webstat | `https://webstat.banque-france.fr/api/explore/v2.1/catalog/datasets?limit=1` | Large Opendatasoft catalog; curate a short allowlist first. |
| Destatis GENESIS REST *(new)* | `https://genesis.destatis.de/genesisWS/rest/2020/` | Guest `logincheck` works, but catalogue/data calls returned Code 15 auth-header errors in this environment — needs Destatis-documented token/header fixture before P0. |
| db.nomics | `https://api.db.nomics.world/v22/providers` | Prefer primary publishers in P0; use for discovery/gap-fill. |
| ISO 10383 MIC list | `https://www.iso20022.org/sites/default/files/ISO10383_MIC/ISO10383_MIC.xls` | Anonymous XLS; confirm ISO/Swift redistribution terms. |
| Bank of Russia daily FX | `https://www.cbr.ru/scripts/XML_daily.asp` | Anonymous XML works; compliance/authorization review required first. |
| Bulgarian National Bank FX | `https://www.bnb.bg/.../index.htm?download=xml&lang=EN` | XML body works, but TLS certificate verification failed in this environment (`curl -k` required). Fix trust-store / alternate CDN before P0. |
| MNB Hungary SOAP FX | `https://www.mnb.hu/arfolyamok.asmx?WSDL` | WSDL is live; HTML interstitial interfered with a simple SOAP POST from this environment. Needs a dedicated SOAP client fixture. |
| UK ONS datasets beta | `https://api.beta.ons.gov.uk/v1/datasets` | Beta API live; pick concrete dataset IDs/editions first. Old timeseries API is gone. |
| Germany SMARD chart API | `https://www.smard.de/app/chart_data/410/DE/index_quarterhour.json` | Anonymous JSON works but looks UI-oriented; confirm license/stability. |
| Zillow Research ZHVI | Zillow public research CSVs | Commercial reuse terms need review; FHFA/Freddie/CSO should lead. |
| FDIC BankFind Suite | `https://api.fdic.gov/banks/institutions?limit=1&format=json` | Anonymous now; official site announces a future API-key requirement — resolve transition timing. |
| IMF PortWatch | `https://portwatch.imf.org/api/search/v1/catalog` | Catalog-first; pin underlying ArcGIS feature services. |
| OECD Data Explorer | `https://sdmx.oecd.org/public/rest/v1/data/` | Overlap with IMF/World Bank/ILO; select differentiated datasets. |
| NASA POWER | `https://power.larc.nasa.gov/api/temporal/daily/point?...` | No-key; needs caching and a clear use case vs ERA5. |
| Federal Register | `https://www.federalregister.gov/api/v1/documents.json?per_page=1&order=newest` | Strong regulatory feed; legal views must link govinfo editions. |
| CFPB complaints | consumerfinance.gov complaint search/bulk | Privacy review; prefer official bulk dataset. |
| CPSC recalls | `https://www.saferproducts.gov/RestWebServices/Recall?format=json` | Narrower financial relevance; unusual paging. |
| openFDA enforcement | `https://api.fda.gov/drug/enforcement.json?limit=1` | Anonymous low ceilings; free key raises limits. |
| NHTSA recalls | `https://api.nhtsa.gov/recalls/recallsByVehicle?...` | Needs make/model/year catalog design. |
| NVD CVE 2.0 | `https://services.nvd.nist.gov/rest/json/cves/2.0?...` | Prefers API key / tight rate limits; after KEV+EPSS. |
| OSV.dev / deps.dev | `https://api.osv.dev/v1/vulns/...`, `https://api.deps.dev/v3/...` | Package-security enrichment after KEV. |
| OpenSanctions bulk | `https://data.opensanctions.org/datasets/latest/default/index.json` | Multi-GB mixed-license aggregate; prefer official national lists first. |
| DefiLlama / Fear & Greed / CoinPaprika / mempool.space | various public JSON | Useful crypto complements; confirm ToS and overlap with CoinGecko-backed `crypto`. |
| GB Carbon Intensity | `https://api.carbonintensity.org.uk/intensity` | Easy GB-only signal; overlaps Elexon. |
| NOAA CO-OPS / Aviation Weather / Open-Meteo / USGS Waterservices | various | Strong physical overlays after station/product catalog design. |
| eCFR | `https://www.ecfr.gov/api/versioner/v1/versions/title-12.json` | Hierarchical legal modeling required. |
| Fintraffic Digitraffic | `https://tie.digitraffic.fi/api/weather/v1/stations/data` | Send `Digitraffic-User` + gzip; cache metadata. |
| Fraunhofer Energy-Charts | `https://api.energy-charts.info/public_power?country=de` | Validate licensing vs ENTSOG/Elexon/Energinet/Elia/SMARD/REE. |
| ClinicalTrials.gov v2 | `https://clinicaltrials.gov/api/v2/studies?pageSize=1` | Needs sponsor/entity resolution. |
| OpenFEMA | `https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?$top=1` | US-only overlap with GDACS/EM-DAT/EONET. |
| RTE eco2mix | Opendatasoft eco2mix datasets | Confirm dataset ID/license/revision behavior. |
| CAISO OASIS | `https://oasis.caiso.com/oasisapi/SingleZip` | ZIP-per-query; DST-safe keys; terms review. |
| HDX CKAN | `https://data.humdata.org/api/3/action/package_search?q=refugees&rows=1` | Select specific datasets, not the whole catalog. |
| FINRA OTC weekly summary | `https://api.finra.org/data/group/otcMarket/name/weeklySummary` | Confirm FINRA API terms/field dictionary; daily Reg SHO short volume is higher-priority P0. |
| Statistics Sweden SCB | `https://api.scb.se/OV0104/v1/doris/en/ssd` | PxWeb allowlisting; overlaps Riksbank for market series. |
| FEC OpenFEC | `https://api.open.fec.gov/v1/candidates/?per_page=1&api_key=DEMO_KEY` | Works with public `DEMO_KEY`, but still a key-shaped auth model — register a production key before scale. |

## P2 — investigate or scrape carefully

| Candidate | Access path | Investigation needed |
|---|---|---|
| World Bank debarred firms | https://www.worldbank.org/en/projects-operations/procurement/debarred-firms | Historical JSON URL now serves HTML app. Find official current file or allowed scrape. |
| CBO budget/economic projections | https://www.cbo.gov/data/budget-economic-data | Structured XLSX/CSV + RSS; schemas change — checksum file ingestion. |
| EBA risk dashboard / transparency | https://www.eba.europa.eu/.../risk-dashboard | Workbook/archive discovery and version handling. |
| UK DBT statistics | https://www.gov.uk/government/organisations/department-for-business-and-trade/about/statistics | Prefer CSV/ODS attachments over prose scraping. |
| AEMO NEMWeb | https://nemweb.com.au/ | Technically reachable; AEMO says not for commercial use — terms decision required. |
| Swiss SECO sanctions XML | `https://www.sesam.search.admin.ch/sesam-search-web/pages/downloadXmlGesamtliste.xhtml?lang=en&type=swiss` | Still returned XHTML interstitial on 2026-07-26, not sanctions XML. |
| Australia DFAT consolidated list | https://www.dfat.gov.au/.../consolidated-list | High value, but HTTPS fetch still failed/reset in this environment. |
| Atlanta Fed GDPNow / Cleveland Fed nowcasts | Fed indicator pages | Useful, but current links often resolve to HTML shells; Philly ADS is the clearer P0 nowcast-style file. |
| Our World in Data grapher CSV | `https://ourworldindata.org/grapher/<slug>.csv` | Presentation-oriented; prefer primary publishers. |
| Redfin Data Center weekly housing | S3 `redfin-public-data` | Huge objects; confirm schema/ToS; FHFA/Land Registry/Freddie/CSO first. |
| OCC equity options volume | `https://marketdata.theocc.com/volume-query` | Still requires undocumented `reportAction`/params (`Volume query type is required`). |
| Open Ownership / BODS | register/BODS hosts | Cloudflare HTML interstitial blocked anonymous JSON. |
| MAS Singapore APIs | `eservices.mas.gov.sg` | SORA/FX paths still portal HTML 404s — rediscover current API directory. |
| RBNZ / SARB statistical files | RBNZ / SARB portals | RBNZ site-unavailable HTML; SARB selected-rates path 404. |
| ASX short sales file | `https://www.asx.com.au/data/shortsell.txt` | Bot-challenge HTML on probe. |
| HKMA ER daily path rediscovery | former `er/er-st-exchange-rates-daily` | Monetary-base works; ER dataset path returned `E00001` — find replacement in HKMA catalog. |
| Yahoo Finance chart API | `https://query1.finance.yahoo.com/v8/finance/chart/AAPL` | Unofficial / ToS-hostile for redistribution. |
| Stooq daily CSV | `https://stooq.com/q/d/l/?s=aapl.us&i=d` | Bot-challenge HTML. |

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
   House free data product + LittleSis.
2. **US markets microstructure:** TreasuryDirect auctions + FINRA Reg SHO short volume + OFR +
   Chicago Fed NFCI + Philadelphia Fed ADS.
3. **Financial conditions and macro stats:** BIS + Eurostat + Statistics Canada + ABS +
   Bundesbank + SingStat + CBS Netherlands + INSEE + SSB + StatFin + INE Spain + CSO Ireland +
   DST Denmark + Swiss FSO + Statistics Iceland + GUS Poland + IBGE SIDRA + INE Portugal +
   BPstat + datos.gob.ar + World Bank IDS.
4. **Global FX prints:** RBA + Norges Bank + Riksbank + SNB + BCB PTAX + NBP + CNB + Danmarks
   Nationalbank (+ DST `DNVALD`) + NBU + BCRA + Banca d'Italia + NBR Romania + Bank of Lithuania
   + Bank of Latvia + Taiwan BOT + BanRep Colombia + BCRP Peru + Bank of Israel + HNB Croatia
   (+ rediscovered HKMA ER when available).
5. **Housing and credit:** FHFA HPI + Freddie Mac PMMS + UK Land Registry + CSO Ireland HPA02.
6. **Power and gas:** Elexon + ENTSOG + MIDAS + Energinet + Elia + REE Spain + ERCOT dashboards.
7. **Procurement and public spending:** TED + Find a Tender + SAM.gov + Grants.gov + USAspending
   + World Bank Projects.
8. **Cyber, physical, climate, and country risk:** CISA KEV + FIRST EPSS + NASA EONET + Climate
   TRACE + Climate Watch NDC + INFORM Risk.

For each adapter, expose source metadata, health, last successful observation/publisher time,
row counts, and parser failures before adding the source to the terminal registry.

## Verification record

These representative calls used a descriptive user agent, followed redirects, sent no credentials,
and downloaded the response body on 2026-07-27 UTC (unless noted as carried from 2026-07-26).

| Source | HTTP | Response type / observation |
|---|---:|---|
| Canada SEMA sanctions | 200 | `text/xml`; ~1.85 MB |
| UK Sanctions List CSV | 206/200 | ranged CSV OK |
| GLEIF | 200 | `application/vnd.api+json` |
| ESMA FIRDS Solr | 200 | JSON index with `download_link` |
| ESMA FITRS Solr | 200 | JSON index |
| NASDAQ listed | 200 | pipe-delimited text ~345 KB |
| TreasuryDirect auctioned | 200 | JSON |
| FINRA CNMS short volume (2026-07-24) | 200 | pipe text ~530 KB |
| Banca d'Italia latestRates | 200 | CSV/JSON rates |
| Bank of Portugal domains *(new)* | 200 | JSON catalog ~49 KB |
| BPstat dataset cube *(new)* | 200 | JSON-stat; 1019 non-null values |
| BanRep Colombia FX *(new)* | 200 | JSON ticks (~1126 pairs) |
| BCRP Peru series *(new)* | 200 | JSON periods/values |
| Bank of Israel EXR CSV *(new)* | 200 | SDMX CSV |
| HNB Croatia FX *(new)* | 200 | JSON daily table |
| DST subjects/tables *(new)* | 200 | JSON |
| DST DNVALD data POST *(new)* | 200 | JSON-stat; USD=657.08 |
| DST DNRENTD data POST *(new)* | 200 | CSV interest rates |
| IBGE SIDRA t/1737 *(new)* | 200 | JSON |
| datos.gob.ar series *(new)* | 200 | JSON |
| INE Portugal pindica *(new)* | 200 | JSON indicator payload |
| Swiss FSO PxWeb root *(new)* | 200 | JSON table list |
| Statistics Iceland PxWeb *(new)* | 200 | JSON topic tree |
| GUS BDL subjects/data *(new)* | 200 | JSON |
| ERCOT daily-prc / fuel-mix *(new)* | 200 | JSON dashboards |
| INFORM workflows/scores *(new)* | 200 | JSON; latest workflow 514 |
| Climate Watch NDC *(new)* | 200 | JSON |
| Companies House BasicCompanyData ZIP *(new)* | 200/206 | `application/zip` (2026-07-01 snapshot) |
| LittleSis search *(new)* | 200 | JSON API v2 |
| World Bank IDS DT.DOD.DECT.CD *(new)* | 200 | JSON |
| HKMA monetary-base | timeout | no body within 25–30s this run |
| Destatis Guest logincheck *(new)* | 200 | login OK as `GAST` |
| Destatis catalogue/tables *(new)* | 401 | Code 15 auth header not accepted |
| Swiss SECO sanctions | 200 | XHTML interstitial, not sanctions XML |
| ASX shortsell.txt | 200 | bot-challenge HTML |
| BCCh Chile SieteRest guest | 200 | `Invalid username or password` (credentialed) |
| Stats NZ open data root | 502 | Azure gateway error |
| MAS SORA/directory rediscovery | 404 | portal HTML |
| RBNZ selected XLSX | 403 | site-unavailable HTML |

Re-run these probes before implementation because anonymous-access and version policies can change.
