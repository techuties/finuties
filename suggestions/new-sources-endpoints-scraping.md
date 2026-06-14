# New source, endpoint, and scraping suggestions

This file reviews the currently exposed FinUties data surfaces and lists new
sources to implement, prioritized from high-value/direct access to not
immediate. The emphasis is on free, directly reachable sources that can become
stable FinUties API endpoints without customer-managed secrets.

## Current coverage reviewed

Primary in-repo reference points:

- `terminal/src/lib/source-registry.ts`: the global/free-data registry used by
  the global map, table views, and some cards.
- `terminal/src/lib/global-data-api.ts`: typed fetch wrappers for a subset of
  `/api/v1/data/*`.
- `terminal/src/lib/cards/*`: dashboard endpoints for rates, macro, SEC,
  holdings, CFTC, sanctions, climate, commodities, and related domains.
- `terminal/src/lib/explore/*`: entity explorer endpoints under `/api/v1/sec/*`,
  `/api/v1/market/*`, `/api/v1/holdings/*`, and `/api/v1/search/*`.
- `notebooks/*`: example workflows for commodities, macro indicators, money
  flow, equity flows, and crypto risk models.

Existing source families already represented include UCDP, ACLED placeholder,
GDELT events, GPR, USGS earthquakes, GDACS, NOAA weather alerts, EM-DAT, Global
Fishing Watch, ECB FX, CoinGecko, IMF, UN Comtrade, CFTC COT, EPA TRI, WHO,
UN/UNHCR/IOM demographics, FAO/USDA/WFP food, World Bank/UNDP/UNESCO/ILO/ITU
development, NASA/NOAA/NSIDC/ERA5/VIIRS climate, GBIF/IUCN biodiversity, and
OFAC/EU/UN sanctions.

Largest gaps from the app shape:

- Free macro/rates coverage can go deeper than the current BLS/BEA/IMF/rates
  endpoints.
- Market data is missing free reference data, historical OHLCV alternatives,
  and microstructure-style short-sale feeds.
- SEC coverage can be enriched with raw EDGAR XBRL company facts, company
  concept time series, frames, and ticker maps.
- Weather/hazard sources can add global forecast, reanalysis, solar/agriculture,
  and curated event feeds beyond current alerts/disasters.
- Crypto coverage can add on-chain/network metrics, DeFi TVL/yields/stablecoins,
  and exchange funding/market structure.
- SDMX providers are high-value but need shared SDMX parsing/normalization before
  broad rollout.

## Recommended record shape for each implementation

When a candidate is implemented, keep a short decision record beside the source
code or ingestion config:

- Source/provider name
- Upstream endpoint pattern
- Access model: direct, free API key, approved app name, OAuth, scraping, or
  paid/blocked
- License/attribution requirements
- Refresh cadence and reasonable rate limit
- Proposed FinUties API path
- Target consumer: source registry, dashboard card, explorer section, notebook,
  or discovery-only table
- Suggested primary keys and incremental cursor
- Known schema pitfalls

## Priority 0 - immediate, high-value, free, directly accessible

These should be the first implementation candidates because they are useful to
FinUties users, have direct HTTP/CSV/JSON access, and do not require paid
credentials.

