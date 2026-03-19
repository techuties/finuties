# New Sources / Endpoints / Scraping Suggestions

This list is prioritized from **highest value + most immediate** to **lower immediacy**.
Priority rule used: **free + directly accessible API first**.

Current coverage already includes conflicts, disasters, climate, food, development, sanctions, crypto/fx/trade, and SEC/CFTC datasets, so proposals below focus on missing/high-gap areas.

## P0 - High value, immediate (free and directly accessible)

### 1) Eurostat SDMX + JSON-stat (EU macro, energy, labor, prices)
- **Access**: Free, public API, no key.
- **Why high value**: Very broad official EU coverage with clean dimensions and country comparability.
- **Proposed endpoints**:
  - `/api/v1/data/europe/eurostat-series`
  - `/api/v1/data/europe/eurostat-latest`
- **Implementation notes**:
  - Start with curated datasets (HICP inflation, unemployment, industrial production, gas/electricity prices).
  - Add dataset code + dimension filter pass-through.

### 2) OECD SDMX (global macro, productivity, tax, trade, social)
- **Access**: Free, no auth (rate limited).
- **Why high value**: Strong cross-country time series not fully covered by existing IMF/WB endpoints.
- **Proposed endpoints**:
  - `/api/v1/data/oecd/indicators`
  - `/api/v1/data/oecd/nowcast-proxies`
- **Implementation notes**:
  - Ship with curated indicator map first (GDP nowcast proxies, labor, confidence indexes).
  - Cache responses aggressively to stay under hourly limits.

### 3) USGS Water Services (streamflow, gauge levels, water quality)
- **Access**: No key required (optional key for higher rate limits).
- **Why high value**: Real-time physical risk signal for agriculture, utilities, and flood monitoring.
- **Proposed endpoints**:
  - `/api/v1/data/water/usgs-streamflow`
  - `/api/v1/data/water/usgs-quality`
- **Implementation notes**:
  - Normalize station metadata and units.
  - Add geo queries (bounding box + radius around lat/lon).

### 4) OpenSky Network (live flights + historical state vectors)
- **Access**: Anonymous free access exists (authenticated gives better limits/features).
- **Why high value**: Strong transportation/logistics risk signal and conflict/disruption context.
- **Proposed endpoints**:
  - `/api/v1/data/aviation/opensky-live`
  - `/api/v1/data/aviation/opensky-airport-traffic`
- **Implementation notes**:
  - Keep polling intervals conservative for anonymous usage.
  - Add airport/region aggregation to reduce payload size.

### 5) UN OCHA HDX (humanitarian datasets + crisis metadata)
- **Access**: CKAN API can be queried without key for search/read.
- **Why high value**: Adds humanitarian lens (displacement, food insecurity, emergency context) with broad country coverage.
- **Proposed endpoints**:
  - `/api/v1/data/humanitarian/hdx-datasets`
  - `/api/v1/data/humanitarian/hdx-resources`
- **Implementation notes**:
  - Start with metadata/discovery endpoint and curated high-value datasets.
  - Add extractor jobs for selected resource formats (CSV/XLSX/GeoJSON).

### 6) Open-Meteo (forecast + historical weather)
- **Access**: Free, no key (non-commercial constraints apply).
- **Why high value**: Quick weather sensitivity signal for agri, transport, energy demand.
- **Proposed endpoints**:
  - `/api/v1/data/weather/openmeteo-forecast`
  - `/api/v1/data/weather/openmeteo-history`
- **Implementation notes**:
  - Use lat/lon query model and optional gridded country aggregation.
  - Mark licensing/commercial constraints in metadata.

## P1 - Near-term (free but key/registration needed)

### 7) U.S. EIA (power, oil, gas, grids, inventories)
- **Access**: Free API key via registration.
- **Why high value**: Directly actionable energy market and macro signals.
- **Proposed endpoints**:
  - `/api/v1/data/energy/eia-series`
  - `/api/v1/data/energy/eia-grid`
- **Implementation notes**:
  - Build a curated "series dictionary" for common market signals.
  - Cache at source cadence (daily/weekly/monthly).

### 8) OpenAQ v3 (air quality observations)
- **Access**: API key required; free access available.
- **Why high value**: Global environmental-health risk signal, useful for city-level monitoring.
- **Proposed endpoints**:
  - `/api/v1/data/environment/openaq-observations`
  - `/api/v1/data/environment/openaq-stations`
- **Implementation notes**:
  - Standardize pollutant naming (PM2.5/PM10/NO2/O3/SO2/CO).
  - Add rolling AQI-like summary endpoint.

### 9) WAQI (real-time AQI feed)
- **Access**: Free token required.
- **Why high value**: Fast operational air-quality signal with high user interest.
- **Proposed endpoints**:
  - `/api/v1/data/environment/waqi-city-aqi`
  - `/api/v1/data/environment/waqi-map-points`
- **Implementation notes**:
  - Respect redistribution terms and cache constraints.
  - Prefer station-level freshness metadata exposure.

### 10) NASA FIRMS (wildfire hotspots)
- **Access**: Free account/key generally required.
- **Why high value**: Critical real-time wildfire risk and supply-chain disruption signal.
- **Proposed endpoints**:
  - `/api/v1/data/disasters/firms-hotspots`
  - `/api/v1/data/disasters/firms-regional-summary`
- **Implementation notes**:
  - Expose confidence and FRP metrics.
  - Add region/day aggregation for dashboard performance.

## P2 - Not immediate (scraping or higher legal/operational complexity)

### 11) Port congestion and vessel queue pages (authority dashboards)
- **Access**: Often web pages/CSV drops, inconsistent formats.
- **Why valuable**: Very high logistics value, but source stability varies.
- **Proposed endpoints**:
  - `/api/v1/data/maritime/port-congestion`
  - `/api/v1/data/maritime/port-turnaround`
- **Implementation notes**:
  - Implement source adapters per port authority.
  - Add change-detection and parser fallback logic.

### 12) Grid outage trackers (utility/operator portals)
- **Access**: Frequently map UIs with no stable API.
- **Why valuable**: High operational risk signal for power reliability.
- **Proposed endpoints**:
  - `/api/v1/data/energy/grid-outages`
  - `/api/v1/data/energy/outage-summary`
- **Implementation notes**:
  - Use headless scraping only where terms allow.
  - Keep country/state-level aggregates to reduce legal/data risks.

### 13) Freight indices with restrictive terms (spot rates, container pricing)
- **Access**: Often paywalled or redistribution-restricted.
- **Why valuable**: Strong macro and inflation leading signals.
- **Proposed endpoints**:
  - `/api/v1/data/trade/freight-rates`
  - `/api/v1/data/trade/container-index`
- **Implementation notes**:
  - Prefer official licensed feeds before scraping.
  - If scraping is used, publish only derived aggregates.

### 14) Corporate disclosures from exchange websites (non-SEC geographies)
- **Access**: Many exchange portals lack stable developer APIs.
- **Why valuable**: Expands coverage beyond SEC filings.
- **Proposed endpoints**:
  - `/api/v1/data/filings/global-exchange-filings`
  - `/api/v1/data/filings/global-material-events`
- **Implementation notes**:
  - Build per-exchange parsers and legal allowlists.
  - Prioritize machine-readable exchanges first.

## Recommended execution order

1. **Eurostat**
2. **OECD**
3. **USGS Water**
4. **OpenSky**
5. **EIA**
6. **OpenAQ**

This sequence keeps delivery aligned with the "free and directly accessible first" requirement while adding clear domain breadth (macro, physical risk, transport, energy, environment).
