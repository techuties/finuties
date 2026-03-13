# New Sources / Endpoints / Scraping Suggestions

This list is prioritized from **high-value + immediate** to **not immediate**.
Priority favors sources that are **free** and **directly accessible**.

## Context check (already covered, so excluded from this proposal)

Current code already includes broad coverage for SEC, macro (NY Fed/Treasury/BLS/BEA), CFTC COT, ECB FX, CoinGecko, IMF, UN/WHO/FAO/WFP, climate/environment, sanctions, and conflict/disaster sources via `data.finuties.com` endpoints.

## Tier A — High value / Immediate (free + direct, minimal friction)

1. **Deribit Public API (crypto options + vol surface)**
   - **Access**: Free, direct, no API key for public market data
   - **Endpoints**:
     - `GET https://www.deribit.com/api/v2/public/get_instruments?currency=BTC&kind=option&expired=false`
     - `GET https://www.deribit.com/api/v2/public/get_book_summary_by_instrument?instrument_name={instrument}`
     - `GET https://www.deribit.com/api/v2/public/get_volatility_index_data?currency=BTC&start_timestamp={ms}&end_timestamp={ms}&resolution=60`
   - **Why now**: Fills current derivatives/options microstructure gap with implied vol and term-structure signals.

2. **Binance Public Spot + Futures Market Data**
   - **Access**: Free, direct, no API key for public endpoints (subject to rate limits)
   - **Endpoints**:
     - `GET https://api.binance.com/api/v3/depth?symbol=BTCUSDT&limit=1000`
     - `GET https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=1000`
     - `GET https://fapi.binance.com/fapi/v1/fundingRate?symbol=BTCUSDT&limit=1000`
   - **Why now**: Adds high-frequency liquidity/funding metrics for risk and regime models.

3. **CBOE Historical Index CSV Feeds (VIX family)**
   - **Access**: Free, direct file download
   - **Endpoints**:
     - `GET https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv`
     - `GET https://cdn.cboe.com/api/global/us_indices/daily_prices/VVIX_History.csv`
   - **Why now**: Delivers immediate options-volatility context with near-zero ingestion complexity.

4. **Coin Metrics Community API (on-chain + market structure)**
   - **Access**: Community tier is free with usage limits; direct HTTP API
   - **Endpoints**:
     - `GET https://community-api.coinmetrics.io/v4/timeseries/asset-metrics?assets=btc&metrics=AdrActCnt,TxCnt&frequency=1d`
     - `GET https://community-api.coinmetrics.io/v4/catalog/all`
   - **Why now**: Strengthens crypto fundamental coverage beyond spot prices.

5. **Open-Meteo Historical + Forecast API (energy/weather demand proxy)**
   - **Access**: Free, direct, no key
   - **Endpoints**:
     - `GET https://archive-api.open-meteo.com/v1/archive?latitude=40.71&longitude=-74.01&start_date=2025-01-01&end_date=2025-12-31&hourly=temperature_2m`
     - `GET https://api.open-meteo.com/v1/forecast?latitude=40.71&longitude=-74.01&hourly=temperature_2m,wind_speed_10m`
   - **Why now**: Supports weather-sensitive commodity/power demand factors with clean direct access.

## Tier B — High value / Near-term (free, but key/SDMX/auth or modeling work needed)

6. **FRED + ALFRED (vintage-aware macro nowcasting)**
   - **Access**: Free; API key required
   - **Endpoints**:
     - `GET https://api.stlouisfed.org/fred/series/observations?series_id=CPIAUCSL&api_key={key}&file_type=json`
     - `GET https://api.stlouisfed.org/fred/series/vintagedates?series_id=PAYEMS&api_key={key}&file_type=json`
   - **Value**: Adds revision-aware macro backtests and event studies.

7. **OECD SDMX-JSON API (global macro depth)**
   - **Access**: Free, direct
   - **Endpoint pattern**:
     - `GET https://sdmx.oecd.org/public/rest/data/{flowRef}/{key}?startPeriod=2015&format=sdmx-json`
   - **Value**: Expands cross-country coverage for inflation, labor, production, and trade.

8. **Eurostat API (EU high-detail statistics)**
   - **Access**: Free, direct
   - **Endpoint pattern**:
     - `GET https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/{datasetCode}?geo=DE&time=2024`
   - **Value**: Improves Europe-specific screening and thematic dashboards.

9. **OpenFIGI Mapping API (identifier normalization)**
   - **Access**: Free tier; API key recommended
   - **Endpoints**:
     - `POST https://api.openfigi.com/v3/mapping`
   - **Value**: Standardizes ticker/ISIN/CUSIP mapping across ingest pipelines.

## Tier C — Valuable but not immediate (scraping/legal or higher maintenance)

10. **CME Daily Bulletins / Settlement Reports (scraping + parsing)**
    - **Access**: Public pages/files; scraping/PDF parsing required
    - **Candidate targets**:
      - Product settlement bulletins and daily reports from CME public report pages
    - **Why not immediate**: Document formats and URLs can drift; parser maintenance overhead.

11. **Exchange holiday/trading-hour calendars across venues**
    - **Access**: Often public web pages; mostly scraping
    - **Candidate targets**:
      - Major exchange calendar pages (US/EU/APAC)
    - **Why not immediate**: Frequent human-readable updates and inconsistent schema.

12. **Physical freight benchmark pages (container/bulk snapshots)**
    - **Access**: Mixed public pages; generally scrape-first unless paid feed is procured
    - **Candidate targets**:
      - Publicly posted index snapshots from benchmark providers
    - **Why not immediate**: Legal/licensing checks and anti-bot constraints.

## Recommended implementation order

1. Deribit (options + volatility)
2. Binance public market/funding
3. CBOE VIX CSV
4. Coin Metrics community
5. Open-Meteo proxies
6. FRED/ALFRED
7. OECD + Eurostat
8. OpenFIGI
9. Scraping-heavy sources (CME calendars/freight) after legal + maintenance review

## Minimum delivery definition for each new source

- Add one source registry entry + clear `coverage` metadata.
- Add one baseline notebook example endpoint call.
- Add rate-limit and attribution notes in code comments/config.
- Add health check/availability probe for each endpoint family.
