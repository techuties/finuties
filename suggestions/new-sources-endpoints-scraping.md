# New Sources / Endpoints / Scraping Suggestions

Checked against current in-repo endpoint registry (`terminal/src/lib/source-registry.ts`) and existing API usages under `terminal/src/lib/**`.

Priority order is from **highest value + immediately implementable** to **not immediate**.

---

## P0 — High value and immediate (free + directly accessible)

1. **Open-Meteo Forecast API**
   - **Access:** Free, no auth (non-commercial usage)
   - **Upstream:** `https://api.open-meteo.com/v1/forecast`
   - **Proposed endpoint:** `/api/v1/data/weather/forecast-global`
   - **Why now:** Adds global forward-looking weather risk (temperature, wind, precipitation) that complements existing alerts/disaster feeds.
   - **Notes:** Supports JSON/CSV, hourly/daily, timezone controls.

2. **Open-Meteo Air Quality API**
   - **Access:** Free, no auth
   - **Upstream docs:** `https://www.open-meteo.com/en/docs/air-quality-api`
   - **Proposed endpoint:** `/api/v1/data/environment/air-quality`
   - **Why now:** Extends climate/environment coverage with PM2.5/PM10/O3/NO2 etc. for health and city-level risk overlays.
   - **Notes:** Can reuse weather geospatial query patterns.

3. **Open-Meteo Marine Weather API**
   - **Access:** Free, no auth
   - **Upstream docs:** `https://www.open-meteo.com/en/docs/marine-weather-api`
   - **Proposed endpoint:** `/api/v1/data/maritime/marine-weather`
   - **Why now:** High value for maritime risk (wave height/period/current) and trade disruption context.
   - **Notes:** Natural fit with existing maritime events.

4. **NASA EONET Natural Events (v3)**
   - **Access:** Free, no auth
   - **Upstream docs:** `https://eonet.gsfc.nasa.gov/docs/v3`
   - **Proposed endpoint:** `/api/v1/data/disasters/eonet-events`
   - **Why now:** Near-real-time global hazards (wildfires, storms, volcanoes, landslides) in GeoJSON.
   - **Notes:** Includes open/closed status, category/source filters, date windows.

5. **ReliefWeb API (reports + disasters)**
   - **Access:** Free, public API (requires `appname` parameter)
   - **Upstream docs:** `https://apidoc.reliefweb.int/`
   - **Proposed endpoints:**
     - `/api/v1/data/humanitarian/reliefweb-reports`
     - `/api/v1/data/humanitarian/reliefweb-disasters`
   - **Why now:** Strong geopolitical + humanitarian signal, broad country coverage, high frequency updates.
   - **Notes:** Daily call quota exists; should add caching + pagination.

6. **UN SDG API**
   - **Access:** Free, no auth
   - **Upstream base:** `https://unstats.un.org/SDGAPI/v1/sdg/`
   - **Proposed endpoints:**
     - `/api/v1/data/development/sdg-series`
     - `/api/v1/data/development/sdg-observations`
   - **Why now:** Adds standardized global development indicators and complements WB/UNDP/UNESCO data.
   - **Notes:** Good source for long-run cross-country trend views.

7. **SEC data.sec.gov Company Facts**
   - **Access:** Free, no API key
   - **Upstream docs:** `https://www.sec.gov/search-filings/edgar-application-programming-interfaces`
   - **Proposed endpoint:** `/api/v1/sec/company-facts`
   - **Why now:** Direct fundamental financial statements API to extend current SEC filings/news/ownership surfaces.
   - **Notes:** Must comply with SEC automated access policy and include proper user-agent handling.

8. **Nager.Date Public Holidays**
   - **Access:** Free, no auth, no rate limits advertised
   - **Upstream docs:** `https://date.nager.at/Api`
   - **Proposed endpoint:** `/api/v1/calendar/public-holidays`
   - **Why now:** Immediate value for economic calendar context (market closures, country-level holiday effects).
   - **Notes:** Very low implementation complexity.

