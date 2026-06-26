# New sources, endpoints, and scraping candidates

This file records candidate data sources to implement after checking the current
FinUties Community terminal and notebook endpoints. It prioritizes free,
directly accessible sources first, then free-but-keyed sources, then sources
that need registration, scraping, licensing review, or heavier parser work.

## Existing coverage checked

Primary source catalog: `terminal/src/lib/source-registry.ts`.

Current high-level coverage already includes:

- Politics and conflict: UCDP, GDELT, GPR, and an ACLED placeholder.
- Nature and disasters: USGS earthquakes, GDACS, NOAA weather alerts, EM-DAT.
- Maritime: Global Fishing Watch vessel events.
- Economy and trade: ECB FX, CoinGecko, IMF, UN Comtrade, CFTC COT.
- Environment, health, demographics, food, development, climate, biodiversity,
  and sanctions: 33 newer catalog sources.
- Additional non-catalog API domains in cards/explorer: SEC, holdings, market,
  rates, macro, calendar, search, and entity discovery.

Notable gaps before adding anything new:

1. ACLED is still marked as a placeholder.
2. Rates, macro, SEC, market, and holdings endpoints are useful but are not all
   exposed through the data catalog.
3. Notebook endpoints for macro series and commodities prices are not mirrored
   as first-class catalog sources.
4. Calendar usage appears split between `/api/v1/calendar/events` and
   `/api/v1/data/economy/calendar`.
5. `global-data-api.ts` has typed fetchers only for the earlier source set; most
   newer registry sources rely on generic `fetchSource(...)`.

## Ranking key

- `Immediate`: no API key, no browser scraping, simple JSON/CSV/XML response,
  and a strong fit for existing FinUties categories.
- `High value, not immediate`: free but requires an API key, approved app name,
  account, custom bulk ingestion, or heavier parser/contract work.
- `Later`: useful but less central to FinUties, more rate-limited, license-bound,
  or operationally complex.

Live accessibility probes were run from this environment on 2026-06-26 for the
top immediate candidates and one existing Treasury reference source. NASA EONET,
Open-Meteo, U.S. Treasury FiscalData, Bank of Canada Valet, FDIC failures, and
the UK Sanctions List CSV returned HTTP 200. Treasury FiscalData is not ranked
below because related treasury debt data already appears in the current app.
ReliefWeb returned HTTP 403 without an approved app name, so it is ranked as not
immediate.

## Immediate, high-value candidates

| Priority | Source | Fit | Upstream access | Proposed FinUties endpoint | Implementation notes |
| --- | --- | --- | --- | --- | --- |
| 1 | UK Sanctions List | Completes sanctions coverage beyond US, EU, and UN. The UK Sanctions List is now the single UK source after OFSI consolidation closed in 2026. | Static CSV: `https://sanctionslist.fcdo.gov.uk/docs/UK-Sanctions-List.csv`; no key. | `/api/v1/data/governance/sanctions/uk` | Parse CSV rows into the same sanctions shape used by OFAC/EU/UN: `entity_name`, `entity_type`, `regime`, `country`, `program`, aliases, identifiers, and list date. Add `uk_sanctions` source registry entry under `sanctions`. |
| 2 | NASA EONET natural events | Adds global real-time wildfires, storms, volcanoes, dust, sea/lake ice, and other event categories. Complements GDACS and USGS. | JSON/GeoJSON API: `https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=100`; docs: `https://eonet.gsfc.nasa.gov/docs/v3`. | `/api/v1/data/disasters/eonet` or `/api/v1/data/nature/eonet` | Prefer `events/geojson` for map-ready geometry. Normalize category, title, event date, status, source links, magnitude, latitude/longitude for points, and polygon centroid/bounds for polygon events. |
| 3 | FDIC BankFind failures | Adds financial-stability risk data with bank failures, assets, deposits, estimated cost, and resolution type. Strong dashboard and explorer fit. | JSON API: `https://banks.data.fdic.gov/api/failures?fields=NAME,CERT,FIN,CITYST,FAILDATE,RESTYPE,QBFDEP,QBFASSET,COST&sort_by=FAILDATE&sort_order=DESC&limit=100&format=json`; docs: `https://api.fdic.gov/banks/docs`. | `/api/v1/data/financial/fdic-failures` | This may justify a new `financial` or `risk` catalog category. If category changes are too invasive, start under `economy`. Normalize dates and currency amounts. |
| 4 | Open-Meteo global forecast | Extends current NOAA U.S.-centric alerts with no-key global weather forecasts. Useful for commodities, logistics, climate, and risk workflows. | JSON API: `https://api.open-meteo.com/v1/forecast?latitude=40.71&longitude=-74.01&daily=temperature_2m_max,precipitation_sum&timezone=UTC`; docs: `https://open-meteo.com/en/docs`. | `/api/v1/data/weather/global-forecast` | Needs a query contract for coordinates or country/city resolution. Start with coordinate-based requests and cache by rounded lat/lon plus date. |
| 5 | Bank of Canada Valet | Adds no-key central-bank time series for FX, bond yields, policy/rate, and Canadian macro/financial data. | JSON API: `https://www.bankofcanada.ca/valet/observations/FXUSDCAD/json?recent=10`; group example: `/valet/observations/group/FX_RATES_DAILY/json`; docs: `https://www.bankofcanada.ca/valet/`. | `/api/v1/data/rates/boc-observations` | Keep this generic: accept `series` or `group`, `start_date`, `end_date`, `recent`. Normalize Valet `{d, SERIES: {v}}` observations into long rows. |
| 6 | HDX public dataset metadata | Adds humanitarian datasets and resource discovery without ReliefWeb's approved-app-name blocker. Good bridge for crisis, refugee, food, health, and conflict datasets. | CKAN API: `https://data.humdata.org/api/3/action/package_search?q=conflict&rows=10`; docs: `https://docs.humdata.org/build/hdx-apis/hdx-api-overview`. | `/api/v1/data/humanitarian/hdx-datasets` | Start as metadata search rather than full data ingestion. Expose package title, organization, tags, countries, updated date, resource formats, and resource URLs. |

