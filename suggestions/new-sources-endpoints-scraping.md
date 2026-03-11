# New Sources / Endpoints / Scraping Suggestions

Date: 2026-03-11

## Scope checked

Existing coverage reviewed from:
- `terminal/src/lib/source-registry.ts`
- `terminal/src/lib/global-data-api.ts`
- `terminal/src/lib/cards/*`

Current implementation already covers many domains (conflict, disasters, climate, sanctions, demographics, development, food, macro, SEC, rates, CFTC, etc.), so the list below focuses on **new gaps** and prioritizes **free + directly accessible** options first.

---

## P0 — High value and immediate (free + directly accessible, no key)

| Rank | Source | External endpoint example | Proposed internal endpoint(s) | Why high value |
|---|---|---|---|---|
| 1 | Open-Meteo (forecast + historical weather) | `https://api.open-meteo.com/v1/forecast` and `https://archive-api.open-meteo.com/v1/archive` | `/api/v1/data/weather/open-meteo-forecast`<br>`/api/v1/data/weather/open-meteo-history` | Global weather risk nowcasts + historical backfill without auth friction. |
| 2 | USGS Water Services (river flow, gauges) | `https://waterservices.usgs.gov/nwis/iv/?format=json&parameterCd=00060&sites=...` | `/api/v1/data/hydrology/usgs-streamflow`<br>`/api/v1/data/hydrology/usgs-sites` | Strong flood/drought signal; highly actionable for commodities, infrastructure, and disaster monitoring. |
| 3 | OpenSky Network (live air traffic states) | `https://opensky-network.org/api/states/all` | `/api/v1/data/aviation/opensky-states` | Adds aviation mobility and disruption signal not currently in the registry. |
| 4 | OECD SDMX API | `https://sdmx.oecd.org/public/rest/v2/...` | `/api/v1/data/economic/oecd` | Large macro and structural dataset coverage via one standardized interface. |
| 5 | Our World in Data Grapher API | `https://ourworldindata.org/grapher/life-expectancy.csv` | `/api/v1/data/public/owid` | Very broad free dataset expansion with stable CSV/JSON style access patterns. |
| 6 | OpenStreetMap Overpass (geospatial infrastructure) | `https://overpass-api.de/api/interpreter?data=...` | `/api/v1/data/geospatial/osm-overpass` | Enables dynamic extraction of ports, pipelines, roads, hospitals, power assets, etc. |

Implementation notes for P0:
- Add strong server-side caching (especially OpenSky and Overpass).
- Normalize country and geo fields to current `source-registry` conventions.
- Add request guards/rate-limiting for endpoints with strict public limits.

---

## P1 — High value, free but registration/token required

| Rank | Source | External endpoint example | Proposed internal endpoint(s) | Access note |
|---|---|---|---|---|
| 1 | U.S. EIA API v2 | `https://api.eia.gov/v2/...` | `/api/v1/data/economic/eia-energy` | Free key required; very high value for energy balances, prices, generation, inventories. |
| 2 | NOAA NCEI CDO v2 | `https://www.ncei.noaa.gov/cdo-web/api/v2/data` | `/api/v1/data/climate/noaa-cdo` | Free token required; excellent station-level climate coverage. |
| 3 | FRED (St. Louis Fed) | `https://api.stlouisfed.org/fred/series/observations` | `/api/v1/data/economic/fred-series` | Free key required; premium macro/market time-series depth. |
| 4 | U.S. Census API | `https://api.census.gov/data/2023/pep/charv` | `/api/v1/data/demographics/us-census` | Free key required; very strong demographic and housing coverage. |
| 5 | OpenAQ v3 | `https://api.openaq.org/v3/sensors/{id}/measurements` | `/api/v1/data/environment/openaq` | Free key required; global air quality complement to existing climate stack. |

Implementation notes for P1:
- Add secure key management and per-source quotas.
- Extend source metadata with `authType` and `rateLimit` hints for operations visibility.

---

## P2 — Not immediate (scraping / approval / reliability constraints)

| Priority | Source | Candidate ingestion mode | Constraint |
|---|---|---|---|
| 1 | ReliefWeb reports/disasters | API ingestion (`/v2/reports`, `/v2/disasters`) | `appname` governance and approval overhead; policy checks required. |
| 2 | NASA FIRMS advanced regional feeds | API + CSV ingestion | Endpoint matrix and access model vary by product/date windows; requires careful contract tests. |
| 3 | OPEC Monthly Oil Market Report (MOMR) | PDF scrape + table extraction | Scraping stability risk and parser maintenance overhead. |
| 4 | IMF/World Bank publication PDFs (special datasets not in direct APIs) | Scheduled scraping | Structure drift in documents; quality control cost. |

---

## Recommended execution order

1. Implement P0 #1-#3 first (Open-Meteo, USGS Water, OpenSky).
2. Add OECD and OWID as generic adapters (`dataset`, `series`, `country`, `date` filter contracts).
3. Introduce tokenized connectors (P1) once secret handling and quota telemetry are finalized.
4. Treat P2 as dedicated ingestion projects with parser monitoring and data quality alerts.

---

## Immediate next endpoints to open in backlog (copy-ready)

- `/api/v1/data/weather/open-meteo-forecast`
- `/api/v1/data/weather/open-meteo-history`
- `/api/v1/data/hydrology/usgs-streamflow`
- `/api/v1/data/aviation/opensky-states`
- `/api/v1/data/economic/oecd`
- `/api/v1/data/public/owid`

