# New sources, endpoints, and scraping candidates

Last reviewed: 2026-08-02 UTC

## Scope and ranking

This is an ingestion backlog for sources not already represented by the 51 entries in
`terminal/src/lib/source-registry.ts` or by the terminal's SEC, market, CFTC, BLS, BEA,
EIA REST, US Treasury Fiscal Data, and New York Fed reference-rate routes. Free EIA *file*
downloads (XLS/CSV) remain P0 below because they need no API key. Fiscal Data REST
(`debt_to_penny`, average interest rates) remains out of scope as already covered by the
terminal Treasury stack, even though anonymous JSON still works.

- **P0 — implement next:** high-value, credential-free, machine-readable, and verified live.
- **P1 — high value:** useful and generally free, but overlapping, changing, unusually complex,
  or requiring a terms/schema decision first.
- **P2 — investigate:** useful file feeds or scraping targets without a sufficiently stable
  machine contract.
- **P3 — not immediate:** gated, restrictive, duplicative, or too brittle for the current value.

HTTP 200 only proves anonymous technical access. Before production release, retain the source's
attribution and disclaimer, confirm redistribution rights, and add a source-specific rate policy.

**New in this review (2026-08-02):** US Treasury TIC major foreign holders (`mfh.txt` /
`mfhhis01.txt`), IMF PortWatch Daily Chokepoints ArcGIS (promoted from P1), SIPRI military
expenditure workbook, EIA natural-gas storage history XLS (extends #131; weekly `ngs.csv`
still 403), NYISO public LMP/fuel-mix CSVs, IESO Ontario generation-capability XML, UK Carbon
Intensity + generation mix (promoted), MET Norway locationforecast/airquality, Bright Sky
(DWD) observations, UN SDG Global Database API (curated series), and OSV.dev vulnerability
lookup (promoted). Prior P0 anchors re-verified (Canada SEMA HEAD 200, UK Sanctions HEAD 200,
GLEIF ~3.39M LEIs with golden-copy date 2026-08-02, BoC Valet, BanRep via `totoro.banrep.gov.co`,
FRED `fredgraph.csv` DGS10, LBMA gold_am, NBG Georgia, BCB SGS Selic, EIA WPSR table1, FINRA
CNMS `equity/regsho/daily` 20260731 ~534 KB, OCC volume-query HEAD 200, CBOE historical `_VIX`,
ISO MIC CSV ~492 KB, GSCPI/Atlanta wage/Census FT-900/tradehalts/SF Fed XLSX, Coinbase/Kraken/
Bitstamp/L2Beat/DeFiLlama, CISA KEV, EPSS, Eurostat, BIS, OFR repo, ESMA FIRDS, TreasuryDirect,
OpenFIGI). **Path notes:** `www.banrep.gov.co/.../consultaMercadoCambiario` now 404 — keep
`totoro.banrep.gov.co`; FINRA `equity/otcmarket/ip/CNMSshvol*.txt` is AccessDenied — keep
`equity/regsho/daily/`. **OTC Markets** www screener timed out / failed from this environment
(prior run ~18.1k); leave listed but re-probe before build. Swiss SECO still XHTML interstitial;
Destatis guest still HTML shell; MAS 404; Stats NZ/RBNZ unavailable; Binance geo-451; Bybit
CloudFront country-blocked.

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
- **Example verified:** `https://cdn.finra.org/equity/regsho/daily/CNMSshvol20260731.txt` (~534 KB; re-verified 2026-08-02). Do **not** use `equity/otcmarket/ip/CNMSshvol*.txt` (S3 AccessDenied).
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

### 66. BanRep Colombia FX market *(restored 2026-07-31)*

- **Value:** real-time Colombian peso (TRM-style) FX market prints from Banco de la República —
  LatAm FX coverage beyond BCRA/BCB.
- **Entry point (re-verified 2026-08-02):**
  `GET https://totoro.banrep.gov.co/estadisticas-economicas/rest/consultaDatosService/consultaMercadoCambiario`
  (~38 KB JSON array of `[epoch_ms_string, rate_string]` pairs on probe). Prefer this host —
  `www.banrep.gov.co/.../consultaMercadoCambiario` returns Drupal 404 HTML as of 2026-08-02.
- **Access:** no authentication; JSON live on `totoro` after prior maintenance HTML outages.
- **Implementation:** append-only ingest keyed by timestamp; downsample to OHLC for storage if
  needed; keep raw ticks for microstructure; canary must reject HTML maintenance bodies.
- **Risk:** intermittent maintenance pages have recurred — never replace last-good snapshot with
  HTML; pin path and monitor canary.

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

### 91. USGS monitored volcanoes

- **Value:** current US volcano alert levels and aviation color codes — nature/disaster overlay
  beyond earthquakes and GDACS.
- **Entry point:** `GET https://volcanoes.usgs.gov/hans-public/api/volcano/getMonitoredVolcanoes`
- **Docs:** https://volcanoes.usgs.gov/hans-public/
- **Access:** no authentication; JSON array (~46 KB; 70 monitored volcanoes on 2026-07-30).
- **Implementation:** upsert by volcano number/`vnum`; store `alert_level`, `color_code`,
  `obs_abbr`, `sent_utc`, and notice URLs. Do **not** use retired `vsc/api/volcanoApi/*` paths
  (404 as of this review).
- **Risk:** US-focused monitoring set; pair with GDACS/EONET for global coverage.

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

### 103. FRED series CSV downloads *(new — no API key)*

- **Value:** long official US macro/rates history (Treasury yields, curve spreads, unemployment,
  CPI, GDP) without registering a FRED API key. Complements NY Fed rates and BLS/BEA terminal
  routes with a simple CSV adapter.
- **Entry points:**
  - `GET https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS10`
  - `GET https://fred.stlouisfed.org/graph/fredgraph.csv?id=T10Y2Y`
  - `GET https://fred.stlouisfed.org/graph/fredgraph.csv?id=UNRATE`
  - `GET https://fred.stlouisfed.org/graph/fredgraph.csv?id=CPIAUCSL`
  - `GET https://fred.stlouisfed.org/graph/fredgraph.csv?id=GDP`
- **Docs:** https://fredhelp.stlouisfed.org/fred/data/downloading/
- **Access:** no authentication; `application/csv` (DGS10 ~268 KB; T10Y2Y ~209 KB).
- **Implementation:** maintain an allowlist of series IDs; parse `observation_date,SERIES_ID`;
  treat `.` as missing; checksum + skip-unchanged; polite daily cadence.
- **Terms/risk:** St. Louis Fed attribution required. Prefer this CSV path over the key-gated
  FRED REST API for zero-credential ingest. Do not scrape the interactive graph UI.

### 104. CBOE VIX / VVIX / SKEW history *(new)*

- **Value:** free equity-volatility risk signals (VIX, VVIX, SKEW) as market-stress overlays next
  to OFR/Chicago Fed financial-conditions sources.
- **Entry points:**
  - `GET https://cdn.cboe.com/api/global/delayed_quotes/charts/historical/_VIX.json` (~1.15 MB)
  - `GET https://cdn.cboe.com/api/global/delayed_quotes/charts/historical/_VVIX.json` (~0.64 MB)
  - `GET https://cdn.cboe.com/api/global/delayed_quotes/charts/historical/_SKEW.json` (~1.19 MB)
- **Docs:** https://www.cboe.com/tradable_products/vix/
- **Access:** no authentication; JSON `{timestamp, data:[{date, open, high, low, close, volume}]}`.
- **Implementation:** daily sync of OHLC close from `delayed_quotes/charts/historical/_*.json`;
  upsert by index symbol + date; start with `_VIX`, then VVIX/SKEW. Use
  `delayed_quotes/quotes/_VIX.json` for a live delayed spot. Do **not** use
  `us_indices/daily_prices/_*.json` (S3 `AccessDenied` on 2026-07-31).
- **Terms/risk:** confirm CBOE redistribution / delayed-data terms before production.

### 105. OCC equity options volume *(new)*

- **Value:** official Options Clearing Corporation daily options volume by underlying — market
  structure / positioning complement to FINRA short volume and CFTC COT.
- **Entry point:**
  `GET https://marketdata.theocc.com/volume-query?reportType=D&format=csv&volumeQueryType=O&reportDate=YYYYMMDD&symbolType=ALL`
- **Verified:** `reportDate=20260731` returned ~4.7 MB CSV; `20260730` ~4.8 MB; `reportType` must
  be `D` (other values return “Report Type is invalid”).
