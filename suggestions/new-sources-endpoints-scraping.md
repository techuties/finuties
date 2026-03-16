# New Sources / Endpoints / Scraping Suggestions

Date: 2026-03-16

## What was checked first (existing coverage)

Current implemented endpoint families already cover:
- SEC filings/ownership/insider/money-flow
- CFTC positioning, IMF, ECB FX, trade flows, sanctions
- broad global domains (conflict, climate, biodiversity, health, demographics, development, food)
- rates endpoints (SOFR/EFFR/TGCR/BGCR, treasury yield/debt series)

Main high-value gaps still open:
- market microstructure (short volume, volatility indices)
- issuer fundamentals at scale (normalized SEC XBRL facts endpoint)
- treasury auction/cash-flow operational datasets
- robust symbol/security master feeds

---

## Priority 1 — High Value + Immediate (free + directly accessible)

### 1) SEC XBRL company fundamentals
- **Proposed endpoint(s)**:
  - `/api/v1/data/market/sec/company-facts`
  - `/api/v1/data/metadata/sec/tickers`
- **Direct source URL(s)**:
  - `https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json`
  - `https://www.sec.gov/files/company_tickers.json`
- **Access check**: HTTP 200, no API key, direct.
- **Why high value**: gives standardized fundamentals (revenue, EPS, assets, liabilities) for screening and time-series factor models.
- **Implementation notes**:
  - require stable `User-Agent` header
  - normalize CIK to zero-padded 10-digit
  - map units/forms/fiscal periods into a compact canonical schema

### 2) FINRA Reg SHO daily short volume
- **Proposed endpoint**: `/api/v1/data/market/short-volume/regsho`
- **Direct source URL(s)**:
  - `https://cdn.finra.org/equity/regsho/daily/CNMSshvolYYYYMMDD.txt`
  - `https://cdn.finra.org/equity/regsho/daily/FNQCshvolYYYYMMDD.txt`
- **Access check**: HTTP 200, no API key, direct.
- **Why high value**: high signal for crowding/risk-on-risk-off and single-name stress detection.
- **Implementation notes**:
  - detect latest available trading date automatically
  - parse pipe-delimited format and compute `short_ratio = short_volume / total_volume`
  - add exchange/source flag in output

### 3) CBOE VIX history
- **Proposed endpoint**: `/api/v1/data/market/volatility/vix`
- **Direct source URL**:
  - `https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv`
- **Access check**: HTTP 200, no API key, direct.
- **Why high value**: direct volatility regime signal for dashboard/risk model cards.
- **Implementation notes**:
  - incremental daily append
  - expose OHLC + close change + rolling z-score

### 4) US Treasury auctions (FiscalData)
- **Proposed endpoint**: `/api/v1/data/treasury/auctions`
- **Direct source URL**:
  - `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/auctions_query?page[size]=100`
- **Access check**: HTTP 200, no API key, direct.
- **Why high value**: auction tails, bid-to-cover, issued amounts are core rates/liquidity signals.
- **Implementation notes**:
  - keep server-side filters for `security_term`, `auction_date`, `security_type`
  - precompute tail/bid metrics where available

### 5) US Treasury Daily Treasury Statement cash operations (FiscalData)
- **Proposed endpoint**: `/api/v1/data/treasury/cash-operations`
- **Direct source URL**:
  - `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/dts/deposits_withdrawals_operating_cash?page[size]=100`
- **Access check**: HTTP 200, no API key, direct.
- **Why high value**: direct fiscal liquidity flow signal; useful with Fed rates and risk assets.
- **Implementation notes**:
  - aggregate deposits vs withdrawals by date/account type
  - provide net daily cash flow field

### 6) FRED no-key CSV fallback series (selected macro/rates)
- **Proposed endpoint**: `/api/v1/data/economy/fred-csv-series`
- **Direct source URL pattern**:
  - `https://fred.stlouisfed.org/graph/fredgraph.csv?id=<SERIES_ID>`
  - example: `https://fred.stlouisfed.org/graph/fredgraph.csv?id=CPIAUCSL`
- **Access check**: HTTP 200, no API key, direct.
- **Why high value**: resilient macro fallback without API key provisioning; quick addition of canonical series.
- **Implementation notes**:
  - whitelist approved series IDs to prevent abuse
  - normalize to `{date, value, series_id}`

---

## Priority 2 — Valuable next wave (still free/direct)

### 7) ECB SDMX fixed-income/short-rate extensions
- **Proposed endpoint**: `/api/v1/data/economy/ecb-rates-extended`
- **Direct source URL**:
  - `https://data-api.ecb.europa.eu/service/data/EST/B.EU000A2X2A25.WT?lastNObservations=100&format=jsondata`
- **Access check**: HTTP 200, no API key, direct.
- **Why**: better Euro-area policy/rate context beyond current FX-only flow.

### 8) NYSE listed securities master file
- **Proposed endpoint**: `/api/v1/data/market/symbols/nyse`
- **Direct source URL**:
  - `https://www.nyse.com/publicdocs/nyse/symbols/ELIGIBLESTOCKS_NYSEAmerican.xls`
- **Access check**: HTTP 200, no API key, direct.
- **Why**: reliable symbol metadata for joins/mapping and UI autocomplete.

### 9) Stooq EOD OHLC fallback feed (equities/ETFs)
- **Proposed endpoint**: `/api/v1/data/market/prices/stooq-eod`
- **Direct source URL pattern**:
  - `https://stooq.com/q/d/l/?s=<symbol>.us&i=d`
  - example: `https://stooq.com/q/d/l/?s=spy.us&i=d`
- **Access check**: HTTP 200, no API key, direct.
- **Why**: lightweight backup market price feed for non-premium environments.

---

## Priority 3 — Not immediate (scraping/heavier parsing)

### 10) Federal Reserve press + speeches event feed (RSS parsing)
- **Proposed endpoint**: `/api/v1/data/news/fed-events`
- **Direct source URL(s)**:
  - `https://www.federalreserve.gov/feeds/press_monetary.xml`
  - `https://www.federalreserve.gov/feeds/speeches.xml`
- **Access check**: HTTP 200, direct.
- **Why later**: requires robust dedupe/entity extraction/sentiment tagging to be truly valuable.

### 11) SEC press-release event intelligence (RSS + content extraction)
- **Proposed endpoint**: `/api/v1/data/news/sec-press-releases`
- **Direct source URL**:
  - `https://www.sec.gov/news/pressreleases.rss`
- **Access check**: HTTP 200, direct.
- **Why later**: parsing pipeline + event taxonomy required (enforcement/rulemaking/disclosure categories).

### 12) OPEC monthly report ingestion
- **Proposed endpoint**: `/api/v1/data/energy/opec-monthly`
- **Source URL**:
  - `https://www.opec.org/opec_web/en/publications/338.htm`
- **Access check**: currently HTTP 403 (anti-bot challenge observed).
- **Why not immediate**: blocked access + PDF/table extraction complexity; likely needs browser automation and fallback mirrors.

### 13) CME FedWatch probability ingestion
- **Proposed endpoint**: `/api/v1/data/rates/fedwatch-probabilities`
- **Source root**:
  - `https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html`
- **Access check**: repeated request timeouts observed from automation environment.
- **Why not immediate**: unstable bot-protected source path and potential legal/ToS review requirement.

---

## Suggested implementation order (short sprint plan)

1. SEC company facts + ticker map
2. FINRA Reg SHO short volume
3. CBOE VIX history
4. Treasury auctions + DTS cash operations
5. FRED CSV fallback endpoint

This order maximizes **free, direct-access, high-signal** additions with low dependency risk.
