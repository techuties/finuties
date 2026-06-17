# New data source, endpoint, and scraping suggestions

This list prioritizes sources that add visible value to FinUties with low integration friction. The top preference is free, official, directly accessible HTTP data that can be ingested server-side and exposed through the existing `/api/v1/data/...` registry pattern.

## Existing coverage considered

Current client coverage already includes FinUties API routes for conflict data, SEC filings and parsed SEC resources, CFTC COT, ECB FX, Treasury and NY Fed rate cards, IMF, Comtrade, sanctions, USGS/GDACS/NOAA alerts, WHO/UN/FAO/World Bank/UNDP/UNESCO/ILO/ITU-style development datasets, climate, GBIF/IUCN, and selected market/holdings endpoints. The suggestions below focus on gaps rather than replacing those sources.

## Ranking criteria

- **Immediate**: official or stable public endpoint, no paid key, validated with a simple GET/POST from this environment, and a clear fit for the current data registry/card model.
- **High value**: likely to improve market, macro, entity, or risk workflows materially.
- **Medium**: useful but either narrower, overlaps current coverage, needs more normalization, or has licensing/rate-limit constraints.
- **Not immediate**: promising but API-keyed, commercial-license constrained, unofficial, region-sensitive, or scraping-like.

## Immediate / high-value candidates

| Rank | Source | Proposed FinUties endpoint | Direct upstream endpoint examples | Access | Why it is valuable | Implementation notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | SEC EDGAR XBRL Company Facts and Concepts | `/api/v1/data/sec/company-facts`, `/api/v1/data/sec/company-concepts`, `/api/v1/data/sec/xbrl-frames` | `https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json`, `https://data.sec.gov/api/xbrl/companyconcept/CIK0000320193/us-gaap/Revenues.json`, `https://data.sec.gov/api/xbrl/frames/us-gaap/Revenues/USD/CY2024Q4I.json` | Free, no API key; User-Agent required; 10 req/sec guidance | Gives normalized fundamentals directly from filings and complements existing SEC filing/holdings views. | Cache by CIK/concept/period, zero-pad CIKs, expose compact fields: cik, taxonomy, concept, unit, fiscal period, form, filed date, value. |
| 2 | U.S. Treasury Fiscal Data: Daily Treasury Statement and debt detail | `/api/v1/data/fiscal/dts-cash`, `/api/v1/data/fiscal/debt-to-penny`, `/api/v1/data/fiscal/mts` | `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/dts/operating_cash_balance?sort=-record_date&page[size]=1`, `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny?sort=-record_date&page[size]=1` | Free, no API key, JSON/CSV/XML | Adds daily TGA cash, debt ceiling/debt outstanding, receipts/outlays, and fiscal liquidity context for macro dashboards. | Use Fiscal Data pagination and `filter`, `fields`, `sort`; daily cache is enough. Start with DTS operating cash and debt-to-penny because they are small and high signal. |
| 3 | FRED public CSV series gateway | `/api/v1/data/macro/fred-series` | `https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS10` | Free direct CSV without API key for known series IDs | Unlocks broad macro/rates/liquidity coverage without requiring a FRED API key for basic series pulls. | Treat as curated-series ingestion, not open search. Maintain an allowlist of series IDs, source labels, units, and release cadence. For search/metadata, the official FRED API still needs a free key. |
| 4 | GLEIF Global LEI Index | `/api/v1/data/entities/lei-records`, `/api/v1/data/entities/lei-relationships` | `https://api.gleif.org/api/v1/lei-records?filter[lei]=7LTWFZYICNSX8D621K86`, `https://api.gleif.org/api/v1/lei-records?filter[entity.legalName]=apple` | Free, no registration, JSON:API | Adds legal entity identity, LEI, corporate status, country, addresses, and parent relationships for company/investor/sanctions enrichment. | Normalize JSON:API responses and paginate. Key joins: LEI, legal name, jurisdiction, registration status, direct/ultimate parent links. |
| 5 | Nasdaq Trader symbol directory | `/api/v1/data/markets/symbol-directory` | `https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt`, `https://www.nasdaqtrader.com/dynamic/SymDir/otherlisted.txt`, `ftp://ftp.nasdaqtrader.com/SymbolDirectory/nasdaqlisted.txt` | Free public text files | Provides nightly official U.S. listed symbol universe, ETF flags, test issue flags, and listings metadata. | Prefer HTTPS `dynamic/SymDir` text files over FTP for simpler infrastructure. Parse pipe-delimited files and filter out `Test Issue=Y`. |
| 6 | OpenFIGI identifier mapping | `/api/v1/data/markets/figi-map`, `/api/v1/data/markets/figi-values` | `https://api.openfigi.com/v3/mapping`, `https://api.openfigi.com/v3/mapping/values/idType` | Free without key at low limits; optional free key raises limits | Bridges ticker, CUSIP, ISIN, FIGI, exchange, MIC, and security metadata across market and filings workflows. | POST mapping jobs in batches. Respect anonymous limits: low request/minute and small jobs/request. Cache aggressively by id type/value/exchange. |
| 7 | ECB Data Portal SDMX beyond FX | `/api/v1/data/macro/ecb-series` | `https://data-api.ecb.europa.eu/service/data/EXR/D.USD.EUR.SP00.A?lastNObservations=1&format=csvdata`, `https://data-api.ecb.europa.eu/service/dataflow` | Free, no API key, SDMX/CSV | Extends current ECB FX usage into euro-area macro, monetary, balance-sheet, rates, and payments datasets. | Use SDMX dataflow discovery, but expose curated series first. Prefer `format=csvdata`, `lastNObservations`, `startPeriod`, and `detail=dataonly`. |
| 8 | World Bank indicator API expansion | `/api/v1/data/development/worldbank-indicators` | `https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?format=json&per_page=1000` | Free, no API key | Existing development coverage can be deepened with curated country indicators and downloadable CSV packages. | Avoid duplicating current WB poverty/governance/education views; use this for missing energy, financial inclusion, climate finance, and country risk indicators. |
| 9 | CFTC Socrata public reports not yet covered | `/api/v1/data/cftc/tff`, `/api/v1/data/cftc/supplemental-cit`, `/api/v1/data/cftc/bank-participation` | `https://publicreporting.cftc.gov/resource/gpe5-46if.json?$limit=1`, `https://publicreporting.cftc.gov/resource/4zgm-a668.json?$limit=1` | Free Socrata API, no token required for basic use | Adds financial futures trader categories and supplemental commodity index trader positioning beyond existing COT routes. | Current COT routes already cover several reports; prioritize missing TFF combined/futures-only and supplemental CIT if not present backend-side. |
| 10 | Coinbase public market data | `/api/v1/data/crypto/coinbase-products`, `/api/v1/data/crypto/coinbase-candles` | `https://api.coinbase.com/api/v3/brokerage/market/products?limit=1`, `https://api.coinbase.com/api/v3/brokerage/market/products/BTC-USD/candles?start=1717200000&end=1717286400&granularity=ONE_HOUR` | Public endpoints, no auth; cache/rate constraints | Adds exchange-native crypto products, candles, top-of-book, and trade context to supplement aggregate crypto prices. | Handle incomplete candle gaps and product availability. Use as exchange market data, not a canonical global crypto price source. |
| 11 | Binance market-data-only host | `/api/v1/data/crypto/binance-ticker`, `/api/v1/data/crypto/binance-klines` | `https://data-api.binance.vision/api/v3/ticker/price?symbol=BTCUSDT`, `https://data-api.binance.vision/api/v3/klines?symbol=BTCUSDT&interval=1h` | Public market data, no auth; main Binance host may be region-blocked | Deep liquidity crypto prices and OHLCV. The `data-api.binance.vision` host worked where `api.binance.com` returned a location restriction. | Use only the market-data-only host. Add region/error fallback messaging and avoid trading/account endpoints entirely. |