| Rank | Source | Upstream endpoint pattern | Why it is valuable | Proposed FinUties endpoints | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | SEC EDGAR XBRL company facts, concepts, frames, and ticker map | `https://data.sec.gov/api/xbrl/companyfacts/CIK{cik10}.json`, `https://data.sec.gov/api/xbrl/companyconcept/CIK{cik10}/us-gaap/{concept}.json`, `https://data.sec.gov/api/xbrl/frames/us-gaap/{concept}/{unit}/CY{year}{period}.json`, `https://www.sec.gov/files/company_tickers.json` | Authoritative free fundamentals and cross-company XBRL facts. Complements existing SEC filings/holdings/explorer coverage. | `/api/v1/sec/company-facts`, `/api/v1/sec/company-concepts`, `/api/v1/sec/xbrl-frames`, `/api/v1/sec/company-tickers` | Requires a descriptive User-Agent and strict 10 req/s politeness. Cache by CIK/concept/period. |
| 2 | FRED graph CSV time series | `https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}` | Fast no-key path for widely used US macro/rates/credit series. Avoids official API key requirement for common series pulls. | `/api/v1/data/macro/fred-series`, `/api/v1/macro/fred-series` | Official FRED API requires a key, but graph CSV is directly downloadable. Start with curated series IDs. |
| 3 | U.S. Treasury Fiscal Data API | `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/{dataset}?fields=...&filter=...&sort=...` | Free JSON/CSV for debt, daily treasury statement, monthly treasury statement, auctions, exchange rates, and receipts/outlays. | `/api/v1/rates/treasury-auctions`, `/api/v1/fiscal/daily-statement`, `/api/v1/fiscal/monthly-statement`, `/api/v1/fiscal/debt-to-penny` | Existing treasury debt/yield cards can be expanded with fiscal operations and auction detail. |
| 4 | FINRA daily short sale volume files | `https://cdn.finra.org/equity/regsho/daily/{facility}shvol{YYYYMMDD}.txt` | Equity-level short volume is highly useful for market structure and sentiment. Same-day publication, no auth. | `/api/v1/market/short-sale-volume`, `/api/v1/market/short-sale-volume/daily` | Facilities include `CNMS`, `FNSQ`, `FNYX`, `FNQC`, `FNRA`, `FORF`. Skip missing/non-trading days gracefully. |
| 5 | CFTC additional COT report families and historical compressed archives | CFTC historical compressed ZIPs by report type/year | Existing CFTC support has legacy/disaggregated coverage; add Traders in Financial Futures and Commodity Index Trader supplement. | `/api/v1/cftc/tff_futures-facts`, `/api/v1/cftc/tff_combined-facts`, `/api/v1/cftc/cit_facts` | Direct public ZIP downloads. Build a shared CFTC archive ingester so reports use one parser. |
| 6 | Nasdaq Trader symbol directory | `https://www.nasdaqtrader.com/dynamic/symdir/nasdaqlisted.txt`, `https://www.nasdaqtrader.com/dynamic/symdir/otherlisted.txt` | Nightly free security master for Nasdaq, NYSE, NYSE American, ETFs, test issues, and listing metadata. | `/api/v1/market/symbol-directory`, `/api/v1/market/listed-securities` | Pipe-delimited HTTPS files. Useful for search suggestions, ticker validation, and SEC CIK joins. |
| 7 | Open-Meteo forecast and archive APIs | `https://api.open-meteo.com/v1/forecast?...`, `https://archive-api.open-meteo.com/v1/archive?...` | Global current/forecast/historical weather, no key for non-commercial use, JSON, CORS. | `/api/v1/data/weather/open-meteo-forecast`, `/api/v1/data/weather/open-meteo-archive` | Strong fit for global map overlays, commodity/weather notebooks, and climate risk features. |
| 8 | NASA POWER meteorology, solar, and agriculture APIs | `https://power.larc.nasa.gov/api/temporal/daily/point?...` | Free no-auth solar radiation, temperature, wind, precipitation, agriculture and renewable-energy parameters. | `/api/v1/data/climate/nasa-power-daily`, `/api/v1/data/climate/nasa-power-climatology` | Good complement to Open-Meteo; batch coordinates carefully and keep concurrency low. |
| 9 | NASA EONET natural events | `https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=...`, GeoJSON at `/events/geojson` | Curated near-real-time natural events: wildfires, volcanoes, storms, floods, droughts, dust, etc. | `/api/v1/data/disasters/eonet`, `/api/v1/data/disasters/eonet-geojson` | Direct JSON, no key. Overlaps with GDACS but gives NASA event taxonomy and geometry. |
| 10 | GDELT DOC 2.0 article search and timelines | `https://api.gdeltproject.org/api/v2/doc/doc?query=...&mode=artlist&format=json` | Free global news search/timeline layer, useful for geopolitical risk, disasters, sanctions, and company news. | `/api/v1/news/gdelt-doc`, `/api/v1/news/gdelt-timeline` | Existing registry covers GDELT events; DOC adds article-level retrieval and timeline modes. Expect 429s on shared IPs and add backoff/cache. |
| 11 | DeFiLlama free endpoints | `https://api.llama.fi/protocols`, `https://yields.llama.fi/pools`, `https://stablecoins.llama.fi/stablecoins?includePrices=true` | Free DeFi TVL, chain, yield pool, and stablecoin supply data. Strong extension to CoinGecko crypto prices. | `/api/v1/crypto/defillama/protocols`, `/api/v1/crypto/defillama/yields`, `/api/v1/crypto/defillama/stablecoins` | Payloads can be large; normalize top-level snapshots and add per-protocol detail on demand. |
| 12 | Coin Metrics Community API | `https://community-api.coinmetrics.io/v4/timeseries/asset-metrics?assets={asset}&metrics={metric}&frequency=1d` | Free community subset for crypto reference rates and selected network/market metrics. | `/api/v1/crypto/coinmetrics/asset-metrics` | No key for community endpoint. Enforce 10 requests per 6 seconds and handle unavailable pro-only metrics. |

