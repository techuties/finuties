# Endpoint and source suggestions

## Scope

This file audits the current FinUties Terminal source surface and lists new
sources/endpoints/scraping candidates from highest value and easiest access to
less immediate work.

Preference order used here:

1. Free, no-key, direct API endpoint returning JSON/XML/SDMX from this
   environment.
2. Existing FinUties API endpoints already used by cards/notebooks but not yet
   normalized into the public source registry.
3. Free APIs that require a key, account, complex SDMX query design, bulk ETL,
   licensing review, or scraping.

Reviewed code paths:

- `terminal/src/lib/source-registry.ts`: 51 registry sources across 12
  categories.
- `terminal/src/lib/global-data-api.ts`: generic `fetchSource` plus typed
  wrappers for older core sources.
- `terminal/src/lib/cards/*.ts`, notebooks, plugin loader, and explore views
  for endpoints used outside the registry.

Current notable gap:

- `acled` is the only registry source explicitly marked `placeholder: true`.
- Several API endpoints are already used outside `source-registry.ts`, including
  SEC, macro/rates, commodities, energy, calendar, and holdings endpoints. These
  should be normalized before adding many new categories.
- `data-hooks.ts` references `fetchRegistry()`, but `global-data-api.ts` does
  not define it.

## Priority levels

| Priority | Meaning |
| --- | --- |
| P0 | Existing internal endpoint/source mismatch; fix before expanding surface area. |
| P1 | High value, free, no-key, direct, and validated from this environment. |
| P2 | High value but needs a key/account, license review, bulk ETL, or query design. |
| P3 | Scraping or brittle source; only pursue if no stable direct API exists. |

## P0 - normalize endpoints already present in the app

These are not new upstream sources, but they are high leverage because the app
already calls them and users can benefit from registry/catalog consistency.

| Area | Existing internal endpoint(s) | Suggested action | Value |
| --- | --- | --- | --- |
| Registry metadata | `/api/v1/data/metadata/sources`, `/api/v1/data/metadata/registry` | Implement/export `fetchRegistry()` in `global-data-api.ts` or remove the caller. | Prevent stale catalog/runtime mismatch. |
| ACLED placeholder | `/api/v1/data/conflicts/acled` | Keep placeholder if upstream access requires a key; add clear access notes and availability checks. | Avoid broken "soon" source behavior. |
| Macro and rates | `/api/v1/macro/bls-series`, `/api/v1/macro/bea-series`, `/api/v1/rates/*` | Add registry entries for BLS, BEA, Treasury, NY Fed rates, and debt series. | Makes dashboard-only macro data discoverable in Explore/Analyze. |
| Commodities and energy | `/api/v1/data/commodities/prices`, `/api/v1/data/economic/energy`, `/api/v1/cftc/commodities` | Add registry entries and align IDs with existing card links. | Strengthens commodities page and notebooks. |
| Calendar | `/api/v1/calendar/events`, `/api/v1/data/economy/calendar` | Pick one canonical path or document both. | Removes split between dashboard card and explore calendar view. |
| SEC and market data | `/api/v1/sec/*`, `/api/v1/market/*`, `/api/v1/holdings/*` | Add registry/catalog rows for public filings, company facts, insider trades, holdings, and prices. | High-value data already powers Explore but is not in the free-data registry. |

## P1 - high-value free/direct sources to implement next

Each row includes an upstream URL that returned live data without credentials
from this cloud environment unless noted otherwise.

