# New Source / Endpoint / Scraping Suggestions

## 1) What was checked

Current implemented source endpoints were checked from:
- `terminal/src/lib/source-registry.ts` (`51` source endpoints under `/api/v1/...`)
- `terminal/src/lib/global-data-api.ts` (typed wrappers for the core data subset)
- Existing endpoint families already cover conflicts, disasters, weather alerts, FX, crypto, trade, CFTC, ESG, health, demographics, food, development, climate, biodiversity, sanctions, and SEC/holdings/search surfaces.

Main high-value gaps:
- Money-market and policy-rate endpoints exposed as first-class datasets
- Treasury/fiscal time series
- Equity positioning datasets (short-volume)
- Additional macro series feeds with no-auth access

---

## 2) Priority list (high value -> not immediate)

Legend:
- **Access**: `Direct` = no auth key needed, `Key` = free key required, `Scrape` = no stable public API
- **Value**: impact for terminal users (macro/market usefulness)

### P0 - Implement now (free + directly accessible)

1. **US Treasury FiscalData (Debt, receipts/outlays, auctions)**
   - **Proposed endpoints**
     - `/api/v1/data/treasury/debt-to-penny`
     - `/api/v1/data/treasury/auctions`
     - `/api/v1/data/treasury/receipts-outlays`
   - **Upstream**: `api.fiscaldata.treasury.gov`
   - **Access**: `Direct` (checked: HTTP 200)
   - **Value**: very high for sovereign risk, liquidity, and macro dashboards

2. **NY Fed reference rates (SOFR, EFFR, OBFR, TGCR, BGCR)**
   - **Proposed endpoint**
     - `/api/v1/data/rates/nyfed-reference`
   - **Upstream**: `markets.newyorkfed.org/api/rates/all/latest.json`
   - **Access**: `Direct` (checked: HTTP 200)
   - **Value**: very high; core short-rate plumbing for market context

3. **FINRA Reg SHO daily short volume**
   - **Proposed endpoint**
     - `/api/v1/data/market/short-volume`
   - **Upstream**: `cdn.finra.org/equity/regsho/daily/*.txt`
   - **Access**: `Direct` (checked sample file: HTTP 200)
   - **Value**: very high for equity sentiment/positioning signals

4. **ECB SDMX (FX, policy and macro series)**
   - **Proposed endpoint**
     - `/api/v1/data/economic/ecb-series`
   - **Upstream**: `data-api.ecb.europa.eu/service/data/...`
   - **Access**: `Direct` (checked: HTTP 200)
   - **Value**: high; broad euro-area macro and rates coverage

5. **World Bank Indicators v2 (generic indicator endpoint)**
   - **Proposed endpoint**
     - `/api/v1/data/economic/world-bank`
   - **Upstream**: `api.worldbank.org/v2/...`
   - **Access**: `Direct` (checked: HTTP 200)
   - **Value**: high; fills long-history macro/development comparables

6. **BLS public timeseries endpoint (generic)**
   - **Proposed endpoint**
     - `/api/v1/data/economic/bls-public-series`
   - **Upstream**: `api.bls.gov/publicAPI/v2/timeseries/data/...`
   - **Access**: `Direct` for base usage (checked: HTTP 200)
   - **Value**: high for inflation/labor nowcasts and cards

7. **Eurostat dissemination API**
   - **Proposed endpoint**
     - `/api/v1/data/economic/eurostat-series`
   - **Upstream**: `ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/...`
   - **Access**: `Direct` (checked: HTTP 200)
   - **Value**: high for EU macro depth and harmonized statistics

### P1 - High value, but not first wave

8. **OpenAlex research/patent-proxy signal feed**
   - **Proposed endpoint**
     - `/api/v1/data/innovation/openalex-works`
   - **Access**: `Direct` (checked: HTTP 200)
   - **Why not P0**: valuable for thematic/innovation alpha, but secondary to rates/fiscal/positioning

9. **Open-Meteo historical/forecast risk bridge**
   - **Proposed endpoint**
     - `/api/v1/data/weather/open-meteo`
   - **Access**: `Direct` (checked: HTTP 200)
   - **Why not P0**: overlaps partially with existing weather/climate coverage; still useful for real-time overlays

10. **SEC submissions/companyfacts normalization upgrade**
   - **Proposed endpoint**
     - `/api/v1/data/sec/companyfacts`
   - **Access**: `Direct` with strict User-Agent policy (no-UA requests can fail with 403)
   - **Why not P0**: compliance/rate-limit guardrails needed before rollout

11. **FRED macro series bridge**
   - **Proposed endpoint**
     - `/api/v1/data/economic/fred-series`
   - **Access**: `Key` (free key required; no-key call returns 400)
   - **Why not P0**: key management required despite high data value

### P2 - Not immediate (scraping / anti-bot / unstable)

12. **FOMC calendar + statement parser**
   - **Proposed endpoint**
     - `/api/v1/data/policy/fomc-calendar`
   - **Access**: `Scrape`
   - **Risk**: HTML structure changes; needs robust parser and tests

13. **CBOE options daily statistics ingestion**
   - **Proposed endpoint**
     - `/api/v1/data/options/cboe-daily`
   - **Access**: `Scrape/guarded` (sample request returned 403 from server-side curl)
   - **Risk**: anti-bot controls and delivery instability

14. **OPEC monthly oil report extraction (PDF/table)**
   - **Proposed endpoint**
     - `/api/v1/data/energy/opec-monthly`
   - **Access**: `Scrape`
   - **Risk**: PDF parsing maintenance and schema drift

---

## 3) Recommended implementation order

1. `treasury/debt-to-penny` + `rates/nyfed-reference`
2. `market/short-volume`
3. `economic/ecb-series` + `economic/world-bank`
4. `economic/bls-public-series` + `economic/eurostat-series`
5. P1 and P2 items

This order keeps the first batch focused on **free + direct + market-critical** datasets.