## Medium-priority candidates

| Source | Proposed endpoint | Upstream access | Value | Caveats |
| --- | --- | --- | --- | --- |
| OpenSanctions bulk exports | `/api/v1/data/sanctions/opensanctions-bulk`, `/api/v1/data/entities/pep` | `https://data.opensanctions.org/datasets/latest/sanctions/targets.simple.csv`, `https://data.opensanctions.org/datasets/latest/default/entities.ftm.json` | Broad sanctions, PEP, adverse entity aggregation with entity schema. | Free for non-commercial use; commercial use needs license. Large files require scheduled ingestion and license review. |
| OECD Data Explorer SDMX | `/api/v1/data/macro/oecd-series` | `https://sdmx.oecd.org/public/rest/data/{agency},{dataset},{version}/{selection}?format=jsondata` | OECD unemployment, CPI, national accounts, productivity, housing, and trade indicators. | Free but rate-limited around data downloads; SDMX keys can be complex. Start with curated datasets generated from OECD Data Explorer links. |
| SEC bulk ZIP archives | `/api/v1/data/sec/bulk-companyfacts`, `/api/v1/data/sec/bulk-submissions` | `https://www.sec.gov/Archives/edgar/daily-index/xbrl/companyfacts.zip`, `https://www.sec.gov/Archives/edgar/daily-index/bulkdata/submissions.zip` | Efficient full-refresh mode for SEC facts/submissions. | Large scheduled ingestion; needs careful delta strategy and storage planning. |
| Treasury auctions and securities | `/api/v1/data/fiscal/treasury-auctions`, `/api/v1/data/fiscal/average-interest-rates` | Fiscal Data API under `v1/accounting/od/*` and `v2/accounting/od/*` | Auction calendar/results, average interest cost, and debt composition. | More tables to normalize; prioritize after DTS/debt-to-penny. |
| Kraken public market data | `/api/v1/data/crypto/kraken-ticker`, `/api/v1/data/crypto/kraken-ohlc` | Public Kraken REST endpoints | Exchange-native crypto data and redundancy against Coinbase/Binance. | Symbol naming and pair mapping require normalization. Add after one exchange adapter pattern exists. |
| Nasdaq options and MPID directories | `/api/v1/data/markets/options-directory`, `/api/v1/data/markets/market-participants` | Nasdaq Trader `options.txt`, `mpidlist.txt`, `mfundslist.txt` | Useful market structure metadata for options, broker/dealer participants, and funds. | More niche than listed equities; parse after core symbol directory. |

