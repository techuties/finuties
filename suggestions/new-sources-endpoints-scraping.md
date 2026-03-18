# New Sources / Endpoints / Scraping Suggestions

Date: 2026-03-18

## What was checked first
- Existing source registry and in-app endpoint usage were reviewed to avoid duplicates.
- Current coverage is already strong across conflicts, disasters, climate, health, food, development, biodiversity, sanctions (US/EU/UN), macro cards, and SEC-focused explore flows.

## Priority model
- **P0 (high value, immediate):** free and directly accessible (no signup/API key required).
- **P1 (high value, near-term):** free but needs a lightweight token, app registration, or extra policy monitoring.
- **P2 (not immediate):** scraping-heavy, more fragile schemas, or higher compliance/maintenance overhead.

## Implementation queue (high value first)

| Priority | Proposed internal endpoint | New source | Access model | Why this is high value | Example upstream endpoint |
|---|---|---|---|---|---|
| P0 | `/api/v1/data/air/quality` | Open-Meteo Air Quality API | Free, no key, direct JSON | Adds global AQI and pollutant layer currently missing from climate/disaster views. | `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=40.71&longitude=-74.01&hourly=pm2_5,pm10,us_aqi` |
| P0 | `/api/v1/data/hazards/events` | NASA EONET v3 | Free, no key, direct JSON | Multi-hazard event feed (wildfires, volcanoes, storms, severe weather) with geospatial metadata. | `https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=100` |
| P0 | `/api/v1/data/aviation/states` | OpenSky Network REST | Free anonymous access (rate-limited), direct JSON | Complements maritime coverage with real-time aviation mobility and anomaly signals. | `https://opensky-network.org/api/states/all` |
| P0 | `/api/v1/data/ocean/tides` | NOAA CO-OPS Data API | Free, no token, direct JSON/CSV | Adds coastal/tide/storm-surge context for climate-risk and port analytics. | `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=water_level&station=9414290&date=latest&datum=MLLW&units=metric&time_zone=gmt&format=json` |
| P0 | `/api/v1/data/development/owid` | Our World in Data Grapher CSV | Free, no key, direct CSV | Fast expansion of development indicators via stable chart slugs and metadata endpoints. | `https://ourworldindata.org/grapher/life-expectancy.csv` |
| P0 | `/api/v1/data/corporate/lei` | GLEIF LEI API | Free, direct API | Adds legal-entity identifiers and ownership links for corporate risk graphing beyond SEC-only context. | `https://api.gleif.org/api/v1/lei-records` |
| P1 | `/api/v1/data/climate/wildfire` | NASA FIRMS Area API | Free but requires map key | High-value wildfire hotspot detections; useful for supply-chain and catastrophe overlays. | `https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/VIIRS_SNPP_NRT/world/1` |
| P1 | `/api/v1/data/air/observations` | OpenAQ API v3 | Free but requires API key | Ground station air-quality observations to complement forecast/model-based AQ feeds. | `https://api.openaq.org/v3/locations` |
| P1 | `/api/v1/data/macro/fred` | FRED API | Free but requires API key | Adds deep US macro/economic series breadth for existing macro cards and explore features. | `https://api.stlouisfed.org/fred/series/observations?series_id=CPIAUCSL&api_key={API_KEY}&file_type=json` |
| P1 | `/api/v1/data/humanitarian/reports` | ReliefWeb API v2 | Free; requires registered `appname` | Improves crisis situational awareness with structured humanitarian reports and updates. | `https://api.reliefweb.int/v2/reports?appname={APPNAME}` |
| P1 | `/api/v1/data/governance/sanctions/uk` | UK Sanctions List (FCDO) | Free CSV download | Extends sanctions coverage beyond US/EU/UN for compliance workflows. | `https://sanctionslist.fcdo.gov.uk/docs/UK-Sanctions-List.csv` |
| P1 | `/api/v1/data/governance/sanctions/ca` | Canada Consolidated Autonomous Sanctions List | Free XML download | Adds Canada sanctions regime and vessel/entity enrichments. | `https://www.international.gc.ca/world-monde/assets/office_docs/international_relations-relations_internationales/sanctions/sema-lmes.xml` |
| P2 | `/api/v1/data/corporate/uk-filings` | UK Companies House (plus filings docs) | Free key + scraping/doc parsing | Strong non-US filings opportunity, but filing document extraction is parsing-heavy. | `https://developer.company-information.service.gov.uk/` |
| P2 | `/api/v1/data/regulatory/esma-filings` | ESMA/ESEF filing distribution points | Mixed formats, scraping-heavy | High strategic value for EU issuer coverage, but schemas and retrieval paths are less uniform. | `https://www.esma.europa.eu/` |

## Recommended execution order
1. Deliver the **P0 six-pack** first (air quality, EONET hazards, OpenSky, NOAA CO-OPS, OWID, GLEIF).
2. Add **P1 feeds** next with shared credential handling (`MAP_KEY`, `X-API-Key`, `api_key`, `appname`) and per-source rate limit guards.
3. Start **P2** only after parser hardening and source-specific monitoring are in place.

## Notes for implementation
- Keep endpoint contracts aligned with existing registry style (`id`, `label`, `endpoint`, `category`, `description`, `license`, `coverage`).
- Add source health checks and freshness metadata for each new integration.
- For sanctions feeds, pin schema tests to catch column/field drift quickly.
