# New Sources / Endpoints / Scraping Suggestions (Free-first)

## Scope checked first

Current implementation already covers:

- `51` source-registry endpoints in `terminal/src/lib/source-registry.ts`
- Additional non-registry families used in cards/views: `sec/*`, `rates/*`, `macro/*`, `calendar/*`, `market/*`, `holdings/*`, `search/*`

This list focuses on **new sources not already covered**, prioritized from **high-value immediate** to **not immediate**.

---

## P0 — High Value, Immediate (free + directly accessible)

| Priority | Source | External endpoint example | Access | Proposed internal endpoint | Why high value now |
|---|---|---|---|---|---|
| P0 | NASA EONET (natural hazards) | `https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=30` | Free, no auth | `/api/v1/data/disasters/eonet-events` | Real-time wildfire/storm/volcano event feed, globally relevant, clean JSON. |
| P0 | ReliefWeb (humanitarian/disaster intelligence) | `https://api.reliefweb.int/v1/disasters?appname=finuties&limit=50` | Free, no auth | `/api/v1/data/disasters/reliefweb` | Adds impact context (appeals, affected regions, response status) around existing hazard feeds. |
| P0 | US Treasury FiscalData (public finance) | `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/dts/dts_table_1` | Free, no auth | `/api/v1/data/economic/fiscaldata-dts` | Daily fiscal and cash-position signals complement existing rates/debt cards. |
| P0 | Open-Meteo (forecast + historical weather) | `https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&hourly=temperature_2m,precipitation&forecast_days=7` | Free, no auth | `/api/v1/data/weather/open-meteo` | Fast weather anomaly/forecast coverage by coordinates; useful for risk overlays and commodity context. |
| P0 | SEC EDGAR Company Facts (fundamentals) | `https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json` | Free, no key (User-Agent required) | `/api/v1/data/equity/sec-company-facts` | Fundamental statements at scale from official SEC data; extends existing filings/insider endpoints. |
| P0 | OpenSky Network (aviation activity/disruptions) | `https://opensky-network.org/api/states/all` | Free, no auth (rate limited) | `/api/v1/data/transport/aviation-states` | New transport layer for geopolitical/disaster monitoring and route disruption detection. |
| P0 | GLEIF LEI API (entity resolution) | `https://api.gleif.org/api/v1/lei-records?page[size]=50` | Free, no auth | `/api/v1/data/governance/lei-records` | Strong legal-entity graph for sanctions/compliance linkage and issuer normalization. |

---

## P1 — High Value, Near-Term (free but key/token, lower limits, or heavier normalization)

| Priority | Source | External endpoint example | Access constraint | Proposed internal endpoint | Notes |
|---|---|---|---|---|---|
| P1 | FRED macro series | `https://api.stlouisfed.org/fred/series/observations?series_id=CPIAUCSL&api_key=...&file_type=json` | Free API key | `/api/v1/data/economic/fred-series` | Excellent macro depth and metadata; key management + caching needed. |
| P1 | EIA v2 (energy balances/prices) | `https://api.eia.gov/v2/petroleum/pri/spt/data/?api_key=...&frequency=daily` | Free API key | `/api/v1/data/economic/eia-energy` | Adds high-value oil/gas/electricity data. |
| P1 | NOAA CDO climate archive | `https://www.ncei.noaa.gov/cdo-web/api/v2/data?datasetid=GHCND&limit=1000` | Free token | `/api/v1/data/climate/noaa-cdo` | Deep station-level climate archive, requires token rotation + pagination controls. |
| P1 | US Census API (trade + demographics) | `https://api.census.gov/data/timeseries/intltrade/exports/hs` | Free key recommended | `/api/v1/data/economic/us-census-trade` | Useful detailed trade series and population microdata families. |

---

## P2 — Not Immediate (scraping / unstable schema / document parsing)

| Priority | Source | Method | Candidate target endpoint | Why not immediate |
|---|---|---|---|---|
| P2 | OPEC Monthly Oil Market Report | PDF table extraction + parsing | `/api/v1/data/economic/opec-momr` | PDF layout drift and revision tracking make maintenance expensive. |
| P2 | IMF Article IV / country reports pages | HTML + document scraping | `/api/v1/data/economic/imf-country-reports` | Narrative-heavy docs; low structure, multilingual, unstable selectors. |
| P2 | National sanctions press releases (multi-jurisdiction) | Multi-site scraping | `/api/v1/data/governance/sanctions-updates` | Fragmented publisher formats; compliance-critical, needs strict QA pipeline. |
| P2 | Port authority congestion pages | HTML scraping | `/api/v1/data/maritime/port-congestion-scrape` | Inconsistent tables and frequent site redesigns. |

---

## Recommended implementation order

1. `eonet-events`
2. `reliefweb`
3. `fiscaldata-dts`
4. `open-meteo`
5. `sec-company-facts`
6. `aviation-states`
7. `lei-records`

---

## Minimal implementation template for each new source

1. Add source metadata entry in `terminal/src/lib/source-registry.ts`
2. Add typed fetch wrapper in `terminal/src/lib/global-data-api.ts`
3. Add card/explore view consumption (if needed)
4. Add availability metadata handling + caching behavior
5. Add basic contract test for envelope (`{ source, count, items, cached }`)
