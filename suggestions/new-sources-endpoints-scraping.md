# New Sources, Endpoints, and Scraping Candidates

Date: 2026-03-14

This file was prepared after checking the currently registered endpoints in:
- `terminal/src/lib/source-registry.ts`
- `terminal/src/lib/global-data-api.ts`

The list below focuses on sources that are not currently implemented there, prioritized from highest value and fastest to ship to lower immediacy.

## Priority model

- **P0 (high value, immediate):** free and directly accessible (no key, no login, stable machine-readable output)
- **P1 (high value, near-term):** free but requires API key and/or has stricter rate limits
- **P2 (not immediate):** useful but scraping-heavy, legal/rate-limit sensitive, or operationally complex

---

## P0 - High value and immediate (free + direct access)

| Source | Direct access example | Proposed FinUties endpoint(s) | Why high value | Notes |
|---|---|---|---|---|
| US Treasury FiscalData | `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/rates_of_exchange?format=json&page[size]=1` | `/api/v1/data/fiscal/treasury-rates`, `/api/v1/data/fiscal/debt-to-penny`, `/api/v1/data/fiscal/auctions` | Core macro and funding stress signals; public and structured JSON | No API key required; pagination metadata is included |
| SEC EDGAR (submissions + companyfacts) | `https://data.sec.gov/submissions/CIK0000320193.json` | `/api/v1/data/markets/sec-submissions`, `/api/v1/data/markets/sec-companyfacts` | Fundamental and filing intelligence for public companies | Must send compliant `User-Agent`; very high alpha value |
| Eurostat Dissemination API | `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/demo_pjan?geo=DE&sex=T&age=TOTAL` | `/api/v1/data/economy/eurostat-indicators` | Broad EU macro, demographics, labor, and production series | No key; SDMX-like structures require schema normalization |
| Open-Meteo | `https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current=temperature_2m` | `/api/v1/data/weather/open-meteo-forecast`, `/api/v1/data/weather/open-meteo-history` | Fast weather risk overlays for commodities, energy, logistics | No key for baseline usage; easy geo query model |
| GLEIF LEI API | `https://api.gleif.org/api/v1/lei-records?page[size]=1` | `/api/v1/data/markets/lei-entities`, `/api/v1/data/markets/lei-relationships` | Legal-entity graph and ownership links for risk screens | No key; JSON API format with clear relationships |
| New York Fed Markets API | `https://markets.newyorkfed.org/api/rates/all/latest.json` | `/api/v1/data/rates/nyfed-money-market` | Daily funding rates and policy transmission indicators | No key; compact JSON payloads |
| Banco Central do Brasil SGS | `https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados?formato=json` | `/api/v1/data/rates/bcb-series` | Adds EM central-bank and inflation/rates coverage | No key; date format conversion needed |
| Stooq EOD CSV feed | `https://stooq.com/q/d/l/?s=spy.us&i=d` | `/api/v1/data/markets/stooq-eod` | Quick no-key OHLC history for prototyping and backtests | CSV ingestion and symbol mapping needed |

---

## P1 - High value but near-term (free with key and/or strict limits)

| Source | Access pattern | Proposed FinUties endpoint(s) | Why valuable | Constraint |
|---|---|---|---|---|
| FRED API | `https://api.stlouisfed.org/fred/...&api_key=...` | `/api/v1/data/macro/fred-series` | Gold standard US macro time series | Free key required |
| EIA Open Data v2 | `https://api.eia.gov/v2/...&api_key=...` | `/api/v1/data/energy/eia-prices`, `/api/v1/data/energy/eia-balances` | Energy balances and price benchmarks | Free key required |
| BEA API | `https://apps.bea.gov/api/data?...&UserID=...` | `/api/v1/data/macro/bea-national-accounts` | GDP components, income, trade by industry | Free registration key required |
| BLS Public API | `https://api.bls.gov/publicAPI/v2/timeseries/data/...` | `/api/v1/data/labor/bls-series` | Labor market timing and inflation context | Works without key but key preferred for larger workloads |
| OpenSky Network | `https://opensky-network.org/api/states/all` | `/api/v1/data/transport/opensky-states` | Air traffic and geopolitical disruption proxy | Unauthenticated access can be unstable/rate-limited |
| OpenAQ v3 | `https://api.openaq.org/v3/...` | `/api/v1/data/environment/openaq-air-quality` | Pollution risk and health-linked signal layer | API key required |
| Nasdaq Data Link | `https://data.nasdaq.com/api/v3/...` | `/api/v1/data/markets/nasdaq-data-link` | Wide set of economic and market datasets | Key required; mixed licensing by dataset |
| Alpha Vantage | `https://www.alphavantage.co/query?...&apikey=...` | `/api/v1/data/markets/alpha-vantage` | Quick technical/FX/equity indicators | Free tier rate limits are tight |

---

## P2 - Not immediate (scraping-heavy or operationally complex)

| Source | Suggested endpoint target | Why still interesting | Why not immediate |
|---|---|---|---|
| OPEC Monthly Oil Market Report PDFs | `/api/v1/data/energy/opec-momr` | High-value supply/demand commentary and revisions | PDF table extraction and revision tracking complexity |
| Baltic-style freight indexes from public web tables | `/api/v1/data/shipping/freight-indexes` | Strong shipping and commodity cycle signal | Source terms/licensing and brittle HTML parsing |
| Port authority congestion dashboards | `/api/v1/data/shipping/port-congestion` | Real-time bottleneck intelligence | Multi-source scraping and frequent layout changes |
| Central bank speech/minutes pages | `/api/v1/data/policy/central-bank-communications` | Policy tone and event risk signal | Heterogeneous websites and language normalization |
| Exchange corporate action calendars | `/api/v1/data/markets/corporate-actions` | Better event-aware analytics | Mixed formats (PDF/HTML/CSV), inconsistent identifiers |
| IMO/GISIS-like maritime registries | `/api/v1/data/maritime/registry-risk` | Vessel compliance and sanctions workflows | Partial access restrictions and legal review needs |

---

## Recommended implementation order

1. **Treasury FiscalData**
2. **SEC EDGAR submissions/companyfacts**
3. **Eurostat indicators**
4. **Open-Meteo**
5. **GLEIF LEI**
6. **NY Fed Markets**
7. **BCB SGS**
8. **Stooq EOD**
9. Then P1 key-based sources (FRED, EIA, BEA, BLS)

## Minimal implementation template (for each new source)

1. Add source definition in `terminal/src/lib/source-registry.ts`
2. Add typed fetch wrapper in `terminal/src/lib/global-data-api.ts`
3. Add backend connector and normalization to `/api/v1/data/...`
4. Add source availability metadata coverage
5. Add smoke test for:
   - envelope shape (`source`, `count`, `items`, `cached`)
   - pagination/rate-limit behavior
   - null and schema drift handling