| Rank | Source | Access check | Proposed FinUties endpoint | Category | Suggested registry ID | Why it is valuable | Implementation notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | US Treasury Fiscal Data - Debt to the Penny | HTTP 200, JSON: `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny?sort=-record_date&page[size]=5` | `/api/v1/data/economic/treasury-debt-daily` | economy | `treasury_debt_daily` | Daily public debt totals are a strong macro/risk dashboard signal. | Direct JSON. Use `record_date`, `debt_held_public_amt`, `intragov_hold_amt`, `tot_pub_debt_out_amt`. |
| 2 | US Treasury Fiscal Data - Average Interest Rates | HTTP 200, JSON: `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/avg_interest_rates?sort=-record_date&page[size]=5` | `/api/v1/data/rates/treasury-average-interest-rates` | economy | `treasury_avg_interest_rates` | Complements Treasury debt and rate cards with funding-cost data. | Direct JSON. Group by `security_type_desc` and `record_date`. |
| 3 | ECB SDMX yield curve | HTTP 200, SDMX XML: `https://data-api.ecb.europa.eu/service/data/YC/B.U2.EUR.4F.G_N_A.SV_C_YM.SR_10Y?lastNObservations=5` | `/api/v1/data/rates/ecb-yield-curve` | economy | `ecb_yield_curve` | Adds euro area curve coverage beyond FX rates. | Parse SDMX XML/CSV. Start with 2Y/5Y/10Y benchmark tenors. |
| 4 | SEC Company Facts | HTTP 200, JSON: `https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json` | `/api/v1/data/sec/company-facts` | economy | `sec_company_facts` | Company fundamentals are central to filings, holdings, and equity analysis. | Requires a descriptive `User-Agent`; no API key. Can reuse existing SEC surface. |
| 5 | GLEIF LEI records | HTTP 200, JSON: `https://api.gleif.org/api/v1/lei-records?page[size]=5` | `/api/v1/data/entities/lei-records` | development | `gleif_lei_records` | Legal entity identifiers improve company, sanctions, and ownership joins. | Direct JSON:API. Add filters for LEI, legal name, country, status. |
| 6 | Open-Meteo Forecast | HTTP 200, JSON: `https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current=temperature_2m,wind_speed_10m` | `/api/v1/data/weather/open-meteo-current` | nature | `open_meteo_current` | Free global weather fills the gap between US-only NOAA alerts and global risk views. | Needs location strategy: country capitals, user lat/lon, or monitored asset coordinates. |
| 7 | Open-Meteo Air Quality | HTTP 200, JSON: `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=52.52&longitude=13.41&current=pm10,pm2_5,carbon_monoxide` | `/api/v1/data/environment/air-quality` | environment | `open_meteo_air_quality` | Adds global PM2.5/PM10/CO coverage without API keys. | Same location strategy as weather; map as point or country centroid. |
| 8 | NASA EONET active natural events | HTTP 200, event feed: `https://eonet.gsfc.nasa.gov/api/v3/events?limit=5` | `/api/v1/data/disasters/eonet` | nature | `nasa_eonet_events` | Active wildfires, storms, volcanoes, dust, and sea/lake ice events complement GDACS/USGS. | Returned event data while content type reported RSS/XML; parser should tolerate content-type mismatch. |
| 9 | NOAA CO-OPS tides and water levels | HTTP 200, JSON: `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=latest&station=8724580&product=water_level&datum=MLLW&time_zone=gmt&units=metric&format=json` | `/api/v1/data/ocean/water-levels` | climate | `noaa_coops_water_levels` | Coastal water levels support storm surge, port, and climate monitoring. | Station-based API. Seed with high-volume ports and exposed coastal stations. |
| 10 | USGS Water Services streamflow | HTTP 200, JSON: `https://waterservices.usgs.gov/nwis/iv/?format=json&sites=01646500&period=P1D&parameterCd=00060` | `/api/v1/data/water/streamflow` | environment | `usgs_streamflow` | River discharge and flood context are useful for disasters, agriculture, and logistics. | US-focused but direct. Use parameter `00060` for discharge, `00065` for gage height. |
| 11 | ClinicalTrials.gov v2 | HTTP 200, JSON: `https://clinicaltrials.gov/api/v2/studies?query.cond=diabetes&pageSize=5` | `/api/v1/data/health/clinical-trials` | health | `clinical_trials` | Adds public health and biotech pipeline intelligence. | Use condition, intervention, sponsor, country, phase, and status filters. |
| 12 | openFDA enforcement reports | HTTP 200, JSON: `https://api.fda.gov/drug/enforcement.json?limit=5` | `/api/v1/data/health/fda-enforcement` | health | `fda_enforcement` | Recalls and enforcement events add health/regulatory risk coverage. | No key for modest usage; add food/device endpoints later if useful. |
| 13 | World Bank indicator expansions | HTTP 200, JSON: `https://api.worldbank.org/v2/country/USA/indicator/NY.GDP.MKTP.CD?format=json&per_page=5` | `/api/v1/data/development/worldbank-indicators` | development | `wb_indicator_series` | One generic World Bank series endpoint can cover debt, climate, trade, health, and development indicators. | Existing WB-specific registry entries can reuse a generic adapter with curated indicator groups. |

## P2 - high-value but not immediate