## High value, not immediate

| Priority | Source | Why valuable | Blocker or extra work | Candidate endpoint |
| --- | --- | --- | --- | --- |
| 7 | ReliefWeb reports, disasters, jobs, training | Curated OCHA humanitarian updates, disasters, country reports, and situation content. | Public read API now requires an `appname`, and live probe returned HTTP 403 with an unapproved app name. Needs an approved FinUties app name before implementation. | `/api/v1/data/humanitarian/reliefweb-reports` |
| 8 | EIA energy API and bulk data | Deep energy coverage: petroleum, natural gas, electricity, storage, generation, consumption, prices. Strong fit for the existing energy card. | API is free but requires a registered EIA key. Bulk downloads can avoid the key but need bulk-file ingestion and refresh jobs. | `/api/v1/data/energy/eia-series` |
| 9 | FRED economic series | Huge macro time-series library and useful for notebooks, macro cards, and user-driven analysis. | Free API key required for every request. Needs secret/config support and clear per-user vs server-key policy. | `/api/v1/data/macro/fred-series` |
| 10 | USDA NASS Quick Stats | Crop progress, conditions, acreage, yield, livestock, and price data. Strong agriculture and commodities fit. | Free API key required; needs indicator discovery and dimensional filters. | `/api/v1/data/food/usda-nass` |
| 11 | OECD SDMX / OECD Data Explorer | Broad international macro, trade, labor, education, and productivity indicators. | Direct access is possible, but SDMX dimensions and dataset discovery require heavier adapter work. | `/api/v1/data/development/oecd-series` |
| 12 | BIS statistics | Credit, debt securities, exchange rates, property prices, and banking statistics. | High-value SDMX source but schema discovery and transformations are more complex than JSON/CSV feeds. | `/api/v1/data/financial/bis-series` |

## Later or conditional candidates

| Source | Reason to defer | Notes |
| --- | --- | --- |
| ACLED | Existing placeholder, but production use requires registration/API access and license review. | Keep placeholder visible but do not treat as direct/free. If access is approved, it becomes a top politics/conflict source. |
| OpenSky Network aircraft states | Anonymous access exists but is heavily rate-limited and less core to finance than maritime/trade sources. | Could support air logistics or sanctions/vessel-style entity monitoring later. |
| Copernicus Climate Data Store | Strong climate value but uses account-backed workflows and asynchronous download jobs. | Better for batch pipelines than request/response terminal endpoints. |
| Protected Planet / WDPA | Good biodiversity and conservation layer. | Licensing/download workflow should be checked before public redistribution. |
| Central bank speech/minutes feeds | Useful for macro narrative search. | Mostly RSS/HTML scraping; implement after data APIs and decide how to store text/search indexes. |
| Company news RSS/sitemaps | Useful for entity explorer enrichment. | Scraping and licensing risk are higher; prefer official APIs already used by SEC/market sections. |

## Endpoint shape recommendation

New server endpoints should keep the existing global-data envelope:

```json
{
  "source": "source_id",
  "count": 0,
  "items": [],
  "cached": true
}
```

Recommended minimum fields per endpoint:

- `source_id`: stable source identifier matching `source-registry.ts`.
- `observed_at` or source-specific event date.
- `country` and `country_code` where available.
- `latitude` and `longitude` for point sources, or a documented centroid policy
  for polygons.
- `source_url` for upstream traceability.
- `raw_id` or upstream stable identifier for dedupe.
- `updated_at` when upstream provides it.

Implementation order:

1. Add backend route and parser with cache.
2. Add `SOURCES` entry in `source-registry.ts`.
3. Add typed fetcher in `global-data-api.ts` for immediate/high-use sources.
4. Add a dashboard card or explorer view only when the source has clear UI value.
5. Add notebook examples for analysis-oriented time series such as Valet, EIA,
   FRED, OECD, or BIS.

## Suggested first implementation batch

1. `uk_sanctions`: very high value, static CSV, fills an obvious sanctions gap.
2. `eonet_events`: high map value, no key, low integration friction.
3. `fdic_failures`: finance-specific, no key, adds a new risk signal.
4. `boc_observations`: no-key central-bank time series with reusable adapter.
5. `open_meteo_forecast`: broadens weather coverage beyond U.S. alerts.

This batch gives a balanced mix of sanctions, disaster risk, financial risk,
rates/macro, and weather without requiring new secrets or scraping fragile HTML.