Validation note: representative small requests from this VM returned HTTP 200
for SEC ticker map, FRED CSV, Treasury Fiscal Data, FINRA short volume, Nasdaq
HTTPS symbol files, Open-Meteo, NASA POWER, NASA EONET, DeFiLlama, and Coin
Metrics Community. GDELT DOC returned HTTP 429 in one spot check, so keep it in
the immediate tier only with backoff/cache. Stooq and Binance were downgraded
because they returned a JavaScript verification page and HTTP 451 respectively.

## Priority 1 - high value, direct, but needs shared parsing or careful scope

These are worth implementing after the first direct-source batch, but they need
common parser infrastructure, curated dataset choices, or stronger throttling.

| Source | Upstream endpoint pattern | Value | Proposed FinUties endpoints | Implementation caution |
| --- | --- | --- | --- | --- |
| BIS Statistics API | `https://stats.bis.org/api/v1/data/{flow}/{key}/all?...` | International banking, credit, debt securities, derivatives, property prices, liquidity, and central bank statistics. | `/api/v1/data/economic/bis-series` | SDMX dimensions are complex. Build a reusable SDMX fetch/flatten layer first. |
| Eurostat dissemination API | `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/{datasetCode}?format=JSON&lang=EN` | EU macro, labor, demographics, prices, trade, energy, government finance. | `/api/v1/data/economic/eurostat`, `/api/v1/data/development/eurostat` | JSON-stat/SDMX shapes require metadata joins and dataset-specific curation. |
| OECD Data Explorer API | `https://sdmx.oecd.org/public/rest/data/{agency},{dataset},{version}/{filters}?format=csvfilewithlabels` | OECD indicators, national accounts, leading indicators, productivity, trade, education, pensions. | `/api/v1/data/economic/oecd`, `/api/v1/data/development/oecd` | Good source, but URL construction is dataset-specific. Start with 5-10 curated flows. |
| World Bank API expansions | `https://api.worldbank.org/v2/country/{country}/indicator/{indicator}?format=json` | Existing World Bank coverage can be broadened to climate, ESG, debt, trade, governance, and finance indicators. | Extend `/api/v1/data/development/*` and `/api/v1/data/climate/*` | Avoid duplicating current poverty/governance/education paths; define curated indicator bundles. |
| ECB SDW expansions | ECB SDW/CSV/API routes for money, rates, balance sheets, securities, and banks | Current ECB FX can expand into euro-area macro-financial data. | `/api/v1/data/economic/ecb-sdw`, `/api/v1/rates/ecb-series` | SDMX again; share parser with BIS/OECD/Eurostat where possible. |
| Nasdaq Trader Reg SHO threshold files | Nasdaq Trader symbol directory/Reg SHO daily files | Complements FINRA short volume with threshold security lists. | `/api/v1/market/regsho-threshold` | Verify exact current path and retention policy before implementation. |
| OCC/Cboe options public reports | Exchange/public report pages and downloadable files | Options volume/open interest, put/call ratios, and exchange share are high-value. | `/api/v1/options/volume`, `/api/v1/options/open-interest` | Some sources are page/report oriented; prefer official downloads over scraping rendered pages. |
| OpenSky Network current states | `https://opensky-network.org/api/states/all` | Live aircraft/mobility/geopolitical map layer. | `/api/v1/data/aviation/opensky-states` | Anonymous access exists but is tightly rate-limited and recent-only; OAuth needed for better access. |

## Priority 2 - useful, but not immediate

These are valuable but should wait because they require registration, approved
app names, API keys, fragile scraping, or unclear terms for production use.