- **Docs:** https://www.theocc.com/market-data
- **Access:** no authentication; CSV columns
  `quantity,underlying,symbol,actype,porc,exchange,actdate`.
- **Implementation:** T+1 pull; aggregate by `underlying` + `actdate` for a compact terminal
  table; retain raw exchange/actype detail optionally. Required params are now pinned (older
  probes failed with “Volume query type is required”).
- **Terms/risk:** confirm OCC market-data terms; files are multi-MB — compress and checksum.

### 106. UK ONS CPIH and datasets API *(new / promoted)*

- **Value:** official UK consumer-price inflation (CPIH) and a broader no-key dataset catalog —
  fills the UK macro gap beside BoE IADB and Land Registry.
- **Entry points:**
  - `GET https://api.beta.ons.gov.uk/v1/datasets`
  - `GET https://api.beta.ons.gov.uk/v1/datasets/cpih01`
  - `GET https://api.beta.ons.gov.uk/v1/datasets/cpih01/editions/time-series/versions/67`
  - `GET https://download.ons.gov.uk/downloads/datasets/cpih01/editions/time-series/versions/67.csv`
    (~4.7 MB verified)
- **Docs:** https://developer.ons.gov.uk/
- **Access:** no authentication; JSON catalog + CSV/XLSX downloads.
- **Implementation:** prefer versioned CSV downloads over sparse observation queries; pin dataset
  IDs (`cpih01` first); store version number and `release_date` from metadata.
- **Risk:** “beta” host naming; pin edition/version and monitor redirects.

### 107. IMF SDMX 3.0 (CPI and catalog) *(new)*

- **Value:** modern IMF SDMX 3.0 registry/data API as a no-key expansion beyond the terminal’s
  curated IMF indicator route — CPI and many other dataflows (WEO/BOP/FM listed in structure).
- **Entry points:**
  - `GET https://api.imf.org/external/sdmx/3.0/structure/dataflow` (~222 dataflows)
  - `GET https://api.imf.org/external/sdmx/3.0/structure/dataflow/IMF.STA/CPI`
  - `GET https://api.imf.org/external/sdmx/3.0/data/dataflow/IMF.STA/CPI/5.0.0/US...?lastNObservations=1`
    with `Accept: application/vnd.sdmx.data+csv;version=2.0.0` (CSV verified)
- **Docs:** https://data.imf.org/en/Resource-Pages/IMF-API
- **Access:** no authentication; structure JSON + SDMX-CSV data.
- **Implementation:** use **full** semantic versions (`5.0.0`, not `5.0`); start with CPI country
  allowlist; cache structure; rate-limit (IMF documents application-based ceilings).
- **Risk:** abbreviated versions return 404; some agency/path combinations 403 — fixture each
  dataflow before widening.

### 108. Central Bank of Türkiye (TCMB) daily FX XML *(new)*

- **Value:** official TRY FX bulletin (USD buying/selling and cross rates) — major EM FX print
  missing from the current central-bank FX set.
- **Entry points:**
  - `GET https://www.tcmb.gov.tr/kurlar/today.xml`
  - `GET https://www.tcmb.gov.tr/kurlar/YYYYMM/DDMMYYYY.xml` (example `202607/29072026.xml`)
- **Docs:** https://www.tcmb.gov.tr/wps/wcm/connect/EN/TCMB+EN/Main+Menu/Statistics/Exchange+Rates
- **Access:** no authentication; XML (~9 KB) with `ForexBuying` / `ForexSelling` / `Banknote*` fields.
- **Implementation:** daily snapshot; upsert by `Date` + `CurrencyCode`; preserve unit multipliers.
- **Terms/risk:** carry TCMB attribution; weekend/holiday bulletins may reuse prior business day.

### 109. Bulgarian National Bank FX XML *(promoted)*

- **Value:** official BGN/EUR-referenced FX table for EU/Balkans coverage.
- **Entry point:**
  `GET https://www.bnb.bg/Statistics/StExternalSector/StExchangeRates/StERForeignCurrencies/index.htm?download=xml&search=&lang=EN`
  (longer `downloadFunc=xml&...` query also works).
- **Docs:** https://www.bnb.bg/Statistics/StExternalSector/StExchangeRates/index.htm
- **Access:** no authentication; XML `ROWSET/ROW` (~6.5–7 KB; first row is header labels —
  skip `F_ORDER=0`). Re-verified 2026-07-31 with standard TLS.
- **Implementation:** skip header row; map `CODE`, `RATE`, `REVERSERATE`, `CURR_DATE`; daily sync.
- **Risk:** query-string is brittle — pin the working URL and add a canary if HTML is returned.

### 110. NOAA CO-OPS tides and water levels *(new / promoted)*

- **Value:** US tide-gauge water levels for ports/storm-surge/climate — maritime + climate overlay
  beyond NOAA weather alerts.
- **Entry points:**
  - `GET https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=latest&station=8518750&product=water_level&datum=MTL&time_zone=gmt&units=metric&format=json`
  - `GET https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=waterlevels&units=metric`
    (~301 stations, ~775 KB)
- **Docs:** https://api.tidesandcurrents.noaa.gov/api/prod/
- **Access:** no authentication; JSON.
- **Implementation:** cache station metadata; poll a curated station allowlist for latest/hourly
  values; store station id, lat/lon, timestamp, value, datum, quality flags.
- **Risk:** product/datum combinations vary by station — validate per station.

### 111. Open-Meteo forecast and air quality *(new / promoted)*

- **Value:** no-key global weather and air-quality point API for user-selected coordinates —
  complements NOAA alerts without station-only coverage.
- **Entry points:**
  - `GET https://api.open-meteo.com/v1/forecast?latitude=40.71&longitude=-74.01&current=temperature_2m,wind_speed_10m`
  - `GET https://air-quality-api.open-meteo.com/v1/air-quality?latitude=52.52&longitude=13.41&current=pm10,pm2_5`
- **Docs:** https://open-meteo.com/en/docs
- **Access:** no authentication; JSON.
- **Implementation:** on-demand / cache-by-rounded-lat-lon only; do not pre-ingest a global grid.
- **Terms/risk:** non-commercial free tier etiquette — cache aggressively and identify the client.

### 112. USGS Water Services (NWIS IV) *(new / promoted)*

- **Value:** US river gauge streamflow / stage for flood and drought signals beside earthquakes
  and CO-OPS coastal levels.
- **Entry point:**
  `GET https://waterservices.usgs.gov/nwis/iv/?format=json&sites=01646500&period=P1D&parameterCd=00060`
- **Docs:** https://waterservices.usgs.gov/
- **Access:** no authentication; WaterML-JSON (~25 KB for 1-day IV sample).
- **Implementation:** site allowlist + parameter codes (`00060` discharge, `00065` gage height);
  normalize site number, datetime, value, unit, lat/lon.
- **Risk:** site catalog is large — do not scrape all sites continuously.

### 113. NY Fed Survey of Consumer Expectations *(new)*

- **Value:** household inflation / labor / credit expectations microdata workbook — forward-looking
  US macro sentiment beyond market rates.
- **Entry point:**
  `GET https://www.newyorkfed.org/medialibrary/Interactives/sce/sce/downloads/data/frbny-sce-data.xlsx`
  (~1.06 MB XLSX verified)
- **Docs:** https://www.newyorkfed.org/microeconomics/sce
- **Access:** no authentication; Excel workbook.
- **Implementation:** parse published sheets for inflation expectations medians; store survey date
  and series; checksum workbook; skip-unchanged.
- **Risk:** sheet layout can change — fixture columns; GSCPI XLSX path still HTML interstitial here.

### 114. OurAirports open airport database *(new)*

- **Value:** global airport/heliport reference (coords, IATA/ICAO, type) for maritime/trade and
  logistics map enrichment.
- **Entry point:** `GET https://davidmegginson.github.io/ourairports-data/airports.csv` (~12.7 MB)
- **Docs / license:** https://ourairports.com/data/ (public domain / CC0-style open data)
- **Access:** no authentication; CSV.
- **Implementation:** periodic bulk sync; filter `type` in (`large_airport`,`medium_airport`) for
  default map layers; store ident, iata/icao, lat/lon, iso_country.
- **Risk:** community-maintained — treat as reference data, not aeronautical truth.

### 115. data.gov.uk CKAN package search *(new)*

- **Value:** UK government open-data discovery (CPI and related stats packages) analogous to HDX
  CKAN — useful for finding official CSV resources behind ONS/departmental releases.
