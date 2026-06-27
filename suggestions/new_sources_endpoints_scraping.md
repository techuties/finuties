# New Sources, Endpoints, and Scraping Suggestions

Last reviewed: 2026-06-27

## Baseline checked

The current Terminal Community source registry already covers a broad free-data catalog:

- Politics/conflict: UCDP, ACLED placeholder, GDELT, GPR.
- Nature/disasters: USGS earthquakes, GDACS, NOAA NWS alerts, EM-DAT.
- Maritime/economy/trade: GFW events, ECB FX, CoinGecko, IMF, UN Comtrade, CFTC COT.
- Environment/health/demographics/food/development/climate/biodiversity/sanctions: EPA TRI, WHO, JMP, UN population, UNHCR, IOM, FAO, USDA WASDE, WFP, World Bank, UNDP, UNESCO, ILO, ITU, NASA/NOAA climate series, GBIF, IUCN, OFAC/EU/UN sanctions.

The highest-value gaps are sources that add live operational signals, public finance/macroeconomic depth, company disclosure depth, or high-frequency geospatial observations while staying free and directly accessible.

## Priority tiers

- **Immediate**: live probe returned HTTP 200, no API key required, JSON-friendly, and data shape fits the existing `/api/v1/data/...` source-envelope pattern.
- **Near-term**: free and valuable, but requires stronger parsing, caching, source-specific usage handling, or a non-secret registration/app identifier.
- **Not immediate**: high value, but key-gated, approval-gated, scraping-heavy, license-sensitive, or operationally fragile.

## Immediate, high-value candidates

### 1. SEC EDGAR structured data

- **Value**: Very high for a finance terminal; adds company filings, filing history, XBRL facts, and cross-company concept frames.
- **Access**: Free, no API key. Requires a descriptive `User-Agent` header and backend-side calls because `data.sec.gov` does not support browser CORS.
- **Live probe**:
  - `https://data.sec.gov/submissions/CIK0000320193.json` -> HTTP 200.
  - `https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json` -> HTTP 200.
- **Upstream endpoints**:
  - `GET https://www.sec.gov/files/company_tickers.json`
  - `GET https://data.sec.gov/submissions/CIK{cik10}.json`
  - `GET https://data.sec.gov/api/xbrl/companyfacts/CIK{cik10}.json`
  - `GET https://data.sec.gov/api/xbrl/companyconcept/CIK{cik10}/{taxonomy}/{concept}.json`
  - `GET https://data.sec.gov/api/xbrl/frames/{taxonomy}/{concept}/{unit}/CY{year}{period}.json`
- **Suggested FinUties endpoints**:
  - `/api/v1/data/sec/submissions`
  - `/api/v1/data/sec/company-facts`
  - `/api/v1/data/sec/company-concept`
  - `/api/v1/data/sec/xbrl-frames`
- **Suggested source registry entries**:
  - `sec_submissions`, category `economy`, geoType `none`.
  - `sec_company_facts`, category `economy`, geoType `none`.
- **Implementation notes**:
  - Reuse existing SEC card/explore concepts where possible.
  - Cache company ticker lookup and submissions aggressively.
  - Enforce SEC fair-access throttling, ideally below 10 requests/second per IP.

### 2. U.S. Treasury Fiscal Data

- **Value**: Very high for public debt, Treasury rates, auctions, monthly statements, fiscal flows, and exchange-rate reference data.
- **Access**: Free, open API, no key.
- **Live probe**:
  - `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny?sort=-record_date&page[size]=1` -> HTTP 200.
  - `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/avg_interest_rates?sort=-record_date&page[size]=1` -> HTTP 200.
- **Upstream endpoints**:
  - `GET /v2/accounting/od/debt_to_penny`
  - `GET /v2/accounting/od/avg_interest_rates`
  - `GET /v1/accounting/od/auctions_query`
  - `GET /v1/accounting/mts/mts_table_1`
  - `GET /v1/accounting/od/rates_of_exchange`
- **Suggested FinUties endpoints**:
  - `/api/v1/data/treasury/debt`
  - `/api/v1/data/treasury/average-rates`
  - `/api/v1/data/treasury/auctions`
  - `/api/v1/data/treasury/monthly-statement`
  - `/api/v1/data/treasury/fx-rates`
- **Suggested source registry entries**:
  - `treasury_debt`, `treasury_average_rates`, `treasury_auctions`, category `economy`, geoType `none`.
- **Implementation notes**:
  - Fiscal Data supports `fields`, `filter`, `sort`, `page[number]`, `page[size]`, and CSV/XML output.
  - Normalize numeric fields from strings before returning items.

