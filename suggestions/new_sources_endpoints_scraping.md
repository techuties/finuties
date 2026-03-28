# New Sources / Endpoints / Scraping Suggestions

This list is prioritized from **highest value + fastest to ship** to **not immediate**.

Scope checked before proposing:
- Existing `/api/v1/data/*` and related endpoints already cover conflicts, disasters, sanctions, climate basics, macro, food, demographics, and SEC/market data.
- Suggestions below avoid overlap with currently implemented sources and favor **free + directly accessible** APIs first.

---

## Tier A — High Value + Immediate (free, direct, no auth or minimal friction)

### 1) NASA EONET (global natural events)
- **Why now:** Real-time geospatial hazards (wildfire, storms, volcanoes, etc.) with direct event geometry; strong map value.
- **Source:** `https://eonet.gsfc.nasa.gov/api/v3/events`
- **Proposed internal endpoint(s):**
  - `/api/v1/data/disasters/eonet/events`
  - `/api/v1/data/disasters/eonet/categories`
- **Access:** Free, direct JSON.
- **Effort:** Low.

### 2) Open-Meteo (global weather forecast + historical)
- **Why now:** Adds global weather depth beyond current NOAA alert-only coverage.
- **Source example:** `https://api.open-meteo.com/v1/forecast?...`
- **Proposed internal endpoint(s):**
  - `/api/v1/data/weather/open-meteo/forecast`
  - `/api/v1/data/weather/open-meteo/history`
- **Access:** Free, direct JSON.
- **Effort:** Low.

### 3) CISA Known Exploited Vulnerabilities (KEV)
- **Why now:** Very high practical value for security/risk workflows; daily updates.
- **Source:** `https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json`
- **Proposed internal endpoint(s):**
  - `/api/v1/data/cyber/kev`
  - `/api/v1/data/cyber/kev/recent`
- **Access:** Free, direct JSON.
- **Effort:** Low.

### 4) NOAA SWPC Space Weather Alerts
- **Why now:** Adds a unique risk signal (geomagnetic storms, solar events) not currently covered.
- **Source:** `https://services.swpc.noaa.gov/products/alerts.json`
- **Proposed internal endpoint(s):**
  - `/api/v1/data/climate/space-weather-alerts`
- **Access:** Free, direct JSON.
- **Effort:** Low.

### 5) Eurostat Dissemination API
- **Why now:** High-quality official EU macro indicators, broad country/economy coverage, near-production-ready.
- **Source example:** `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nama_10_gdp?...`
- **Proposed internal endpoint(s):**
  - `/api/v1/data/economic/eurostat`
  - `/api/v1/data/economic/eurostat/{dataset}`
- **Access:** Free, direct JSON.
- **Effort:** Medium (dimension mapping + dataset normalization).

### 6) NOAA Tides & Currents (CO-OPS)
- **Why now:** Excellent maritime/ports signal for coastal risk and logistics.
- **Source example:** `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?...`
- **Proposed internal endpoint(s):**
  - `/api/v1/data/maritime/tides/water-level`
  - `/api/v1/data/maritime/tides/predictions`
- **Access:** Free, direct JSON.
- **Effort:** Medium (station metadata + resampling).

---

## Tier B — High Value, Implement Next (some constraints)

### 7) OpenSky Network (live aircraft state vectors)
- **Why next:** Strong geo-intelligence/logistics value.
- **Source:** `https://opensky-network.org/api/states/all`
- **Proposed internal endpoint(s):**
  - `/api/v1/data/aviation/opensky/states`
- **Constraint:** Anonymous access is rate-limited and less reliable at scale.
- **Effort:** Medium.

### 8) NVD CVE API 2.0
- **Why next:** Security telemetry complement to CISA KEV.
- **Source:** `https://services.nvd.nist.gov/rest/json/cves/2.0`
- **Proposed internal endpoint(s):**
  - `/api/v1/data/cyber/nvd/cves`
- **Constraint:** Better throughput with API key; still accessible without key.
- **Effort:** Medium.

### 9) GLEIF LEI Records
- **Why next:** Legal-entity identity graph for sanctions/compliance/counterparty checks.
- **Source:** `https://api.gleif.org/api/v1/lei-records`
- **Proposed internal endpoint(s):**
  - `/api/v1/data/governance/lei/records`
  - `/api/v1/data/governance/lei/{lei}`
- **Constraint:** Large payloads/pagination strategy required.
- **Effort:** Medium.

### 10) OpenAlex (research + innovation signal)
- **Why next:** Adds innovation/science trend data for thematic intelligence.
- **Source:** `https://api.openalex.org/works`
- **Proposed internal endpoint(s):**
  - `/api/v1/data/innovation/openalex/works`
- **Constraint:** Large schema; must curate fields.
- **Effort:** Medium.

---

## Tier C — Not Immediate (scraping-heavy or access uncertainty)

### 11) ReliefWeb disaster feeds
- **Potential value:** Humanitarian operations signal.
- **Candidate:** `https://api.reliefweb.int/v1/disasters`
- **Current blocker:** Access behavior can return 403 without correct app/profile handling.
- **Recommendation:** Revisit with robust client headers + endpoint contract validation.

### 12) USGS Volcano Program detailed activity pages
- **Potential value:** Strong volcano-specific risk coverage.
- **Current blocker:** Some feed endpoints can return HTML/app content through generic fetch paths.
- **Recommendation:** Add only after stable machine-readable route is validated.

### 13) OPEC / IEA monthly market reports (PDF/web extraction)
- **Potential value:** High macro-energy value.
- **Current blocker:** Mostly document parsing/scraping, brittle extraction pipelines.
- **Recommendation:** Keep as later-phase scraping project.

### 14) Central bank speech/meeting calendars (Fed, ECB, BoE, BoJ)
- **Potential value:** Event-driven macro alerts.
- **Current blocker:** Multi-site scraping + layout drift + dedup complexity.
- **Recommendation:** Implement once scraping framework + alert QA is mature.

---

## Suggested Implementation Order

1. EONET  
2. Open-Meteo  
3. CISA KEV  
4. NOAA SWPC alerts  
5. Eurostat  
6. NOAA Tides  
7. OpenSky  
8. NVD  
9. GLEIF  
10. OpenAlex  
11+ Scraping tier

