# New Sources / Endpoints / Scraping Backlog

Updated: 2026-03-10

## Scope checked

- Reviewed current registry in `terminal/src/lib/source-registry.ts` (existing sources across politics, nature, maritime, economy, environment, health, demographics, food, development, climate, biodiversity, sanctions).
- The list below excludes already-listed sources and focuses on **new** opportunities.
- Priority is based on: **free access**, **direct API reachability**, **high analytical value**, and **implementation effort**.

---

## P0 — High value, implement now (free + directly accessible)

1. **OpenFEMA — Disaster Declarations**
   - Endpoint: `https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?$top=100`
   - Access: Free, no API key
   - Why high value: High-quality U.S. disaster declarations with dates, geographies, and incident types; useful for disaster risk + macro impact overlays.
   - Suggested internal endpoint: `/api/v1/data/disasters/fema`
   - Notes: OData pagination (`$top`, `$skip`), easy incremental sync by date.

2. **NASA EONET v3 — Natural Events**
   - Endpoint: `https://eonet.gsfc.nasa.gov/api/v3/events?limit=100`
   - Access: Free, no API key
   - Why high value: Near-real-time global natural events (wildfires, storms, volcanoes, etc.) with geospatial geometry.
   - Suggested internal endpoint: `/api/v1/data/disasters/eonet`
   - Notes: Supports category/status filters; GeoJSON-friendly.

3. **Open-Meteo — Forecast + Historical Weather**
   - Endpoint examples:
     - `https://api.open-meteo.com/v1/forecast?latitude=40.7&longitude=-74.0&current=temperature_2m`
     - `https://archive-api.open-meteo.com/v1/archive?latitude=40.7&longitude=-74.0&start_date=2026-01-01&end_date=2026-01-31&daily=temperature_2m_max`
   - Access: Free (no key for non-commercial usage), directly accessible
   - Why high value: Fast weather signal layer for commodities, logistics, and event-risk monitoring.
   - Suggested internal endpoint: `/api/v1/data/weather/open-meteo`
   - Notes: Add attribution handling; straightforward query model.

4. **US Treasury FiscalData — Government Finance/Macro**
   - Endpoint: `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/rates_of_exchange?page%5Bsize%5D=100`
   - Access: Free, no API key
   - Why high value: Official U.S. fiscal and financial datasets; clean pagination and metadata.
   - Suggested internal endpoint: `/api/v1/data/economic/us-treasury`
   - Notes: Good fit for debt/liquidity/fiscal monitoring cards.

5. **OECD SDMX API — Cross-country Economic/Structural Data**
   - Endpoint: `https://sdmx.oecd.org/public/rest/dataflow`
   - Access: Free, no API key
   - Why high value: Broad international economic coverage (productivity, trade, labor, inflation, etc.) with stable SDMX structure.
   - Suggested internal endpoint: `/api/v1/data/economic/oecd`
   - Notes: Requires SDMX parser but high reuse across many datasets.

6. **Eurostat Statistics API — EU Macro and Sector Data**
   - Endpoint example: `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nama_10_gdp?geo=DE&unit=CP_MEUR`
   - Access: Free, no API key
   - Why high value: Strong EU granularity and frequent updates for macro nowcasting.
   - Suggested internal endpoint: `/api/v1/data/economic/eurostat`
   - Notes: Ideal for EU-focused growth/inflation/labor views.

7. **USGS Volcano Hazards Program Feed**
   - Endpoint: `https://volcanoes.usgs.gov/vhp/feed/v1.0/summary/all_week.geojson`
   - Access: Free, directly accessible
   - Why high value: Complements earthquakes with volcanic alerts and activity windows.
   - Suggested internal endpoint: `/api/v1/data/disasters/volcanoes`
   - Notes: Use a clear User-Agent in ingestion client.

8. **SEC EDGAR Submissions (issuer-level filings stream)**
   - Endpoint pattern: `https://data.sec.gov/submissions/CIK0000320193.json`
   - Access: Free, no API key
   - Why high value: Direct filing timeline per issuer; useful for event-driven equity analysis.
   - Suggested internal endpoint: `/api/v1/data/filings/sec-submissions`
   - Notes: SEC requires responsible `User-Agent` and polite rate limiting.

---

## P1 — High value, near-term but not immediate (light constraints)

1. **ReliefWeb API (humanitarian incidents/reports)**
   - Endpoint: `https://api.reliefweb.int/v2/reports?limit=10`
   - Access: Free, but now requires approved `appname` (process/ops dependency)
   - Reason to delay: Access policy setup needed before production ingestion.
   - Suggested internal endpoint: `/api/v1/data/humanitarian/reliefweb`

2. **OpenSky Network (aviation traffic/events)**
   - Endpoint family: `https://opensky-network.org/api/`
   - Access: Free tier exists, but anonymous access is constrained
   - Reason to delay: Throughput/rate limits may not satisfy broad ingestion.
   - Suggested internal endpoint: `/api/v1/data/transport/aviation`

3. **OpenAlex (research output / innovation signal)**
   - Endpoint: `https://api.openalex.org/works?per-page=100`
   - Access: Free, no key required
   - Reason to delay: Valuable but secondary versus disaster/macro sources above.
   - Suggested internal endpoint: `/api/v1/data/development/openalex`

---

## P2 — Not immediate / scraping candidates (API gaps or legal/licensing checks)

1. **OPEC Monthly Oil Market Report (PDF tables)**
   - Type: Scraping + PDF extraction
   - Value: Oil supply/demand narrative + table values
   - Blocker: Parsing complexity and document-layout fragility.

2. **Shipping bottleneck bulletins from authority pages (Suez/Panama/ports)**
   - Type: Targeted HTML scraping
   - Value: Real-time logistics chokepoint signal for commodity/trade risk
   - Blocker: Heterogeneous page formats, no unified schema.

3. **Central-bank release calendars (non-API pages)**
   - Type: HTML scraping + normalization
   - Value: Event calendar for macro volatility modeling
   - Blocker: Maintenance burden; source-specific parser drift.

4. **Freight benchmark pages requiring license review (e.g., premium index pages)**
   - Type: Scraping only if terms permit
   - Value: Very high for global trade stress tracking
   - Blocker: Licensing/compliance risk; legal review required before implementation.

---

## Recommended implementation order

1. OpenFEMA
2. NASA EONET
3. Open-Meteo
4. US Treasury FiscalData
5. OECD SDMX
6. Eurostat
7. USGS Volcano feed
8. SEC submissions
9. ReliefWeb (after appname approval)