### 3. NASA EONET natural events

- **Value**: High for near-real-time natural hazards: wildfires, volcanoes, severe storms, sea/lake ice, floods, dust/haze, and other observable events.
- **Access**: Free, no key for EONET.
- **Live probe**:
  - `https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=3` -> HTTP 200.
- **Upstream endpoints**:
  - `GET https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=100`
  - `GET https://eonet.gsfc.nasa.gov/api/v3/events/geojson?status=open`
  - `GET https://eonet.gsfc.nasa.gov/api/v3/categories/{categoryId}?status=open`
- **Suggested FinUties endpoint**:
  - `/api/v1/data/disasters/eonet`
- **Suggested source registry entry**:
  - `eonet_events`, category `nature`, geoType `point`, fields `event_id`, `title`, `category`, `date`, `latitude`, `longitude`, `source`.
- **Implementation notes**:
  - Prefer the GeoJSON endpoint for map layers.
  - EONET complements GDACS and USGS earthquakes rather than replacing either.

### 4. NOAA National Hurricane Center current storms

- **Value**: High during cyclone seasons; provides active storm location, intensity, pressure, advisory links, and movement.
- **Access**: Free, no key, static JSON.
- **Live probe**:
  - `https://www.nhc.noaa.gov/CurrentStorms.json` -> HTTP 200.
- **Upstream endpoints/files**:
  - `GET https://www.nhc.noaa.gov/CurrentStorms.json`
  - Advisory URLs embedded in `activeStorms[*].forecastAdvisory`, `publicAdvisory`, and related fields.
  - Optional GIS products under NHC forecast/advisory links for track cones and wind radii.
- **Suggested FinUties endpoint**:
  - `/api/v1/data/weather/tropical-cyclones`
- **Suggested source registry entry**:
  - `nhc_tropical_cyclones`, category `nature`, geoType `point`, fields `id`, `name`, `classification`, `intensity`, `pressure`, `latitude`, `longitude`, `movement_dir`, `movement_speed`, `last_update`.
- **Implementation notes**:
  - Start with `CurrentStorms.json`; defer advisory text/GIS scraping to a follow-up.
  - Empty `activeStorms` should return a valid empty item list, not an error.

### 5. Open-Meteo weather and air quality

- **Value**: High for directly accessible weather, air quality, marine, flood, forecast, archive, and reanalysis-like features at arbitrary coordinates.
- **Access**: Free for non-commercial use, no key, JSON over GET. Attribution required.
- **Live probe**:
  - `https://api.open-meteo.com/v1/forecast?...` -> HTTP 200.
  - `https://air-quality-api.open-meteo.com/v1/air-quality?...` -> HTTP 200.
- **Upstream endpoints**:
  - `GET https://api.open-meteo.com/v1/forecast`
  - `GET https://archive-api.open-meteo.com/v1/archive`
  - `GET https://air-quality-api.open-meteo.com/v1/air-quality`
  - `GET https://marine-api.open-meteo.com/v1/marine`
  - `GET https://flood-api.open-meteo.com/v1/flood`
  - `GET https://geocoding-api.open-meteo.com/v1/search`
- **Suggested FinUties endpoints**:
  - `/api/v1/data/weather/open-meteo/current`
  - `/api/v1/data/weather/open-meteo/air-quality`
  - `/api/v1/data/weather/open-meteo/marine`
  - `/api/v1/data/weather/open-meteo/flood`
- **Suggested source registry entries**:
  - `open_meteo_current`, category `climate` or `nature`, geoType `point`.
  - `open_meteo_air_quality`, category `environment`, geoType `point`.
- **Implementation notes**:
  - Requires `latitude` and `longitude`; for country views, use a country centroid or capital-city coordinate table.
  - Keep variable selection narrow by default to avoid large payloads.

### 6. BLS Public Data API v1

- **Value**: High for U.S. labor, CPI/PPI, employment, wages, productivity, and unemployment time series.
- **Access**: Version 1 is no-key and open, but limited; Version 2 requires free registration for higher limits.
- **Live probe**:
  - `https://api.bls.gov/publicAPI/v1/timeseries/data/LNS14000000` -> HTTP 200.
- **Upstream endpoints**:
  - `GET https://api.bls.gov/publicAPI/v1/timeseries/data/{series_id}`
  - `POST https://api.bls.gov/publicAPI/v1/timeseries/data/`
- **Suggested FinUties endpoint**:
  - `/api/v1/data/economic/bls-series`
