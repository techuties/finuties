# New sources, endpoints, and scraping candidates

Last reviewed: 2026-08-14 UTC

## Scope and ranking

This is an ingestion backlog for sources not already represented by the 51 entries in
`terminal/src/lib/source-registry.ts` or by the terminal's SEC, market, CFTC, BLS, BEA,
EIA REST, US Treasury Fiscal Data, and New York Fed reference-rate routes. Free EIA *file*
downloads (XLS/CSV) remain P0 below because they need no API key. Fiscal Data REST
(`debt_to_penny`, average interest rates) remains out of scope as already covered by the
terminal Treasury stack, even though anonymous JSON still works. Registry routes such as
`demographics/refugees` and `weather/alerts` already exist as FinUties products — prefer
extending those adapters over parallel public mirrors unless the upstream contract is new.
UNHCR Population API anonymous JSON still works — extend `demographics/refugees` rather than
listing a parallel P0.

Ranking (high value → not immediate):

- **P0 — implement next:** high-value, credential-free, machine-readable, and verified live.
- **P1 — high value:** useful and generally free, but overlapping, changing, unusually complex,
  or requiring a terms/schema decision first.
- **P2 — investigate:** useful file feeds or scraping targets without a sufficiently stable
  machine contract.
- **P3 — not immediate:** gated, restrictive, duplicative, or too brittle for the current value.

HTTP 200 only proves anonymous technical access. Before production release, retain the source's
attribution and disclaimer, confirm redistribution rights, and add a source-specific rate policy.

**New in this review (2026-08-14):** CFTC Traders in Financial Futures (TFF) current-week
`FinFutWk.txt` / `FinComWk.txt` plus Socrata JSON (`gpe5-46if`, latest **2026-08-04**);
CFTC Supplemental CIT Socrata (`4zgm-a668`, latest **2026-08-04**); nine additional Federal
Reserve DDP ZIP packages sharing the G.17 contract (`H8`, `H41`, `H6`, `H10`, `G19`, `CP`,
`CHGDEL`, `FOR`, `SLOOS`) plus the large Z.1 Financial Accounts package; ONS Brazil CKAN
electricity open data (`package_list` 83 datasets; `carga-energia` 2026 CSV ~37 KB, last
modified **2026-08-13**). **Allowlist extensions:** FRED `fredgraph.csv` adds `RSAFS` /
`TOTLL` / `BUSLOANS` / `M2SL` / `WALCL` / `REVOLSL` / `DRCCLACBS` / `TDSP` as companions to
the new Fed DDP / Census retail prints. **Contract note:** OCC volume-query now requires
`format=csv` (bare query returns `Report Format is Required`); 20260813 ~4.8 MB. **Re-verified:**
GLEIF ~3,402,410 LEIs (golden copy **2026-08-14**); UK Sanctions List report date still
**06-Aug-2026**; CISA KEV catalogVersion **2026.08.11** (1,665); OTC Markets screener ~18,077;
FINRA CNMS 20260813 / 20260812 / 20260811 all live (~537–540 KB); Fear & Greed **29** Fear;
Coin Metrics BTC PriceUSD **2026-08-13** ~63395; NY Fed SOFR 2026-08-12 3.62%; OpenSanctions
~291.6k entities (updated **2026-08-14**); Swiss SECO XML list date **2026-08-11**; PredictIt
194 markets; SGX 893 indices; Malaysia CPI / Census M3 / Fed G.17 / Dallas TMOS still live;
Polymarket + Kalshi + Canada SEMA. **Still blocked / watch:** Census MARTS advance XLSX paths
still 404 (PDF + FRED `RSAFS` work — keep P1); Richmond Fed manufacturing workbook URLs still
404; MarineCadastre AIS ZIP GETs still 404; OpenSky connection failed; OpenNEM power stats
still 401; GIE AGSI/ALSI need `x-key`; NASA FIRMS needs `MAP_KEY`; USDA NASS / Ember API /
Electricity Maps / Banxico / OpenAQ / AirNow / KOSIS key-gated or Cloudflare-blocked; Metaculus
403; BaFin/FI Sweden/FSMA/CONSOB short-selling machine exports not stably extracted; Baker
Hughes stable workbook still undiscovered; Destatis guest REST still HTML/405; RBNZ unavailable;
MAS paths 404; Bank of Korea ECOS requires free API key (`sample` demo key works — not
zero-credential).

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
- **Entry point:** `GET https://www.fhfa.gov/hpi/download/monthly/hpi_master.csv`
  (re-verified ~17 MB CSV on 2026-08-09; prior `/data/pmi/` path is stale)
- **Docs:** https://www.fhfa.gov/data/house-price-index
- **Access:** no authentication; large CSV.
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
  - `GET https://data-api.ecb.europa.eu/service/data/CISS?lastNObservations=1&format=csvdata`
    (Composite Indicator of Systemic Stress — ~60 series; latest sovereign/systemic points through
    **2026-08-04** on 2026-08-11 probe)
  - `GET https://data-api.ecb.europa.eu/service/data/MIR/M.U2.B.A2C.AM.R.A.2250.EUR.N?lastNObservations=3&format=csvdata`
    (MFI interest rate sample — euro-area household lending)
- **Docs:** https://data.ecb.europa.eu/help/api/overview
- **Access:** no authentication; SDMX-CSV / XML / JSON.
- **Implementation:** curated dataflow allowlist (`EXR`, `FM`, `YC`, `CISS`, `MIR`, plus €STR
  `EST` when needed); store KEY dimensions and `TIME_PERIOD`/`OBS_VALUE`; throttle and cache
  dataflow metadata. Prefer narrow CISS filters in production after the discovery pull.
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

### 91. USGS monitored volcanoes *(extended 2026-08-07)*

- **Value:** current US volcano alert levels and aviation color codes — nature/disaster overlay
  beyond earthquakes and GDACS.
- **Entry points:**
  - `GET https://volcanoes.usgs.gov/hans-public/api/volcano/getMonitoredVolcanoes`
  - `GET https://volcanoes.usgs.gov/hans-public/api/volcano/getElevatedVolcanoes` (elevated-alert
    subset; ~3.3 KB JSON verified 2026-08-07, e.g. Great Sitkin)
- **Docs:** https://volcanoes.usgs.gov/hans-public/
- **Access:** no authentication; JSON arrays.
- **Implementation:** upsert by volcano number/`vnum`; store `alert_level`, `color_code`,
  `obs_abbr`, `sent_utc`, and notice URLs. Prefer the elevated endpoint for a hot-path risk card;
  keep the full monitored set for completeness. Do **not** use retired `vsc/api/volcanoApi/*`
  paths (404 as of this review).
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

### 102. DeFiLlama historical chain TVL *(extended 2026-08-04)*

- **Value:** free DeFi TVL history and stablecoin circulating supply as crypto-market complements
  to the existing CoinGecko-backed `crypto` prices route.
- **Entry points:**
  - `GET https://api.llama.fi/v2/historicalChainTvl/Ethereum`
  - `GET https://api.llama.fi/protocols` (large protocol catalog)
  - Stablecoin circulating supply (extended 2026-08-04):
    `GET https://stablecoins.llama.fi/stablecoins?includePrices=true` (~539 KB; ~413 pegged
    assets) and `GET https://stablecoins.llama.fi/stablecoinchains` (~19 KB)
- **Docs:** https://defillama.com/docs/api
- **Access:** no authentication; JSON. Note: `bridges.llama.fi` returned paid-plan 402 here —
  keep bridges out of the free allowlist.
- **Implementation:** start with a small chain allowlist (Ethereum, Bitcoin/sidechains as
  published); store `date` epoch + `tvl`; snapshot stablecoin pegged USD totals by asset/chain;
  avoid daily full `/protocols` dumps.
- **Terms/risk:** confirm DefiLlama terms; `/protocols` is multi-MB — cache rarely.

### 103. FRED series CSV downloads *(new — no API key)*

- **Value:** long official US macro/rates/housing/sentiment history without registering a FRED
  API key. Complements NY Fed rates and BLS/BEA terminal routes with a simple CSV adapter.