## Not immediate / watchlist

| Source | Reason to wait |
| --- | --- |
| Official FRED API search and metadata | Very valuable, but requires a free API key. Use the no-key FRED CSV endpoint first for curated series values. |
| EIA API v2 | Strong energy dataset fit, but generally API-keyed; existing energy routes may already proxy it. |
| Alpha Vantage, Financial Modeling Prep, Twelve Data, Polygon, Nasdaq Data Link | Useful market/fundamental APIs, but key-based and usually rate-limited or commercial for serious use. |
| Stooq CSV download | Attractive no-key OHLC source, but sample requests returned 404 from this environment; treat as scraping-adjacent until reliability is rechecked. |
| Yahoo Finance chart/query endpoints | High utility but unofficial and brittle; recent ecosystem changes make this a poor primary source. |
| Companies House | High-value corporate registry, but API-keyed and UK-specific. |
| OpenCorporates | Useful entity graph, but API access and redistribution terms need review. |
| GDELT advanced scraping/news enrichment | Already appears in current conflict coverage; richer article/news scraping should wait until source licensing, dedupe, and storage strategy are explicit. |

## Suggested implementation order

1. **SEC XBRL facts**: immediate user-facing value for company pages, stock search, financial statement views, and notebooks.
2. **Treasury Fiscal Data DTS/debt**: fast to implement, strong macro dashboard value, official no-key JSON.
3. **Nasdaq symbol directory + GLEIF LEI**: foundational identifiers that improve joins across filings, holdings, sanctions, and market data.
4. **FRED curated CSV series**: broad macro coverage with minimal access friction if series IDs are curated.
5. **ECB/OECD curated SDMX adapters**: build one reusable SDMX ingestion path after the simpler sources.
6. **Crypto exchange public data**: add Coinbase first, then Binance market-data-only as a secondary adapter with region-aware error handling.
7. **OpenFIGI and OpenSanctions**: implement only after caching, rate limiting, and license expectations are clear.

## Validation performed

The following candidate URLs returned HTTP 200 from this environment during research:

- SEC company facts: `https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json`
- Treasury debt-to-the-penny: `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny?page[size]=1&sort=-record_date`
- Treasury DTS operating cash: `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/dts/operating_cash_balance?page[size]=1&sort=-record_date`
- FRED CSV: `https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS10`
- GLEIF LEI records: `https://api.gleif.org/api/v1/lei-records?filter[lei]=7LTWFZYICNSX8D621K86&page[size]=1`
- ECB EXR CSV: `https://data-api.ecb.europa.eu/service/data/EXR/D.USD.EUR.SP00.A?lastNObservations=1&format=csvdata`
- World Bank indicators: `https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?format=json&per_page=1`
- OpenFIGI mapping values: `https://api.openfigi.com/v3/mapping/values/idType`
- Nasdaq Trader symbol directory: `https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt`
- Coinbase public products: `https://api.coinbase.com/api/v3/brokerage/market/products?limit=1`
- Binance market-data-only ticker: `https://data-api.binance.vision/api/v3/ticker/price?symbol=BTCUSDT`
- CFTC TFF Socrata sample: `https://publicreporting.cftc.gov/resource/gpe5-46if.json?$limit=1`
- OpenSanctions names bulk file: `https://data.opensanctions.org/datasets/latest/sanctions/names.txt`

Observed constraints:

- `https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT` returned a location restriction here; use `https://data-api.binance.vision`.
- Stooq CSV URL variants returned 404 here; keep it out of the immediate queue until retested.
- SEC endpoints require a descriptive User-Agent and conservative rate limiting.
- OpenFIGI anonymous usage is free but low-throughput; cache every mapping response.