- **Suggested source registry entry**:
  - `bls_series`, category `economy`, geoType `none`, fields `series_id`, `year`, `period`, `date`, `value`, `footnotes`.
- **Implementation notes**:
  - Start with a curated series allowlist to avoid requiring users to know opaque BLS IDs.
  - Cache heavily because no-key usage has lower daily limits.

### 7. iNaturalist observations

- **Value**: Medium-high; adds fresh citizen-science biodiversity observations and can complement GBIF occurrence records.
- **Access**: Free anonymous GET for public observation data; rate-limited and pagination-sensitive.
- **Live probe**:
  - `https://api.inaturalist.org/v1/observations?per_page=3&quality_grade=research&order_by=observed_on` -> HTTP 200.
- **Upstream endpoints**:
  - `GET https://api.inaturalist.org/v1/observations`
  - `GET https://api.inaturalist.org/v2/observations?fields=...`
- **Suggested FinUties endpoint**:
  - `/api/v1/data/biodiversity/inaturalist-observations`
- **Suggested source registry entry**:
  - `inat_observations`, category `biodiversity`, geoType `point`, fields `id`, `observed_on`, `species_guess`, `taxon_name`, `quality_grade`, `latitude`, `longitude`, `place_guess`.
- **Implementation notes**:
  - Prefer v2 with explicit `fields` for smaller responses.
  - Respect licenses and avoid exposing obscured/private coordinates.

### 8. Generic World Bank indicator bridge

- **Value**: Medium-high; the registry already contains several World Bank-derived verticals, but a generic bridge would let the API add new indicators without a new bespoke source each time.
- **Access**: Free, no key.
- **Live probe**:
  - `https://api.worldbank.org/v2/country/all/indicator/NY.GDP.MKTP.CD?format=json&per_page=3&date=2024` -> HTTP 200.
- **Upstream endpoint**:
  - `GET https://api.worldbank.org/v2/country/{country}/indicator/{indicator}?format=json`
- **Suggested FinUties endpoint**:
  - `/api/v1/data/development/world-bank-indicator`
- **Suggested source registry entry**:
  - `wb_indicator_generic`, category `development`, geoType `country`, fields `country_code`, `country`, `indicator_code`, `indicator_name`, `year`, `value`.
- **Implementation notes**:
  - Avoid duplicating existing poverty/governance/education cards; use this as a flexible fallback and admin-driven source.

## Near-term candidates

### Eurostat Statistics API

- **Value**: High for EU macro, labor, prices, demographics, energy, trade, and regional indicators.
- **Access**: Free, no key.
- **Why not immediate**: JSON-stat dimensional parsing and dataset-specific dimensions require a reusable adapter.
- **Endpoint pattern**:
  - `GET https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/{datasetCode}?lang=EN&...filters`
- **Suggested FinUties endpoint**:
  - `/api/v1/data/economic/eurostat`

### ECB Data Portal expansion

- **Value**: High for rates, monetary aggregates, yield curves, bank balance sheets, and euro area macro-finance.
- **Access**: Public.
- **Why not immediate**: SDMX/Data Portal parsing and dimension discovery.
- **Suggested FinUties endpoints**:
  - `/api/v1/data/ecb/policy-rates`
  - `/api/v1/data/ecb/yield-curves`
  - `/api/v1/data/ecb/monetary-aggregates`

### BIS statistics

- **Value**: High for international banking, credit, debt securities, liquidity, and FX derivatives.
- **Access**: Public SDMX APIs/downloads.
- **Why not immediate**: SDMX parsing and dataset discovery.
- **Suggested FinUties endpoint**:
  - `/api/v1/data/economic/bis`

### OECD Data Explorer / SDMX

- **Value**: High for cross-country macro, trade, education, productivity, tax, and wellbeing data.
- **Access**: Public.
- **Why not immediate**: SDMX complexity and dimension mapping.
- **Suggested FinUties endpoint**:
  - `/api/v1/data/development/oecd`

### OpenSky Network state vectors

- **Value**: Medium-high for live aviation, airspace disruption, and mobility monitoring.
- **Access**: Anonymous access exists with strict limits; authenticated access uses OAuth2.
- **Live probe**: Attempt from the cloud VM reset the connection, so treat as operationally fragile until rechecked from production networking.
- **Endpoint pattern**:
  - `GET https://opensky-network.org/api/states/all`
- **Suggested FinUties endpoint**:
  - `/api/v1/data/aviation/opensky-states`
- **Implementation notes**:
  - Put behind a cache with at least 10-second TTL for anonymous use.
  - Add a new category only if aviation/geospatial mobility is part of the roadmap.