- **Entry point:** `GET https://www.data.gov.uk/api/action/package_search?q=cpi&rows=1`
- **Docs:** https://www.data.gov.uk/
- **Access:** no authentication; CKAN JSON (`success: true` verified).
- **Implementation:** metadata search + allowlisted package → resource URL ingest; do not mirror
  the catalog wholesale.
- **Risk:** heterogeneous publishers/licenses; prefer ONS direct downloads when the dataset is
  already known (see #106).


### 116. Chicago Fed CFNAI *(new)*

- **Value:** monthly Chicago Fed National Activity Index and diffusion — real-activity companion
  to the already-listed NFCI financial-conditions CSV.
- **Entry point:** `GET https://www.chicagofed.org/~/media/publications/cfnai/cfnai-data-series-csv.csv`
  (~33 KB; columns `Date,P_I,EU_H,C_H,SO_I,CFNAI,CFNAI_MA3,DIFFUSION`).
- **Docs:** https://www.chicagofed.org/research/data/cfnai/current-data
- **Access:** no authentication; CSV.
- **Implementation:** checksum CSV; parse monthly date + CFNAI / MA3 / diffusion; keep revisions.
- **Risk:** sharepoint-style `~/media` URL may redirect — pin final URL after first fetch.

### 117. Dallas Fed Trimmed Mean PCE *(new)*

- **Value:** Dallas Fed trimmed-mean PCE inflation — sticky-inflation signal beside FRED CPI/PCE
  and Cleveland nowcasts.
- **Entry point:** `GET https://www.dallasfed.org/-/media/Documents/research/pce/pcedata.xlsx`
  (~20 KB XLSX verified 2026-07-31).
- **Docs:** https://www.dallasfed.org/research/pce
- **Access:** no authentication; Excel workbook.
- **Implementation:** checksum workbook; parse published sheets for monthly trimmed-mean series;
  store as-of / revision metadata.
- **Risk:** sheet layout can change — fixture columns; reject HTML error pages.

### 118. Cleveland Fed Inflation Nowcasting *(new)*

- **Value:** high-frequency Cleveland Fed CPI/PCE inflation nowcasts (month / quarter / year).
- **Entry points:**
  - `GET https://www.clevelandfed.org/-/media/files/webcharts/inflationnowcasting/nowcast_month.json` (~7.5 MB)
  - `GET https://www.clevelandfed.org/-/media/files/webcharts/inflationnowcasting/nowcast_quarter.json` (~4.9 MB)
  - `GET https://www.clevelandfed.org/-/media/files/webcharts/inflationnowcasting/nowcast_year.json` (~7.5 MB)
- **Docs:** https://www.clevelandfed.org/en/our-research/indicators-and-data/inflation-nowcasting.aspx
- **Access:** no authentication; FusionCharts-style JSON (chart caption `_comment` dated 2026-07-30).
- **Implementation:** start with `nowcast_month.json`; extract series categories/values into a
  normalized `(vintage, horizon, measure, value)` table; checksum and skip-unchanged.
- **Risk:** UI-oriented payload (multi-MB). Prefer extracting plotted series over storing raw chart
  JSON long-term; watch for path/schema drift.

### 119. SF Fed Daily News Sentiment Index *(new)*

- **Value:** San Francisco Fed daily news-sentiment time series — high-frequency US macro/news
  pulse distinct from GPR and market vol.
- **Entry points:**
  - `GET https://www.frbsf.org/wp-content/uploads/news_sentiment_data.xlsx` (~417 KB; still 200 on
    2026-08-01)
  - Prior chart CSV `.../news-sentiment-chart-1.csv` returned **404** on 2026-08-01 — do not pin.
- **Docs:** https://www.frbsf.org/research-and-insights/data-and-indicators/daily-news-sentiment-index/
- **Access:** no authentication; XLSX primary product.
- **Implementation:** ingest the workbook; checksum; upsert by date; rediscover any replacement CSV
  from the research page if needed.
- **Risk:** WordPress upload paths can move — canary the research page for new attachment URLs.

### 120. OTC Markets securities screener *(new)*

- **Value:** free OTC/Expert Market / Pink security master (~18k names) complementing NASDAQ
  Trader listed/traded directories and OpenFIGI mapping.
- **Entry point:** `GET https://www.otcmarkets.com/research/stock-screener/api?page=1&pageSize=100`
  (JSON; `count` ~18085 on 2026-08-01; response may be a JSON-encoded string — parse twice if needed).
- **Docs / UI:** https://www.otcmarkets.com/research/stock-screener
- **Access:** no authentication; paginated JSON (`symbol`, `securityName`, `market`, `securityId`, …).
  Prefer the `www.otcmarkets.com` host — `backend.otcmarkets.com/otcapi/...` returned 403 on
  2026-08-01.
- **Implementation:** page through `pages`; upsert by `securityId`/`symbol`; capture market tier
  and reportDate; soft-delete disappearances.
- **Terms/risk:** confirm OTC Markets redistribution terms; this is a UI research API — pin fields
  and rate-limit politely.

### 121. Coinbase Exchange public market data *(new)*

- **Value:** credential-free spot crypto ticker, products catalog, and OHLCV candles — venue-level
  market structure beyond CoinGecko aggregates and DeFiLlama TVL.
- **Entry points:**
  - `GET https://api.exchange.coinbase.com/products`
  - `GET https://api.exchange.coinbase.com/products/BTC-USD/ticker`
  - `GET https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=86400`
- **Docs:** https://docs.cloud.coinbase.com/exchange/reference/
- **Access:** no authentication for public market data; JSON.
- **Implementation:** allowlist major products; store ticker snapshots and daily candles; respect
  public rate limits; do not use authenticated private endpoints.
- **Terms/risk:** confirm Coinbase public-data / redistribution terms; exchange APIs are not a
  full historical warehouse.

### 122. Kraken public market data *(new)*

- **Value:** second major venue public ticker/OHLC/asset-pair catalog for cross-exchange crypto
  microstructure (pairs with Coinbase).
- **Entry points:**
  - `GET https://api.kraken.com/0/public/Ticker?pair=XBTUSD`
  - `GET https://api.kraken.com/0/public/OHLC?pair=XBTUSD&interval=1440`
  - `GET https://api.kraken.com/0/public/AssetPairs`
- **Docs:** https://docs.kraken.com/api/docs/rest-api/get-ticker-information
- **Access:** no authentication; JSON (`error: []` on verified calls).
- **Implementation:** map Kraken pair codes to normalized base/quote; allowlist pairs; daily OHLC
  sync + intraday ticker snapshots as needed.
- **Terms/risk:** confirm Kraken API terms; AssetPairs payload is large (~1.1 MB) — cache.

### 123. L2Beat scaling TVL and activity *(new)*

- **Value:** Ethereum L2 TVL composition and activity charts — free crypto market-structure layer
  that complements DeFiLlama chain TVL.
- **Entry points:**
  - `GET https://l2beat.com/api/scaling/summary` (~303 KB JSON)
  - `GET https://l2beat.com/api/scaling/activity` (compact activity chart JSON)
- **Docs / site:** https://l2beat.com/
- **Access:** no authentication; JSON.
- **Implementation:** parse chart timestamps + native/canonical/external TVL; store daily points
  and latest project summary fields if present; checksum skip-unchanged.
- **Terms/risk:** unofficial research API surface — pin schema and confirm reuse terms; `/api/tvl`
  and `/api/scaling/tvl` 404 (use `summary` / `activity`).

### 124. SEC IAPD investment adviser search *(new)*

- **Value:** Investment Adviser Public Disclosure firm/individual search — entity resolution for
  RIAs beside existing SEC filings/holdings coverage.
- **Entry points:**
  - `GET https://api.adviserinfo.sec.gov/search/firm?query=blackrock&hl=true&nrows=25&start=0&r=25&sort=score+desc`
  - `GET https://api.adviserinfo.sec.gov/search/individual?query=smith&hl=true&nrows=25&start=0&r=25&sort=score+desc`
- **Docs / UI:** https://adviserinfo.sec.gov/
- **Access:** no authentication; JSON Elasticsearch-style hits (`firm_source_id`, SEC IA numbers).
- **Implementation:** on-demand search + selective firm detail hydration; cache by `firm_source_id`;
  send a descriptive User-Agent; do not bulk-scrape the entire index.
- **Terms/risk:** UI-backed search API — field names can drift; respect fair-use rate limits.

### 125. FINRA BrokerCheck firm search *(new)*

- **Value:** broker-dealer / firm registry search complementary to IAPD and SEC entity identity.
- **Entry point:**
  `GET https://api.brokercheck.finra.org/search/firm?query=goldman&hl=true&nrows=25&start=0&r=25&sort=score+desc`
- **Docs / UI:** https://brokercheck.finra.org/
- **Access:** no authentication; JSON hits with `firm_source_id`, names, IA scope flags.
- **Implementation:** on-demand search; cache firm IDs; link to IAPD/GLEIF where possible; polite
  rate limits.
- **Terms/risk:** FINRA terms of use for BrokerCheck data; treat as reference, not a dump.

### 126. CourtListener / RECAP search *(new)*

- **Value:** free federal court opinions and RECAP docket materials — litigation/risk overlay for
  securities, bankruptcy, and corporate events.
- **Entry points:**
  - `GET https://www.courtlistener.com/api/rest/v4/courts/?page_size=1` (~3.3k courts)
  - `GET https://www.courtlistener.com/api/rest/v4/search/?q=securities&type=o&page_size=1`
  - `GET https://www.courtlistener.com/api/rest/v4/search/?q=bankruptcy&type=r&page_size=1`
- **Docs:** https://www.courtlistener.com/help/api/rest/
- **Access:** anonymous JSON works for light search (token recommended for higher volume).
- **Implementation:** on-demand / watchlist queries first (issuers, tickers, case types); store
  result metadata + deep links; upgrade to free API token if polling grows.
- **Terms/risk:** Free Law Project terms; large corpora — do not mirror PACER/RECAP wholesale.

### 127. National Bank of Moldova FX XML *(new)*

- **Value:** official Moldovan leu FX table — Eastern European FX coverage beside NBU/BNR/HNB.
- **Entry point:**
  `GET https://www.bnm.md/en/official_exchange_rates?get_xml=1&date=DD.MM.YYYY`
  (example `date=31.07.2026` → ~7 KB XML `ValCurs` with EUR/USD/… rows).
- **Docs / page:** https://www.bnm.md/en/content/official-exchange-rates
- **Access:** no authentication; XML when `date` is supplied (dateless URL 404s).
- **Implementation:** daily pull for prior business day; upsert by date + `CharCode`; preserve
  `Nominal` multipliers.
- **Risk:** require explicit `date=DD.MM.YYYY`; monitor holiday gaps.

### 128. LBMA precious metal prices *(new)*

- **Value:** official London Bullion Market Association gold/silver/platinum/palladium AM (and
  silver single) price history — the highest-value free commodities print not covered by WASDE /
  FAO / existing crypto routes.
- **Entry points:**
  - `GET https://prices.lbma.org.uk/json/gold_am.json` (~922 KB)
  - `GET https://prices.lbma.org.uk/json/silver.json` (~896 KB)
  - `GET https://prices.lbma.org.uk/json/platinum_am.json` (~559 KB)
  - `GET https://prices.lbma.org.uk/json/palladium_am.json` (~555 KB)
- **Docs / page:** https://www.lbma.org.uk/prices-and-data/precious-metal-prices
- **Access:** no authentication; JSON arrays of `{d, v:[USD, GBP, EUR?]}` daily points.
- **Implementation:** checksum each metal file; upsert by date + metal; keep USD as primary and
  store GBP/EUR when present; prefer AM fixes for gold/PGMs.
- **Terms/risk:** confirm LBMA redistribution / attribution terms before commercial reuse.

### 129. NY Fed Global Supply Chain Pressure Index *(new)*

- **Value:** monthly GSCPI — a compact global logistics/supply-chain stress measure that pairs with
  maritime events, trade flows, and inflation nowcasts.
- **Entry points:**
  - `GET https://www.newyorkfed.org/medialibrary/research/interactives/gscpi/downloads/gscpi_data.xlsx`
    (~182 KB; Excel)
  - `GET https://www.newyorkfed.org/medialibrary/research/interactives/data/gscpi/gscpi_interactive_data.csv`
    (~219 KB; wide vintage columns)
- **Docs / page:** https://www.newyorkfed.org/research/policy/gscpi
- **Access:** no authentication.
- **Implementation:** prefer the XLSX “latest” column or the last non-null CSV vintage column;
  store as-of / vintage metadata; monthly cadence with checksum skip-unchanged.
- **Risk:** path names under `/medialibrary/` have moved before — keep a canary and the page HTML
  as a rediscovery fallback.

### 130. Atlanta Fed Wage Growth Tracker *(new)*

- **Value:** CPS-based median wage-growth tracker (overall + demographic cuts) — fills the US labor
  compensation gap beside BLS series already in the terminal.
- **Entry point:**
  `GET https://www.atlantafed.org/-/media/Project/Atlanta/FRBA/Documents/datafiles/chcs/wage-growth-tracker/wage-growth-data.xlsx`
  (~334 KB; verified 2026-08-01).
- **Fallback:** `GET https://fred.stlouisfed.org/graph/fredgraph.csv?id=FRBATLWGTUMHWGO` (overall
  series only; no-key).
- **Docs / page:** https://www.atlantafed.org/chcs/wage-growth-tracker
- **Access:** no authentication; multi-sheet XLSX.
- **Implementation:** pin the new `Project/Atlanta/FRBA/...` media path (older
  `documents/datafiles/...` path 404s); parse sheets with fixture/canary for header skips; keep
  FRED overall series as a backup.
- **Risk:** Atlanta Fed media paths change; treat workbook layout drift as a first-class canary.

### 131. EIA no-key petroleum and natural-gas files *(new)*

- **Value:** free energy spot/stocks prints without the gated EIA REST API key — complements the
  terminal energy card and commodities notebooks.
- **Entry points:**
  - `GET https://ir.eia.gov/wpsr/table1.csv` (weekly petroleum stocks summary; ~7 KB)
  - `GET https://ir.eia.gov/wpsr/table2.csv` (refiner inputs / utilization; ~8 KB)
  - `GET https://www.eia.gov/dnav/pet/hist_xls/RBRTEd.xls` (Europe Brent spot; ~491 KB)
  - `GET https://www.eia.gov/dnav/ng/hist_xls/RNGWHHDd.xls` (Henry Hub; ~374 KB)
  - `GET https://www.eia.gov/dnav/pet/xls/PET_PRI_SPT_S1_D.xls` (spot prices workbook; ~3.6 MB)
  - `GET https://ir.eia.gov/ngs/ngshistory.xls` (weekly natural-gas storage history; ~730 KB;
    verified 2026-08-02)
- **Docs:** https://www.eia.gov/petroleum/supply/weekly/ and https://www.eia.gov/dnav/
- **Access:** no authentication for these file URLs (EIA REST `api.eia.gov` remains P3 key-gated).
- **Implementation:** weekly WPSR CSV pull + daily/weekly XLS sync + NGS history XLS; checksum;
  parse STUB/date columns carefully; do not treat `ir.eia.gov/wpsr/overview.csv`, `ngs.csv`, or
  `ngs/overview.csv` as free (403 Access Restricted here on 2026-08-02).
- **Terms/risk:** US government open data; still add attribution. Some `ir.eia.gov` paths are
  restricted — pin the verified table IDs / `ngshistory.xls`.

### 132. National Bank of Georgia FX *(new)*

- **Value:** official GEL FX rates for all currencies — Caucasus FX coverage beside Azerbaijan /
  Armenia SOAP backlog items.
- **Entry point:**
  `GET https://nbg.gov.ge/gw/api/ct/monetarypolicy/currencies?date=YYYY-MM-DD`
  (full table ~10 KB) or add `&currencies=USD` for a single pair.
- **Docs / page:** https://nbg.gov.ge/en/monetary-policy/currency
- **Access:** no authentication; JSON `[{date, currencies:[{code, quantity, rate, ...}]}]`.
- **Implementation:** daily dated pull; upsert by date + currency code; honor `quantity`
  multipliers when normalizing.
- **Risk:** dateless `/currencies.json` 404s — always pass `date=`.

### 133. Banco Central do Brasil SGS series *(new)*

- **Value:** Selic policy rate and IPCA inflation via the free SGS JSON API — expands BCB coverage
  beyond PTAX (#30) into Brazil rates/inflation.
- **Entry points:**
  - `GET https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/5?formato=json` (Selic)
  - `GET https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados/ultimos/5?formato=json` (IPCA)
- **Docs:** https://dadosabertos.bcb.gov.br/ and SGS series catalog
- **Access:** no authentication; JSON `[{data, valor}]` with `DD/MM/YYYY` dates.
- **Implementation:** curated series-code allowlist (start 432/433); incremental `dados` range
  pulls for history; store series code + observation date.
- **Risk:** series codes are numeric and opaque — keep a code→label map and canary.

### 134. NASDAQ Trader trade halts RSS *(new)*

- **Value:** near-real-time US equity trade-halt / resume notices — market-structure overlay on
  NASDAQ symbol directories (#7) and FINRA short volume (#10).
- **Entry point:** `GET https://www.nasdaqtrader.com/rss.aspx?feed=tradehalts` (~36 KB RSS/XML)
- **Docs / page:** https://www.nasdaqtrader.com/Trader.aspx?id=TradeHalts
- **Access:** no authentication; RSS 2.0 with NASDAQ extensions.
- **Implementation:** poll frequently during US session; upsert by halt key / symbol + timestamp;
  retain reason codes; do not rely on retired `tradinghalts.txt` (HTML “Page Not Available”).
- **Terms/risk:** confirm NASDAQ Trader redistribution terms; feed is operational/event data.

### 135. US Census FT-900 foreign trade exhibit *(new)*

- **Value:** official US goods trade balance / FT-900 exhibit workbook — national trade print
  complementary to UN Comtrade flows already in the registry.
- **Entry point:**
  `GET https://www.census.gov/foreign-trade/Press-Release/current_press_release/exh1.xlsx`
  (~246 KB; current release exhibit).
- **Docs:** https://www.census.gov/foreign-trade/Press-Release/current_press_release/index.html
- **Access:** no authentication; XLSX.
- **Implementation:** monthly checksum; parse headline balance / exports / imports; archive each
  release filename/date; prefer this over key-gated Census APIs.
- **Risk:** “current_press_release” path always points at latest — snapshot with publisher date.

### 136. Multi-venue crypto public tickers *(new)*

- **Value:** credential-free spot/perp tickers across additional venues for cross-exchange crypto
  microstructure beyond Coinbase (#121), Kraken (#122), and CoinGecko aggregates.
- **Entry points (all verified 200 JSON on 2026-08-01):**
  - Bitstamp `GET https://www.bitstamp.net/api/v2/ticker/btcusd`
  - Gemini `GET https://api.gemini.com/v1/pubticker/btcusd`
  - OKX `GET https://www.okx.com/api/v5/market/ticker?instId=BTC-USDT`
  - Bitfinex `GET https://api-pub.bitfinex.com/v2/ticker/tBTCUSD`
  - KuCoin `GET https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=BTC-USDT`
  - Gate.io `GET https://api.gateio.ws/api/v4/spot/tickers?currency_pair=BTC_USDT`
  - Poloniex `GET https://api.poloniex.com/markets/BTC_USDT/ticker24h`
  - Deribit `GET https://www.deribit.com/api/v2/public/ticker?instrument_name=BTC-PERPETUAL`
- **Access:** no authentication for these public market endpoints.
- **Implementation:** allowlist BTC/ETH majors first; normalize last/bid/ask/volume; snapshot on a
  polite cadence; store venue + instrument id; skip Binance (geo-451 here) and Bybit (CloudFront
  country block here).
- **Terms/risk:** confirm each exchange’s public-API / redistribution terms; these are not full
  historical warehouses.

### 137. ISO 10383 MIC list *(promoted)*

- **Value:** official market-identifier-code master (operating MIC, segment MIC, LEI, country,
  status) — joins ESMA FIRDS venue MICs and NASDAQ/HKEX listings.
- **Entry points:**
  - `GET https://www.iso20022.org/sites/default/files/ISO10383_MIC/ISO10383_MIC.csv` (~492 KB)
  - `GET https://www.iso20022.org/sites/default/files/ISO10383_MIC/ISO10383_MIC.xls` (~1.7 MB)
- **Docs:** https://www.iso20022.org/market-identifier-codes
- **Access:** no authentication; CSV/XLS download.
- **Implementation:** prefer CSV; upsert by MIC; track STATUS / LAST VALIDATION DATE; soft-delete
  or mark inactive codes that leave the file.
- **Terms/risk:** confirm ISO/Swift redistribution and attribution terms before shipping.



### 138. US Treasury TIC major foreign holders *(new)*

- **Value:** official monthly major foreign holders of US Treasury securities — core
  cross-border capital-flow print not covered by Fiscal Data routes already in the terminal.
- **Entry points:**
  - `GET https://ticdata.treasury.gov/Publish/mfh.txt` (latest holdings table; ~7.5 KB)
  - `GET https://ticdata.treasury.gov/Publish/mfhhis01.txt` (history through recent months;
    ~99 KB)
- **Docs / page:** https://home.treasury.gov/data/treasury-international-capital-tic-system
- **Access:** no authentication; fixed-width / whitespace text tables.
- **Implementation:** parse country rows + month columns; store as long observations
  `(country, month, usd_billions)`; checksum skip-unchanged; archive each publish snapshot.
- **Risk:** layout is prose-table text, not CSV — pin column positions with fixtures; directory
  listing of `/Publish/` is not a file (404). Prefer these stable filenames over HTML pages.

### 139. IMF PortWatch daily chokepoints *(promoted)*

- **Value:** daily vessel-transit / chokepoint activity that fills the largest maritime gap
  beside the existing Global Fishing Watch events route.
- **Entry points:**
  - Layer metadata:
    `GET https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/Daily_Chokepoints_Data/FeatureServer/0?f=pjson`
  - Sample query:
    `GET https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/Daily_Chokepoints_Data/FeatureServer/0/query?where=1%3D1&outFields=date,portid,n_total&resultRecordCount=5&orderByFields=date%20DESC&f=json`
  - Site catalog (discovery only): `GET https://portwatch.imf.org/api/search/v1/catalog`
- **Docs / page:** https://portwatch.imf.org/
- **Access:** no authentication; ArcGIS FeatureServer JSON (1,000-row page cap typical).
- **Implementation:** paginate with `resultOffset`; upsert by `date` + `portid`; retain ObjectId /
  source layer id; cache daily. Pin working FeatureServer IDs from the catalog — some guessed
  layer names (e.g. `Daily_Trade_Data`) 400/CONT_0001.
- **Terms/risk:** confirm IMF/ArcGIS redistribution terms before mirroring full history.

### 140. SIPRI military expenditure *(new)*

- **Value:** authoritative cross-country military spending history — high-signal geopolitics /
  fiscal-risk companion to conflict and sanctions coverage.
- **Entry point:**
  `GET https://www.sipri.org/sites/default/files/SIPRI-Milex-data-1949-2024.xlsx`
  (~870 KB; verified 2026-08-02).
- **Docs / page:** https://www.sipri.org/databases/milex
- **Access:** no authentication; multi-sheet XLSX.
- **Implementation:** checksum workbook; parse constant-USD / share-of-GDP sheets; upsert by
  country + year; keep SIPRI country codes; monitor filename year suffix when SIPRI publishes
  the next vintage.
- **Terms/risk:** SIPRI terms require attribution and restrict some commercial redistribution —
  confirm before shipping. Arms-transfer register is HTML-form based (not a stable bulk file).

### 141. NYISO public market CSVs *(new)*

- **Value:** free US Northeast power LMPs and fuel mix — expands energy coverage beyond ERCOT
  dashboards and European TSO APIs.
- **Entry points (date-stamped `YYYYMMDD`):**
  - Real-time zonal LMP:
    `GET https://mis.nyiso.com/public/csv/realtime/20260731realtime_zone.csv` (~233 KB)
  - Day-ahead zonal LMP:
    `GET https://mis.nyiso.com/public/csv/damlbmp/20260731damlbmp_zone.csv` (~17 KB)
  - Real-time fuel mix:
    `GET https://mis.nyiso.com/public/csv/rtfuelmix/20260731rtfuelmix.csv` (~86 KB)
- **Docs / page:** https://www.nyiso.com/energy-market-operational-data
- **Access:** no authentication; CSV.
- **Implementation:** daily/5-minute cadence pulls; upsert by timestamp + zone/fuel; retain PTID;
  polite polling; checksum.
- **Terms/risk:** confirm NYISO redistribution terms; files 404 before the operating day exists.

### 142. IESO Ontario generation capability *(new)*

- **Value:** near-real-time Ontario generator output/capability XML — Canadian power complement
  to NYISO and US EIA files.
- **Entry point:**
  `GET http://reports.ieso.ca/public/GenOutputCapability/PUB_GenOutputCapability.xml`
  (~107 KB; also served via reports-public host).
- **Docs / page:** https://www.ieso.ca/en/Power-Data
- **Access:** no authentication; XML with published XSL.
- **Implementation:** poll on a short cadence; parse generator name/fuel/output/capability;
  store as-of timestamp from document; prefer HTTPS mirror if/when stable.
- **Terms/risk:** confirm IESO terms; schema is IMO/IESO-specific — fixture the XSD-ish shape.

### 143. UK Carbon Intensity and generation mix *(promoted)*

- **Value:** half-hourly GB carbon intensity plus national/regional generation mix — lightweight
  GB power-transition signal that pairs with Elexon (#53) without duplicating BMRS settlement.
- **Entry points:**
  - `GET https://api.carbonintensity.org.uk/intensity`
  - `GET https://api.carbonintensity.org.uk/generation`
  - `GET https://api.carbonintensity.org.uk/regional/england`
- **Docs:** https://carbonintensity.org.uk/
- **Access:** no authentication; JSON.
- **Implementation:** store `from`/`to` interval, forecast/actual intensity, and fuel-mix
  percentages; national series first, then regional.
- **Terms/risk:** National Grid ESO open data; GB-only. Prefer Elexon for imbalance/settlement
  detail.

### 144. MET Norway Locationforecast and air quality *(new)*

- **Value:** free, high-quality Nordic/global point weather and air-quality forecasts with a
  clear open license — useful operational overlay beside Open-Meteo (#111) from a primary NMS.
- **Entry points:**
  - `GET https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=59.91&lon=10.75`
  - `GET https://api.met.no/weatherapi/airqualityforecast/0.1/?lat=59.91&lon=10.75`
- **Docs:** https://api.met.no/weatherapi/
- **Access:** no authentication; JSON **requires** a descriptive User-Agent identifying the
  client (anonymous library defaults are throttled/blocked).
- **Implementation:** cache by lat/lon grid cell; honor `Expires` / rate guidance; store units
  from `properties.meta.units`.
- **Terms/risk:** CC BY 4.0-style terms with mandatory identification; do not hammer the API.

### 145. Bright Sky (DWD) weather observations *(new)*

- **Value:** credential-free JSON over Deutscher Wetterdienst observations — European weather
  risk complement to Open-Meteo/MET Norway with station-level provenance.
- **Entry points:**
  - Current: `GET https://api.brightsky.dev/current_weather?lat=52.52&lon=13.41`
  - Historical day: `GET https://api.brightsky.dev/weather?lat=52.52&lon=13.41&date=2026-07-31`
- **Docs:** https://brightsky.dev/
- **Access:** no authentication; JSON.
- **Implementation:** point queries for monitored sites; store `source_id` + timestamp; backfill
  by date; keep DWD attribution.
- **Terms/risk:** Bright Sky is a community wrapper over DWD open data — pin API version and
  monitor schema.

### 146. UN SDG Global Database API *(new)*

- **Value:** official SDG indicator series (poverty, health, climate finance, etc.) with stable
  series codes — curated expansion beyond World Bank/UN registry slices.
- **Entry points:**
  - Series catalog: `GET https://unstats.un.org/SDGAPI/v1/sdg/Series/List?allreleases=false`
    (~181 KB JSON)
  - Observations:
    `GET https://unstats.un.org/SDGAPI/v1/sdg/Series/Data?seriesCode=SI_POV_DAY1&pageSize=5`
- **Docs:** https://unstats.un.org/sdgapi/swagger/
- **Access:** no authentication; JSON.
- **Implementation:** do **not** mirror all series — maintain an allowlist (start with
  `SI_POV_DAY1` and a short climate/governance set); page with `pageSize`; store series code,
  geo, time, value, and nature/SDMX attributes.
- **Risk:** unfiltered pulls are large; some series overlap existing World Bank poverty routes —
  keep only additive codes.

### 147. OSV.dev vulnerability database *(promoted)*

- **Value:** free package/CVE vulnerability enrichment that pairs with CISA KEV (#61) and FIRST
  EPSS (#62) for cyber operational risk.
- **Entry points:**
  - Query by package:
    `POST https://api.osv.dev/v1/query` with JSON
    `{"package":{"name":"lodash","ecosystem":"npm"},"version":"4.17.20"}`
  - Direct vuln: `GET https://api.osv.dev/v1/vulns/<OSV_OR_GHSA_ID>`
- **Docs:** https://google.github.io/osv.dev/api/
- **Access:** no authentication; JSON.
- **Implementation:** on-demand enrichment for dependency/watch lists; cache by package+version
  and vuln id; join to KEV by CVE when present. Not all CVE ids resolve as OSV ids (404) — prefer
  query-by-package or GHSA/OSV identifiers.
- **Terms/risk:** open data; still add attribution. Use after KEV/EPSS for prioritization.

## P1 — high value after P0

| Candidate | Representative endpoint or docs | Why it is not P0 |
|---|---|---|
| Banque de France Webstat | `https://webstat.banque-france.fr/api/explore/v2.1/catalog/datasets?limit=1` | Catalog live (~42k datasets) but many series return empty `records`; curate working dataset IDs / alternate export paths before P0. |
| Destatis GENESIS REST | `https://www-genesis.destatis.de/genesisWS/rest/2020/` | Guest paths currently return HTML app shells / redirects here; still needs a documented token/header fixture. |
| db.nomics | `https://api.db.nomics.world/v22/providers` | Prefer primary publishers in P0; use for discovery/gap-fill. |
| ISO 10383 MIC list | CSV/XLS on iso20022.org | **Promoted to P0 #137** (CSV verified 2026-08-01); keep terms review on the adapter. |
| Bank of Russia daily FX | `https://www.cbr.ru/scripts/XML_daily.asp` | Anonymous XML works; compliance/authorization review required first. |
| Central Bank of Armenia SOAP FX | `https://api.cba.am/exchangerates.asmx?WSDL` | WSDL live (2026-08-01); needs SOAP client fixture like MNB. |
| MNB Hungary SOAP FX | `https://www.mnb.hu/arfolyamok.asmx?WSDL` | WSDL live; SOAP `GetCurrentExchangeRates` still needs a dedicated client fixture (GET helpers 404). |
| NY Fed SCE public microdata | `.../frbny-sce-public-microdata-latest.xlsx` | Anonymous XLSX verified but ~80 MB — useful research dump after the compact SCE workbook P0 #113. |
| Germany SMARD chart API | `https://www.smard.de/app/chart_data/410/DE/index_quarterhour.json` | Anonymous JSON works but looks UI-oriented; confirm license/stability. |
| Zillow Research ZHVI | `https://files.zillowstatic.com/research/public_csvs/zhvi/Metro_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv` (~4.4 MB verified) | Commercial reuse terms need review; FHFA/Freddie/CSO should lead. |
| NASA POWER | `https://power.larc.nasa.gov/api/temporal/daily/point?...` | No-key; needs caching and a clear use case vs ERA5. |
| CPSC recalls | `https://www.saferproducts.gov/RestWebServices/Recall?format=json` | Narrower financial relevance; unusual paging. |
| openFDA enforcement | `https://api.fda.gov/drug/enforcement.json?limit=1` | Anonymous low ceilings; free key raises limits. |
| NHTSA recalls | `https://api.nhtsa.gov/recalls/recallsByVehicle?...` | Needs make/model/year catalog design. |
| NVD CVE 2.0 | `https://services.nvd.nist.gov/rest/json/cves/2.0?...` | Prefers API key / tight rate limits; after KEV+EPSS. |
| OpenSanctions bulk | `https://data.opensanctions.org/datasets/latest/default/entities.ftm.json` | Multi-GB mixed-license NDJSON aggregate (~verified reachable); prefer official national lists first. |
| Fear & Greed / mempool.space / CoinPaprika | `https://api.alternative.me/fng/?limit=3`, `https://mempool.space/api/v1/fees/recommended` | Re-verified live 2026-08-01; useful after DeFiLlama + Coinbase/Kraken/L2Beat + multi-venue ticker P0s. Confirm ToS. |
| mindicador.cl Chile indicators | `https://mindicador.cl/api`, `/api/uf`, `/api/dolar` | Convenient unofficial JSON for UF/USD/CLP; prefer Banco Central de Chile official feeds if/when anonymously stable. |
| IMF SDMX 3.0 non-CPI dataflows | `https://api.imf.org/external/sdmx/3.0/structure/dataflow` | Structure catalog live (222 flows); WEO/BOP/FM need per-flow fixtures (abbreviated versions 404; some paths 403). CPI `5.0.0` is P0. |
| MNB Hungary SOAP FX | `https://www.mnb.hu/arfolyamok.asmx?WSDL` | WSDL live; SOAP `GetCurrentExchangeRates` still needs a dedicated client fixture (GET helpers 404). |
| WHO Disease Outbreak News OData | `https://www.who.int/api/news/diseaseoutbreaknews?$top=1&$orderby=PublicationDateAndTime desc` | Official DON JSON verified (e.g. Bundibugyo Ebola item 2026-07-17). Prefer extending existing `who_outbreaks` adapter rather than a parallel source. |
| SEC `company_tickers*.json` | `https://www.sec.gov/files/company_tickers.json` (+ `_exchange`) | Anonymous with descriptive User-Agent (~0.5–0.8 MB). Already covered by terminal SEC stack — only add if a standalone registry source is desired. |
| Aviation Weather Center / additional NOAA products | `https://aviationweather.gov/api/data/` | CO-OPS + Open-Meteo + USGS IV promoted to P0; remaining aviation/METAR products need product allowlist. |
| eCFR | `https://www.ecfr.gov/api/versioner/v1/versions/title-12.json` | Hierarchical legal modeling required. |
| Fintraffic Digitraffic | `https://tie.digitraffic.fi/api/weather/v1/stations/data` | Send `Digitraffic-User` + gzip; cache metadata. |
| Fraunhofer Energy-Charts | `https://api.energy-charts.info/public_power?country=de` | Validate licensing vs ENTSOG/Elexon/Energinet/Elia/SMARD/REE. |
| ClinicalTrials.gov v2 | `https://clinicaltrials.gov/api/v2/studies?pageSize=1` | Needs sponsor/entity resolution. |
| RTE eco2mix | Opendatasoft eco2mix datasets | Confirm dataset ID/license/revision behavior. |
| CAISO OASIS | `https://oasis.caiso.com/oasisapi/SingleZip` | ZIP-per-query; DST-safe keys; terms review. |
| FINRA OTC weekly summary | `https://api.finra.org/data/group/otcMarket/name/weeklySummary` | Confirm FINRA API terms/field dictionary; daily Reg SHO short volume is higher-priority P0. |
| FEC OpenFEC | `https://api.open.fec.gov/v1/candidates/?per_page=1&api_key=DEMO_KEY` | Re-verified 2026-07-30 with `DEMO_KEY` (~54k candidates). Still key-shaped auth — register a production key before scale. |
| ECDC open data (COVID historical) | `https://opendata.ecdc.europa.eu/covid19/nationalcasedeath/json/` | Anonymous multi-MB JSON still live; lower incremental value post-emergency — niche health backfill. |
| UNICEF SDMX demographics | `https://sdmx.data.unicef.org/ws/public/sdmxapi/rest/data/UNICEF,DM,1.0/all?...` | Anonymous SDMX-CSV works but unfiltered pulls are multi-MB; curate indicator/geo filters before P0. |
| data.europa.eu hub search | `https://data.europa.eu/api/hub/search/datasets?limit=1&catalogue=estat` | Discovery JSON live; prefer Eurostat dissemination API (#11) for observations. |
| Frankfurter ECB redistributor | `https://api.frankfurter.app/latest?from=USD&to=EUR,GBP` | Convenient, but prefer primary ECB Data Portal P0. |

| Nager.Date public holidays | `https://date.nager.at/api/v3/PublicHolidays/2026/US` | Free worldwide holiday calendar; useful scheduling metadata but not a core market print. |
| Wikimedia pageviews | `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents/Federal_Reserve/daily/20260701/20260731` | Attention proxy for entities/topics; noisy vs primary financial sources. |
| deps.dev (companion to OSV) | `https://api.deps.dev/v3/...` | Package graph enrichment after OSV P0 #147. |
| OTC Markets www screener *(reprobe)* | `https://www.otcmarkets.com/research/stock-screener/api` | Still P0 #120, but 2026-08-02 probes timed out here — re-verify before adapter work. |
| Baker Hughes NA rig count | `https://rigcount.bakerhughes.com/na-rig-count/` | Landing page live; stable XLS/CSV asset still needs discovery (static-files path 404). |
| Kansas City Fed LMCI / Richmond Fed surveys | regional Fed research pages | Pages live/timeout-prone; workbook URLs not stably extracted this run — rediscover file links. |
| Bank of Thailand / BSP / RBI / FBIL FX | various | HTML portals or key-gated APIs from this environment; keep watching for anonymous JSON/CSV. |
| OpenSky Network ADS-B | `https://opensky-network.org/api/states/all` | Connection failed here; anonymous limits / auth tiers need a fixture when reachable. |
| PatentsView USPTO | `https://api.patentsview.org/...` | Request failed/ERR this run; revisit for IP/innovation overlays. |

## P2 — investigate or scrape carefully

| Candidate | Access path | Investigation needed |
|---|---|---|
| World Bank debarred firms | https://www.worldbank.org/en/projects-operations/procurement/debarred-firms | Historical JSON URL now serves HTML app. Find official current file or allowed scrape. |
| CBO budget/economic projections | https://www.cbo.gov/data/budget-economic-data | Captcha interstitial on probe (2026-07-29); structured XLSX/CSV + RSS when reachable. |
| EBA risk dashboard / transparency | https://www.eba.europa.eu/.../risk-dashboard | Workbook/archive discovery and version handling. |
| UK DBT statistics | https://www.gov.uk/government/organisations/department-for-business-and-trade/about/statistics | Prefer CSV/ODS attachments over prose scraping. |
| AEMO NEMWeb DispatchIS | `https://nemweb.com.au/Reports/Current/DispatchIS_Reports/` | Directory listing + ZIP files reachable (~577 files); AEMO terms may restrict commercial use — legal review before scrape. |
| Swiss SECO sanctions XML | `https://www.sesam.search.admin.ch/sesam-search-web/pages/downloadXmlGesamtliste.xhtml?lang=en&type=sanction` | Still returned XHTML interstitial on 2026-07-30, not sanctions XML. |
| Australia DFAT consolidated list | https://www.dfat.gov.au/.../consolidated-list | High value, but HTTPS fetch still failed/reset in this environment; data.gov.au search did not surface a clean DFAT resource. |
| Cleveland Fed yield-curve / inflation expectations workbooks | Fed indicator pages | Inflation nowcast JSON promoted to P0 #118; remaining IE/yield-curve XLSX/CSV URLs still not cleanly pinned. |
| Our World in Data grapher CSV | `https://ourworldindata.org/grapher/<slug>.csv` | Presentation-oriented; prefer primary publishers. |
| Redfin Data Center weekly housing | S3 `redfin-public-data` | Huge objects; confirm schema/ToS; FHFA/Land Registry/Freddie/CSO first. |
| Open Ownership / BODS | register/BODS hosts | Cloudflare HTML interstitial blocked anonymous JSON. |
| MAS Singapore APIs | `eservices.mas.gov.sg` | SORA/FX paths still portal HTML 404s — rediscover current API directory. |
| RBNZ / SARB statistical files | RBNZ / SARB portals | RBNZ still site-unavailable HTML (2026-07-31); SARB selected-rates JSON path 404. |
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

- **Key-required statistical APIs:** FRED **REST API** (key required — use no-key `fredgraph.csv`
  P0 #103 instead), BEA, EIA **REST** (`api.eia.gov` still gated; use no-key WPSR/XLS files in P0
  #131 instead), Banxico SIE (token required), Ember Energy, OpenAQ v3 / AirNow, Congress.gov,
  GovInfo, Companies House REST API (bulk free data product is P0 instead), IATI Datastore,
  Japanese e-Stat (app ID), US Census API (`Missing Key`; FT-900 XLSX is P0 #135), Fingrid Open
  Data (subscription key), PJM Data Miner, and ISO-NE web services. They may still be free, but
  they do not meet the preferred zero-credential deployment path. CourtListener anonymous light
  search is P0 #126; register a free token before high-volume polling.
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
   + ESMA FITRS + ISO 10383 MIC + NASDAQ Trader dirs/halts + HKEX securities + PRH Finland +
   Brreg Norway + Companies House free data product + LittleSis + Federal Register +
   SIPRI Milex (geopolitical spend context).
2. **US markets microstructure & banking:** TreasuryDirect auctions + FINRA Reg SHO short volume +
   OCC options volume (`reportType=D`) + CBOE VIX/VVIX/SKEW (historical charts path) + OTC Markets
   www screener (reprobe) + TIC major foreign holders + FRED `fredgraph.csv` allowlist + OFR +
   Chicago Fed NFCI/CFNAI + Philadelphia Fed ADS + Atlanta Fed GDPNow + Atlanta Fed Wage Growth +
   NY Fed SCE + NY Fed GSCPI + Dallas Trimmed Mean PCE + Cleveland inflation nowcast + SF Fed
   news sentiment + FDIC BankFind + CFPB complaints + IAPD + BrokerCheck.
3. **Financial conditions and macro stats:** FRED `fredgraph.csv` allowlist (incl. KCFSI / Empire /
   wage tracker) + ECB Data Portal + BIS + Eurostat + OECD CLI + IMF SDMX 3.0 CPI + UK ONS CPIH +
   OFR STFM + Chicago Fed NFCI + Philadelphia Fed ADS + Atlanta Fed GDPNow/Wage + NY Fed SCE/GSCPI
   + BoE/BoC/RBA/Norges/Riksbank/SNB + Bundesbank + StatsCan/ABS/SingStat/CBS/INSEE/SSB/StatFin/
   INE Spain + CSO Ireland + DST Denmark + Swiss FSO + Statistics Iceland + GUS Poland + IBGE +
   SCB Sweden + Statistics Estonia/Latvia/Slovenia/Slovakia + BCB SGS Selic/IPCA.
4. **Global FX prints:** RBA + Norges Bank + Riksbank + SNB + BCB PTAX + NBP + CNB + Danmarks
   Nationalbank (+ DST `DNVALD`) + NBU + BCRA + Banca d'Italia + NBR Romania + Bank of Lithuania
   + Bank of Latvia + Taiwan BOT + BCRP Peru + Bank of Israel + HNB Croatia + NBK Kazakhstan +
   CBAR Azerbaijan + BNM Malaysia + TCMB Türkiye + BNB Bulgaria + BanRep Colombia + National Bank
   of Moldova + National Bank of Georgia (+ rediscovered HKMA ER when available).
5. **Commodities, energy, housing, credit:** LBMA metals + EIA WPSR/Brent/HH/NGS-history files +
   FHFA HPI + Freddie Mac PMMS + UK Land Registry + CSO Ireland HPA02 + Census FT-900.
6. **Power and gas:** Elexon + ENTSOG + MIDAS + Energinet + Elia + REE Spain + ERCOT dashboards
   + NYISO public CSVs + IESO Ontario GenOutputCapability + UK Carbon Intensity
   (+ AEMO only after terms clearance).
7. **Procurement and public spending:** TED + Find a Tender + SAM.gov + Grants.gov + USAspending
   + World Bank Projects.
8. **Cyber, physical, climate, and country risk:** CISA KEV + FIRST EPSS + OSV.dev + NASA EONET +
   USGS volcanoes (`hans-public`) + NOAA PSL indices + NOAA CO-OPS + Open-Meteo + MET Norway +
   Bright Sky (DWD) + USGS NWIS IV + Climate TRACE + Climate Watch NDC + INFORM Risk +
   OpenFEMA + HDX allowlisted packages + IMF PortWatch chokepoints + OurAirports + VoteView +
   CourtListener watchlists + UN SDG allowlisted series.
9. **Crypto market structure (free):** DeFiLlama chain TVL + Coinbase/Kraken + L2Beat + Bitstamp /
   Gemini / OKX / Bitfinex / KuCoin / Gate / Poloniex / Deribit public tickers (+ Fear & Greed /
   mempool fees as P1 follow-ons).

For each adapter, expose source metadata, health, last successful observation/publisher time,
row counts, and parser failures before adding the source to the terminal registry.

## Verification record

These representative calls used a descriptive user agent, followed redirects, sent no credentials,
and downloaded the response body on 2026-08-02 UTC (prior 2026-08-01/07-31 notes retained where
still accurate).

| Source | HTTP | Response type / observation |
|---|---:|---|
| Canada SEMA sanctions | 200 | HEAD `text/xml` |
| UK Sanctions List CSV | 200 | HEAD OK |
| GLEIF lei-records | 200 | JSON:API; ~3.39M LEIs; golden copy 2026-08-02 |
| BoC Valet FXUSDCAD | 200 | JSON |
| BanRep `totoro.../consultaMercadoCambiario` | 200 | JSON tick array (~38 KB) |
| BanRep `www.banrep.gov.co/.../consultaMercadoCambiario` | 404 | Drupal HTML — avoid |
| FRED `fredgraph.csv` DGS10 | 200 | CSV ~268 KB |
| LBMA gold_am | 200 | HEAD `application/json` |
| NBG Georgia FX `date=2026-07-31` | 200 | JSON; USD present |
| BCB SGS Selic 432 | 200 | JSON (values into Aug 2026) |
| EIA WPSR table1.csv | 200 | text/plain ~6.6 KB |
| EIA `ngs/ngshistory.xls` *(new)* | 200 | Excel ~730 KB |
| EIA `ngs.csv` / `ngs/overview.csv` | 403 | Access Restricted |
| FINRA CNMS `equity/regsho/daily` 20260731 | 200 | pipe text ~534 KB |
| FINRA CNMS `equity/otcmarket/ip` | 403 | S3 AccessDenied — avoid |
| OCC volume-query `reportType=D` 20260731 | 200 | HEAD OK |
| CBOE historical `_VIX` | 200 | HEAD JSON |
| ISO MIC CSV | 200 | CSV ~492 KB |
| NY Fed GSCPI xlsx | 200 | HEAD Excel |
| Atlanta Fed wage-growth-data.xlsx | 200 | HEAD XLSX |
| Census FT-900 exh1.xlsx | 200 | HEAD XLSX |
| NASDAQ tradehalts RSS | 200 | HEAD XML |
| SF Fed news_sentiment_data.xlsx | 200 | HEAD XLSX |
| Chicago Fed NFCI CSV | 200 | CSV ~148 KB |
| Philadelphia Fed ADS workbook | 200 | XLSX ~782 KB |
| TreasuryDirect auctioned | 200 | JSON |
| OpenFIGI mapping AAPL | 200 | JSON FIGI |
| ESMA FIRDS Solr FULINS | 200 | JSON; `numFound` ~12.4k |
| Eurostat nama_10_gdp sample | 200 | JSON-stat |
| BIS dataflow structure | 200 | SDMX-JSON |
| OFR REPO-TRIV1 series | 200 | JSON |
| Coinbase products | 200 | JSON ~351 KB |
| Kraken Ticker XBTUSD | 200 | JSON |
| Bitstamp BTCUSD ticker | 200 | JSON |
| L2Beat scaling/summary | 200 | JSON ~303 KB |
| DeFiLlama ETH historical TVL | 200 | JSON ~119 KB |
| CISA KEV | 200 | JSON ~1.57 MB; catalogVersion 2026.07.29 |
| FIRST EPSS sample CVE | 200 | JSON |
| USGS monitored volcanoes (`hans-public`) | 200 | JSON (prior) |
| TIC `mfh.txt` / `mfhhis01.txt` *(new)* | 200 | text ~7.5 KB / ~99 KB |
| IMF PortWatch chokepoints query *(promoted)* | 200 | ArcGIS JSON |
| IMF PortWatch site catalog | 200 | JSON |
| SIPRI Milex 1949-2024 XLSX *(new)* | 200 | XLSX ~870 KB |
| NYISO realtime / DAM / fuelmix CSVs *(new)* | 200 | CSV |
| IESO GenOutputCapability XML *(new)* | 200 | XML ~107 KB |
| UK Carbon Intensity / generation / regional *(promoted)* | 200 | JSON |
| MET Norway locationforecast + airquality *(new)* | 200 | GeoJSON / JSON (UA required) |
| Bright Sky current + daily weather *(new)* | 200 | JSON |
| UN SDG Series List + SI_POV_DAY1 *(new)* | 200 | JSON |
| OSV.dev package query *(promoted)* | 200 | JSON vulns for lodash@4.17.20 |
| Nager.Date PublicHolidays US *(P1)* | 200 | JSON |
| Wikimedia pageviews Federal_Reserve *(P1)* | 200 | JSON |
| OTC Markets www screener | ERR | timeout / connection failed this run |
| OpenSky states/all | ERR | connection failed |
| PatentsView query | ERR | request failed |
| Swiss SECO sanctions | 200 | XHTML interstitial, not sanctions XML |
| Destatis guest catalogue | 200 | HTML app shell |
| MAS directory | 404 | portal HTML |
| Stats NZ / RBNZ | 404/403 | still unavailable |
| Binance public ticker | 451 | geo-restricted |
| Bybit public ticker | 403 | CloudFront country block |

Re-run these probes before implementation because anonymous-access and version policies can change.