| Source | Blocker | Proposed endpoint | Notes |
| --- | --- | --- | --- |
| ACLED political violence | Requires key/access terms; current registry source is placeholder. | `/api/v1/data/conflicts/acled` | Worth keeping as a paid/keyed integration, but not a free/direct priority. |
| FRED economic series | Free API key required. | `/api/v1/data/macro/fred-series` | High macro value; lower immediate priority because BLS, BEA, Treasury, ECB, and World Bank can cover much without a key. |
| EIA energy data | API key normally required. | `/api/v1/data/economic/eia-series` | Valuable for oil, gas, electricity, inventories; keep behind keyed integration or server-side credential. |
| NOAA Climate Data Online | Token required. | `/api/v1/data/climate/noaa-cdo` | Use only if existing NOAA/open-meteo/USGS sources do not cover the requirement. |
| OECD SDMX | Free but query design is complex; a generic dataflow URL check returned HTTP 422 for an underspecified query. | `/api/v1/data/economic/oecd-series` | Valuable for CPI, labour, trade, and national accounts after building a curated SDMX query map. |
| Copernicus CDS/ERA5 | Account, queueing, and heavier retrieval workflow. | `/api/v1/data/climate/era5` | Existing registry has `era5_reanalysis`; treat as batch ETL rather than an immediate direct endpoint. |
| Global Fishing Watch expanded APIs | Access/licensing/token considerations beyond current `gfw` registry row. | `/api/v1/data/maritime/gfw-*` | Good maritime value, but not as direct as NOAA/USGS/NASA sources. |
| OpenSanctions datasets | Free data exists, but licensing/attribution and bulk update workflow need review. | `/api/v1/data/governance/sanctions/opensanctions` | Could enrich OFAC/EU/UN sanctions with aliases and entity resolution. |
| ReliefWeb humanitarian data | Tested v1 reports/disasters URLs returned HTTP 410 from this environment. | `/api/v1/data/humanitarian/reliefweb` | Revisit current API path or use HDX/OCHA alternatives before implementation. |

## P3 - scraping candidates

Only use scraping when no stable API/download exists.

| Candidate | Suggested endpoint | Reason to defer |
| --- | --- | --- |
| Central bank policy calendars and statements | `/api/v1/data/rates/central-bank-calendar` | Country-specific HTML/RSS shapes; start with official APIs where available. |
| Port authority notices and closures | `/api/v1/data/maritime/port-notices` | High logistics value but fragmented across local sites. |
| Commodity exchange notices and margin updates | `/api/v1/data/commodities/exchange-notices` | Often HTML/PDF and exchange-specific licensing. |
| Government food security PDFs | `/api/v1/data/food/security-bulletins` | Prefer WFP/FAO APIs first; scrape PDFs only for uncovered regions. |
| Disease outbreak bulletins without feeds | `/api/v1/data/health/outbreak-bulletins` | Existing WHO outbreak source should be checked first; scraping should be fallback. |

## Suggested implementation order

1. Fix P0 internal normalization:
   - Add/export `fetchRegistry()` or remove its caller.
   - Add registry entries for existing macro/rates/SEC/market/commodities
     endpoints that already power cards, notebooks, or Explore.
   - Clarify `acled` availability and placeholder handling.
2. Add P1 sources in small batches:
   - Finance/entity batch: Treasury FiscalData, ECB yield curve, SEC Company
     Facts, GLEIF.
   - Global conditions batch: Open-Meteo weather, Open-Meteo air quality, NASA
     EONET.
   - Water/health batch: NOAA CO-OPS, USGS streamflow, ClinicalTrials.gov,
     openFDA.
3. For every new source, mirror `SourceDef` fields:
   - `id`, `category`, `label`, `shortLabel`, `description`, `endpoint`,
     `geoType`, `defaultLimit`, `defaultDays`, `columns`, and `filters`.
4. Add source availability coverage:
   - Include the new source in `/api/v1/data/metadata/sources`.
   - Add a lightweight smoke test that validates envelope shape:
     `{ source, count, items, cached }`.
5. Defer P2/P3 until the immediate no-key sources and registry consistency work
   are complete.

## Validation notes

Endpoint reachability was checked from the cloud-agent VM with `python3` and
`urllib.request`, using a descriptive `User-Agent`.

Validated direct/no-key examples returned:

- Open-Meteo forecast: HTTP 200 JSON.
- Open-Meteo air quality: HTTP 200 JSON.
- Treasury FiscalData debt to penny: HTTP 200 JSON.
- Treasury FiscalData average interest rates: HTTP 200 JSON.
- World Bank indicator API: HTTP 200 JSON.
- ECB yield curve API: HTTP 200 SDMX XML.
- FDA enforcement: HTTP 200 JSON.
- GLEIF LEI records: HTTP 200 JSON:API.
- NASA EONET events: HTTP 200 event feed.
- NOAA CO-OPS water levels: HTTP 200 JSON.
- USGS Water Services streamflow: HTTP 200 JSON.
- ClinicalTrials.gov v2 studies: HTTP 200 JSON.
- SEC Company Facts: HTTP 200 JSON.

Endpoints that should not be treated as immediate based on this check:

- ReliefWeb v1 reports/disasters examples returned HTTP 410.
- A generic OECD SDMX dataflow request returned HTTP 422 and needs curated
  query design.
- One older Treasury FiscalData daily statement path returned HTTP 404; use the
  validated FiscalData v2 endpoints above first.