### ReliefWeb disasters and reports

- **Value**: High for humanitarian crises, reports, appeals, and disaster metadata.
- **Access**: Read-only API, but all requests require `appname`; documentation indicates approved appnames are required from 2025-11-01.
- **Live probe**: HTTP 403 with an unapproved appname.
- **Endpoint pattern**:
  - `GET https://api.reliefweb.int/v2/disasters?appname={approved_appname}&limit=...`
  - `GET https://api.reliefweb.int/v2/reports?appname={approved_appname}&limit=...`
- **Suggested FinUties endpoints**:
  - `/api/v1/data/disasters/reliefweb`
  - `/api/v1/data/humanitarian/reliefweb-reports`
- **Implementation notes**:
  - Useful once an approved appname exists; do not classify as direct/immediate.

## Not immediate, but worth tracking

### FRED and ALFRED

- **Value**: Very high for U.S. macro and vintage data.
- **Constraint**: Free API key required, so not directly accessible.
- **Potential endpoint**:
  - `/api/v1/data/economic/fred-series`

### EIA Open Data

- **Value**: Very high for energy prices, supply, demand, inventories, electricity, petroleum, gas, and emissions.
- **Constraint**: Free API key required for normal API access.
- **Potential endpoint**:
  - `/api/v1/data/energy/eia`

### NASA FIRMS active fire

- **Value**: High for wildfire and thermal anomaly monitoring.
- **Constraint**: Requires a free MAP_KEY for the API; bulk and area endpoints need careful caching and terms review.
- **Potential endpoint**:
  - `/api/v1/data/disasters/firms-active-fires`

### OpenSanctions hosted API

- **Value**: High for unified sanctions, PEPs, adverse media, and enforcement lists.
- **Constraint**: Hosted API requires an API key; existing registry already has OFAC/EU/UN sanctions.
- **Potential endpoint**:
  - `/api/v1/data/governance/opensanctions`

### NOAA Climate Data Online

- **Value**: High for station-level historical climate normals and observations.
- **Constraint**: API token required.
- **Potential endpoint**:
  - `/api/v1/data/climate/noaa-cdo`

### HDX / CKAN humanitarian datasets

- **Value**: Medium-high for country-specific humanitarian datasets.
- **Constraint**: Catalog is public, but datasets vary in freshness, file format, license, and schema stability.
- **Potential endpoint**:
  - `/api/v1/data/humanitarian/hdx-datasets`

## Scraping and static-file candidates

These should be implemented only when an API-first option is unavailable or when the static files are the official machine-readable source.

1. **NHC advisory text and GIS products**
   - Start from `CurrentStorms.json`, then follow advisory URLs for forecast discussions, public advisories, and GIS files.
   - Scraping risk: advisory formats are stable but text parsing can be brittle.

2. **SEC Archives filing documents**
   - Use `submissions` metadata to locate accession-number documents under `https://www.sec.gov/Archives/edgar/data/...`.
   - Scraping risk: HTML documents vary; prefer XBRL/XML where present.

3. **Eurostat bulk TSV downloads**
   - Useful for large datasets where JSON-stat calls are too slow.
   - Scraping risk: compressed TSV parsing and dimension metadata management.

4. **CFTC raw historical CSVs**
   - Existing COT endpoints are present; static CSV ingestion could expand history and contract coverage.
   - Scraping risk: legacy format variations across report families.

5. **World Bank bulk indicator CSVs**
   - Useful for periodic full-refresh jobs instead of API pagination.
   - Scraping risk: zip layout changes are unlikely but should be guarded.

## Suggested implementation order

1. **Treasury Fiscal Data**: quickest strong finance win; clean JSON and no auth.
2. **NASA EONET + NHC Current Storms**: quick geospatial disaster expansion with direct JSON.
3. **SEC EDGAR structured endpoints**: very high value; implement with careful caching and User-Agent handling.
4. **Open-Meteo current/air-quality**: high utility; needs coordinate strategy.
5. **BLS v1 curated series**: valuable but needs caching and curated series IDs.
6. **iNaturalist observations**: useful complement to GBIF; implement with field selection and coordinate privacy care.
7. **World Bank generic bridge**: broadens current WB coverage without many bespoke endpoints.
8. **Eurostat/ECB/BIS/OECD adapters**: high value once a reusable SDMX/JSON-stat adapter exists.
9. **ReliefWeb/OpenSky**: revisit once access/appname/network constraints are settled.
10. **Key-gated sources**: FRED, EIA, FIRMS, OpenSanctions, NOAA CDO after deciding how free-key credentials should be managed.