- **Entry points (allowlist — extend carefully):**
  - `GET https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS10`
  - `GET https://fred.stlouisfed.org/graph/fredgraph.csv?id=T10Y2Y`
  - `GET https://fred.stlouisfed.org/graph/fredgraph.csv?id=UNRATE`
  - `GET https://fred.stlouisfed.org/graph/fredgraph.csv?id=CPIAUCSL`
  - `GET https://fred.stlouisfed.org/graph/fredgraph.csv?id=GDP`
  - `GET https://fred.stlouisfed.org/graph/fredgraph.csv?id=KCFSI` (Kansas City Fed Financial
    Stress Index; verified 2026-08-03)
  - `GET https://fred.stlouisfed.org/graph/fredgraph.csv?id=CSUSHPISA` (S&P/Case-Shiller US
    National HPI SA; verified 2026-08-03)
  - `GET https://fred.stlouisfed.org/graph/fredgraph.csv?id=UMCSENT` (U. Michigan consumer
    sentiment; re-verified 2026-08-07)
  - `GET https://fred.stlouisfed.org/graph/fredgraph.csv?id=ICSA` (initial jobless claims;
    verified 2026-08-07)
  - `GET https://fred.stlouisfed.org/graph/fredgraph.csv?id=JTSJOL` (JOLTS job openings;
    verified 2026-08-07)
  - `GET https://fred.stlouisfed.org/graph/fredgraph.csv?id=MEDCPIM158SFRBCLE` (Cleveland Fed
    median CPI; verified 2026-08-07 — native Cleveland JSON path currently 404)
  - `GET https://fred.stlouisfed.org/graph/fredgraph.csv?id=CORESTICKM159SFRBATL` (Atlanta Fed
    sticky-price CPI; verified 2026-08-07 — native Atlanta CSV path currently 404/HTML)
  - Optional housing starts companion: `id=HOUST`
  - `GET https://fred.stlouisfed.org/graph/fredgraph.csv?id=STLFSI4` (St. Louis Fed Financial
    Stress Index; verified 2026-08-11 — weekly through 2026-07-31)
  - `GET https://fred.stlouisfed.org/graph/fredgraph.csv?id=INDPRO` (industrial production;
    verified 2026-08-11 — companion to native G.17 P0 #217)
  - `GET https://fred.stlouisfed.org/graph/fredgraph.csv?id=TCU` (capacity utilization;
    verified 2026-08-11)
  - `GET https://fred.stlouisfed.org/graph/fredgraph.csv?id=AMTMNO` (Census manufacturers' new
    orders; verified 2026-08-11 — companion to Census M3 P0 #216)
  - `GET https://fred.stlouisfed.org/graph/fredgraph.csv?id=RSAFS` (advance retail & food
    services; verified 2026-08-14 through **2026-06** 768553 — companion while MARTS XLSX
    paths remain unpinned)
  - `GET https://fred.stlouisfed.org/graph/fredgraph.csv?id=TOTLL` (commercial-bank total loans;
    verified 2026-08-14 through **2026-07-29** — companion to H.8 P0 #220)
  - `GET https://fred.stlouisfed.org/graph/fredgraph.csv?id=BUSLOANS` (commercial & industrial
    loans; verified 2026-08-14 through **2026-06**)
  - `GET https://fred.stlouisfed.org/graph/fredgraph.csv?id=M2SL` (M2 money stock; verified
    2026-08-14 through **2026-06** 23155.2 — companion to H.6 P0 #222)
  - `GET https://fred.stlouisfed.org/graph/fredgraph.csv?id=WALCL` (Fed balance-sheet total
    assets; verified 2026-08-14 through **2026-08-12** 6759955 — companion to H.4.1 P0 #221)
  - `GET https://fred.stlouisfed.org/graph/fredgraph.csv?id=REVOLSL` (revolving consumer credit;
    verified 2026-08-14 through **2026-06** — companion to G.19 P0 #224)
  - `GET https://fred.stlouisfed.org/graph/fredgraph.csv?id=DRCCLACBS` (credit-card delinquency
    rate; verified 2026-08-14 through **2026-01** 2.92 — companion to CHGDEL P0 #226)
  - `GET https://fred.stlouisfed.org/graph/fredgraph.csv?id=TDSP` (household debt-service ratio;
    verified 2026-08-14 through **2026-01** 11.16 — companion to FOR P0 #227)
- **Docs:** https://fredhelp.stlouisfed.org/fred/data/downloading/
- **Access:** no authentication; `application/csv` (DGS10 ~268 KB; Case-Shiller ~9 KB).
- **Implementation:** maintain an allowlist of series IDs; parse `observation_date,SERIES_ID`;
  treat `.` / blanks as missing; optional `vintage_date=` for point-in-time; checksum +
  skip-unchanged; polite daily cadence. Prefer FHFA (#44) / Freddie (#45) as primary housing
  prints; Case-Shiller via FRED is a convenient cross-check.
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
- **Verified:** `reportDate=20260731` returned ~4.7 MB CSV; `20260730` ~4.8 MB; `20260813` and
  `20260812` ~4.8 MB each (2026-08-14). `reportType` must be `D` (other values return “Report
  Type is invalid”). `format=csv` is now required — omitting it returns
  `Report Format is Required` (200, 25 bytes).
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

### 111. Open-Meteo forecast and air quality *(extended 2026-08-04)*

- **Value:** no-key global weather, air-quality, and marine point APIs for user-selected
  coordinates — complements NOAA alerts without station-only coverage.
- **Entry points:**
  - `GET https://api.open-meteo.com/v1/forecast?latitude=40.71&longitude=-74.01&current=temperature_2m,wind_speed_10m`
  - `GET https://air-quality-api.open-meteo.com/v1/air-quality?latitude=52.52&longitude=13.41&current=pm10,pm2_5`
  - Air-quality hourly (verified 2026-08-04):
    `GET https://air-quality-api.open-meteo.com/v1/air-quality?latitude=40.71&longitude=-74.01&hourly=pm10,pm2_5&past_days=1`
  - Marine waves (verified 2026-08-04):
    `GET https://marine-api.open-meteo.com/v1/marine?latitude=40.7&longitude=-74.0&hourly=wave_height&forecast_days=1`
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
  (JSON; `count` ~18,085 / ~905 pages re-verified 2026-08-03 after a 2026-08-02 timeout;
  response may be a JSON-encoded string — parse twice if needed).
- **Docs / UI:** https://www.otcmarkets.com/research/stock-screener
- **Access:** no authentication; paginated JSON (`symbol`, `securityName`, `market`, `securityId`, …).
  Prefer the `www.otcmarkets.com` host — `backend.otcmarkets.com/otcapi/...` returned 403.
- **Implementation:** page through `pages`; upsert by `securityId`/`symbol`; capture market tier
  and reportDate; soft-delete disappearances; retry/backoff on intermittent timeouts.
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

### 131. EIA no-key petroleum, natural-gas, and outlook files *(extended 2026-08-04)*

- **Value:** free energy spot/stocks/outlook/generation/drilling prints without the gated EIA
  REST API key — complements the terminal energy card and commodities notebooks.
- **Entry points:**
  - `GET https://ir.eia.gov/wpsr/table1.csv` (weekly petroleum stocks summary; ~7 KB)
  - `GET https://ir.eia.gov/wpsr/table2.csv` (refiner inputs / utilization; ~8 KB)
  - `GET https://ir.eia.gov/wpsr/table9.csv` (crude production / stocks detail; ~47 KB;
    verified 2026-08-04)
  - `GET https://ir.eia.gov/wpsr/psw01.xls` (WPSR workbook companion; ~1.3 MB; verified
    2026-08-04)
  - `GET https://www.eia.gov/dnav/pet/hist_xls/RBRTEd.xls` (Europe Brent spot; ~491 KB)
  - `GET https://www.eia.gov/dnav/ng/hist_xls/RNGWHHDd.xls` (Henry Hub; ~374 KB)
  - `GET https://www.eia.gov/dnav/pet/xls/PET_PRI_SPT_S1_D.xls` (spot prices workbook; ~3.6 MB)
  - `GET https://ir.eia.gov/ngs/ngshistory.xls` (weekly natural-gas storage history; ~730 KB;
    verified 2026-08-02/03/04)
  - `GET https://www.eia.gov/outlooks/steo/xls/STEO_m.xlsx` (Short-Term Energy Outlook monthly
    workbook; ~1.1 MB; verified 2026-08-03/04)
  - `GET https://www.eia.gov/electricity/monthly/xls/table_1_01.xlsx` (Electric Power Monthly
    generation summary; ~20 KB; verified 2026-08-03)
  - `GET https://www.eia.gov/petroleum/drilling/xls/dpr-data.xlsx` (Drilling Productivity Report;
    ~156 KB; verified 2026-08-04)
- **Docs:** https://www.eia.gov/petroleum/supply/weekly/, https://www.eia.gov/outlooks/steo/,
  https://www.eia.gov/electricity/monthly/, https://www.eia.gov/petroleum/drilling/, and
  https://www.eia.gov/dnav/
- **Access:** no authentication for these file URLs (EIA REST `api.eia.gov` remains P3 key-gated).
- **Implementation:** weekly WPSR CSV/XLS pull + daily/weekly XLS sync + NGS history XLS +
  monthly STEO/EPM/DPR workbooks; checksum; parse STUB/date columns carefully; do not treat
  `ir.eia.gov/wpsr/overview.csv`, `ngs.csv`, `ngs/overview.csv`, or `wngsr.xlsx` as free (403
  Access Restricted / interstitial). Optional large companion (P1 cadence): `Region_US48.xlsx`
  from the EIA Grid Monitor known-issues path (~36 MB verified) — treat as bulk, not a hot path.
- **Terms/risk:** US government open data; still add attribution. Some `ir.eia.gov` paths are
  restricted — pin the verified table IDs / `ngshistory.xls` / `STEO_m.xlsx` / `dpr-data.xlsx`.

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

### 136. Multi-venue crypto public tickers *(extended 2026-08-05)*

- **Value:** credential-free spot/perp tickers across additional venues for cross-exchange crypto
  microstructure beyond Coinbase (#121), Kraken (#122), Hyperliquid (#157), Coin Metrics (#160),
  and CoinGecko aggregates.
- **Entry points (verified 200 JSON on 2026-08-01; Binance.US re-verified 2026-08-04; venues
  below added/re-verified 2026-08-05):**
  - Bitstamp `GET https://www.bitstamp.net/api/v2/ticker/btcusd`
  - Gemini `GET https://api.gemini.com/v1/pubticker/btcusd`
  - OKX `GET https://www.okx.com/api/v5/market/ticker?instId=BTC-USDT`
  - Bitfinex `GET https://api-pub.bitfinex.com/v2/ticker/tBTCUSD`
  - KuCoin `GET https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=BTC-USDT`
  - Gate.io `GET https://api.gateio.ws/api/v4/spot/tickers?currency_pair=BTC_USDT`
  - Poloniex `GET https://api.poloniex.com/markets/BTC_USDT/ticker24h`
  - Deribit `GET https://www.deribit.com/api/v2/public/ticker?instrument_name=BTC-PERPETUAL`
  - Binance.US `GET https://api.binance.us/api/v3/ticker/price?symbol=BTCUSD` and
    `GET https://api.binance.us/api/v3/ticker/24hr?symbol=BTCUSD` /
    `.../klines?symbol=BTCUSD&interval=1d&limit=3` (geo-reachable here; Binance.com remains
    geo-451)
  - BitMEX `GET https://www.bitmex.com/api/v1/instrument?symbol=XBTUSD&columns=symbol,lastPrice,bidPrice,askPrice,volume24h`
  - MEXC `GET https://api.mexc.com/api/v3/ticker/price?symbol=BTCUSDT` (+ `/ticker/24hr`)
  - HTX/Huobi `GET https://api.huobi.pro/market/detail/merged?symbol=btcusdt`
  - Crypto.com Exchange `GET https://api.crypto.com/exchange/v1/public/get-tickers?instrument_name=BTC_USDT`
  - dYdX v4 `GET https://indexer.dydx.trade/v4/perpetualMarkets` (oraclePrice / volume24H /
    nextFundingRate per market)
  - Optional: GMX `GET https://api.gmx.io/prices` (token address → price map; pair with a
    token allowlist)
- **Access:** no authentication for these public market endpoints.
- **Implementation:** allowlist BTC/ETH majors first; normalize last/bid/ask/volume; snapshot on a
  polite cadence; store venue + instrument id; skip Binance.com (geo-451 here) and Bybit
  (CloudFront country block here); prefer Binance.US when a Binance-family print is required.
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


### 148. US Drought Monitor Data Services *(extended 2026-08-04)*

- **Value:** official US drought severity area statistics and current polygon geography — fills a
  high-signal climate/agriculture gap beside NOAA PSL indices, USGS NWIS, and Open-Meteo.
- **Entry points:**
  - National area percent:
    `GET https://usdmdataservices.unl.edu/api/USStatistics/GetDroughtSeverityStatisticsByAreaPercent?aoi=us&statisticsType=1&startDate=7/1/2026&endDate=8/3/2026`
    (CSV; CONUS D0–D4 shares; map date 2026-07-28 still current on 2026-08-04 re-probe)
  - County area percent:
    `GET https://usdmdataservices.unl.edu/api/CountyStatistics/GetDroughtSeverityStatisticsByAreaPercent?aoi=06037&statisticsType=1&startDate=7/1/2026&endDate=8/3/2026`
  - Current shapefile ZIP:
    `GET https://droughtmonitor.unl.edu/data/shapefiles_m/USDM_current_M.zip` (~2.3 MB;
    `USDM_YYYYMMDD.*` members; still `USDM_20260728.*` on 2026-08-04)
  - Current GeoJSON (extended 2026-08-04):
    `GET https://droughtmonitor.unl.edu/data/json/usdm_current.json` (~19.1 MB FeatureCollection)
- **Docs:** https://droughtmonitor.unl.edu/DmData/DataDownload.aspx and
  https://usdmdataservices.unl.edu/
- **Access:** no authentication; CSV + ZIP shapefile + GeoJSON. Note: some
  `usdmdataservices.unl.edu` national CSV URL variants returned **404** on 2026-08-06 — shapefile
  + GeoJSON remained healthy with map date still **2026-07-28**.
- **Implementation:** weekly pull of national + selected-county series; upsert by `MapDate` /
  FIPS; archive shapefile/GeoJSON checksums; prefer dataservices CSV for area stats when the
  endpoint responds, otherwise derive area shares from polygons; do not invent interpolations
  between map dates.
- **Terms/risk:** USDM / NDMC attribution required; polygons are weekly snapshots. GeoJSON is
  large — cold-sync / CDN-cache, not a hot dashboard poll.

### 149. NOAA NHC active tropical cyclones *(new)*

- **Value:** authoritative Atlantic/Eastern Pacific tropical-cyclone status for disaster and
  insurance/ops overlays next to GDACS, NASA EONET, and NWS alerts already in the registry.
- **Entry points:**
  - `GET https://www.nhc.noaa.gov/CurrentStorms.json` (JSON `{activeStorms:[...]}`; empty array
    is a valid quiet-season response — verified 2026-08-03)
  - `GET https://www.nhc.noaa.gov/index-at.xml` (Atlantic RSS/GeoRSS advisories)
  - GIS forecast archive index: `https://www.nhc.noaa.gov/gis/forecast/archive/` (large HTML
    listing of shapefile/KMZ products when storms are active)
- **Docs:** https://www.nhc.noaa.gov/gis/ and https://www.nhc.noaa.gov/aboutnhcws.shtml
- **Access:** no authentication; JSON + XML.
- **Implementation:** poll `CurrentStorms.json` frequently in season; persist advisory IDs /
  storm IDs; treat empty `activeStorms` as healthy zero, not a parse failure; optionally mirror
  GeoRSS items with `georss` points.
- **Terms/risk:** US government open data; do not scrape the interactive map UI when these feeds
  suffice.

### 150. ILOSTAT labour indicators *(new)*

- **Value:** official ILO modelled/labour-market and SDG labour indicators (employment, working
  poverty, social protection coverage) as a development/macro complement to existing World Bank /
  UN / UN SDG (#146) routes.
- **Entry points:**
  - Indicator catalog TOC:
    `GET https://rplumber.ilo.org/metadata/toc/indicator?lang=en&format=.csv` (~738 KB)
  - Curated indicator extract (example working-poverty SDG 1.1.1):
    `GET https://rplumber.ilo.org/data/indicator/?id=SDG_0111_SEX_AGE_RT_A&type=label&format=.csv`
    (~6.9 MB full extract; filter with `ref_area=` when possible)
  - SDMX structure discovery (large):
    `GET https://sdmx.ilo.org/rest/dataflow/ILO/all/latest` (~7.3 MB structure XML)
- **Docs:** https://ilostat.ilo.org/data/ and https://rplumber.ilo.org/
- **Access:** no authentication; CSV/JSON/SDMX.
- **Implementation:** maintain a small indicator-id allowlist from the TOC; prefer filtered
  plumber extracts over unfiltered dumps; store `ref_area`, classifications, `time`, `obs_value`,
  and `obs_status`. SDMX `/rest/data/...` key paths returned 422/500 here on 2026-08-03 — use
  plumber until a stable SDMX key fixture is pinned.
- **Terms/risk:** ILO attribution; modelled estimates carry methodological caveats — preserve
  source labels and observation status.


### 151. World Bank Pink Sheet commodity prices *(new)*

- **Value:** official World Bank Commodity Markets Outlook “Pink Sheet” historical prices for
  energy, metals, agriculture, and fertilizers — highest-value free commodity panel after LBMA
  and EIA file prints.
- **Entry points:**
  - Monthly history:
    `GET https://thedocs.worldbank.org/en/doc/5d903e848db1d1b83e0ec8f744e55570-0350012021/related/CMO-Historical-Data-Monthly.xlsx`
    (~765 KB; verified 2026-08-04)
  - Annual history:
    `GET https://thedocs.worldbank.org/en/doc/5d903e848db1d1b83e0ec8f744e55570-0350012021/related/CMO-Historical-Data-Annual.xlsx`
    (~3.1 MB; verified 2026-08-04)
- **Docs / page:** https://www.worldbank.org/en/research/commodity-markets
- **Access:** no authentication; XLSX.
- **Implementation:** monthly checksum; parse commodity × date wide/long sheets; store units and
  nominal/real series as published; archive each publish snapshot.
- **Terms/risk:** World Bank attribution; URL slug is stable under the docs host but canary the
  commodity-markets page if the related-doc GUID changes.

### 152. IMF Primary Commodity Prices *(new)*

- **Value:** IMF monthly primary commodity price workbook (PCPS / External Data) as a second
  official commodity panel beside the World Bank Pink Sheet — useful for cross-checks and IMF
  index families.
- **Entry point:**
  `GET https://www.imf.org/external/np/res/commod/External_Data.xls`
  (HTTP 200; body is OOXML XLSX ~480 KB despite `.xls` suffix; verified 2026-08-04)
- **Docs / page:** https://www.imf.org/en/Research/commodity-prices
- **Access:** no authentication; XLSX served from the legacy External_Data path.
- **Implementation:** detect OOXML vs BIFF; parse monthly commodity indices/prices; upsert by
  commodity code + period; do not use the retired `/media/Files/Research/CommodityPrices/Monthly/`
  blob paths (404 BlobNotFound here).
- **Terms/risk:** IMF attribution; filename extension is misleading — pin content-type/magic
  bytes in the adapter canary.

### 153. NASA GISS GISTEMP *(new)*

- **Value:** canonical global surface-temperature anomaly tables (land-ocean and zonal) for the
  climate monitor — primary-publisher alternative to reanalysis-only paths.
- **Entry points:**
  - Global monthly means:
    `GET https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv` (~13 KB)
  - Zonal annual means:
    `GET https://data.giss.nasa.gov/gistemp/tabledata_v4/ZonAnn.Ts+dSST.csv` (~10 KB)
- **Docs:** https://data.giss.nasa.gov/gistemp/
- **Access:** no authentication; CSV/text.
- **Implementation:** monthly pull; parse year×month grids; treat missing sentinels per GISS
  notes; store dataset version (`tabledata_v4`) with observations.
- **Terms/risk:** NASA GISS citation required; values are anomalies, not absolute temperatures.

### 154. NOAA SWPC space weather *(new)*

- **Value:** planetary K-index, NOAA space-weather scales, alerts, and solar-cycle indices —
  operational nature/risk overlay that complements NWS alerts, NHC, and GDACS.
- **Entry points:**
  - `GET https://services.swpc.noaa.gov/json/planetary_k_index_1m.json` (~28 KB rolling minutes)
  - `GET https://services.swpc.noaa.gov/products/noaa-scales.json` (~1 KB current R/S/G scales)
  - `GET https://services.swpc.noaa.gov/products/alerts.json` (~51 KB recent alert products)
  - `GET https://services.swpc.noaa.gov/json/solar-cycle/observed-solar-cycle-indices.json`
    (~512 KB monthly SSN / F10.7 history)
- **Docs:** https://www.swpc.noaa.gov/products and https://services.swpc.noaa.gov/
- **Access:** no authentication; JSON.
- **Implementation:** high-cadence poll for Kp + scales/alerts; daily/weekly sync for solar-cycle
  history; upsert by `time_tag` / product id; treat scale `0` / empty alerts as healthy.
- **Terms/risk:** US government open data; do not scrape the interactive SWPC UI when these JSON
  products suffice. Some older `products/solar-wind/*` paths 404 — pin the verified JSON hosts.

### 155. EMSC Seismic Portal FDSN events *(new)*

- **Value:** European-Mediterranean Seismological Centre global event feed via FDSN — denser
  near-real-time quake coverage that complements the existing USGS earthquakes registry route.
- **Entry points:**
  - JSON FeatureCollection:
    `GET https://www.seismicportal.eu/fdsnws/event/1/query?limit=5&format=json`
  - Text TSV:
    `GET https://www.seismicportal.eu/fdsnws/event/1/query?limit=2&format=text`
- **Docs:** https://www.seismicportal.eu/ and FDSN event docs at `/fdsnws/event/1/`
- **Access:** no authentication; JSON / text.
- **Implementation:** poll recent events with `starttime`/`minmagnitude` filters; upsert by
  EMSC/FDSN event id; store mag type, depth, author/catalog, and place string; join to USGS ids
  when present rather than double-counting blindly.
- **Terms/risk:** EMSC attribution; respect FDSN rate guidance and prefer incremental windows.

### 156. NSIDC Sea Ice Index daily extent *(new)*

- **Value:** definitive daily Arctic/Antarctic sea-ice extent CSVs (Sea Ice Index v4) for the
  climate monitor — primary cryosphere print beside any aggregated climate routes.
- **Entry points:**
  - Northern Hemisphere:
    `GET https://noaadata.apps.nsidc.org/NOAA/G02135/north/daily/data/N_seaice_extent_daily_v4.0.csv`
    (~1.88 MB; verified 2026-08-04)
  - Southern Hemisphere:
    `GET https://noaadata.apps.nsidc.org/NOAA/G02135/south/daily/data/S_seaice_extent_daily_v4.0.csv`
    (~1.82 MB; verified 2026-08-04)
- **Docs:** https://nsidc.org/data/g02135 and directory indexes under
  `https://noaadata.apps.nsidc.org/NOAA/G02135/`
- **Access:** no authentication; CSV (directory listing confirms current `v4.0` filenames).
- **Implementation:** daily checksum; parse Year/Month/Day/Extent/Missing; do **not** pin retired
  `v3.0` filenames (404); store hemisphere + version in the series key.
- **Terms/risk:** NSIDC / NOAA citation; values are extent (10⁶ km²), not concentration grids.

### 157. Hyperliquid public market data *(new)*

- **Value:** credential-free perpetual-DEX universe and mid prices — fills a crypto derivatives
  microstructure gap beyond CEX tickers (#121/#122/#136) and DeFiLlama TVL (#102).
- **Entry points:**
  - `POST https://api.hyperliquid.xyz/info` with JSON `{"type":"meta"}` (~17.5 KB universe)
  - `POST https://api.hyperliquid.xyz/info` with JSON `{"type":"allMids"}` (~15.7 KB; ~944 mids
    on 2026-08-04)
- **Docs:** https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api
- **Access:** no authentication; JSON over POST (GET returns 405).
- **Implementation:** snapshot meta + allMids on a polite cadence; map coin names / asset ids to
  normalized symbols; store mid, leverage metadata, and as-of time; allowlist majors first.
- **Terms/risk:** confirm Hyperliquid API / redistribution terms; mids are not a full trade tape.

### 158. CIRCL.lu CVE record API *(new)*

- **Value:** anonymous CVE 5.1 record lookup that complements CISA KEV (#61), FIRST EPSS (#62),
  and OSV.dev (#147) without an NVD API key.
- **Entry point:**
  `GET https://cve.circl.lu/api/cve/CVE-2024-3400` (~12 KB CVE_RECORD; verified 2026-08-04)
- **Docs:** https://www.circl.lu/services/cve-search/ and https://cve.circl.lu/
- **Access:** no authentication; JSON.
- **Implementation:** on-demand enrichment by CVE id from KEV/OSV joins; cache immutable CVE
  records; do not bulk-crawl the entire CVE list anonymously.
- **Terms/risk:** CIRCL / CVE attribution; still prefer NVD (#P1) only when a free production key
  and higher bulk throughput are required.
- **Ops note (2026-08-05):** anonymous burst traffic returned HTTP **429** (`20 per 1 minute`).
  Keep a global CIRCL budget and back off; prefer OSV (#147) / CISA KEV (#61) for hot paths.

### 159. NOAA GML greenhouse-gas trends *(new)*

- **Value:** canonical Mauna Loa / global GHG mole-fraction time series used across climate and
  carbon-risk dashboards — complements NASA GISS (#153), NOAA PSL (#90), Climate TRACE (#64), and
  registry climate temperature / GHG cards with a primary observational feed.
- **Entry points (all 200 text, 2026-08-05):**
  - CO₂ monthly Mauna Loa: `GET https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_mm_mlo.txt` (~59 KB)
  - CO₂ weekly Mauna Loa: `GET https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_weekly_mlo.txt` (~209 KB)
  - CO₂ annual mean Mauna Loa: `GET https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_annmean_mlo.txt` (~3.7 KB)
  - CH₄ global monthly: `GET https://gml.noaa.gov/webdata/ccgg/trends/ch4/ch4_mm_gl.txt` (~46 KB)
  - N₂O global monthly: `GET https://gml.noaa.gov/webdata/ccgg/trends/n2o/n2o_mm_gl.txt` (~28 KB)
  - SF₆ global monthly: `GET https://gml.noaa.gov/webdata/ccgg/trends/sf6/sf6_mm_gl.txt` (~32 KB)
- **Docs:** https://gml.noaa.gov/ccgg/trends/
- **Access:** no authentication; plain-text tables with `#` comment headers (freely available
  public/scientific use per file preamble).
- **Implementation:** parse whitespace columns after skipping `#` comments; upsert by gas + site/
  region + year + month(+week); store `average`, `deseasonalized` / trend columns when present;
  checksum each file; do not interpolate missing months coded as `-99.99` / fill values.
- **Terms/risk:** retain NOAA GML attribution and the file-header use statement; values are
  preliminary near the tip of the series.

### 160. Coin Metrics Community API *(new)*

- **Value:** credential-free institutional-grade crypto reference prices and asset catalog —
  better historical continuity than raw exchange tickers alone; pairs with #121/#122/#136/#157.
- **Entry points:**
  - Timeseries: `GET https://community-api.coinmetrics.io/v4/timeseries/asset-metrics?assets=btc,eth&metrics=PriceUSD&page_size=2&paging_from=end`
  - Asset catalog: `GET https://community-api.coinmetrics.io/v4/catalog/assets`
- **Docs:** https://docs.coinmetrics.io/api/v4
- **Access:** Community tier works without an API key for documented public metrics (verified
  `PriceUSD` for BTC on 2026-08-09 ~64907 with `page_size=1&paging_from=end`). Some
  metrics/frequencies remain paid — allowlist only community-visible fields.
- **Contract note (2026-08-09):** `limit=` returns HTTP 400 `unsupported_parameter`; use
  `page_size=` only.
- **Implementation:** start with `PriceUSD` daily for BTC/ETH; follow `next_page_token` /
  `next_page_url`; cache catalog; map `asset` → internal instrument id; treat as reference print
  beside venue last prices, not a replacement for exchange bid/ask.
- **Terms/risk:** confirm Coin Metrics Community redistribution terms; do not scrape paid metric
  names that 400/402.

### 161. Aviation Weather Center METAR and SIGMET *(promoted)*

- **Value:** airport METAR observations and SIGMET hazard polygons for travel, logistics, and
  event-risk overlays — fills the aviation product allowlist left open under prior P1 NOAA notes
  beside Open-Meteo (#111), CO-OPS (#110), and NWS alert cards.
- **Entry points:**
  - METAR: `GET https://aviationweather.gov/api/data/metar?ids=KJFK,EGLL,RJTT&format=json`
  - SIGMET / airmet: `GET https://aviationweather.gov/api/data/airsigmet?format=json`
- **Docs:** https://aviationweather.gov/data/api/
- **Access:** no authentication; JSON arrays (METAR multi-station sample ~1.4 KB; SIGMET payload
  tens of KB depending on active hazards).
- **Implementation:** maintain an ICAO station allowlist (major hubs + user watchlist); poll METAR
  on a 10–20 minute cadence; store obsTime, temp, winds, visibility, flight category, rawOb;
  ingest SIGMET with validTimeFrom/To + geometry when present; descriptive User-Agent.
- **Terms/risk:** US government weather data; cache aggressively; not a substitute for operational
  briefing products.

### 162. Fraunhofer Energy-Charts (DE power and prices) *(promoted)*

- **Value:** high-frequency German public-power and day-ahead price series with an explicit
  machine-readable license string — strongest no-key EU power complement to Elexon (#53),
  Energinet (#54), Elia (#55), REE (#56), and UK Carbon Intensity (#143).
- **Entry points:**
  - Public power: `GET https://api.energy-charts.info/public_power?country=de`
  - Total power: `GET https://api.energy-charts.info/total_power?country=de`
  - Day-ahead price: `GET https://api.energy-charts.info/price?bzn=DE-LU`
- **Docs:** https://api.energy-charts.info/
- **Access:** no authentication; JSON. Price responses include
  `license_info: "CC BY 4.0 ... from Bundesnetzagentur | SMARD.de"` (verified 2026-08-05).
- **Implementation:** store unix_seconds + series arrays; attribute SMARD/BNetzA + Energy-Charts;
  prefer this over scraping SMARD chart URLs (#P1 residual) when DE power/price is the goal;
  expand `country` / `bzn` allowlists only after fixture checks.
- **Terms/risk:** CC BY 4.0 attribution required; confirm commercial redistribution against
  SMARD/Energy-Charts notices before wide republishing.

### 163. Crypto Fear & Greed and Bitcoin mempool fees *(promoted)*

- **Value:** compact sentiment and on-chain congestion gauges that sit naturally beside
  DeFiLlama (#102), venue tickers (#136), Hyperliquid (#157), and Coin Metrics (#160).
- **Entry points:**
  - Fear & Greed: `GET https://api.alternative.me/fng/?limit=5` (JSON; value + classification +
    unix timestamp)
  - Mempool fees: `GET https://mempool.space/api/v1/fees/recommended` (JSON sat/vB ladder:
    fastest/halfHour/hour/economy/minimum)
- **Access:** no authentication.
- **Implementation:** daily (or hourly) snapshot of Fear & Greed; 5–15 minute mempool fee poll;
  store publisher timestamps; do not treat Fear & Greed as a predictive signal in product copy.
- **Terms/risk:** confirm Alternative.me and mempool.space ToS/attribution; both are community
  APIs — keep soft dependencies and cache.

### 164. deps.dev package metadata *(promoted)*

- **Value:** free package version/advisory graph enrichment that complements OSV.dev (#147),
  CISA KEV (#61), FIRST EPSS (#62), and CIRCL (#158) for software-supply-chain risk cards.
- **Entry point:** `GET https://api.deps.dev/v3/systems/npm/packages/lodash` (also `cargo`,
  `maven`, `pypi`, `go`, etc.)
- **Docs:** https://docs.deps.dev/api/
- **Access:** no authentication; JSON (~20 KB for lodash package overview on 2026-08-05).
- **Implementation:** resolve allowlisted package keys → versions → advisories; join to OSV IDs;
  cache aggressively; do not crawl the entire ecosystem on a hot loop.
- **Terms/risk:** Google deps.dev ToS; use as enrichment, not as the sole vulnerability authority.



### 165. SEC CNS fails-to-deliver *(new)*

- **Value:** official bi-monthly CNS fails-to-deliver by CUSIP/symbol/quantity — core US equity
  settlement-stress print that complements FINRA Reg SHO short volume (#10) without duplicating
  the existing EDGAR/filings stack.
- **Discovery page:** https://www.sec.gov/data-research/sec-markets-data/fails-deliver-data
- **Entry points (half-month ZIPs; path changed from older `fails-to-deliver` guesses):**
  - `GET https://www.sec.gov/files/data/fails-deliver-data/cnsfails202607a.zip` (~1.2 MB;
    contains `cnsfails202607a.txt`)
  - `GET https://www.sec.gov/files/data/fails-deliver-data/cnsfails202606b.zip` (~1.6 MB)
- **Access:** no authentication; ZIP of pipe/CSV-like text. Use a descriptive User-Agent
  (SEC fair-access).
- **Implementation:** poll the discovery page for new `cnsfailsYYYYMMa|b.zip` links; download,
  checksum, unpack; upsert by `(SETTLEMENT DATE, CUSIP)`; retain SYMBOL, QUANTITY (FAILS),
  DESCRIPTION, PRICE; never replace a good half-month with an empty parse.
- **Terms/risk:** SEC data terms; files are settlement lagged (half-month batches). Some older
  months may live under `/files/data/other/fails-deliver-data/` — follow page links, do not guess.

### 166. Federal Reserve H.15 Selected Interest Rates *(new)*

- **Value:** primary Board H.15 packages (Fed funds / bank prime / discount, commercial paper,
  Treasury constant maturities) without a FRED API key — official release packaging beside the
  no-key `fredgraph.csv` allowlist (#103) and the terminal NY Fed reference-rate routes.
- **Package discovery:** `GET https://www.federalreserve.gov/datadownload/Choose.aspx?rel=H15`
- **Entry points (verified package hashes):**
  - Fed funds / prime / discount (weekly):
    `GET https://www.federalreserve.gov/datadownload/Output.aspx?rel=H15&series=8e83f7f17c5cea4d190d85ae6737639f&lastobs=52&from=&to=&filetype=csv&label=include&layout=seriescolumn&type=package`
    (~1.9 KB; ids `RIFSPFF_N.WW`, `RIFSPBLP_N.WW`, `RIFSRP_F02_N.WW`)
  - Weekly averages incl. commercial paper + bills/CMTs:
    `GET https://www.federalreserve.gov/datadownload/Output.aspx?rel=H15&series=c3ec77dedd37c9aa112f71c9eba34b50&lastobs=52&from=&to=&filetype=csv&label=include&layout=seriescolumn&type=package`
    (~12 KB)
  - Treasury constant maturities (all observations):
    `GET https://www.federalreserve.gov/datadownload/Output.aspx?rel=H15&series=bf17364827e38702b42a58cf8eaa3f78&lastobs=&from=&to=&filetype=csv&label=include&layout=seriescolumn&type=package`
    (~981 KB; 1m–30y CMTs)
- **Docs / page:** https://www.federalreserve.gov/releases/h15/
- **Access:** no authentication; CSV with multi-row headers (description / unit / multiplier /
  currency / unique id / time period).
- **Implementation:** pin package `series=` hashes from the Choose page; skip header rows; store
  long observations `(series_id, date, value)`; checksum; prefer H.15 packages for the official
  release surface and FRED CSV for long companion series not in these packages.
- **Terms/risk:** Board redistribution/attribution; package hashes can change when DDP rebuilds —
  canary the Choose page. Do not treat empty Output.aspx bodies as success.

### 167. CAISO real-time demand and fuel mix *(promoted)*

- **Value:** free California ISO system demand and fuel-mix CSVs — fills the largest US Western
  interconnect gap beside ERCOT (#77), NYISO (#141), and EIA files (#131) without OASIS ZIP
  complexity.
- **Entry points:**
  - `GET https://www.caiso.com/outlook/current/demand.csv` (~6 KB; day-ahead / hour-ahead /
    current demand)
  - `GET https://www.caiso.com/outlook/current/fuelsource.csv` (~0.9 KB; solar/wind/gas/nuclear/
    hydro/batteries/imports/…)
- **Docs / page:** https://www.caiso.com/todays-outlook
- **Access:** no authentication; CSV (today’s operating day).
- **Implementation:** poll on a short cadence during the operating day; upsert by timestamp;
  archive daily; treat missing tomorrow files as not-yet-published. Keep OASIS `SingleZip` as a
  deeper LMP follow-on after terms review (still P1).
- **Terms/risk:** confirm CAISO redistribution terms; outlook HTML paths 404’d here — pin the
  stable `/outlook/current/*.csv` files only.

### 168. openFDA enforcement and product APIs *(promoted)*

- **Value:** free FDA drug/device/food enforcement actions plus NDC and FAERS event JSON —
  product-safety / liability overlay for healthcare and consumer issuers.
- **Entry points:**
  - `GET https://api.fda.gov/drug/enforcement.json?limit=1` (~17.8k enforcement records meta)
  - `GET https://api.fda.gov/device/enforcement.json?limit=1`
  - `GET https://api.fda.gov/food/enforcement.json?limit=1`
  - `GET https://api.fda.gov/drug/ndc.json?limit=1`
  - `GET https://api.fda.gov/drug/event.json?limit=1` (FAERS)
- **Docs:** https://open.fda.gov/apis/
- **Access:** anonymous JSON works without a key at low ceilings; a free key raises limits.
- **Implementation:** incremental sync via `search` + `skip`/`limit` or downloadable archives;
  store recall number, classifying firm, status, product description, and report date; cache;
  register a free API key before production volume.
- **Terms/risk:** openFDA disclaimer (not for clinical decisions); attribution required.

### 169. NASA POWER daily meteorology *(promoted)*

- **Value:** credential-free point meteorology (temperature, precipitation, solar, wind) on a
  stable JSON contract — operational climate/ag overlay beside Open-Meteo (#111), MET Norway
  (#144), and Bright Sky (#145) with NASA provenance.
- **Entry point:**
  `GET https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M,PRECTOTCORR&community=RE&longitude=-77.0&latitude=38.9&start=20260101&end=20260107&format=JSON`
- **Docs:** https://power.larc.nasa.gov/docs/services/api/
- **Access:** no authentication; GeoJSON-like Feature with parameter dictionaries.
- **Implementation:** allowlist monitored lat/lon cells; cache by date range; store parameter
  units from the response; prefer daily community=`RE` or `AG` bundles; do not hammer single
  points.
- **Terms/risk:** NASA POWER ToS/attribution; not a substitute for station GHCN (#173) when
  station provenance is required.

### 170. NASA DONKI space weather events *(new)*

- **Value:** structured CME and solar-flare event catalogs from NASA CCMC — pairs with NOAA SWPC
  (#154) for space-weather risk without scraping HTML dashboards.
- **Entry points:**
  - `GET https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get/CME?startDate=2026-07-01&endDate=2026-08-06`
    (~364 KB JSON)
  - `GET https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get/FLR?startDate=2026-07-01&endDate=2026-08-06`
    (~37 KB JSON)
- **Docs:** https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/
- **Access:** no authentication; JSON arrays keyed by activity/flare IDs.
- **Implementation:** daily window pulls; upsert by `activityID` / `flrID`; retain instruments,
  start/peak/end times, and linked notifications; polite cadence.
- **Terms/risk:** NASA/CCMC attribution; DONKI is research-grade — keep SWPC as the operational
  alert primary.

### 171. PSMSL tide gauge sea level *(new)*

- **Value:** permanent service for mean sea level (PSMSL) revised local reference monthly series —
  station-level complement to registry `climate/sea-level` and CO-OPS (#110).
- **Entry points:**
  - Station list: `GET https://psmsl.org/data/obtaining/rlr.monthly.data/filelist.txt` (~139 KB)
  - Station series: `GET https://psmsl.org/data/obtaining/rlr.monthly.data/{id}.rlrdata`
    (e.g. `1.rlrdata` Brest ~68 KB)
- **Docs:** https://psmsl.org/data/obtaining/
- **Access:** no authentication; semicolon text tables.
- **Implementation:** sync `filelist.txt` for lat/lon/name; pull allowlisted station ids; parse
  year-fraction / RLR mm / missing flags; checksum; annual full refresh + monthly delta.
- **Terms/risk:** PSMSL citation required; RLR datum is station-specific — do not mix with
  satellite altimetry without documentation.

### 172. CPC ENSO / ONI / Niño indices *(new)*

- **Value:** canonical NOAA CPC ENSO monitoring text indices (ONI, Niño 1+2/3/3.4/4) — highest-
  signal climate-regime print for commodities and disaster risk, credential-free.
- **Entry points:**
  - `GET https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt` (~23 KB)
  - `GET https://www.cpc.ncep.noaa.gov/data/indices/sstoi.indices` (~39 KB)
- **Docs / page:** https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/ensostuff/
- **Access:** no authentication; fixed-width / whitespace text.
- **Implementation:** parse seasonal ONI anomaly and monthly Niño SST/anomaly columns; upsert by
  `(index, year, month_or_season)`; checksum; monitor for header drift.
- **Terms/risk:** NOAA public domain; keep as small allowlisted index files (do not scrape the
  whole CPC product tree blindly).

### 173. NOAA GHCN-Daily station observations *(new)*

- **Value:** Global Historical Climatology Network daily station CSV (precip, snow, Tmax/Tmin,
  etc.) — ground-truth weather/climate observations that complement POWER (#169) and Open-Meteo
  (#111).
- **Entry point:**
  `GET https://www.ncei.noaa.gov/data/global-historical-climatology-network-daily/access/{STATION}.csv`
  (e.g. `USW00094728.csv` Central Park ~17.8 MB)
- **Docs:** https://www.ncei.noaa.gov/products/land-based-station/global-historical-climatology-network-daily
- **Access:** no authentication; CSV per station (can be multi-MB).
- **Implementation:** maintain a small monitored-station allowlist; nightly conditional GET /
  checksum; store core elements first (`PRCP`, `TMAX`, `TMIN`, `SNOW`, `SNWD`); do not bulk-mirror
  the full archive on first cut.
- **Terms/risk:** NCEI access policies; large objects — cold sync and caching mandatory.

### 174. NHTSA vehicle recalls *(promoted)*

- **Value:** official US vehicle recall campaigns by make/model/year — auto-sector product-risk
  overlay with a clean JSON API.
- **Entry point:**
  `GET https://api.nhtsa.gov/recalls/recallsByVehicle?make=tesla&model=model%203&modelYear=2023`
  (Count=11 verified)
- **Docs:** https://www.nhtsa.gov/nhtsa-datasets-and-apis
- **Access:** no authentication; JSON.
- **Implementation:** maintain an allowlist of makes/models/years (or manufacturer campaign
  feeds); upsert by `NHTSACampaignNumber`; store park-it / OTA flags and report dates; polite
  polling. Complaints endpoint can return empty for some queries — treat recalls as the P0 path.
- **Terms/risk:** NHTSA terms; not a substitute for manufacturer notices in regulated workflows.

### 175. EPA eGRID emissions factors *(new)*

- **Value:** eGRID plant/balancing-authority/state emissions and generation characteristics —
  US power-carbon factors that pair with CAISO/ERCOT/NYISO operational feeds and EIA files.
- **Entry point:**
  `GET https://www.epa.gov/system/files/documents/2025-06/egrid2023_data_rev2.xlsx` (~21.2 MB)
- **Docs / page:** https://www.epa.gov/egrid/download-data
- **Access:** no authentication; multi-sheet XLSX (2023 data, rev2).
- **Implementation:** checksum workbook; parse BA/state/plant summary sheets of interest; upsert
  by eGRID id + data year; monitor the download-data page when EPA posts the next vintage (prior
  guessed `/other-files/` paths 404’d).
- **Terms/risk:** EPA attribution; annual vintage — not real-time carbon intensity (use UK Carbon
  Intensity / Electricity Maps only after keys/terms).

### 176. Blockchain.com Bitcoin network stats *(new)*

- **Value:** free Bitcoin network/market stats and chart series (price, hash rate, tx counts) —
  lightweight on-chain companion to mempool fees (#163), Coin Metrics (#160), and venue tickers
  (#136) without a paid on-chain vendor.
- **Entry points:**
  - `GET https://api.blockchain.info/stats` (~0.6 KB JSON snapshot)
  - `GET https://api.blockchain.info/charts/n-transactions?timespan=30days&format=json` (~1 KB)
- **Docs:** https://www.blockchain.com/explorer/api
- **Access:** no authentication; JSON.
- **Implementation:** snapshot `stats` on a polite cadence; allowlist a few chart slugs
  (`n-transactions`, `hash-rate`, `market-price`); store `x` epoch + `y` value; do not scrape the
  full chart catalog.
- **Terms/risk:** confirm Blockchain.com API terms; treat as secondary to venue prints for price.

### 177. CPSC SaferProducts recalls *(promoted)*

- **Value:** US Consumer Product Safety Commission recall JSON — broad consumer-goods safety
  overlay beside openFDA (#168) and NHTSA (#174).
- **Entry point:**
  `GET https://www.saferproducts.gov/RestWebServices/Recall?format=json&RecallDateStart=2026-01-01`
  (~1.1 MB JSON for 2026 YTD on probe)
- **Docs:** https://www.saferproducts.gov/Public-API
- **Access:** no authentication; JSON array of recall objects.
- **Implementation:** date-window pulls; upsert by `RecallID` / `RecallNumber`; store title,
  hazards, retailers, and dates; page carefully (API quirks noted historically).
- **Terms/risk:** CPSC terms; narrower “market print” value than SEC FTD/H.15 — still free and
  directly usable for risk cards.


### 178. SF Fed Proxy Funds Rate *(path fix 2026-08-08)*

- **Value:** San Francisco Fed proxy federal-funds rate — a shadow-rate style measure when the
  effective funds rate is constrained; pairs with H.15 (#166), OFR, and Chicago Fed NFCI.
- **Entry points:**
  - `GET https://www.frbsf.org/wp-content/uploads/proxy-funds-rate.xlsx` (~28 KB XLSX)
  - `GET https://www.frbsf.org/wp-content/uploads/proxy-funds-rate-data.xlsx` (~104 KB XLSX)
  - `GET https://www.frbsf.org/wp-content/uploads/proxy-funds-rate-chart1-data.csv` (~20 KB CSV)
- **Docs:** https://www.frbsf.org/research-and-insights/data-and-indicators/proxy-funds-rate/
- **Access:** no authentication; Excel + CSV. Prior `/sites/4/proxy-funds-rate-data.xlsx` and
  `proxy_funds_rate.xlsx` paths 404'd on 2026-08-08.
- **Implementation:** prefer the CSV for a stable two-column parse (`Date`, `Proxy funds rate`);
  checksum workbook/CSV; retain publication vintage; daily/weekly poll with skip-unchanged.
- **Terms/risk:** SF Fed attribution; workbook schema can shift — fixture the sheet/column names.

### 179. Philadelphia Fed Survey of Professional Forecasters *(new)*

- **Value:** longest-running US macro survey (GDP, unemployment, inflation) — high-value
  expectations complement to Atlanta GDPNow (#100), Cleveland nowcasts (#118), and NY Fed SCE
  (#113).
- **Entry point:**
  `GET https://www.philadelphiafed.org/-/media/frbp/assets/surveys-and-data/survey-of-professional-forecasters/historical-data/medianGrowth.xlsx`
  (~144 KB XLSX verified 2026-08-07)
- **Docs:** https://www.philadelphiafed.org/surveys-and-data/real-time-data-research/survey-of-professional-forecasters
- **Access:** no authentication; Excel median growth workbook.
- **Implementation:** checksum; parse median growth sheets by variable; store survey date +
  horizon; alert on sheet rename. Prefer this workbook over HTML SPF pages.
- **Terms/risk:** Philadelphia Fed citation; some alternate SPF ZIP/microdata paths 404'd here.

### 180. Polymarket public prediction markets *(new)*

- **Value:** large liquid prediction-market probabilities for geopolitics, elections, macro, and
  crypto events — additive event-risk layer not covered by conflict/news feeds.
- **Entry points:**
  - `GET https://gamma-api.polymarket.com/markets?limit=2&active=true` (JSON market cards)
  - `GET https://gamma-api.polymarket.com/events?limit=2&active=true` (JSON events)
  - `GET https://clob.polymarket.com/markets` (CLOB market catalog; ~1.8 MB on probe)
- **Docs:** https://docs.polymarket.com/
- **Access:** no authentication for these public read endpoints.
- **Implementation:** page Gamma markets/events; upsert by `conditionId` / slug; store question,
  odds/prices, volume, end date, and closed flag. Prefer Gamma for product cards; use CLOB for
  deeper market microstructure. Rate-limit and cache aggressively.
- **Terms/risk:** confirm Polymarket ToS/redistribution; prediction prices are not forecasts of
  record — label clearly as market-implied probabilities.

### 181. Kalshi public prediction markets *(new)*

- **Value:** CFTC-regulated US event-contract markets with a clean public REST surface — pairs
  with Polymarket (#180) for cross-venue event odds.
- **Entry points:**
  - `GET https://api.elections.kalshi.com/trade-api/v2/markets?limit=2&status=open`
  - `GET https://api.elections.kalshi.com/trade-api/v2/events?limit=2&status=open`
  - `GET https://api.elections.kalshi.com/trade-api/v2/exchange/status`
- **Docs:** https://docs.kalshi.com/
- **Access:** no authentication for these public read endpoints (JSON; exchange status ~0.3 KB).
- **Implementation:** cursor-page markets/events; upsert by `ticker` / `event_ticker`; store
  yes/no bid-ask, volume, open interest, close time, and category. Poll exchange status as a
  health canary.
- **Terms/risk:** confirm Kalshi API terms; US-regulatory product — keep market-implied labeling.

### 182. Penn World Table *(new)*

- **Value:** cross-country real GDP, capital, productivity, and relative prices — deep
  development/macro panel beyond World Bank/IMF registry slices.
- **Entry points:**
  - `GET https://www.rug.nl/ggdc/docs/pwt100.xlsx` (~6.6 MB XLSX verified 2026-08-07)
  - Alternate Dataverse NL object also returned the workbook (~6.6 MB) on probe
- **Docs:** https://www.rug.nl/ggdc/productivity/pwt/
- **Access:** no authentication; Excel.
- **Implementation:** checksum release workbook; upsert by `countrycode` × `year`; store rgdpo,
  emp, hc, ctfp, and price levels; version the PWT release number in metadata.
- **Terms/risk:** academic citation (Feenstra/Inklaar/Timmer); annual release cadence — not a
  daily hot path.

### 183. adsb.lol open ADS-B *(new)*

- **Value:** free near-real-time aircraft positions (civil + military flags) for logistics and
  geopolitical air-activity overlays — OpenSky remained unreachable from this environment.
- **Entry points:**
  - `GET https://api.adsb.lol/v2/mil` (~80 KB military-marked aircraft JSON verified 2026-08-07)
  - `GET https://api.adsb.lol/v2/lat/{lat}/lon/{lon}/dist/{nm}` (radius query; JFK example ~16 KB)
- **Docs:** https://adsb.lol/
- **Access:** no authentication; JSON.
- **Implementation:** short-TTL snapshots; store hex, flight, lat/lon, alt, groundspeed, and
  `dbFlags`; do not archive full global dumps every minute. Prefer radius or mil endpoints over
  unbounded worldwide pulls.
- **Terms/risk:** community ADS-B aggregator — confirm ToS/attribution; positions can be sparse
  or delayed; not aeronautical truth (pair with OurAirports #114 for metadata).

### 184. UN Operational Rates of Exchange *(new)*

- **Value:** official UN Treasury monthly operational FX for ~223 currencies — broad coverage
  beyond major central-bank prints, useful for humanitarian/budget conversions.
- **Entry point:** `GET https://treasury.un.org/operationalrates/xsql2XML.php` (~48 KB XML;
  223 `UN_OPERATIONAL_RATES` rows on 2026-08-07, e.g. AFN effective 01 Aug 2026)
- **Docs:** https://treasury.un.org/operationalrates/OperationalRates.php
- **Access:** no authentication; DataSet-style XML.
- **Implementation:** parse `f_curr_code`, `rate`, `eff_date`, `name`; upsert by currency ×
  effective date; checksum snapshot; skip unchanged months.
- **Terms/risk:** UN attribution; rates are operational/accounting prints, not tradable mid-market
  quotes — label accordingly beside ECB/BoC/RBA FX P0s.

### 185. ANBIMA IMA Brazilian fixed-income indices *(new)*

- **Value:** ANBIMA IMA family (Brazilian government/credit fixed-income indices) — fills a LatAm
  rates/credit gap beside BCB PTAX (#30) and SGS (#133).
- **Entry point:** `GET https://www.anbima.com.br/informacoes/ima/arqs/ima_completo.xls`
  (also `IMA_COMPLETO.xls`; ~252 KB Excel verified 2026-08-07)
- **Docs:** https://www.anbima.com.br/informacoes/ima/ima.aspx
- **Access:** no authentication; Excel.
- **Implementation:** checksum; parse index levels/returns by IMA sub-index; daily upsert; alert
  on column drift. Debentures daily TXT path probed here 404'd — rediscover before corporate
  credit extension.
- **Terms/risk:** ANBIMA redistribution/attribution terms; workbook is legacy `.xls`.

### 186. BCB Focus Survey expectations *(new)*

- **Value:** Banco Central do Brasil Focus market expectations (IPCA, Selic, FX, GDP) —
  high-frequency LatAm expectations companion to BCB SGS (#133) and PTAX (#30).
- **Entry points:**
  - `GET https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/ExpectativaMercadoMensais?$top=3&$format=json&$select=Indicador,Data,Mediana`
  - `GET https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/ExpectativasMercadoSelic?$top=3&$format=json`
- **Docs:** https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/swagger-ui3
- **Access:** no authentication; OData JSON (IPCA/Selic rows verified 2026-08-07).
- **Implementation:** OData `$filter` by indicator + date; store median/mean/stddev and meeting
  labels for Selic; incremental by `Data`.
- **Terms/risk:** BCB terms; some Expectativas entity names are Portuguese — pin the entity paths.

### 187. CEPALSTAT / ECLAC indicators *(new)*

- **Value:** UN ECLAC official Latin America & Caribbean statistical API — regional macro,
  social, and trade indicators that complement IBGE (#71), datos.gob.ar (#72), and World Bank.
- **Entry points:**
  - `GET https://api-cepalstat.cepal.org/cepalstat/api/v1/thematic-tree?lang=en&format=json`
    (~375 KB theme tree verified 2026-08-07)
  - `GET https://api-cepalstat.cepal.org/cepalstat/api/v1/indicator/{id}/data?lang=en&format=json`
    (sample indicator `2202` ~671 KB JSON with `data`/`dimensions`/`metadata`)
- **Docs:** https://statistics.cepal.org/portal/cepalstat/index.html?lang=en
- **Access:** no authentication; JSON.
- **Implementation:** cache thematic tree; allowlist indicator IDs; upsert observations with
  dimension keys; do not mirror the full indicator universe on day one.
- **Terms/risk:** ECLAC attribution; response payloads can be large — page/filter where available.

### 188. SEC Form D data sets *(new)*

- **Value:** official quarterly Form D offerings (private placements) — capital-formation signal
  that extends the terminal SEC stack beyond filings/insiders/13F.
- **Discovery page:** https://www.sec.gov/data-research/sec-markets-data/form-d-data-sets
- **Entry points:**
  - `GET https://www.sec.gov/files/datastandardsinnovation/data/form-d-data-sets/2026q2_d.zip`
    (~3.8 MB ZIP → TSV bundle verified 2026-08-07)
  - Prior quarters under
    `https://www.sec.gov/files/structureddata/data/form-d-data-sets/{YYYY}q{N}_d.zip`
    (2026q1 ~3.6 MB verified)
- **Access:** no authentication; requires a descriptive `User-Agent` (SEC fair-access policy).
- **Implementation:** discover latest quarter from the HTML index or known URL pattern; download
  ZIP; parse TSV tables (e.g. `FORMDSUBMISSION`, `ISSUERS`, `OFFERING`, `SIGNATURES`); upsert by
  accession / CIK; checksum and skip unchanged quarters.
- **Terms/risk:** SEC EDGAR terms; path prefix changed for 2026q2 (`datastandardsinnovation`) —
  keep a dual-prefix downloader. Not a substitute for live EDGAR full-text search.



### 189. FCA UK net short positions *(new)*

- **Value:** official UK public net short positions — highest-value free short-interest print after
  FINRA Reg SHO (#10); pairs with ESMA short-selling registers and AFM (#190).
- **Entry point:** `GET https://www.fca.org.uk/publication/data/short-positions-daily-update.xlsx`
  (~3.1 MB XLSX verified 2026-08-08)
- **Docs:** https://www.fca.org.uk/markets/short-selling
- **Access:** no authentication; daily Excel workbook (CSV sibling 404).
- **Implementation:** checksum workbook; parse holder, issuer, ISIN, net short %, position date;
  upsert by holder × ISIN × date; replace only when the publisher file checksum changes; alert on
  sheet/column drift.
- **Terms/risk:** FCA attribution and redistribution terms; positions are regulatory disclosures
  above publication thresholds, not full short interest.

### 190. AFM Netherlands net short positions *(new)*

- **Value:** Dutch AFM public net short positions CSV — EU national short-selling companion to FCA
  (#189) with a simpler delimiter text contract than workbook parses.
- **Entry point:**
  `GET https://www.afm.nl/export.aspx?type=8a46a4ef-f196-4467-a7ab-1ae1cb58f0e7&format=csv`
  (~81 KB semicolon CSV; columns `Positie houder`, issuer, ISIN, net short %, position date;
  sample rows dated 2026-08-06)
- **Docs / UI:** https://www.afm.nl/en/sector/registers/meldingenregisters/netto-shortposities-actueel
- **Access:** no authentication; CSV export from the register UI (`export.aspx` type GUID).
- **Implementation:** discover/pin the export GUID from the register page as a canary; parse
  semicolon CSV; upsert by holder × ISIN × date; keep history via the historie register export if
  the GUID remains stable.
- **Terms/risk:** AFM attribution; Dutch headers — normalize field names; GUID may rotate.

### 191. Swiss SECO consolidated sanctions *(new)*

- **Value:** official Swiss State Secretariat for Economic Affairs (SECO) consolidated sanctions
  XML — fills the Switzerland gap beside Canada SEMA (#1), UK (#2), and registry US/EU/UN lists.
- **Entry point:**
  `GET https://www.sesam.search.admin.ch/sesam-search-web/pages/downloadXmlGesamtliste.xhtml?lang=en&action=downloadXmlGesamtlisteAction`
  (~39.9 MB `text/xml`; root `swiss-sanctions-list`, list date **2026-07-30** on probe)
- **Docs:** https://www.sesam.search.admin.ch/sesam-search-web/pages/search.xhtml
- **Access:** no authentication; full-list XML download (prior `type=sanction` URL returned an
  XHTML interstitial — use the `action=downloadXmlGesamtlisteAction` form).
- **Implementation:** stream + checksum; parse programs/entities/identifiers; upsert by SSID /
  stable ids; do not replace a last-good snapshot with HTML/interstitial content.
- **Terms/risk:** Swiss Confederation / SECO attribution; large XML — cold sync with validation.

### 192. RTE France éco2mix *(new)*

- **Value:** near-real-time French electricity demand and generation mix — EU power companion to
  Energy-Charts (#162), Elexon (#53), REE (#56), and UK Carbon Intensity (#143).
- **Entry points:**
  - `GET https://opendata.reseaux-energies.fr/api/records/1.0/search/?dataset=eco2mix-national-tr&rows=3&sort=-date_heure`
    (JSON; ~9.7k national realtime hits)
  - `GET https://opendata.reseaux-energies.fr/api/records/1.0/search/?dataset=eco2mix-regional-tr&rows=1`
    (JSON; ~105k regional hits)
  - `GET https://opendata.reseaux-energies.fr/api/records/1.0/search/?dataset=eco2mix-national-cons-def&rows=1`
    (JSON consolidated national; ~502k hits)
- **Docs:** https://opendata.reseaux-energies.fr/explore/?refine.keyword=eco2mix
- **Access:** no authentication; Opendatasoft Records API JSON.
- **Implementation:** poll national realtime with `sort=-date_heure`; upsert by timestamp; optional
  regional series; pace requests; store fuel-mix fields without inventing missing technologies.
- **Terms/risk:** RTE / open data license attribution; dataset IDs can be renamed — canary the
  catalog search.

### 193. NY Fed Empire State Manufacturing Survey *(new)*

- **Value:** monthly Empire State manufacturing diffusion indexes — regional hard-activity signal
  beside Philadelphia Fed ADS (#15), Chicago Fed CFNAI (#116), and Atlanta Fed GDPNow (#100).
- **Entry points:**
  - `GET https://www.newyorkfed.org/medialibrary/media/survey/empire/data/esms_seasonallyadjusted_diffusion.csv`
    (~36 KB)
  - `GET https://www.newyorkfed.org/medialibrary/media/survey/empire/data/esms_seasonallyadjusted_allseries.csv`
    (~135 KB)
- **Docs:** https://www.newyorkfed.org/survey/empire/empiresurvey_overview
- **Access:** no authentication; CSV (also NSA siblings on the same directory).
- **Implementation:** parse `surveyDate` + diffusion columns (`GACDISA`, etc.); monthly upsert;
  checksum; prefer seasonally adjusted diffusion for dashboards.
- **Terms/risk:** NY Fed attribution; column codes are opaque — map from the survey documentation.

### 194. US Census Building Permits Survey *(new)*

- **Value:** official US housing permits by state — construction/activity companion to FHFA HPI
  (#44) and Freddie Mac PMMS (#45).
- **Entry point:** `GET https://www2.census.gov/econ/bps/State/st2025a.txt` (~11 KB state annual
  2025 file; directory also lists prior `stYYYY[a|c|y].txt`)
- **Docs / index:** https://www.census.gov/construction/bps/ and
  `https://www2.census.gov/econ/bps/State/`
- **Access:** no authentication; fixed-schema TXT/CSV-like survey extracts.
- **Implementation:** discover newest `stYYYY*.txt` from the directory listing; parse Survey/FIPS /
  buildings/units/value columns; upsert by period × state; watch for monthly current-year files as
  they appear.
- **Terms/risk:** US Census Bureau attribution; annual vs monthly vintages — label period type.

### 195. Kansas City Fed Labor Market Conditions Indicators *(new)*

- **Value:** KC Fed LMCI workbook — labor-market momentum/level companion to FRED JOLTS/claims
  allowlist (#103) and Atlanta Fed Wage Growth (#130).
- **Entry point:** `GET https://www.kansascityfed.org/documents/17164/lmcicharts-070726.xlsx`
  (~30 KB XLSX verified 2026-08-08; filename includes a publish stamp)
- **Docs:** https://www.kansascityfed.org/data-and-trends/labor-market-conditions-indicators/
- **Access:** no authentication; Excel.
- **Implementation:** discover current workbook URL from the LMCI page (document id/filename can
  change); checksum; parse level/momentum series; monthly upsert.
- **Terms/risk:** KC Fed attribution; URL slug is not stable — scrape the page for `.xlsx` hrefs.

### 196. NESO GB electricity demand *(new)*

- **Value:** National Energy System Operator (former National Grid ESO) historic and daily demand
  updates — GB demand companion to UK Carbon Intensity (#143) and Elexon (#53).
- **Entry points:**
  - Package search:
    `GET https://api.neso.energy/api/3/action/package_search?q=demand&rows=3`
  - Daily demand update CSV:
    `GET https://api.neso.energy/dataset/7a12172a-939c-404c-b581-a6128b74f588/resource/177f6fa4-ae49-4182-81ea-0c6b35f26ca6/download`
    (~218 KB; `SETTLEMENT_DATE`, `ND`, `TSD`, interconnectors, embedded wind/solar)
  - Datastore sample:
    `GET https://api.neso.energy/api/3/action/datastore_search?resource_id=177f6fa4-ae49-4182-81ea-0c6b35f26ca6&limit=2`
- **Docs:** https://www.neso.energy/data-portal
- **Access:** no authentication; CKAN JSON + CSV downloads.
- **Implementation:** resolve resource IDs via package_search; prefer datastore_search for
  incremental rows and CSV download for full-year historic packages; upsert by settlement date ×
  period.
- **Terms/risk:** NESO open-data license; resource UUIDs can rotate — resolve via package metadata.


### 197. Philadelphia Fed Manufacturing Business Outlook Survey *(new)*

- **Value:** longest-running US regional manufacturing diffusion indexes — hard-activity companion
  to NY Fed Empire State (#193), Philadelphia Fed ADS (#15) / SPF (#179), and Chicago Fed CFNAI
  (#116).
- **Entry points:**
  - `GET https://www.philadelphiafed.org/-/media/FRBP/Assets/Surveys-And-Data/MBOS/Historical-Data/Diffusion-Indexes/bos_dif.csv?sc_lang=en`
    (~78 KB; `DATE,GAC,NOC,...` from May-68)
  - `GET https://www.philadelphiafed.org/-/media/FRBP/Assets/Surveys-And-Data/MBOS/Historical-Data/Data-Series/bos_history.csv?sc_lang=en`
    (~578 KB full data-series history)
  - XLS/TXT siblings on the same historical-data paths (`bos_difx.xls`, `bos_historyx.xls`,
    `bos_dift.txt`, `bos_historyt.txt`)
- **Docs:** https://www.philadelphiafed.org/surveys-and-data/mbos-historical-data
- **Access:** no authentication; CSV (keep `?sc_lang=en` query).
- **Implementation:** prefer `bos_dif.csv` for dashboards; monthly upsert by `DATE`; map GAC/NOC/
  etc. from Philly Fed documentation; checksum and alert on column drift.
- **Terms/risk:** Philadelphia Fed attribution; URL path casing is part of the contract.

### 198. Kansas City Fed Manufacturing Survey *(new)*

- **Value:** Tenth District manufacturing diffusion indexes — regional hard-activity print beside
  Empire State (#193), Philly MBOS (#197), and KC Fed LMCI (#195).
- **Entry point:** `GET https://www.kansascityfed.org/documents/17603/2026Jul23historicalmfg.xlsx`
  (~130 KB XLSX verified 2026-08-09; filename includes a publish stamp)
- **Docs:** https://www.kansascityfed.org/surveys/manufacturing-survey/
- **Access:** no authentication; Excel.
- **Implementation:** discover current workbook URL from the manufacturing-survey page (document
  id/filename rotate); checksum; parse composite/level series; monthly upsert. Optional quarterly
  companion: `/documents/7767/HistoricalQuarterlyData_ManufSurvey.xls`.
- **Terms/risk:** KC Fed attribution; unstable document slug — scrape `.xlsx` hrefs each run.

### 199. Kansas City Fed Services Survey *(new)*

- **Value:** Tenth District services-sector survey — services companion to KC manufacturing (#198)
  and LMCI (#195).
- **Entry point:** `GET https://www.kansascityfed.org/documents/17637/2026Julhistoricalserv.xlsx`
  (~126 KB XLSX verified 2026-08-09)
- **Docs:** https://www.kansascityfed.org/surveys/services-survey/
- **Access:** no authentication; Excel.
- **Implementation:** same discover-from-page pattern as #198; monthly upsert; keep manufacturing
  and services as separate series families.
- **Terms/risk:** KC Fed attribution; filename stamp changes monthly.

### 200. APRA Monthly ADI statistics *(new)*

- **Value:** Australian Prudential Regulation Authority monthly authorised deposit-taking
  institution (bank) statistics — Asia-Pacific banking/credit companion to FDIC BankFind (#85).
- **Entry points:**
  - Current monthly workbook (June 2026 on probe):
    `GET https://www.apra.gov.au/system/files/2026-07/Monthly%20authorised%20deposit-taking%20institution%20statistics%20June%202026.xlsx`
    (~340 KB)
  - Back-series workbook:
    `GET https://www.apra.gov.au/system/files/2026-07/Monthly%20authorised%20deposit-taking%20institution%20statistics%20back-series%20March%202019%20-%20June%202026.xlsx`
- **Docs:** https://www.apra.gov.au/monthly-authorised-deposit-taking-institution-statistics
- **Access:** no authentication; XLSX (URL-encoded spaces).
- **Implementation:** discover newest monthly + back-series links from the statistics page;
  checksum; parse balance-sheet / lending sheets; monthly upsert by period × institution class.
- **Terms/risk:** APRA attribution and reuse terms; path segments include month names — do not
  hardcode beyond a canary.

### 201. Bank of Japan Main Time-series Statistics *(new)*

- **Value:** official BOJ English CSV dumps for Tokyo FX, basic loan rate, monetary base, and
  money stock — fills the Japan central-bank gap beside RBA (#18), BoK/KOSIS (still key-gated),
  and other P0 FX/macro prints.
- **Entry points:**
  - FX (Tokyo market interbank, monthly):
    `GET https://www.stat-search.boj.or.jp/ssi/mtshtml/csv/fm08_m_1_en.csv` (~25 KB; stamp
    **2026-08-09**)
  - Basic loan / discount rate:
    `GET https://www.stat-search.boj.or.jp/ssi/mtshtml/csv/ir01_m_1_en.csv` (~7 KB; end **2026/07**)
  - Monetary base:
    `GET https://www.stat-search.boj.or.jp/ssi/mtshtml/csv/md01_m_1_en.csv` (~31 KB)
  - Money stock:
    `GET https://www.stat-search.boj.or.jp/ssi/mtshtml/csv/md02_m_1_en.csv` (~45 KB)
- **Docs / UI:** https://www.stat-search.boj.or.jp/ssi/mtshtml/fm08_m_1_en.html
- **Access:** no authentication; CSV with multi-row headers (`Series code`, units, last update).
- **Implementation:** pin an allowlist of `*_en.csv` codes; parse the multi-header preamble; upsert
  by series code × period; discover additional codes from the Main Time-series HTML index.
- **Terms/risk:** BOJ attribution; not every guessed code exists (e.g. some `fm0*` 404) — only pin
  verified codes; encoding is English CSV on these paths.

### 202. IRENASTAT renewable capacity and generation *(new)*

- **Value:** International Renewable Energy Agency electricity capacity/generation statistics by
  country and technology — global renewables companion to Energy-Charts (#162), Ember (still
  key/CDN gated), and Climate TRACE (#64).
- **Entry points:**
  - Catalog: `GET https://pxweb.irena.org/api/v1/en/IRENASTAT`
  - Topic: `GET https://pxweb.irena.org/api/v1/en/IRENASTAT/Power%20Capacity%20and%20Generation`
    (tables updated **2026-04-17**, e.g. `Country_ELECCAP_2026_H1_v-PX 1.px`)
  - Table metadata: append the `.px` table id (URL-encode spaces)
  - Data: `POST` the same table URL with PxWeb JSON query body and `"response":{"format":"json-stat2"}`
    (sample POST verified 200 JSON-stat2 on 2026-08-09)
- **Docs:** https://pxweb.irena.org/pxweb/en/IRENASTAT/
- **Access:** no authentication; JSON catalog + JSON-stat2 observations.
- **Implementation:** resolve table ids from the topic listing (filenames change each release);
  POST constrained country/tech/year selections; store source attribution from the JSON-stat
  `source` field (IRENA Renewable Capacity Statistics).
- **Terms/risk:** IRENA attribution/license; table ids include spaces and version stamps — resolve
  dynamically.

### 203. TWSE OpenAPI exchange reports *(new)*

- **Value:** Taiwan Stock Exchange official open data — Asia cash-equity prints (indexes, valuation
  ratios, daily averages, ex-dividend calendar) beside HKEX List of Securities (#8) and JPX (#204).
- **Entry points:**
  - `GET https://openapi.twse.com.tw/v1/exchangeReport/MI_INDEX` (market indexes JSON; ROC calendar
    dates e.g. `1150807` = 2026-08-07)
  - `GET https://openapi.twse.com.tw/v1/exchangeReport/BWIBBU_ALL` (PE / dividend yield / PB; ~116 KB)
  - `GET https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_AVG_ALL` (close + monthly average;
    ~2.6 MB)
  - `GET https://openapi.twse.com.tw/v1/exchangeReport/TWT48U_ALL` (ex-dividend / rights calendar)
  - Bulk day file alternate:
    `GET https://www.twse.com.tw/rwd/en/afterTrading/STOCK_DAY_ALL?response=json` (may return CSV
    despite `response=json`)
- **Docs:** https://openapi.twse.com.tw/
- **Access:** no authentication; JSON (and CSV bulk).
- **Implementation:** daily sync; convert ROC `YYYMMDD` dates (`year = roc + 1911`); upsert by
  code × date; pace requests; prefer OpenAPI JSON over HTML scrape.
- **Terms/risk:** TWSE terms; Chinese field names — normalize; confirm redistribution for derived
  products.

### 204. JPX listed issues and equity statistics *(new)*

- **Value:** Japan Exchange Group listed-company / equity-statistics workbooks — Japan securities
  master companion to NASDAQ Trader (#7), HKEX (#8), ESMA FIRDS (#5), and TWSE (#203).
- **Entry points (discover from misc statistics page):**
  - `GET https://www.jpx.co.jp/english/markets/statistics-equities/misc/tvdivq0000001vg2-att/data_e.xls`
    (~851 KB; last-saved stamp **2026-08-04** on probe)
  - `GET https://www.jpx.co.jp/english/markets/statistics-equities/misc/tvdivq0000001vg2-att/jyoujyou(updated)_e.xlsx`
    (~32 KB listed-issue workbook)
- **Docs:** https://www.jpx.co.jp/english/markets/statistics-equities/misc/01.html
- **Access:** no authentication; XLS / XLSX.
- **Implementation:** scrape current attachment hrefs from the misc statistics page (path tokens
  rotate); checksum; parse listing sheets; upsert by code + market segment; soft-delete disappearances.
- **Terms/risk:** JPX attribution and redistribution terms; attachment URL tokens are not stable.

### 205. US Census New Residential Construction *(new)*

- **Value:** official US housing starts / permits / completions workbook — construction activity
  companion to Census BPS state files (#194), FHFA HPI (#44), and Freddie Mac PMMS (#45).
- **Entry points:**
  - `GET https://www.census.gov/construction/nrc/xls/newresconst.xlsx` (~45 KB XLSX verified
    2026-08-09)
  - Legacy sibling: `GET https://www.census.gov/construction/nrc/xls/newresconst.xls` (~102 KB)
- **Docs:** https://www.census.gov/construction/nrc.html
- **Access:** no authentication; Excel.
- **Implementation:** monthly checksum; parse starts/permits/completions sheets; upsert by period ×
  geo/structure type; optional FRED `HOUST` (#103 allowlist) as a thin companion series only.
- **Terms/risk:** US Census Bureau attribution; sheet layout can shift with release notes.

### 206. JRC EDGAR GHG emissions booklet *(new)*

- **Value:** European Commission JRC EDGAR greenhouse-gas emissions workbook — national/sector GHG
  companion to Climate TRACE (#64), NOAA GML (#159), and registry `climate/greenhouse-gas`.
- **Entry point:**
  `GET https://edgar.jrc.ec.europa.eu/booklet/EDGAR_2024_GHG_booklet_2024.xlsx` (~4.0 MB XLSX
  verified 2026-08-09)
- **Docs:** https://edgar.jrc.ec.europa.eu/
- **Access:** no authentication; Excel booklet tables.
- **Implementation:** checksum; parse country/sector/year sheets; annual upsert; watch for yearly
  filename bumps (`EDGAR_YYYY_...`).
- **Terms/risk:** EC/JRC attribution and EDGAR license; annual vintage — canary the download page
  for newer booklet names.


### 207. Dallas Fed Texas Manufacturing Outlook Survey *(promoted)*

- **Value:** regional manufacturing diffusion indexes for Texas — closes the Dallas Fed TMOS gap
  that sat in P1 while workbook URLs were unpinned; pairs with Empire State (#193), Philly MBOS
  (#197), and KC Fed Manufacturing (#198).
- **Entry points:**
  - `GET https://www.dallasfed.org/~/media/Documents/research/surveys/tmos/documents/alldata.xls`
    (~482 KB)
  - `GET https://www.dallasfed.org/~/media/Documents/research/surveys/tmos/documents/alldata_sa.xls`
    (~237 KB)
  - `GET https://www.dallasfed.org/~/media/Documents/research/surveys/tmos/documents/index.xls`
    (~80 KB)
  - `GET https://www.dallasfed.org/~/media/Documents/research/surveys/tmos/documents/index_sa.xls`
    (~193 KB)
- **Docs / page:** https://www.dallasfed.org/research/surveys/tmos/data
- **Access:** no authentication; XLS/XLSX payloads (Content-Type reports OOXML).
- **Implementation:** checksum workbooks; parse SA vs NSA sheets; upsert by survey month +
  indicator; canary on `/research/surveys/tmos/data` link list if paths rotate.
- **Terms/risk:** Dallas Fed attribution; do not replace last-good snapshot with empty parse.

### 208. Dallas Fed Texas Service Sector and Retail Outlook Surveys *(new)*

- **Value:** TSSOS service-sector and nested TROS retail diffusion history — services/retail
  companion to TMOS for the Eleventh District.
- **Entry points:**
  - `GET https://www.dallasfed.org/~/media/Documents/research/surveys/tssos/documents/tssos_alldata.xls`
    (~139 KB)
  - `GET https://www.dallasfed.org/~/media/Documents/research/surveys/tssos/documents/tssos_alldata_sa.xls`
    (~146 KB)
  - `GET https://www.dallasfed.org/~/media/Documents/research/surveys/tssos/documents/tssos_index.xls`
    (~63 KB)
  - `GET https://www.dallasfed.org/~/media/Documents/research/surveys/tssos/documents/tssos_index_sa.xls`
    (~66 KB)
  - `GET https://www.dallasfed.org/-/media/Documents/research/surveys/tssos/documents/tros_alldata.xls`
    (~414 KB)
  - `GET https://www.dallasfed.org/-/media/Documents/research/surveys/tssos/documents/tros_alldata_sa.xls`
    (~154 KB)
- **Docs / page:** https://www.dallasfed.org/research/surveys/tssos/data
- **Access:** no authentication; workbook downloads verified 2026-08-11.
- **Implementation:** same pattern as TMOS; keep TSSOS and TROS as related datasets with distinct
  provenance; note mixed `/~/media/` vs `/-/media/` path prefixes.
- **Terms/risk:** Dallas Fed attribution; watch for path-prefix drift.

### 209. Dallas Fed Banking Conditions Survey *(new)*

- **Value:** Eleventh District bank lending / deposit / credit-standard diffusion — banking
  conditions overlay beside FDIC BankFind (#85) and APRA ADI (#200).
- **Entry points:**
  - `GET https://www.dallasfed.org/~/media/Documents/research/surveys/bcs/documents/BCS_All_Results.xls`
    (~50 KB)
  - `GET https://www.dallasfed.org/~/media/Documents/research/surveys/bcs/documents/BCS_Index_Results.xls`
    (~22 KB)
- **Docs / page:** https://www.dallasfed.org/research/surveys/bcs/data
- **Access:** no authentication; XLS verified 2026-08-11.
- **Implementation:** checksum; parse all-results vs index workbooks; upsert by month + question.
- **Terms/risk:** Dallas Fed attribution.

### 210. Dallas Fed Energy Survey *(new)*

- **Value:** oil & gas exploration/production business conditions and price expectations for the
  Eleventh District — energy-sector sentiment complement to EIA file feeds (#131).
- **Entry points:**
  - `GET https://www.dallasfed.org/~/media/Documents/research/surveys/des/documents/all_data_qq.xls`
    (~45 KB)
  - `GET https://www.dallasfed.org/~/media/Documents/research/surveys/des/documents/all_data_yy.xls`
    (~43 KB)
  - `GET https://www.dallasfed.org/~/media/Documents/research/surveys/des/documents/all_data_price_expectations.xls`
    (~13 KB)
  - Companion index files on the same `/des/documents/` path (`index_qq.xls`, `index_yy.xls`,
    `all_data_price_forecasts.xls`)
- **Docs / page:** https://www.dallasfed.org/research/surveys/des/data
- **Access:** no authentication; XLS verified 2026-08-11.
- **Implementation:** store QQ/YY and price-expectation sheets separately; canary the data page
  for filename drift.
- **Terms/risk:** Dallas Fed attribution.

### 211. Dallas Fed Agricultural Survey *(new)*

- **Value:** Eleventh District ag credit, lending volumes, land values/rents, and rates — rural
  credit conditions rarely covered by other free Fed survey files.
- **Entry points:**
  - `GET https://www.dallasfed.org/-/media/Documents/research/surveys/AgSurvey/data/agcredit.xls`
  - `GET https://www.dallasfed.org/-/media/Documents/research/surveys/AgSurvey/data/aglending.xls`
  - `GET https://www.dallasfed.org/-/media/Documents/research/surveys/AgSurvey/data/agrates.xls`
  - Also on the data page: `agrents.xls`, `agvalue.xls`, `agvolume.xls`
- **Docs / page:** https://www.dallasfed.org/research/surveys/agsurvey/data
- **Access:** no authentication; sample workbooks ~17–23 KB verified 2026-08-11.
- **Implementation:** ingest the six small workbooks; upsert by quarter/report date + series.
- **Terms/risk:** Dallas Fed attribution; quarterly cadence.

### 212. PredictIt public markets API *(new)*

- **Value:** US political/event prediction-market prices and shares as a credential-free
  complement to Polymarket (#180) and Kalshi (#181).
- **Entry point:** `GET https://www.predictit.org/api/marketdata/all/`
- **Docs:** https://www.predictit.org/api
- **Access:** no authentication; JSON ~442 KB with **198** markets on 2026-08-11 probe.
- **Implementation:** poll `/marketdata/all/` (or per-market endpoints); store market id, contract
  prices, and timestamps; respect PredictIt API terms and caching guidance.
- **Terms/risk:** PredictIt restricts commercial redistribution — confirm license before product
  exposure; treat as event-odds enrichment, not a primary market print.

### 213. Manifold Markets API *(new)*

- **Value:** large open prediction-market graph with anonymous JSON search — useful for
  Fed/macro/event probability overlays beside PredictIt/Polymarket/Kalshi.
- **Entry points:**
  - `GET https://api.manifold.markets/v0/markets?limit=5`
  - `GET https://api.manifold.markets/v0/search-markets?term=federal%20reserve&limit=5`
- **Docs:** https://docs.manifold.markets/api
- **Access:** no authentication for read endpoints; search JSON verified 2026-08-11 (e.g. Fed hike
  2026 markets with probabilities).
- **Implementation:** prefer `search-markets` allowlists for finance/geopolitics topics; cache
  market ids; note some `markets` sort params return 400 — pin working query shapes.
- **Terms/risk:** review Manifold API terms; noisy retail markets — filter by liquidity/volume.

### 214. Singapore Exchange (SGX) public indices *(new)*

- **Value:** Asia equity/index reference prints without a data vendor — venue complement to HKEX
  (#8), TWSE (#203), and JPX (#204).
- **Entry point:** `GET https://api.sgx.com/indices/v1.0`
- **Access:** no authentication; JSON ~273 KB; **893** index rows (`pid`, `n`, `lp`, `op`, `h`,
  `l`, `c`, `trading_time`) on 2026-08-11 probe.
- **Implementation:** daily snapshot; upsert by `pid`; retain `trading_time`; securities price
  endpoints need additional typed params / returned sparse samples — start with indices only.
- **Terms/risk:** confirm SGX redistribution terms; delayed/session semantics may apply.

### 215. Malaysia data.gov.my open statistics *(new)*

- **Value:** official Malaysian CPI, industrial production, and monetary aggregates as anonymous
  JSON — fills a Southeast Asia macro gap beside BNM Open API (#95) and SingStat (#37).
- **Entry points:**
  - `GET https://api.data.gov.my/data-catalogue?id=cpi_headline` (~451 KB; through **2026-06**)
  - `GET https://api.data.gov.my/data-catalogue?id=cpi_core` (~83 KB)
  - `GET https://api.data.gov.my/data-catalogue?id=ipi` (~32 KB; through **2026-04**)
  - `GET https://api.data.gov.my/data-catalogue?id=monetary_aggregates` (~144 KB; through
    **2025-12**)
- **Docs:** https://developer.data.gov.my/
- **Access:** no authentication; JSON arrays keyed by catalog `id`.
- **Implementation:** allowlist verified catalog IDs; upsert by `date` + dimension fields
  (`division` / `series` / `measure`); discover additional IDs via the developer catalog rather
  than guessing (many intuitive names 404).
- **Terms/risk:** Malaysian government open-data terms; schema can add divisions over time.

### 216. US Census Manufacturers' Shipments, Inventories, and Orders (M3) *(new)*

- **Value:** advance manufacturing shipments/orders workbook — real-economy print beside Census
  BPS (#194), NRC (#205), and FRED `AMTMNO`.
- **Entry point:** `GET https://www.census.gov/manufacturing/m3/adv/table1a.xlsx` (~23 KB)
- **Docs / page:** https://www.census.gov/manufacturing/m3.html
- **Access:** no authentication; XLSX verified 2026-08-11.
- **Implementation:** checksum; parse advance Table 1A; optionally mirror `AMTMNO` via FRED #103
  for a long history companion; canary sibling `adv/` filenames (other guessed tables 404'd).
- **Terms/risk:** US government work; watch monthly file-name rotations on the advance release.

### 217. Federal Reserve G.17 Industrial Production and Capacity Utilization *(new)*

- **Value:** official Board G.17 package (IP, capacity, utilization, diffusion) as a no-key ZIP —
  richer than single-series FRED pulls while remaining credential-free.
- **Entry point:** `GET https://www.federalreserve.gov/datadownload/Output.aspx?rel=G17&filetype=zip`
  (~8.6 MB; 17 package members including `G17_data.xml` / structure XSDs)
- **Docs:** https://www.federalreserve.gov/releases/g17/
- **Access:** no authentication; `application/x-zip-compressed`.
- **Implementation:** download ZIP, verify membership, parse `G17_data.xml` (or selected CSV
  exports if added); hot-path may use FRED `INDPRO`/`TCU` (#103) with G.17 ZIP as full refresh.
- **Terms/risk:** Federal Reserve Board attribution; multi-MB package — schedule cold sync.

### 218. CFTC Traders in Financial Futures (TFF) *(new)*

- **Value:** dealer / asset-manager / leveraged-fund / other-reportable positioning in financial
  futures (FX, Treasuries, equity indices, VIX, SOFR swaps) — the missing COT product beside
  the terminal's legacy and disaggregated facts routes.
- **Entry points:**
  - `GET https://www.cftc.gov/dea/newcot/FinFutWk.txt` (futures-only current week; ~68 KB;
    88 rows; report date **2026-08-04**)
  - `GET https://www.cftc.gov/dea/newcot/FinComWk.txt` (futures + options combined; ~69 KB)
  - `GET https://www.cftc.gov/files/dea/history/fut_fin_txt_2026.zip` (annual futures-only)
  - `GET https://www.cftc.gov/files/dea/history/com_fin_txt_2026.zip` (annual combined)
  - `GET https://www.cftc.gov/files/dea/history/fut_fin_xls_2026.zip` (annual XLS)
  - Socrata JSON: `GET https://publicreporting.cftc.gov/resource/gpe5-46if.json?$limit=1&$order=report_date_as_yyyy_mm_dd%20DESC`
    (TFF futures-only; latest **2026-08-04**; combined dataset `yw9f-hn96`)
- **Docs:** https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm
- **Access:** no authentication; comma-delimited text / ZIP / Socrata JSON.
- **Implementation:** prefer Socrata for incremental history (`$order` + `$where` on
  `report_date_as_yyyy_mm_dd`); use `FinFutWk.txt` as a weekly canary. Store dealer,
  asset-manager, leveraged-fund, other-reportable, and nonreportable long/short/spread
  plus open interest. Do not treat TFF as a replacement for legacy/disagg COT.
- **Terms/risk:** CFTC public-data terms; weekly Tuesday publication with T+3 lag.

### 219. CFTC Supplemental CIT (Commodity Index Traders) *(new)*

- **Value:** commodity-index-trader overlay on selected agricultural markets — high-signal
  complement to disaggregated COT and TFF (#218).
- **Entry point:**
  `GET https://publicreporting.cftc.gov/resource/4zgm-a668.json?$limit=1&$order=report_date_as_yyyy_mm_dd%20DESC`
  (latest **2026-08-04**; e.g. Coffee C / ICE).
- **Docs:** https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm
- **Access:** no authentication; Socrata JSON. Current-week `deascit.txt` / `CFTCsit.txt`
  path guesses 404'd on 2026-08-14 — use Socrata, not the retired text names.
- **Implementation:** incremental pull by report date; keep CIT vs non-CIT noncommercial
  columns; upsert by contract market code + date.
- **Terms/risk:** CFTC public-data terms; CIT covers a subset of ag markets only.

### 220. Federal Reserve H.8 commercial bank assets and liabilities *(new)*

- **Value:** weekly US commercial-bank balance-sheet aggregates (loans, securities, deposits)
  — official no-key package beside FRED `TOTLL` / `BUSLOANS`.
- **Entry point:** `GET https://www.federalreserve.gov/datadownload/Output.aspx?rel=H8&filetype=zip`
  (~8.4 MB; members `H8_data.xml`, `H8_struct.xml`, `H8_H8.xsd`, `frb_common.xsd`)
- **Docs:** https://www.federalreserve.gov/releases/h8/
- **Access:** no authentication; same DDP ZIP contract as G.17 (#217).
- **Implementation:** shared Fed DDP adapter keyed by `rel=`; parse `H8_data.xml`; hot-path
  may use FRED `TOTLL` / `BUSLOANS` (#103) with the ZIP as full refresh.
- **Terms/risk:** Federal Reserve Board attribution; weekly package.

### 221. Federal Reserve H.4.1 factors affecting reserve balances *(new)*

- **Value:** weekly Fed balance-sheet factors (reserve balances, SOMA, liquidity facilities)
  — official companion to FRED `WALCL`.
- **Entry point:** `GET https://www.federalreserve.gov/datadownload/Output.aspx?rel=H41&filetype=zip`
  (~9.0 MB; `H41_data.xml` / `H41_struct.xml` / `H41_H41.xsd`)
- **Docs:** https://www.federalreserve.gov/releases/h41/
- **Access:** no authentication; DDP ZIP.
- **Implementation:** same adapter as #220; FRED `WALCL` for a single-series hot path
  (through **2026-08-12** 6,759,955 on this review).
- **Terms/risk:** Federal Reserve Board attribution.

### 222. Federal Reserve H.6 money stock measures *(new)*

- **Value:** official M1 / M2 / monetary-base package without a FRED API key.
- **Entry point:** `GET https://www.federalreserve.gov/datadownload/Output.aspx?rel=H6&filetype=zip`
  (~1.4 MB; `H6_data.xml` plus M1/M2/MBASE/MEMO XSDs)
- **Docs:** https://www.federalreserve.gov/releases/h6/
- **Access:** no authentication; DDP ZIP.
- **Implementation:** parse `H6_data.xml`; FRED `M2SL` (#103) through **2026-06** 23,155.2
  as the compact companion.
- **Terms/risk:** Federal Reserve Board attribution.

### 223. Federal Reserve H.10 foreign exchange rates *(new)*

- **Value:** Board H.10 country FX package — US-side complement to ECB EXR (#83) and the
  many national FX prints already in P0.
- **Entry point:** `GET https://www.federalreserve.gov/datadownload/Output.aspx?rel=H10&filetype=zip`
  (~2.1 MB; `H10_data.xml` / `H10_struct.xml` / `H10_H10.xsd`)
- **Docs:** https://www.federalreserve.gov/releases/h10/
- **Access:** no authentication; DDP ZIP.
- **Implementation:** shared DDP adapter; store country / tenor / observation date.
- **Terms/risk:** Federal Reserve Board attribution; do not replace ECB or national fixings.

### 224. Federal Reserve G.19 consumer credit *(new)*

- **Value:** monthly consumer-credit outstanding and terms — household-credit print beside
  CFPB complaints (#86) and FRED `REVOLSL`.
- **Entry point:** `GET https://www.federalreserve.gov/datadownload/Output.aspx?rel=G19&filetype=zip`
  (~604 KB; `G19_data.xml`, `G19_CCOUT.xsd`, `G19_TERMS.xsd`)
- **Docs:** https://www.federalreserve.gov/releases/g19/
- **Access:** no authentication; DDP ZIP.
- **Implementation:** parse outstanding vs terms cubes separately; FRED `REVOLSL` through
  **2026-06** as revolving-credit companion.
- **Terms/risk:** Federal Reserve Board attribution.

### 225. Federal Reserve commercial paper (CP) *(new)*

- **Value:** outstanding, rates, and volumes for US commercial paper — short-term credit
  market beside OFR STFM (#13) and NY Fed reference rates.
- **Entry point:** `GET https://www.federalreserve.gov/datadownload/Output.aspx?rel=CP&filetype=zip`
  (~6.3 MB; `CP_data.xml` plus OUTST / RATES / VOL XSDs)
- **Docs:** https://www.federalreserve.gov/releases/cp/
- **Access:** no authentication; DDP ZIP.
- **Implementation:** shared DDP adapter; start with rates + outstanding; keep vintage
  discontinued series out of the hot path.
- **Terms/risk:** Federal Reserve Board attribution.

### 226. Federal Reserve charge-off and delinquency rates *(new)*

- **Value:** quarterly bank loan charge-off and delinquency rates by category — credit-quality
  overlay beside H.8 (#220) and G.19 (#224).
- **Entry point:** `GET https://www.federalreserve.gov/datadownload/Output.aspx?rel=CHGDEL&filetype=zip`
  (~279 KB; `CHGDEL_data.xml` / `CHGDEL_CHGDEL.xsd`)
- **Docs:** https://www.federalreserve.gov/releases/chargeoff/
- **Access:** no authentication; DDP ZIP.
- **Implementation:** parse `CHGDEL_data.xml`; FRED `DRCCLACBS` (#103) through **2026-01**
  2.92 as the credit-card delinquency companion.
- **Terms/risk:** Federal Reserve Board attribution; quarterly cadence.

### 227. Federal Reserve household debt service and financial obligations *(new)*

- **Value:** household debt-service (TDSP) and financial-obligations ratios — compact
  household-leverage print.
- **Entry point:** `GET https://www.federalreserve.gov/datadownload/Output.aspx?rel=FOR&filetype=zip`
  (~26 KB; `FOR_data.xml` / `FOR_FOR.xsd`)
- **Docs:** https://www.federalreserve.gov/releases/housedebt/
- **Access:** no authentication; smallest DDP ZIP in this review.
- **Implementation:** parse `FOR_data.xml`; FRED `TDSP` (#103) through **2026-01** 11.16 as
  the single-series companion.
- **Terms/risk:** Federal Reserve Board attribution; quarterly.

### 228. Federal Reserve SLOOS *(new)*

- **Value:** Senior Loan Officer Opinion Survey on bank lending standards and demand —
  credit-conditions sentiment beside Dallas BCS (#209) and H.8 volumes.
- **Entry point:** `GET https://www.federalreserve.gov/datadownload/Output.aspx?rel=SLOOS&filetype=zip`
  (~244 KB; `SLOOS_data.xml` plus SLOOS / REASONS / MEMO / DISCONTINUED XSDs)
- **Docs:** https://www.federalreserve.gov/data/sloos.htm
- **Access:** no authentication; DDP ZIP.
- **Implementation:** parse diffusion / net-percentage series; keep discontinued codes out
  of the default allowlist; quarterly publication.
- **Terms/risk:** Federal Reserve Board attribution.

### 229. Federal Reserve Z.1 Financial Accounts *(new)*

- **Value:** Flow of Funds / Financial Accounts of the United States — sector balance sheets
  and flows. Highest-value remaining Board package after G.17 / H.15 / H.8.
- **Entry point:** `GET https://www.federalreserve.gov/datadownload/Output.aspx?rel=Z1&filetype=zip`
  (~36.4 MB; `Z1_data.xml` / `Z1_struct.xml` / `Z1_Z1.xsd`)
- **Docs:** https://www.federalreserve.gov/releases/z1/
- **Access:** no authentication; DDP ZIP.
- **Implementation:** cold sync only; parse selected table/series allowlist from `Z1_data.xml`
  rather than loading the full cube into the hot path. Quarterly.
- **Terms/risk:** Federal Reserve Board attribution; large XML — stream and checksum; do not
  replace last-good snapshot with a truncated download.

### 230. ONS Brazil electricity open data *(new)*

- **Value:** official Brazilian power-system open data (load, CMO, hydro, capacity) via CKAN
  + public S3 — South America complement to Elexon / REE / RTE / NESO / Energy-Charts.
- **Entry points:**
  - `GET https://dados.ons.org.br/api/3/action/package_list` (JSON; **83** packages)
  - `GET https://dados.ons.org.br/api/3/action/package_search?q=carga&rows=2`
  - `GET https://dados.ons.org.br/api/3/action/package_show?id=carga-energia`
    (83 resources; year-sliced CSV/XLSX/Parquet)
  - `GET https://ons-aws-prod-opendata.s3.amazonaws.com/dataset/carga_energia_di/CARGA_ENERGIA_2026.csv`
    (~37 KB; last-modified **2026-08-13**; columns
    `id_subsistema;nom_subsistema;din_instante;val_cargaenergiamwmed`)
- **Docs:** https://dados.ons.org.br/
- **Access:** no authentication; CKAN JSON + S3 objects.
- **Implementation:** discover via `package_show`, then pull the current-year CSV; upsert by
  subsystem + timestamp. Start with `carga-energia`; expand to `cmo-semanal` /
  `capacidade-geracao` after the first adapter.
- **Terms/risk:** ONS open-data terms; year-sliced filenames; guessed 2026 keys that omit the
  `_di` suffix 404.


## P1 — high value after P0

| Candidate | Representative endpoint or docs | Why it is not P0 |
|---|---|---|
| CFTC TFF current week + Socrata | `.../dea/newcot/FinFutWk.txt` ; `gpe5-46if.json` | **Promoted to P0 #218**. |
| CFTC Supplemental CIT Socrata | `.../resource/4zgm-a668.json` | **Promoted to P0 #219** (legacy `deascit.txt` still 404). |
| Fed DDP H.8 / H.4.1 / H.6 / H.10 / G.19 / CP / CHGDEL / FOR / SLOOS | `.../Output.aspx?rel={H8,H41,H6,H10,G19,CP,CHGDEL,FOR,SLOOS}&filetype=zip` | **Promoted to P0 #220–#228**. |
| Fed Z.1 Financial Accounts ZIP | `.../Output.aspx?rel=Z1&filetype=zip` | **Promoted to P0 #229** (~36.4 MB; cold sync). |
| ONS Brazil CKAN electricity | `https://dados.ons.org.br/api/3/action/package_list` | **Promoted to P0 #230**. |
| Census MARTS advance workbook | `census.gov/retail` / `marts_current.pdf` | Advance PDF live (~373 KB, June 2026); guessed XLSX paths still 404 — use FRED `RSAFS` (#103) until a stable workbook/ZIP is pinned. |
| Dallas Fed TMOS / TSSOS / BCS / DES / AgSurvey workbooks | `.../surveys/{tmos,tssos,bcs,des,agsurvey}/data` XLS | **Promoted to P0 #207–#211** (paths pinned 2026-08-11). |
| PredictIt / Manifold Markets | `predictit.org/api/marketdata/all/` ; `api.manifold.markets/v0/*` | **Promoted to P0 #212–#213**. |
| SGX indices API | `https://api.sgx.com/indices/v1.0` | **Promoted to P0 #214**. |
| Malaysia data.gov.my CPI/IPI/M3 | `https://api.data.gov.my/data-catalogue?id=cpi_headline` etc. | **Promoted to P0 #215**. |
| Census M3 advance Table 1A | `.../manufacturing/m3/adv/table1a.xlsx` | **Promoted to P0 #216**. |
| Fed G.17 IP/capacity ZIP | `.../datadownload/Output.aspx?rel=G17&filetype=zip` | **Promoted to P0 #217**; FRED `INDPRO`/`TCU` also added to #103. |
| ECB CISS + MIR | `data-api.ecb.europa.eu/service/data/{CISS,MIR}/...` | **Folded into ECB Data Portal P0 #83** allowlist (2026-08-11). |
| Philadelphia Fed MBOS CSVs | `.../MBOS/.../bos_dif.csv` + `bos_history.csv` | **Promoted to P0 #197** (CSV verified 2026-08-09). |
| KC Fed Manufacturing Survey | `.../documents/17603/2026Jul23historicalmfg.xlsx` | **Promoted to P0 #198**. |
| KC Fed Services Survey | `.../documents/17637/2026Julhistoricalserv.xlsx` | **Promoted to P0 #199**. |
| APRA Monthly ADI statistics | `.../Monthly authorised deposit-taking institution statistics June 2026.xlsx` | **Promoted to P0 #200**. |
| Bank of Japan main time-series CSVs | `https://www.stat-search.boj.or.jp/ssi/mtshtml/csv/{fm08,ir01,md01,md02}_*_en.csv` | **Promoted to P0 #201**. |
| IRENASTAT PxWeb API | `https://pxweb.irena.org/api/v1/en/IRENASTAT` | **Promoted to P0 #202** (JSON-stat2 POST verified). |
| TWSE OpenAPI | `https://openapi.twse.com.tw/v1/exchangeReport/*` | **Promoted to P0 #203**. |
| JPX listed-issue workbooks | `.../statistics-equities/misc/.../data_e.xls` + `jyoujyou(updated)_e.xlsx` | **Promoted to P0 #204**. |
| Census New Residential Construction | `https://www.census.gov/construction/nrc/xls/newresconst.xlsx` | **Promoted to P0 #205**. |
| JRC EDGAR GHG booklet | `https://edgar.jrc.ec.europa.eu/booklet/EDGAR_2024_GHG_booklet_2024.xlsx` | **Promoted to P0 #206**. |
| BaFin / FI Sweden / FSMA / CONSOB net shorts | national short-selling register pages | High value beside FCA/AFM; machine CSV/XLSX exports not stably extracted on 2026-08-09 (HTML portals / 404 attachment guesses) — keep investigating. |
| Richmond Fed manufacturing survey | regional Fed survey pages | Dallas Fed TMOS/TSSOS/etc. **promoted to P0 #207–#211**; Richmond Fed manufacturing workbook URLs still 404 on 2026-08-11 path guesses. |
| Banco Central de Chile SieteWS | `https://si3.bcentral.cl/SieteWS/SieteWS.asmx?WSDL` | WSDL live; needs SOAP client + credentials/series fixtures (mindicador.cl remains unofficial P1 enrichment). |
| Coin Metrics `limit` param | Community asset-metrics API | **Contract fix:** use `page_size` — kept in P0 #160. |
| FCA UK net short positions | `.../short-positions-daily-update.xlsx` | **Promoted to P0 #189** (XLSX ~3.1 MB verified 2026-08-08). |
| AFM Netherlands net shorts | `https://www.afm.nl/export.aspx?type=8a46a4ef-f196-4467-a7ab-1ae1cb58f0e7&format=csv` | **Promoted to P0 #190**. |
| Swiss SECO sanctions XML | `.../downloadXmlGesamtliste.xhtml?...action=downloadXmlGesamtlisteAction` | **Promoted to P0 #191** (~39.9 MB XML; list date 2026-07-30). |
| RTE eco2mix | Opendatasoft `eco2mix-national-tr` / regional / cons-def | **Promoted to P0 #192**. |
| NY Fed Empire State CSVs | `.../survey/empire/data/esms_seasonallyadjusted_*.csv` | **Promoted to P0 #193**. |
| Census BPS state files | `https://www2.census.gov/econ/bps/State/st2025a.txt` | **Promoted to P0 #194**. |
| Kansas City Fed LMCI | `.../documents/17164/lmcicharts-070726.xlsx` | **Promoted to P0 #195** (workbook URL rediscovered 2026-08-08). |
| NESO GB demand CKAN | `https://api.neso.energy/api/3/action/package_search?q=demand` | **Promoted to P0 #196**. |
| SF Fed Proxy Funds Rate | `.../proxy-funds-rate-data.xlsx` | **Promoted to P0 #178** (XLSX verified 2026-08-07). |
| Philadelphia Fed SPF median growth | `.../medianGrowth.xlsx` | **Promoted to P0 #179** (XLSX verified 2026-08-07). |
| Polymarket Gamma/CLOB | `https://gamma-api.polymarket.com/markets` | **Promoted to P0 #180**. |
| Kalshi trade API | `https://api.elections.kalshi.com/trade-api/v2/markets` | **Promoted to P0 #181**. |
| Penn World Table | `https://www.rug.nl/ggdc/docs/pwt100.xlsx` | **Promoted to P0 #182**. |
| adsb.lol ADS-B | `https://api.adsb.lol/v2/mil` | **Promoted to P0 #183**; OpenSky still unreachable here. |
| UN Operational Rates | `https://treasury.un.org/operationalrates/xsql2XML.php` | **Promoted to P0 #184**. |
| ANBIMA IMA | `https://www.anbima.com.br/informacoes/ima/arqs/ima_completo.xls` | **Promoted to P0 #185**. |
| BCB Focus / Olinda expectations | `.../Expectativas/versao/v1/odata/...` | **Promoted to P0 #186**. |
| CEPALSTAT indicator API | `https://api-cepalstat.cepal.org/cepalstat/api/v1/...` | **Promoted to P0 #187**. |
| SEC Form D quarterly ZIPs | `.../form-d-data-sets/2026q2_d.zip` | **Promoted to P0 #188**. |
| Crossref / ROR / OpenAlex | `https://api.crossref.org/works`, `https://api.ror.org/v2/organizations`, `https://api.openalex.org/works` | Anonymous JSON live 2026-08-07; useful entity/research enrichment after LEI/FIGI — not a core market print. |
| SEC NPORT-P Atom current filings | `https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=NPORT-P&output=atom` | Anonymous Atom works with User-Agent; overlaps terminal SEC stack — add only for a dedicated fund-holdings product. |
| Metaculus questions API | `https://www.metaculus.com/api2/questions/` | **403** without account token (2026-08-07) — keep below Polymarket/Kalshi. |
| WHO GHO OData | `https://ghoapi.azureedge.net/api/WHOSIS_000001?$top=2` | Anonymous OData JSON live; prefer extending existing `health/who-indicators` adapter. |
| ECB €STR (`EST`) | `https://data-api.ecb.europa.eu/service/data/EST/B.EU000A2X2A25.WT?lastNObservations=5&format=csvdata` | Anonymous CSV live 2026-08-07; fold into ECB Data Portal P0 #83 allowlist rather than a parallel source. |
| NY Fed Markets SOFR JSON | `https://markets.newyorkfed.org/api/rates/secured/sofr/last/1.json` | Still live; already covered by terminal NY Fed reference-rate routes — do not re-list as new P0. |
| Banque de France Webstat | `https://webstat.banque-france.fr/api/explore/v2.1/catalog/datasets?limit=1` | Catalog live (~42k datasets) but many series return empty `records`; curate working dataset IDs / alternate export paths before P0. |
| Destatis GENESIS REST | `https://www-genesis.destatis.de/genesisWS/rest/2020/` | Guest paths currently return HTML app shells / redirects here; still needs a documented token/header fixture. |
| db.nomics | `https://api.db.nomics.world/v22/providers` | Prefer primary publishers in P0; use for discovery/gap-fill. |
| ISO 10383 MIC list | CSV/XLS on iso20022.org | **Promoted to P0 #137** (CSV verified 2026-08-01); keep terms review on the adapter. |
| Bank of Russia daily FX | `https://www.cbr.ru/scripts/XML_daily.asp` | Anonymous XML works; compliance/authorization review required first. |
| Central Bank of Armenia SOAP FX | `https://api.cba.am/exchangerates.asmx?WSDL` | WSDL live (2026-08-01); needs SOAP client fixture like MNB. |
| MNB Hungary SOAP FX | `https://www.mnb.hu/arfolyamok.asmx?WSDL` | WSDL live; SOAP `GetCurrentExchangeRates` still needs a dedicated client fixture (GET helpers 404). |
| NY Fed SCE public microdata | `.../frbny-sce-public-microdata-latest.xlsx` | Anonymous XLSX verified but ~80 MB — useful research dump after the compact SCE workbook P0 #113. |
| Germany SMARD chart API | `https://www.smard.de/app/chart_data/410/DE/index_quarterhour.json` | Still UI-oriented JSON; prefer Energy-Charts P0 #162 (explicit CC BY 4.0 / SMARD attribution) unless a SMARD-native bulk contract appears. |
| Zillow Research ZHVI | `https://files.zillowstatic.com/research/public_csvs/zhvi/Metro_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv` (~4.4 MB verified) | Commercial reuse terms need review; FHFA/Freddie/CSO should lead. |
| NASA POWER | `https://power.larc.nasa.gov/api/temporal/daily/point?...` | **Promoted to P0 #169** (daily point JSON verified 2026-08-06). |
| CPSC recalls | `https://www.saferproducts.gov/RestWebServices/Recall?format=json` | **Promoted to P0 #177** (2026 YTD JSON ~1.1 MB verified 2026-08-06). |
| openFDA enforcement | `https://api.fda.gov/drug/enforcement.json?limit=1` | **Promoted to P0 #168** (drug/device/food enforcement + NDC + FAERS verified 2026-08-06); free key still recommended at scale. |
| NHTSA recalls | `https://api.nhtsa.gov/recalls/recallsByVehicle?...` | **Promoted to P0 #174** (Tesla Model 3 2023 Count=11 verified 2026-08-06). |
| NVD CVE 2.0 | `https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=1` | Anonymous JSON still works 2026-08-05 (~373k CVEs); prefers API key / tight rate limits — after KEV+EPSS+OSV+CIRCL+deps.dev. |
| OpenSanctions sanctions collection | `https://data.opensanctions.org/datasets/latest/sanctions/index.json` (+ `targets.simple.csv` ~68 MB; full `entities.ftm.json` ~352 MB) | Index live (~291.6k entities, updated 2026-08-07). Prefer Canada/UK/US/EU/UN official lists in P0 first; use `targets.simple.csv` only as a secondary cross-check with license review. |
| CoinPaprika tickers | `https://api.coinpaprika.com/v1/tickers/btc-bitcoin` | Re-verified 200 JSON 2026-08-05; Fear & Greed + mempool **promoted to P0 #163**. CoinPaprika remains optional aggregator after Coin Metrics (#160) + venue prints. |
| mindicador.cl Chile indicators | `https://mindicador.cl/api`, `/api/uf`, `/api/dolar` | Convenient unofficial JSON for UF/USD/CLP; prefer Banco Central de Chile official feeds if/when anonymously stable. |
| IMF SDMX 3.0 non-CPI dataflows | `https://api.imf.org/external/sdmx/3.0/structure/dataflow` | Structure catalog live (222 flows); WEO/BOP/FM need per-flow fixtures (abbreviated versions 404; some paths 403). CPI `5.0.0` is P0. |
| MNB Hungary SOAP FX | `https://www.mnb.hu/arfolyamok.asmx?WSDL` | WSDL live; SOAP `GetCurrentExchangeRates` still needs a dedicated client fixture (GET helpers 404). |
| WHO Disease Outbreak News OData | `https://www.who.int/api/news/diseaseoutbreaknews?$top=1&$orderby=PublicationDateAndTime desc` | Official DON JSON verified (e.g. Bundibugyo Ebola item 2026-07-17). Prefer extending existing `who_outbreaks` adapter rather than a parallel source. |
| SEC `company_tickers*.json` | `https://www.sec.gov/files/company_tickers.json` (+ `_exchange`) | Anonymous with descriptive User-Agent (~0.5–0.8 MB). Already covered by terminal SEC stack — only add if a standalone registry source is desired. |
| Aviation Weather Center METAR/SIGMET | `https://aviationweather.gov/api/data/metar?ids=KJFK&format=json` | **Promoted to P0 #161** (METAR + airsigmet verified 2026-08-05); other AWC products still need allowlist. |
| eCFR | `https://www.ecfr.gov/api/versioner/v1/versions/title-12.json` | Hierarchical legal modeling required. |
| Fintraffic Digitraffic | `https://tie.digitraffic.fi/api/weather/v1/stations/data` | Send `Digitraffic-User` + gzip; cache metadata. |
| Fraunhofer Energy-Charts | `https://api.energy-charts.info/public_power?country=de` | **Promoted to P0 #162** — `license_info` cites CC BY 4.0 / SMARD (2026-08-05). Residual: non-DE countries and exotic bzns. |
| ClinicalTrials.gov v2 | `https://clinicaltrials.gov/api/v2/studies?pageSize=1` | Needs sponsor/entity resolution. |
| CAISO OASIS | `https://oasis.caiso.com/oasisapi/SingleZip` | Real-time demand/fuel CSVs **promoted to P0 #167**; keep OASIS ZIP for LMPs after DST-safe keys + terms review. |
| NASA FIRMS hotspots | `https://firms.modaps.eosdis.nasa.gov/api/area/csv/...` | Requires free `MAP_KEY` (Invalid MAP_KEY without registration) — register before P0. |
| USDA NASS Quick Stats | `https://quickstats.nass.usda.gov/api/api_GET/` | Unauthorized without API key (401) — free key path, not zero-credential. |
| CBOE `_MOVE.json` | `https://cdn.cboe.com/api/global/delayed_quotes/charts/historical/_MOVE.json` | AccessDenied 2026-08-06; keep VIX/VVIX/SKEW from #104. |
| FINRA OTC weekly summary | `https://api.finra.org/data/group/otcMarket/name/weeklySummary` | Confirm FINRA API terms/field dictionary; daily Reg SHO short volume is higher-priority P0. |
| FEC OpenFEC | `https://api.open.fec.gov/v1/candidates/?per_page=1&api_key=DEMO_KEY` | Re-verified 2026-07-30 with `DEMO_KEY` (~54k candidates). Still key-shaped auth — register a production key before scale. |
| ECDC open data (COVID historical) | `https://opendata.ecdc.europa.eu/covid19/nationalcasedeath/json/` | Anonymous multi-MB JSON still live; lower incremental value post-emergency — niche health backfill. |
| UNICEF SDMX demographics | `https://sdmx.data.unicef.org/ws/public/sdmxapi/rest/data/UNICEF,DM,1.0/all?...` | Anonymous SDMX-CSV works but unfiltered pulls are multi-MB; curate indicator/geo filters before P0. |
| data.europa.eu hub search | `https://data.europa.eu/api/hub/search/datasets?limit=1&catalogue=estat` | Discovery JSON live; prefer Eurostat dissemination API (#11) for observations. |
| Frankfurter ECB redistributor | `https://api.frankfurter.app/latest?from=USD&to=EUR,GBP` | Convenient, but prefer primary ECB Data Portal P0. |
| UNHCR Population Statistics API | `https://api.unhcr.org/population/v1/population/?limit=5&year=2024` | Anonymous JSON live (2026-08-05), but terminal already exposes `demographics/refugees` — extend that adapter rather than a parallel source. |
| Global Forest Watch Data API | `https://data-api.globalforestwatch.org/dataset/umd_tree_cover_loss/latest` | Dataset catalog/version JSON is anonymous; SQL `/query` returned 403 without free API key — keep until a no-key download path is pinned. |
| USGS MCS 2025 ScienceBase items | `https://www.sciencebase.gov/catalog/items?q=mineral%20commodity%20summaries%202025&format=json` | Item search live (cobalt/nickel/… data releases); direct `file/get` CSV URLs 404'd here — rediscover stable download links before P0. |
| ReliefWeb API v2 | `https://api.reliefweb.int/v2/disasters?appname=...` | v1 now **410 decommissioned** (2026-08-05); v2 still requires approved `appname` (403). |
| BLS `download.bls.gov` time-series flat files | `https://download.bls.gov/pub/time.series/cu/cu.data.1.AllItems` | Anonymous bulk CES/CPI flat files work (~GB-scale CES), but terminal BLS routes already cover the product surface — raw-upstream fallback only. |
| SEC EDGAR full-text search (EFTS) | `https://efts.sec.gov/LATEST/search-index?q=apple&forms=10-K&from=0&size=1` | Anonymous JSON works with User-Agent; already overlaps the terminal SEC stack — only add if a standalone search product is desired. |
| NWS `api.weather.gov` | `https://api.weather.gov/alerts/active?status=actual&message_type=alert` | GeoJSON alerts live (descriptive User-Agent); registry already has `weather/alerts` — prefer extending that adapter. Do not pass unsupported `limit`. |
| UN Comtrade Plus public preview | `https://comtradeapi.un.org/public/v1/preview/C/A/HS` | Preview JSON returned 200 (~445 KB) here; production Comtrade Plus still key-shaped — treat as discovery/sample, not full warehouse. |
| Nager.Date public holidays | `https://date.nager.at/api/v3/PublicHolidays/2026/US` | Free worldwide holiday calendar; useful scheduling metadata but not a core market print. |
| Wikimedia pageviews | `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents/Federal_Reserve/daily/20260701/20260731` | Attention proxy for entities/topics; noisy vs primary financial sources. |
| deps.dev (companion to OSV) | `https://api.deps.dev/v3/systems/npm/packages/lodash` | **Promoted to P0 #164** (lodash package JSON verified 2026-08-05). |
| OTC Markets www screener | `https://www.otcmarkets.com/research/stock-screener/api` | **Restored 2026-08-03** (~18,085) — keep as P0 #120; retain timeout/backoff guidance. |
| WorldPop services API | `https://api.worldpop.org/v1/services` | Anonymous JSON catalog live; useful population rasters but heavy geospatial processing vs existing demographics sources. |
| IMF BOP / COFER SDMX 3.0 | `https://api.imf.org/external/sdmx/3.0/structure/dataflow/IMF.STA/BOP` | BOP structure JSON live (2026-08-03); COFER/BOP data paths still need working key fixtures (data calls 404). |
| EIA Grid Monitor Region_US48 workbook | `https://www.eia.gov/electricity/gridmonitor/knownissues/xls/Region_US48.xlsx` | ~36 MB XLSX verified; useful bulk US48 electricity — schedule as cold sync after STEO/EPM in #131. |
| Polity5 polity scores | `https://www.systemicpeace.org/inscr/p5v2018.xls` | Anonymous XLS (~4.5 MB) still reachable but vintage-stale (2018) — prefer V-Dem/Freedom House if stable machine URLs appear. |
| Baker Hughes NA rig count | `https://rigcount.bakerhughes.com/na-rig-count/` | Landing page live; stable XLS/CSV asset still needs discovery (static-files path 404). |
| Kansas City Fed LMCI | `.../lmcicharts-070726.xlsx` | **Promoted to P0 #195**; Richmond Fed manufacturing workbook URL still not stably extracted (2026-08-11) — keep watching. |
| Bank of Thailand / BSP / RBI / FBIL FX | various | HTML portals or key-gated APIs from this environment; keep watching for anonymous JSON/CSV. |
| Bank of Korea ECOS | `https://ecos.bok.or.kr/api/.../{apiKey}/json/...` | Free API key required (`sample` demo key returns JSON; blank key `ERROR-200`) — not zero-credential P0. |
| OpenSky Network ADS-B | `https://opensky-network.org/api/states/all` | Connection failed here; anonymous limits / auth tiers need a fixture when reachable. |
| Berkeley Earth global temperature | `https://berkeley-earth-temperature.s3.us-west-1.amazonaws.com/Global/Land_and_Ocean_complete.txt` (~417 KB verified 2026-08-04) | Useful companion after NASA GISS P0 #153; prefer one primary anomaly product in the hot path. |
| Fund for Peace Fragile States Index | `https://fragilestatesindex.org/wp-content/uploads/2023/06/FSI-2023-DOWNLOAD.xlsx` (~27 KB) | Anonymous XLSX works, but latest public workbook on the excel page is still 2023 (2024 path 404) — annual refresh canary needed. |
| FAO Food Price Index workbook | `https://www.fao.org/fileadmin/templates/worldfood/Reports_and_docs/Food_price_indices_data_jul.xls` (~183 KB) | Anonymous XLS works; terminal already exposes `food/price-index` — only add if a direct FAO upstream adapter is desired. |
| CFTC public COT annual/disagg ZIPs | `https://www.cftc.gov/files/dea/history/fut_disagg_txt_2026.zip` / `deacot2025.zip` | Anonymous ZIPs work, but terminal already wires CFTC facts routes — treat as raw-upstream fallback, not a new product surface. |
| PatentsView USPTO | `https://api.patentsview.org/...` | Request failed/ERR this run; revisit for IP/innovation overlays. |

## P2 — investigate or scrape carefully

| Candidate | Access path | Investigation needed |
|---|---|---|
| NOAA MarineCadastre AIS bulk | `https://coast.noaa.gov/htdata/CMSP/AISDataHandler/2024/` (and `/2023/`) | Year indexes still list `AIS_YYYY_MM_DD.zip`, but direct ZIP GETs returned **404** again on 2026-08-08 — rediscover working object URLs / mirror before maritime AIS ingest. |
| World Bank debarred firms | https://www.worldbank.org/en/projects-operations/procurement/debarred-firms | Historical JSON URL now serves HTML app. Find official current file or allowed scrape. |
| CBO budget/economic projections | https://www.cbo.gov/data/budget-economic-data | Captcha interstitial on probe (2026-07-29); structured XLSX/CSV + RSS when reachable. |
| EBA risk dashboard / transparency | https://www.eba.europa.eu/.../risk-dashboard | Workbook/archive discovery and version handling. |
| UK DBT statistics | https://www.gov.uk/government/organisations/department-for-business-and-trade/about/statistics | Prefer CSV/ODS attachments over prose scraping. |
| AEMO NEMWeb DispatchIS / TradingIS | `https://nemweb.com.au/Reports/Current/DispatchIS_Reports/` (+ `TradingIS_Reports/`) | Directory listing + ZIP/CSV still reachable (sample DispatchIS ZIP ~19 KB on 2026-08-08); OpenNEM power stats now **401 auth**. AEMO terms may restrict commercial use — legal review before P0. |
| Swiss SECO sanctions XML | `action=downloadXmlGesamtlisteAction` | **Promoted to P0 #191** (full XML ~39.9 MB verified 2026-08-08). Old `type=sanction` URL still interstitial-prone. |
| OpenFoodFacts product API | `https://world.openfoodfacts.org/api/v2/product/{code}.json` (+ search JSON) | Anonymous JSON live; useful food/product enrichment after CPSC/openFDA — not a core market print. |
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
- **ReliefWeb API:** v1 decommissioned (410 on 2026-08-05); v2 still needs a pre-approved `appname`.
- **WTO Stats / Timeseries API:** subscription key required.
- **UCDP / ACLED upstream APIs:** token-gated at source; terminal already exposes FinUties routes.
- **Commercial or unofficial market-data aggregators:** require explicit redistribution rights.
- **HTML-only news/search pages:** too volatile while official feeds remain available.
- **abuse.ch threat intel APIs:** URLHaus / MalwareBazaar / ThreatFox anonymous calls returned
  401 Unauthorized on 2026-08-04 — treat as auth-gated unless a free registered key path is
  documented for production.
- **Duplicates of current coverage:** SEC EDGAR (including `company_tickers.json` and anonymous `data.sec.gov` companyfacts/XBRL — already in the terminal SEC stack), US Treasury
  Fiscal Data, New York Fed Markets reference rates, BLS (anonymous CPI probe still succeeds but
  is already wired), USGS earthquakes, NOAA weather alerts, OFAC, CFTC, CoinGecko, UN Comtrade,
  IMF indicator families mapped by registry `imf`, and existing World Bank indicator families.

## Suggested delivery slices

1. **Compliance and entity identity:** Canada SEMA + UK Sanctions + Swiss SECO (#191) + GLEIF +
   OpenFIGI + ESMA FIRDS + ESMA FITRS + ISO 10383 MIC + NASDAQ Trader dirs/halts + HKEX securities
   + TWSE OpenAPI (#203) + JPX listed issues (#204) + SGX indices (#214) + PRH Finland + Brreg
   Norway + Companies House free data product + LittleSis + Federal Register + SIPRI Milex
   (geopolitical spend context).
2. **US markets microstructure & banking:** TreasuryDirect auctions + FINRA Reg SHO short volume +
   FCA/AFM public net shorts (#189/#190) + SEC CNS fails-to-deliver (#165) + SEC Form D quarters
   (#188) + OCC options volume (`reportType=D` + `format=csv`) + CBOE VIX/VVIX/SKEW (historical
   charts path) + OTC Markets www screener + TIC major foreign holders + CFTC TFF (#218) + CFTC
   Supplemental CIT (#219) + Fed H.15 DDP packages (#166) + Fed H.8 / H.4.1 / H.6 / H.10 / G.19 /
   CP / CHGDEL / FOR / SLOOS (#220–#228) + Fed Z.1 Financial Accounts (#229) + FRED
   `fredgraph.csv` allowlist (incl. claims/JOLTS/median & sticky CPI + RSAFS/TOTLL/M2SL/WALCL) +
   OFR + Chicago Fed NFCI/CFNAI + Philadelphia Fed ADS + Philadelphia Fed SPF (#179) +
   Philadelphia Fed MBOS (#197) + Atlanta Fed GDPNow + Atlanta Fed Wage Growth + NY Fed SCE + NY
   Fed Empire State (#193) + NY Fed GSCPI + Dallas Trimmed Mean PCE + Dallas Fed
   TMOS/TSSOS/BCS/DES/AgSurvey (#207–#211) + Cleveland inflation nowcast + SF Fed news sentiment
   + SF Fed Proxy Funds Rate (#178) + KC Fed LMCI (#195) + KC Fed Manufacturing/Services
   (#198/#199) + Fed G.17 IP package (#217) + Census M3 (#216) + FDIC BankFind (+ SOD deposits
   API) + APRA Monthly ADI (#200) + CFPB complaints + IAPD + BrokerCheck.
3. **Financial conditions and macro stats:** Fed H.15 packages (#166) + FRED `fredgraph.csv`
   allowlist (incl. KCFSI / Empire / wage tracker) + ECB Data Portal + BIS + Eurostat + OECD CLI +
   IMF SDMX 3.0 CPI + UK ONS CPIH + OFR STFM + Chicago Fed NFCI + Philadelphia Fed ADS + Atlanta
   Fed GDPNow/Wage + NY Fed SCE/GSCPI + BoE/BoC/RBA/Norges/Riksbank/SNB + Bundesbank +
   StatsCan/ABS/SingStat/CBS/INSEE/SSB/StatFin/INE Spain + CSO Ireland + DST Denmark + Swiss FSO +
   Statistics Iceland + GUS Poland + IBGE + SCB Sweden + Statistics Estonia/Latvia/Slovenia/Slovakia
   + BCB SGS Selic/IPCA + Malaysia data.gov.my CPI/IPI/monetary aggregates (#215).
4. **Global FX prints:** RBA + Norges Bank + Riksbank + SNB + BCB PTAX + NBP + CNB + Danmarks
   Nationalbank (+ DST `DNVALD`) + NBU + BCRA + Banca d'Italia + NBR Romania + Bank of Lithuania
   + Bank of Latvia + Taiwan BOT + BOJ Tokyo FX / loan-rate CSVs (#201) + BCRP Peru + Bank of
   Israel + HNB Croatia + NBK Kazakhstan + CBAR Azerbaijan + BNM Malaysia + TCMB Türkiye + BNB
   Bulgaria + BanRep Colombia + National Bank of Moldova + National Bank of Georgia + UN
   Operational Rates (#184) (+ rediscovered HKMA ER when available).
5. **Commodities, energy, housing, credit:** World Bank Pink Sheet + IMF Primary Commodity Prices +
   LBMA metals + EIA WPSR/Brent/HH/NGS-history/STEO_m/EPM/DPR files (full GET for STEO; avoid
   Range) + FHFA HPI + Freddie Mac PMMS + UK Land Registry + CSO Ireland HPA02 + Census FT-900 +
   Census BPS permits (#194) + Census New Residential Construction (#205) + ANBIMA IMA (#185) +
   BCB Focus (#186) + FRED Case-Shiller/UMCSENT/ICSA/HOUST allowlist companions.
6. **Power and gas:** Elexon + ENTSOG + MIDAS + Energinet + Elia + REE Spain + RTE éco2mix (#192)
   + NESO GB demand (#196) + IRENASTAT renewables (#202) + ERCOT dashboards + CAISO demand/fuel
   CSVs (#167) + NYISO public CSVs + IESO Ontario GenOutputCapability + UK Carbon Intensity +
   Energy-Charts DE power/price (#162) + ONS Brazil CKAN load (#230) + EPA eGRID (#175) + EDGAR
   GHG booklet (#206) (+ AEMO NEMWEB only after terms clearance; OpenNEM power still auth-gated).
7. **Procurement and public spending:** TED + Find a Tender + SAM.gov + Grants.gov + USAspending
   + World Bank Projects.
8. **Cyber, physical, climate, and country risk:** CISA KEV + FIRST EPSS + OSV.dev + CIRCL CVE +
   deps.dev (#164) + openFDA / NHTSA / CPSC recalls (#168/#174/#177) + NASA EONET + NASA GISS +
   NASA POWER (#169) + NASA DONKI (#170) + NOAA GML GHG trends (#159) + CPC ENSO/ONI (#172) +
   GHCN-Daily (#173) + PSMSL (#171) + NSIDC sea ice + NOAA SWPC + NOAA PSL + NOAA CO-OPS +
   Aviation Weather METAR/SIGMET (#161) + adsb.lol ADS-B (#183) + NHC CurrentStorms/GeoRSS +
   US Drought Monitor (+ GeoJSON; map date 2026-08-04) + Open-Meteo (+ AQ/marine) + MET Norway +
   Bright Sky (DWD) + USGS NWIS IV + EMSC FDSN + USGS volcanoes (#91 elevated subset) + Climate
   TRACE + Climate Watch NDC + INFORM Risk + OpenFEMA + HDX allowlisted packages + IMF PortWatch
   chokepoints + OurAirports + VoteView + CourtListener watchlists + Polymarket/Kalshi event odds
   (#180/#181) + PredictIt/Manifold (#212/#213) + Penn World Table (#182) + CEPALSTAT (#187) + UN
   SDG + ILOSTAT labour allowlists.
9. **Crypto market structure (free):** DeFiLlama chain TVL + stablecoins + Coin Metrics
   Community `PriceUSD` (#160) + Coinbase/Kraken + Hyperliquid + L2Beat + Binance.US / Bitstamp /
   Gemini / OKX / Bitfinex / KuCoin / Gate / Poloniex / Deribit / BitMEX / MEXC / HTX /
   Crypto.com / dYdX v4 public tickers + Fear & Greed / mempool fees (#163) + Blockchain.com
   network stats (#176).

For each adapter, expose source metadata, health, last successful observation/publisher time,
row counts, and parser failures before adding the source to the terminal registry.

## Verification record

These representative calls used a descriptive user agent, followed redirects, sent no credentials,
and downloaded the response body on **2026-08-14 UTC** (prior 2026-08-11/09/08/07/06/05/04/03/02/01/07-31
notes retained where still accurate).

| Source | HTTP | Response type / observation |
|---|---:|---|
| CFTC `FinFutWk.txt` / `FinComWk.txt` *(new)* | 200 | text ~68–69 KB; 88 rows; report **2026-08-04** |
| CFTC TFF Socrata `gpe5-46if` latest *(new)* | 200 | JSON; report_date **2026-08-04** |
| CFTC CIT Socrata `4zgm-a668` latest *(new)* | 200 | JSON; report_date **2026-08-04** |
| CFTC `fut_fin_txt_2026.zip` / `com_fin_txt_2026.zip` / `fut_fin_xls_2026.zip` *(new)* | 200/206 | ZIP annual TFF history |
| Fed H.8 DDP ZIP *(new)* | 200 | ZIP ~8.4 MB; `H8_data.xml` |
| Fed H.4.1 DDP ZIP *(new)* | 200 | ZIP ~9.0 MB; `H41_data.xml` |
| Fed H.6 DDP ZIP *(new)* | 200 | ZIP ~1.4 MB; `H6_data.xml` |
| Fed H.10 DDP ZIP *(new)* | 200 | ZIP ~2.1 MB; `H10_data.xml` |
| Fed G.19 DDP ZIP *(new)* | 200 | ZIP ~604 KB; `G19_data.xml` |
| Fed CP DDP ZIP *(new)* | 200 | ZIP ~6.3 MB; `CP_data.xml` |
| Fed CHGDEL DDP ZIP *(new)* | 200 | ZIP ~279 KB; `CHGDEL_data.xml` |
| Fed FOR (household debt) DDP ZIP *(new)* | 200 | ZIP ~26 KB; `FOR_data.xml` |
| Fed SLOOS DDP ZIP *(new)* | 200 | ZIP ~244 KB; `SLOOS_data.xml` |
| Fed Z.1 DDP ZIP *(new)* | 200 | ZIP ~36.4 MB; `Z1_data.xml` |
| ONS Brazil `package_list` *(new)* | 200 | JSON; 83 packages |
| ONS `carga-energia` 2026 CSV *(new)* | 200 | CSV ~37 KB; Last-Modified **2026-08-13** |
| FRED `RSAFS` / `TOTLL` / `BUSLOANS` / `M2SL` / `WALCL` / `REVOLSL` / `DRCCLACBS` / `TDSP` *(new)* | 200 | CSV companions through 2026-06/07/08 |
| OCC volume-query `format=csv` 20260813 / 20260812 *(contract)* | 200 | CSV ~4.8 MB each |
| OCC volume-query without `format` | 200 | `Report Format is Required` (25 bytes) |
| GLEIF lei-records *(recheck)* | 200 | JSON:API; ~3,402,410 LEIs; golden copy **2026-08-14** |
| UK Sanctions List CSV *(recheck)* | 200/206 | CSV; Report Date **06-Aug-2026** |
| CISA KEV *(recheck)* | 200 | JSON; catalogVersion **2026.08.11**; count 1,665 |
| OTC Markets stock-screener *(recheck)* | 200 | JSON; count ~18,077 |
| FINRA CNMS 20260813 / 20260812 / 20260811 *(recheck)* | 200 | pipe text ~537–540 KB |
| Fear & Greed `limit=1` *(recheck)* | 200 | JSON; latest value **29** (Fear) |
| Coin Metrics BTC PriceUSD `page_size=1` *(recheck)* | 200 | JSON; **2026-08-13** ~63395 |
| NY Fed SOFR last/1 *(recheck)* | 200 | JSON; effectiveDate **2026-08-12**; 3.62% |
| OpenSanctions sanctions index *(recheck)* | 200 | JSON; ~291.6k entities; updated **2026-08-14** |
| Swiss SECO Gesamtliste XML *(recheck)* | 200 | XML ~38.0 MB; list date **2026-08-11** |
| PredictIt `marketdata/all/` *(recheck)* | 200 | JSON; **194** markets |
| SGX `indices/v1.0` *(recheck)* | 200 | JSON; **893** indices |
| Malaysia `cpi_headline` *(recheck)* | 200 | JSON ~451 KB |
| Census M3 `table1a.xlsx` *(recheck)* | 200 | XLSX ~23 KB |
| Fed G.17 ZIP *(recheck)* | 200 | ZIP ~8.6 MB |
| Dallas Fed TMOS `alldata.xls` *(recheck)* | 200 | XLSX ~482 KB |
| Canada SEMA XML *(recheck)* | 200/206 | XML |
| Polymarket Gamma / Kalshi markets *(recheck)* | 200 | JSON; active markets |
| Census MARTS guessed XLSX paths | 404 | keep P1; PDF + FRED `RSAFS` work |
| Richmond Fed manufacturing workbook guesses | 404 | still unpinned |
| Dallas Fed TMOS `alldata.xls` / `alldata_sa.xls` *(prior)* | 200 | XLSX ~482 KB / ~237 KB |
| Dallas Fed TMOS `index.xls` / `index_sa.xls` *(new)* | 200 | XLSX ~80 KB / ~193 KB |
| Dallas Fed TSSOS `tssos_alldata*.xls` / `tssos_index*.xls` *(new)* | 200 | XLSX ~63–146 KB |
| Dallas Fed TROS `tros_alldata.xls` / `_sa.xls` *(new)* | 200 | XLSX ~414 KB / ~154 KB |
| Dallas Fed BCS `BCS_All_Results.xls` / `BCS_Index_Results.xls` *(new)* | 200 | XLSX ~50 KB / ~22 KB |
| Dallas Fed DES `all_data_qq/yy` + price expectations *(new)* | 200 | XLSX ~13–45 KB |
| Dallas Fed AgSurvey `agcredit` / `aglending` / `agrates` *(new)* | 200 | XLSX ~17–23 KB |
| PredictIt `marketdata/all` *(new)* | 200 | JSON ~442 KB; **198** markets |
| Manifold `search-markets?term=federal%20reserve` *(new)* | 200 | JSON; Fed-hike markets with probs |
| SGX `indices/v1.0` *(new)* | 200 | JSON ~273 KB; **893** indices |
| data.gov.my `cpi_headline` / `cpi_core` / `ipi` / `monetary_aggregates` *(new)* | 200 | JSON ~451 / 83 / 32 / 144 KB |
| Census M3 `table1a.xlsx` *(new)* | 200 | XLSX ~23 KB |
| Fed G.17 `filetype=zip` *(new)* | 200 | ZIP ~8.6 MB; 17 members |
| ECB `CISS?lastNObservations=1` *(allowlist)* | 200 | CSV ~17 KB; ~60 series; through 2026-08-04 |
| ECB `MIR` sample *(allowlist)* | 200 | CSV ~2.5 KB |
| FRED `STLFSI4` / `INDPRO` / `TCU` / `AMTMNO` *(allowlist)* | 200 | CSV; STLFSI4 through 2026-07-31 |
| GLEIF lei-records *(recheck)* | 200 | JSON:API; ~3,398,874 LEIs; golden copy **2026-08-11** |
| UK Sanctions List CSV *(recheck)* | 200 | CSV ~49.6 MB; Report Date **06-Aug-2026** |
| CISA KEV *(recheck)* | 200 | JSON; catalogVersion **2026.08.10**; count 1,662 |
| Fear & Greed `limit=1` *(recheck)* | 200 | JSON; latest value **29** (Fear) |
| Coin Metrics BTC PriceUSD (`page_size=1`) *(recheck)* | 200 | JSON; 2026-08-10 ~63908 |
| NY Fed SOFR last/1 *(recheck)* | 200 | JSON; effectiveDate **2026-08-07**; 3.62% |
| OpenSanctions sanctions index *(recheck)* | 200 | JSON; ~291.3k entities; updated **2026-08-11** |
| Swiss SECO Gesamtliste XML *(recheck)* | 200 | XML ~40.1 MB; list date **2026-08-11** |
| OTC Markets stock-screener *(recheck)* | 200 | JSON; count ~18,080 |
| FINRA CNMS 20260810 *(recheck)* | 200 | pipe text ~542 KB |
| FINRA CNMS 20260811 / 20260809 / 20260808 | 403 | AccessDenied (non-session / not published) |
| OCC volume-query 20260810 *(recheck)* | 200 | CSV ~5.1 MB; ~154k rows |
| Polymarket Gamma markets *(recheck)* | 200 | JSON; active markets |
| Kalshi markets *(recheck)* | 200 | JSON; exchange markets |
| Canada SEMA XML *(recheck)* | 200 | XML ~1.85 MB |
| Richmond Fed mfg historical xlsx guesses | 404 | still unpinned |
| Bank of Korea ECOS without key | 200 | JSON `ERROR-200` (key required) |
| Philly Fed MBOS `bos_dif.csv` / `bos_history.csv` *(prior)* | 200 | CSV ~78 KB / ~578 KB |
| KC Fed `2026Jul23historicalmfg.xlsx` *(new)* | 200 | XLSX ~130 KB |
| KC Fed `2026Julhistoricalserv.xlsx` *(new)* | 200 | XLSX ~126 KB |
| APRA Monthly ADI June 2026 XLSX *(new)* | 200 | XLSX ~340 KB (+ back-series XLSX) |
| BOJ `fm08` / `ir01` / `md01` / `md02` CSVs *(new)* | 200 | CSV ~25 / 7 / 31 / 45 KB; stamp 2026-08-09 |
| IRENASTAT catalog + ELECCAP JSON-stat2 POST *(new)* | 200 | JSON catalog; JSON-stat2 sample |
| TWSE OpenAPI MI_INDEX / BWIBBU / STOCK_DAY_AVG *(new)* | 200 | JSON; ROC date 1150807 |
| JPX `data_e.xls` + `jyoujyou(updated)_e.xlsx` *(new)* | 200 | XLS ~851 KB; XLSX ~32 KB |
| Census `newresconst.xlsx` *(new)* | 200 | XLSX ~45 KB |
| JRC EDGAR 2024 GHG booklet XLSX *(new)* | 200 | XLSX ~4.0 MB |
| Coin Metrics BTC PriceUSD (`page_size=1`) *(contract)* | 200 | JSON; 2026-08-08 ~64907 (`limit` → 400) |
| EIA `STEO_m.xlsx` full GET *(recheck)* | 200 | XLSX ~1.09 MB (Range GET can 404) |
| FINRA CNMS 20260808 | 403 | AccessDenied (weekend/non-session) |
| FINRA CNMS 20260807 *(recheck)* | 200 | pipe text ~539 KB |
| GLEIF lei-records *(recheck)* | 200 | JSON:API; ~3,397,891 LEIs; golden copy 2026-08-08 |
| UK Sanctions List CSV *(recheck)* | 200/206 | CSV; Report Date **06-Aug-2026** |
| CISA KEV *(recheck)* | 200 | JSON; catalogVersion **2026.08.07**; count 1,662 |
| Fear & Greed `limit=1` *(recheck)* | 200 | JSON; latest value 31 (Fear) |
| OpenSanctions sanctions index *(recheck)* | 200 | JSON; ~291.2k entities; updated 2026-08-09 |
| Swiss SECO Gesamtliste XML *(recheck)* | 200 | XML ~40.0 MB; list date 2026-07-30 |
| FHFA `hpi_master.csv` *(recheck)* | 200 | CSV ~17 MB |
| NY Fed SOFR last/1 *(recheck)* | 200 | JSON; effectiveDate 2026-08-06; 3.65% |
| FCA short-positions daily XLSX *(recheck)* | 200/206 | XLSX |
| AFM net short positions CSV *(new)* | 200 | semicolon CSV ~81 KB; positions through 2026-08-06 |
| Swiss SECO Gesamtliste XML *(new)* | 200 | XML ~39.9 MB; list date 2026-07-30 |
| RTE eco2mix national/regional/cons-def *(new)* | 200 | JSON; ~9.7k / ~105k / ~502k hits |
| NY Fed Empire SA diffusion + allseries *(new)* | 200 | CSV ~36 KB / ~135 KB |
| Census BPS `st2025a.txt` *(new)* | 200 | TXT ~11 KB |
| KC Fed LMCI `lmcicharts-070726.xlsx` *(new)* | 200 | XLSX ~30 KB |
| NESO demand update CSV + datastore *(new)* | 200 | CSV ~218 KB; datastore JSON rows |
| SF Fed `proxy-funds-rate.xlsx` / `-data.xlsx` / CSV *(path fix)* | 200 | XLSX ~28 KB / ~104 KB; CSV ~20 KB |
| UN `xsql2XML.php` / `xsql2CSV.php` *(recheck)* | 200 | XML ~48 KB; Excel/CSV ~20 KB |
| ANBIMA `ima/arqs/ima_completo.xls` *(recheck)* | 200 | Excel ~252 KB |
| BCB `ExpectativasMercadoAnuais` IPCA + Selic *(recheck)* | 200 | OData JSON |
| CBOE historical `_VIX`/`_VVIX`/`_SKEW` *(recheck)* | 200 | JSON ~1.16 / 0.64 / 1.19 MB; timestamp 2026-08-08 |
| CBOE `us_indices/daily_prices/_VIX.json` | 403 | AccessDenied |
| USDM `USDM_current_M.zip` + GeoJSON *(recheck)* | 200 | ZIP members `USDM_20260804.*`; GeoJSON ~26.7 MB |
| GLEIF lei-records *(recheck)* | 200 | JSON:API; ~3,397,167 LEIs; golden copy 2026-08-07 |
| UK Sanctions List CSV *(recheck)* | 200/206 | CSV; Report Date **06-Aug-2026** |
| CISA KEV *(recheck)* | 200 | JSON; catalogVersion **2026.08.07**; count 1,662 |
| OTC Markets stock-screener *(recheck)* | 200 | JSON; count ~18,085 |
| FINRA CNMS 20260807 | 200 | pipe text ~539 KB |
| OCC volume-query 20260807 | 200 | CSV ~5.1 MB |
| Fear & Greed `limit=1` | 200 | JSON; latest value 30 (Fear) |
| Coin Metrics `PriceUSD` BTC | 200 | JSON; 2026-08-07 ~64869 |
| NY Fed SOFR last/1 | 200 | JSON; effectiveDate 2026-08-06; 3.65% |
| OpenSanctions sanctions index | 200 | JSON; ~291.2k entities; updated 2026-08-08 |
| Polymarket Gamma markets *(recheck)* | 200 | JSON; active markets |
| Kalshi markets *(recheck)* | 200 | JSON; exchange markets |
| adsb.lol `/v2/mil` *(recheck)* | 200 | JSON ~23 KB |
| CEPALSTAT thematic-tree *(recheck)* | 200 | JSON ~375 KB |
| SEC Form D `2026q2_d.zip` *(recheck)* | 200/206 | ZIP → TSV bundle |
| Penn World Table `pwt100.xlsx` *(recheck)* | 200 | XLSX ~6.6 MB |
| Energy-Charts `public_power?country=de` | 200 | JSON |
| PortWatch Daily_Chokepoints_Data | 200 | JSON features |
| NHC `CurrentStorms.json` | 200 | JSON; `activeStorms: []` |
| ECB €STR `EST` sample | 200 | CSV |
| FRED `fredgraph.csv?id=DGS10` | 200 | CSV ~268 KB |
| Canada SEMA XML | 200/206 | XML |
| ESMA FIRDS Solr FULINS | 200 | JSON index |
| FDIC SOD API sample | 200 | JSON; total ~76,727 |
| NEMWEB DispatchIS sample ZIP | 200 | ZIP ~19 KB → CSV |
| MarineCadastre `AIS_2024_01_01.zip` | 404 | directory lists files; object GET still 404 |
| OpenNEM `/stats/power/network/fueltech/NEM` | 401 | Not authenticated |
| OpenSky states/all | ERR | connection failed |
| GIE AGSI/ALSI without key | 200 | JSON body `Invalid or missing API key` |
| NASA FIRMS without MAP_KEY | 400 | Invalid MAP_KEY |
| OpenAQ v3 without key | 401 | Unauthorized |
| Metaculus questions API | 403 | auth required *(prior)* |
| RBNZ statistics portal | 403 | Website unavailable |
| MAS eservices API paths | 404 | portal HTML |
| Australia DFAT consolidated | ERR | fetch failed/reset |

Re-run these probes before implementation because anonymous-access and version policies can change.
