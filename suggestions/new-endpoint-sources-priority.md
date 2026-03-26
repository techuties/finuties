# New endpoint/source suggestions (priority order)

Goal: prioritize free and directly accessible sources first, then move to lower-priority or less-direct options.

## 1) High value - immediate (free + directly accessible)

### 1.1 Open-Meteo (global weather, no key)
- **Type:** API
- **Access:** Free, direct, no auth
- **Sample:** `https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current=temperature_2m`
- **Why high value:** Adds global weather/forecast depth beyond current alert-focused feeds.
- **Proposed internal endpoint:** `/api/v1/data/weather/open-meteo`
- **Suggested fields:** `time, latitude, longitude, temperature_2m, wind_speed_10m, precipitation, weather_code`

### 1.2 NASA EONET (global natural hazard events)
- **Type:** API
- **Access:** Free, direct, no auth
- **Sample:** `https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=50`
- **Why high value:** Strong live event feed for fires, volcanoes, storms, floods; complements USGS/GDACS.
- **Proposed internal endpoint:** `/api/v1/data/disasters/eonet`
- **Suggested fields:** `id, title, category, geometry_date, latitude, longitude, source, status`

### 1.3 SEC submissions JSON (company filing metadata, direct)
- **Type:** API-style JSON endpoint
- **Access:** Free, direct (set clear `User-Agent`)
- **Sample:** `https://data.sec.gov/submissions/CIK0000320193.json`
- **Why high value:** Improves filing workflows with structured and frequently updated issuer-level data.
- **Proposed internal endpoint:** `/api/v1/data/filings/sec-submissions`
- **Suggested fields:** `cik, ticker, company_name, form, filing_date, accession_number, primary_document`

### 1.4 BLS Public API (labor data)
- **Type:** API
- **Access:** Free, direct (public usage available without key for core use)
- **Sample:** `https://api.bls.gov/publicAPI/v2/timeseries/data/LNS14000000`
- **Why high value:** Reliable labor time series for macro dashboards (unemployment, CPI components, wages).
- **Proposed internal endpoint:** `/api/v1/data/economy/bls-series`
- **Suggested fields:** `series_id, year, period, value, footnotes`

### 1.5 Eurostat Statistics API (EU macro/sector indicators)
- **Type:** API
- **Access:** Free, direct, no auth
- **Sample:** `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_hicp_midx?geo=EA19&coicop=CP00&freq=M&unit=I15&lang=en`
- **Why high value:** Expands robust EU coverage (inflation, labor, energy, trade).
- **Proposed internal endpoint:** `/api/v1/data/economy/eurostat`
- **Suggested fields:** `dataset, geo, freq, period, unit, value`

### 1.6 GLEIF LEI API (entity identity and linkage)
- **Type:** API
- **Access:** Free, direct, no auth
- **Sample:** `https://api.gleif.org/api/v1/lei-records?page[size]=25`
- **Why high value:** Enables stronger entity resolution for sanctions, filings, ownership, and risk joins.
- **Proposed internal endpoint:** `/api/v1/data/entities/lei`
- **Suggested fields:** `lei, legal_name, legal_address_country, entity_status, registration_status, next_renewal_date`

## 2) High value - near term (free/direct but narrower or integration-heavy)

### 2.1 NOAA Tides and Currents (coastal/maritime)
- **Type:** API
- **Access:** Free, direct, no auth
- **Sample:** `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=water_level&application=finuties&station=9414290&date=latest&datum=MLLW&time_zone=gmt&units=metric&format=json`
- **Why useful:** Adds operational maritime signal (water levels, tides) for port risk context.
- **Proposed internal endpoint:** `/api/v1/data/maritime/noaa-tides`

### 2.2 UK National Grid Carbon Intensity API
- **Type:** API
- **Access:** Free, direct, no auth
- **Sample:** `https://api.carbonintensity.org.uk/intensity`
- **Why useful:** Good real-time power decarbonization signal; can seed broader electricity-carbon monitoring.
- **Proposed internal endpoint:** `/api/v1/data/climate/grid-carbon-intensity`

### 2.3 Energy-Charts (power prices and generation)
- **Type:** API
- **Access:** Free, direct, no auth
- **Sample:** `https://api.energy-charts.info/price?bzn=DE-LU&start=2025-01-01&end=2025-01-02`
- **Why useful:** Adds high-frequency power/price insights for energy and inflation nowcasts.
- **Proposed internal endpoint:** `/api/v1/data/economic/power-prices`

## 3) Medium priority (useful, but fit/scope needs design first)

### 3.1 FRED public CSV endpoint (time series without API key path)
- **Type:** Direct CSV endpoint
- **Access:** Free, direct, no auth for CSV route
- **Sample:** `https://fred.stlouisfed.org/graph/fredgraph.csv?id=UNRATE`
- **Why medium:** High value macro data, but ingestion/modeling conventions should be standardized first.
- **Proposed internal endpoint:** `/api/v1/data/economy/fred-csv-series`

### 3.2 Wider SEC datasets expansion
- **Type:** JSON + index files
- **Access:** Free, direct (with compliant `User-Agent`)
- **Sample:** `https://www.sec.gov/Archives/edgar/daily-index/xbrl/companyfacts.zip`
- **Why medium:** Very powerful fundamentals coverage, but parser/storage complexity is non-trivial.
- **Proposed internal endpoint:** `/api/v1/data/filings/sec-company-facts`

## 4) Not immediate (not fully direct in this environment or likely scraping-heavy)

### 4.1 ReliefWeb API
- **Type:** API
- **Access observed:** Returned `403` from current runtime during probe
- **Sample attempted:** `https://api.reliefweb.int/v1/disasters?appname=finuties&limit=1`
- **Reason to defer:** Access behavior inconsistent from current environment; needs provider guidance or alternate route.
- **Possible internal endpoint:** `/api/v1/data/humanitarian/reliefweb`

### 4.2 OpenSky live states
- **Type:** API
- **Access observed:** Connection reset from current runtime during probe
- **Sample attempted:** `https://opensky-network.org/api/states/all`
- **Reason to defer:** Connectivity/rate-limit/auth behavior uncertain for production polling.
- **Possible internal endpoint:** `/api/v1/data/aviation/opensky-states`

### 4.3 PDF-first institutional reports (scraping/parsing track)
- **Type:** Scraping + document parsing
- **Examples:** OPEC monthly oil market report tables, some customs and port authority bulletins
- **Reason to defer:** Parsing fragility and maintenance overhead compared with direct APIs.
- **Possible internal endpoint family:** `/api/v1/data/scraped/*`

## Implementation order recommendation
1. `open-meteo`
2. `eonet`
3. `sec-submissions`
4. `bls-series`
5. `eurostat`
6. `lei`
7. `noaa-tides`
8. `grid-carbon-intensity`
9. `power-prices`