| Source | Access status | Why not immediate | Possible future path |
| --- | --- | --- | --- |
| EIA Open Data API | Free API key required for API v2; bulk files may be no-key | Good energy data, but not "directly accessible" for API calls and key management is needed. | Support optional backend-managed EIA key or use no-key bulk files for selected datasets. |
| ReliefWeb API | Read-only API but pre-approved `appname` required from Nov 2025 | Humanitarian reports/disasters are useful, but appname approval blocks immediate direct use. | Apply for FinUties appname, then add `/api/v1/humanitarian/reliefweb-*`. |
| ACLED | Existing placeholder; API access typically requires account/terms | High geopolitical value, but not direct/free enough for this backlog's first wave. | Keep placeholder until credentials/licensing are approved. |
| ENTSO-E Transparency Platform | Free token required | Excellent European power data, but needs registration and token management. | Backend-managed token; add energy/power endpoints later. |
| IEA / Ember / grid datasets | Mixed downloads, licenses, and API availability | Energy transition data is valuable but each source needs a license check. | Treat as a separate energy-source review. |
| Yahoo Finance chart/download routes | Unofficial and can break/change | Easy market data, but fragile and terms are ambiguous. | Use only as a fallback if Stooq/Nasdaq/SEC do not cover the use case. |
| Stooq historical OHLCV CSV | No-key CSV route is documented, but this VM received a browser JavaScript verification page | Potentially valuable OHLCV fallback, but not reliably direct for backend ingestion from automated environments. | Re-test with provider-acceptable access before using; otherwise prefer Nasdaq directory plus another official price source. |
| Binance public market data | Public no-key endpoints, but this VM received HTTP 451 restricted-location responses | Liquid crypto OHLCV/funding is useful, but backend deployment region can block access. | Only implement if production egress location and terms allow it; otherwise prioritize CoinGecko, Coin Metrics, and DeFiLlama. |
| Alpha Vantage, Tiingo, Twelve Data, Polygon free tiers | Free API key or paid tiers | Useful but not direct and may introduce per-user key or quota complexity. | Avoid unless a specific endpoint is unavailable elsewhere. |
| Web scraping of provider pages | Varies | More brittle than direct APIs and usually harder to maintain. | Use only when official CSV/JSON/XML downloads do not exist. |

## Suggested implementation sequence

1. Add a backend ingestion/source registry pattern for no-auth HTTP/CSV sources:
   FRED CSV, Treasury Fiscal Data, FINRA short volume, and Nasdaq directory.
2. Add SEC EDGAR enrichment endpoints with strict User-Agent and cache discipline.
3. Add weather/hazard endpoints: Open-Meteo, NASA POWER, EONET.
4. Add crypto/DeFi endpoints: DeFiLlama and Coin Metrics Community.
5. Build a reusable SDMX/JSON-stat normalization layer, then onboard BIS,
   Eurostat, OECD, and ECB SDW expansions.
6. Revisit not-immediate sources only after credentials, appnames, or license
   decisions are resolved.

## Proposed endpoint naming conventions

- Use `/api/v1/data/{domain}/{source-or-topic}` for global registry-style data.
- Use `/api/v1/market/*`, `/api/v1/sec/*`, `/api/v1/rates/*`,
  `/api/v1/crypto/*`, and `/api/v1/news/*` for domain-specific explorer/card
  data.
- Keep provider names in source IDs when the data semantics are provider
  specific, for example `fred_series`, `finra_short_volume`,
  `open_meteo_archive`, `sec_company_facts`, `defillama_protocols`.
- For curated multi-provider views, expose a normalized endpoint separately,
  for example `/api/v1/market/ohlcv`, and retain provider-specific raw endpoints
  for auditability.

## Scraping guidance

Prefer direct JSON, CSV, XML, ZIP, FTP, or SDMX access. Treat scraping as the
last option and only implement it when all are true:

1. The provider permits automated access or published downloads.
2. There is no stable API/download endpoint.
3. The source has enough value to justify parser maintenance.
4. The scraper is isolated behind a provider adapter with retries, backoff,
   schema checks, and fixture-based tests.

Good scraping-adjacent candidates are official static files or archives, such as
CFTC ZIPs and Nasdaq Trader text files. Avoid scraping interactive dashboards
when a CSV/API route exists.

## Candidate quality checklist

- Direct no-auth access, or clearly documented access requirement.
- Stable official endpoint, not a reverse-engineered browser call.
- Machine-readable response: JSON, CSV, XML, ZIP, FTP text, SDMX, or JSON-stat.
- Clear refresh cadence and incremental cursor.
- License and attribution can be satisfied in product UI/docs.
- Fits an existing FinUties consumer: registry source, dashboard card, explorer,
  notebook, or search/discovery table.
- Can be tested with a small deterministic request.
