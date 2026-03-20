# New Sources / Endpoints / Scraping Suggestions

## Scope checked (already implemented)
- Source registry reviewed in `terminal/src/lib/source-registry.ts` and card-level calls in `terminal/src/lib/cards/*`.
- Existing coverage already includes: UCDP, ACLED (placeholder), GDELT, USGS earthquakes, GDACS, NOAA alerts, IMF, Comtrade, CFTC, WHO, UN/World Bank development metrics, climate baselines, GBIF, OFAC/EU/UN sanctions, SEC filings/insider flows, rates, and calendar endpoints.

## Prioritization logic
1. **High value + immediate** = free + directly accessible + stable API.
2. **High value + near-term** = free but needs lightweight key, stricter limits, or heavier normalization.
3. **Not immediate** = legal/commercial friction, brittle scraping, or high maintenance burden.

---

## 1) High value + immediate (implement first)

| Candidate | Public endpoint (example) | Access | Ingestion | Why high value | Suggested internal route |
|---|---|---|---|---|---|
| NASA EONET natural events | `https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=30` | No auth | API | Real-time wildfire/storm/volcano event feed complements GDACS + NOAA. | `/api/v1/data/disasters/eonet` |
| Open-Meteo forecast + historical | `https://api.open-meteo.com/v1/forecast?...` and `https://archive-api.open-meteo.com/v1/archive?...` | No auth | API | Adds global weather nowcast/forecast data (missing outside NOAA-US alerts). | `/api/v1/data/weather/open-meteo` |
| USGS NWIS river/stream gauges | `https://waterservices.usgs.gov/nwis/iv/?format=json&sites=01646500&parameterCd=00060` | No auth | API | Flood/drought signal for risk and commodity logistics. | `/api/v1/data/water/usgs-streamflow` |
| ReliefWeb disaster + conflict reports | `https://api.reliefweb.int/v1/reports` | No auth | API | Humanitarian severity context and narrative signal around events. | `/api/v1/data/humanitarian/reliefweb-reports` |
| OpenSky live aircraft states | `https://opensky-network.org/api/states/all` | No auth (rate-limited) | API | Aviation disruption and conflict-adjacent mobility signal. | `/api/v1/data/transport/opensky-states` |
| Eurostat datasets (macro/labor/energy) | `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/` | No auth | API | High-quality official EU macro/industry data, useful for regional risk dashboards. | `/api/v1/data/economic/eurostat` |
| Our World in Data grapher exports | `https://ourworldindata.org/grapher/co2.csv` | No auth | API/CSV | Fast way to expand validated country-level indicators with reproducible series. | `/api/v1/data/indicators/owid` |

---

## 2) High value + near-term

| Candidate | Public endpoint (example) | Access | Ingestion | Constraint | Suggested internal route |
|---|---|---|---|---|---|
| NASA FIRMS active fire detections | `https://firms.modaps.eosdis.nasa.gov/api/` | Free key | API | Requires MAP key and careful quota handling. | `/api/v1/data/climate/firms-fires` |
| OpenAQ air quality observations | `https://api.openaq.org/v3/locations` | Free key/tier | API | Versioned API and tier limits; still strong global pollution signal. | `/api/v1/data/environment/openaq` |
| SEC Company Facts (fundamentals) | `https://data.sec.gov/api/xbrl/companyfacts/CIK##########.json` | No key (UA required) | API | Need robust CIK mapping + rate etiquette, but very high equity value. | `/api/v1/data/sec/company-facts` |
| BLS broad labor expansion | `https://api.bls.gov/publicAPI/v2/timeseries/data/` | Free (key optional) | API | Already partially used; scale-up needs cataloging and cache layer. | `/api/v1/data/macro/bls-expanded` |
| CDC data via Socrata (health) | `https://data.cdc.gov/resource/...json` | No key for small usage | API | Endpoint-by-endpoint schema variation and throttling policy. | `/api/v1/data/health/cdc` |

---

## 3) Not immediate (backlog / evaluate later)

| Candidate | Access reality | Ingestion | Why not immediate |
|---|---|---|---|
| ACLED full production feed | Licensed/restricted | API | Legal/commercial restrictions despite high value. |
| IEA detailed energy datasets | Key/commercial constraints | API | Access friction and terms management. |
| Commercial maritime AIS enrichments | Mostly paid | API | Cost and redistribution limits are significant. |
| OPEC Monthly Oil Market Report tables | Free PDFs | Scraping/PDF extraction | Parsing quality/maintenance overhead is high for production reliability. |
| Country-level customs press bulletins | Mostly HTML/PDF | Scraping | Fragile selectors, multilingual normalization, ongoing maintenance. |

---

## Implementation order recommendation
1. `eonet` -> `open-meteo` -> `usgs-streamflow` -> `reliefweb-reports` (all no-auth, immediate value).
2. Add `opensky-states` with strict caching and rate-limit guard.
3. Add `eurostat` and `owid` for broad indicator expansion with minimal legal risk.
4. Move to key-based sources (`firms`, `openaq`) after no-auth wins are stable.

## Minimal contract for each new source
- Source registry entry (`id`, `label`, `endpoint`, `geoType`, columns, filters).
- Adapter/normalizer with retry + deterministic field mapping.
- Lightweight smoke test using a fixed query + schema assertion.
- Card/explore wiring only after source-level validation passes.
