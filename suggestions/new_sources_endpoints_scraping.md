# New source and endpoint suggestions (prioritized)

This file was prepared after checking currently registered data endpoints in:

- `terminal/src/lib/source-registry.ts` (51 registered source endpoints)
- existing `/api/v1/...` usages across the terminal codebase

The list below focuses on **new** sources not already implemented, with priority from **high-value immediate** to **not immediate**.

## 1) High-value and immediate (free + directly accessible)

| Priority | Proposed internal endpoint | External source / endpoint | Access | Why this is high value | Notes |
|---|---|---|---|---|---|
| P0 | `/api/v1/data/fiscal/debt-to-penny` | `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny` | Free, no key | Real-time sovereign risk and macro dashboard anchor metric | Add latest debt, debt delta (1d, 30d), debt/GDP proxy field |
| P0 | `/api/v1/data/fiscal/auctions` | `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/auctions_query` | Free, no key | Direct rates/liquidity signal for fixed income and risk regime cards | Filter by security type and auction date |
| P0 | `/api/v1/data/disasters/eonet` | `https://eonet.gsfc.nasa.gov/api/v3/events?status=open` | Free, no key | Open natural hazard events with geo primitives; strong map utility | Normalize categories, geometry, and source links |
| P0 | `/api/v1/data/weather/forecast-openmeteo` | `https://api.open-meteo.com/v1/forecast` | Free, no key (non-commercial usage) | Fast forecast layer for country/city drilldowns and weather risk context | Add caching and explicit rate guardrails |
| P0 | `/api/v1/data/space-weather/swpc` | `https://services.swpc.noaa.gov/json/` | Free, no key | Space weather is useful for aviation, power-grid, satellite risk context | NOAA format updates planned; keep parser versioned |
| P1 | `/api/v1/data/hydrology/usgs-streamflow` | `https://api.waterdata.usgs.gov/ogcapi/v0/` | Free, no key (rate limits) | Flood/drought situational awareness and basin-level stress signals | Implement backoff for 429 responses |
| P1 | `/api/v1/data/economy/eurostat` | `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/{dataset}` | Free, no key | High-quality official EU macro/labor/industry statistics | JSON-stat parser needed |
| P1 | `/api/v1/data/economy/oecd-sdmx` | OECD SDMX public API | Free, no key | Adds richer macro and policy series, complements IMF/World Bank | Build generic SDMX query adapter |
| P1 | `/api/v1/data/corporate/lei` | GLEIF LEI API | Free, no key | Entity identity normalization (cross-border legal entities) | Useful for sanctions + holdings link resolution |

## 2) High-value but near-term (free with operational constraints)

| Priority | Proposed internal endpoint | External source / endpoint | Access constraint | Why valuable | Implementation caveat |
|---|---|---|---|---|---|
| P1 | `/api/v1/data/humanitarian/reliefweb` | ReliefWeb API (`/reports`, `/disasters`, `/jobs`) | Public API but appname registration requirement | Critical humanitarian and crisis intelligence feed | Add registration + stable appname in config |
| P1 | `/api/v1/data/aviation/opensky-states` | OpenSky `/states/all` | Anonymous has reduced rate limits; authenticated tier preferred | Live aviation activity and disruption proxies | Start with low-frequency polling and optional auth mode |
| P2 | `/api/v1/data/air-quality/openaq` | OpenAQ v3 API | Free API key required | Air quality risk layer for health + city-level analytics | Add API-key handling in ingestion settings |
| P2 | `/api/v1/data/maritime/aisstream` | AISStream websocket feed | Free API key required | Better vessel movement coverage for maritime risk features | Requires websocket collector service |

## 3) Not immediate (scraping-heavy, unstable, or legal/ToS risk)

| Priority | Candidate | Method | Why not immediate |
|---|---|---|---|
| P3 | MarineTraffic-like vessel data without official API plan | Third-party scraping | Terms-of-service/legal risk and scraper fragility |
| P3 | Country-level government bulletin scraping (heterogeneous portals) | Multi-site scraping/parsing | High maintenance cost, unstable HTML/PDF structures |
| P3 | Paywalled market microstructure feeds | Scraping or paid APIs | Access restrictions, legal/licensing issues, low free-tier viability |
| P3 | High-frequency social media geopolitics scraping | Scraping/firehose ingestion | Noise, moderation burden, compliance complexity |

## 4) Recommended implementation order

1. Fiscal Data (debt + auctions)
2. NASA EONET open events
3. Open-Meteo forecast
4. NOAA SWPC space weather
5. USGS streamflow
6. Eurostat and OECD SDMX adapters
7. GLEIF LEI identity layer
8. ReliefWeb and OpenSky (constraint-aware rollout)

## 5) Minimal schema shape to standardize new endpoints

Use a shared envelope and consistent fields for easier plug-in to `source-registry.ts`:

- `timestamp` (ISO)
- `source` (provider id)
- `event_type` or `indicator_code`
- `country` / `country_code` (if available)
- `latitude`, `longitude` (if geospatial)
- `value`, `unit` (for numeric series)
- `url` (original source link for traceability)

This keeps integration straightforward for cards, explore pages, and map rendering.