9. **Our World in Data Grapher dataset ingestion**
   - **Access:** Free, direct CSV/JSON files
   - **Upstream docs:** `https://docs.owid.io/projects/etl/api/chart-api`
   - **Proposed endpoint:** `/api/v1/data/development/owid-series`
   - **Why now:** Fast path to high-quality cross-domain indicators without complex API auth.
   - **Notes:** Requires controlled allow-list of supported chart slugs.

---

## P1 — High value, free but needs registration / key

1. **NASA FIRMS Active Fire**
   - **Access:** Free map key required
   - **Upstream:** `https://firms.modaps.eosdis.nasa.gov/api/`
   - **Proposed endpoint:** `/api/v1/data/disasters/firms-active-fires`
   - **Why:** Strong wildfire hotspot signal for climate and commodity risk.

2. **FRED (St. Louis Fed)**
   - **Access:** Free API key required
   - **Upstream:** `https://fred.stlouisfed.org/docs/api/fred/`
   - **Proposed endpoint:** `/api/v1/data/economic/fred-series`
   - **Why:** Deep macro series coverage for rates, labor, housing, credit.

3. **US EIA v2**
   - **Access:** Free API key required
   - **Upstream:** `https://www.eia.gov/opendata/`
   - **Proposed endpoint:** `/api/v1/data/economic/eia-energy`
   - **Why:** Direct energy market fundamentals (power, petroleum, gas, generation).

4. **NOAA Climate Data Online (CDO)**
   - **Access:** Free token required
   - **Upstream:** `https://www.ncei.noaa.gov/cdo-web/webservices/v2`
   - **Proposed endpoint:** `/api/v1/data/climate/noaa-cdo-observations`
   - **Why:** Station-level historical climate observations for anomaly backtesting.

---

## P2 — Not immediate (scraping/normalization/licensing complexity)

1. **Eurostat advanced datasets (beyond current core feeds)**
   - **Type:** API + heavy dimensional normalization
   - **Candidate endpoint:** `/api/v1/data/development/eurostat-series`
   - **Why later:** High value but SDMX dimensions and metadata harmonization are non-trivial.

2. **ECB SDMX expansion (rates/liquidity beyond FX)**
   - **Type:** API
   - **Candidate endpoint:** `/api/v1/data/economic/ecb-series`
   - **Why later:** Useful, but requires generalized SDMX key builder and robust codelist caching.

3. **Official sanctions updates from additional jurisdictions (UK/Canada/Australia)**
   - **Type:** Mixed API/CSV/scraping
   - **Candidate endpoint:** `/api/v1/data/governance/sanctions/multi-jurisdiction`
   - **Why later:** Entity resolution, deduping, and schema alignment across heterogeneous sources.

4. **Port congestion / vessel queue intelligence from public dashboards**
   - **Type:** Scraping
   - **Candidate endpoint:** `/api/v1/data/maritime/port-congestion`
   - **Why later:** Terms-of-use review, scraping fragility, and geospatial cleaning workload.

5. **Regulatory calendar scraping (central banks / ministries)**
   - **Type:** Scraping + parser maintenance
   - **Candidate endpoint:** `/api/v1/calendar/regulatory-events`
   - **Why later:** Frequent webpage structure changes; ongoing maintenance burden.

---

## Recommended implementation order (first 5)

1. `/api/v1/calendar/public-holidays` (Nager.Date)
2. `/api/v1/data/disasters/eonet-events` (NASA EONET)
3. `/api/v1/data/weather/forecast-global` (Open-Meteo)
4. `/api/v1/data/environment/air-quality` (Open-Meteo AQ)
5. `/api/v1/data/humanitarian/reliefweb-reports` (ReliefWeb)

These five maximize speed-to-value while keeping auth and legal friction low.
