# New Sources / Endpoints / Scraping Backlog (Free-First)

Context: existing coverage was checked in `terminal/src/lib/source-registry.ts` (51 endpoints already implemented).  
Goal: add **new** high-value data sources, prioritizing **free** and **directly accessible** endpoints.

## Prioritization levels
- **P0 - High value / Immediate**: free, direct API/file access, low legal and engineering friction.
- **P1 - High value / Next**: free but requires API key/registration or extra normalization.
- **P2 - Not immediate**: scraping-heavy, anti-bot barriers, licensing ambiguity, or unstable formats.

---

## P0 - High value / Immediate (free + directly accessible)

1. **US Treasury FiscalData (Debt, rates, auctions)**
   - **Why**: major macro/market signal; public and reliable.
   - **Access**: free, no auth.
   - **Example endpoint**: `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/debt_to_penny`
   - **Proposed internal endpoint**: `/api/v1/data/economy/us-treasury-debt`
   - **Method**: API.

2. **SEC EDGAR Company Facts / Submissions**
   - **Why**: direct fundamentals and filing updates for risk and equity analytics.
   - **Access**: free, no auth (requires compliant User-Agent header).
   - **Example endpoints**:
     - `https://data.sec.gov/submissions/CIK0000320193.json`
     - `https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json`
   - **Proposed internal endpoint**: `/api/v1/data/markets/sec-filings`
   - **Method**: API.

3. **NASA EONET (Natural events feed)**
   - **Why**: near-real-time wildfire/storm/volcanic events with geospatial coordinates.
   - **Access**: free, no auth.
   - **Example endpoint**: `https://eonet.gsfc.nasa.gov/api/v3/events`
   - **Proposed internal endpoint**: `/api/v1/data/disasters/eonet-events`
   - **Method**: API.

4. **Open-Meteo (Forecast + historical weather)**
   - **Why**: strong climate/weather utility without auth friction.
   - **Access**: free, no auth.
   - **Example endpoints**:
     - `https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&hourly=temperature_2m,precipitation`
     - `https://archive-api.open-meteo.com/v1/archive?latitude=52.52&longitude=13.41&start_date=2026-01-01&end_date=2026-01-31&daily=temperature_2m_mean,precipitation_sum`
   - **Proposed internal endpoint**: `/api/v1/data/climate/open-meteo`
   - **Method**: API.

5. **ReliefWeb (Humanitarian disasters, conflicts, reports)**
   - **Why**: high-value humanitarian situational awareness with global scope.
   - **Access**: free, no auth.
   - **Example endpoint**: `https://api.reliefweb.int/v1/disasters?appname=finuties`
   - **Proposed internal endpoint**: `/api/v1/data/humanitarian/reliefweb-disasters`
   - **Method**: API.

6. **OpenAQ (Air quality observations)**
   - **Why**: actionable environmental/health risk signal (PM2.5, NO2, O3, etc.).
   - **Access**: free tier, direct API access.
   - **Example endpoint**: `https://api.openaq.org/v3/locations?limit=100&page=1`
   - **Proposed internal endpoint**: `/api/v1/data/environment/air-quality`
   - **Method**: API.

7. **OpenSky Network (Aircraft states)**
   - **Why**: geopolitics/logistics signal for mobility and regional disruptions.
   - **Access**: free endpoint access (rate-limited for anonymous users).
   - **Example endpoint**: `https://opensky-network.org/api/states/all`
   - **Proposed internal endpoint**: `/api/v1/data/mobility/air-traffic`
   - **Method**: API.

8. **Eurostat SDMX API**
   - **Why**: high-quality official statistics for inflation, labor, industry, trade.
   - **Access**: free, no auth.
   - **Example endpoint**: `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_hicp_midx?geo=DE&coicop=CP00`
   - **Proposed internal endpoint**: `/api/v1/data/economy/eurostat-indicators`
   - **Method**: API.

---

## P1 - High value / Next (free but key/registration or heavier normalization)

1. **FRED API (Federal Reserve Economic Data)**
   - **Access**: free API key.
   - **Example endpoint**: `https://api.stlouisfed.org/fred/series/observations?series_id=CPIAUCSL&api_key={KEY}&file_type=json`
   - **Proposed endpoint**: `/api/v1/data/economy/fred-series`
   - **Method**: API.

2. **EIA v2 API (Energy Information Administration)**
   - **Access**: free API key.
   - **Example endpoint**: `https://api.eia.gov/v2/petroleum/pri/spt/data/?api_key={KEY}&frequency=daily&data[0]=value`
   - **Proposed endpoint**: `/api/v1/data/energy/eia-prices`
   - **Method**: API.

3. **BLS Public Data API**
   - **Access**: free key (small requests also possible without key).
   - **Example endpoint**: `https://api.bls.gov/publicAPI/v2/timeseries/data/CUUR0000SA0`
   - **Proposed endpoint**: `/api/v1/data/economy/bls-timeseries`
   - **Method**: API.

4. **US Census API**
   - **Access**: free API key.
   - **Example endpoint**: `https://api.census.gov/data/2024/acs/acs5?get=NAME,B01001_001E&for=state:*&key={KEY}`
   - **Proposed endpoint**: `/api/v1/data/demographics/us-census`
   - **Method**: API.

5. **USDA NASS Quick Stats**
   - **Access**: free API key.
   - **Example endpoint**: `https://quickstats.nass.usda.gov/api/api_GET/?key={KEY}&commodity_desc=CORN&year__GE=2020&format=JSON`
   - **Proposed endpoint**: `/api/v1/data/food/usda-nass`
   - **Method**: API.

6. **GLEIF LEI API (legal entity identifiers)**
   - **Access**: free, direct API access.
   - **Example endpoint**: `https://api.gleif.org/api/v1/lei-records?page[size]=25`
   - **Proposed endpoint**: `/api/v1/data/markets/lei-entities`
   - **Method**: API.

---

## P2 - Not immediate (scraping/licensing/operational risk)

1. **IMO / maritime incident bulletins**
   - **Why valuable**: shipping disruption and chokepoint risk.
   - **Blocker**: mostly portal/PDF style; scraping and parser maintenance required.
   - **Method**: scraping + document extraction.

2. **National grid outage dashboards (country-by-country)**
   - **Why valuable**: infrastructure stress signal.
   - **Blocker**: fragmented sources, non-standard schemas, frequent front-end changes.
   - **Method**: targeted scraping adapters.

3. **Port authority congestion pages**
   - **Why valuable**: near-real-time trade bottleneck indicator.
   - **Blocker**: many HTML tables, inconsistent update cadence, anti-bot controls.
   - **Method**: scraping.

4. **Exchange-level short interest pages (regional exchanges)**
   - **Why valuable**: sentiment and stress indicator.
   - **Blocker**: terms-of-use variance and brittle HTML structure.
   - **Method**: scraping with legal review.

5. **Satellite-derived crop condition pages without stable APIs**
   - **Why valuable**: food security and commodity nowcasting.
   - **Blocker**: often raster/imagery pipelines, high ETL complexity.
   - **Method**: scraping + geospatial ETL.

---

## Suggested implementation order
1. P0-1: US Treasury FiscalData  
2. P0-2: SEC EDGAR  
3. P0-3: NASA EONET  
4. P0-4: Open-Meteo  
5. P0-5: ReliefWeb  
6. P0-6: OpenAQ  

This sequence maximizes value while keeping implementation straightforward and free-first.
