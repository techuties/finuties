# Endpoint Expansion Suggestions (Free + Direct Access First)

This file is a prioritized backlog for **new sources/endpoints/scraping** opportunities after checking the currently referenced endpoint set in this repository.

## Priority rules used

1. Free and directly accessible (no paid plan, no hard auth dependency)
2. High downstream value for dashboard + explore + global views
3. Simple and stable payloads first
4. Scraping-only ideas last (higher maintenance and legal risk)

---

## P0 - Immediate (highest value, low friction)

### A) Internal endpoint gaps to close first
These endpoints are already referenced in UI/notebooks and should be formalized in registry + typed wrappers if not fully implemented yet.

1. `/api/v1/data/economy/calendar`
   - Type: Internal consistency gap
   - Why now: already used by `calendar-view`/calendar cards
   - Action: add source-registry entry + `global-data-api.ts` typed fetch + source metadata

2. `/api/v1/data/economy/indicators`
   - Type: Internal consistency gap
   - Why now: used by `econ-indicator` view
   - Action: same as above, with standard filters (`indicator`, `country`, `start_date`, `end_date`)

3. `/api/v1/data/economic/energy`
   - Type: Internal consistency gap
   - Why now: used by energy card
   - Action: define canonical schema (`date`, `series`, `value`, `unit`, `region`)

4. `/api/v1/data/macro/series`
   - Type: Internal consistency gap
   - Why now: used in notebooks
   - Action: unify macro time-series envelope and document filters

5. `/api/v1/data/commodities/prices`
   - Type: Internal consistency gap
   - Why now: used in commodities notebook flow
   - Action: standardize symbols, contract metadata, and frequency filters

### B) New free + direct sources (no key or optional key)

1. `/api/v1/data/economic/worldbank-indicators`
   - Upstream: World Bank API (`api.worldbank.org`)
   - Access: Free, direct, no key
   - Value: broad macro/development coverage with stable country + indicator model
   - Suggested filters: `country_code`, `indicator_code`, `start_year`, `end_year`, `limit`

2. `/api/v1/data/economic/eurostat-series`
   - Upstream: Eurostat dissemination API
   - Access: Free, direct, no key
   - Value: high-quality EU inflation, labor, trade, industry datasets
   - Suggested filters: `dataset`, `geo`, `time`, `freq`, `unit`

3. `/api/v1/data/economic/oecd-series`
   - Upstream: OECD SDMX API
   - Access: Free, direct, no key
   - Value: leading indicators, productivity, confidence, national accounts
   - Suggested filters: `dataset`, `country`, `indicator`, `start_period`, `end_period`

4. `/api/v1/data/weather/open-meteo-extremes`
   - Upstream: Open-Meteo
   - Access: Free, direct, no key
   - Value: fast global weather anomaly and forecast-extreme signals
   - Suggested filters: `lat`, `lon`, `daily_fields`, `start_date`, `end_date`

5. `/api/v1/data/humanitarian/reliefweb-disasters`
   - Upstream: ReliefWeb API
   - Access: Free, direct, no key
   - Value: humanitarian incidents + context complements conflict/disaster layers
   - Suggested filters: `country`, `disaster_type`, `start_date`, `end_date`, `limit`

---

## P1 - High value, next wave

1. `/api/v1/data/governance/sanctions/uk`
   - Upstream: UK sanctions list (OFSI/FCDO open publications)
   - Access: Free, direct downloads
   - Value: closes major sanctions coverage gap (US/EU/UN already present)
   - Note: source format may require light transform versioning

2. `/api/v1/data/governance/sanctions/canada`
   - Upstream: Global Affairs Canada sanctions publications
   - Access: Free, direct
   - Value: improves screening completeness for allied jurisdiction programs

3. `/api/v1/data/climate/nasa-power`
   - Upstream: NASA POWER API
   - Access: Free, direct, no key
   - Value: global radiation/temperature/climate variables with strong geographic utility

4. `/api/v1/data/nature/volcano-alerts`
   - Upstream: Smithsonian GVP + USGS volcano feeds
   - Access: Free, direct
   - Value: complements earthquake + disaster stack with high-impact natural hazard signals

5. `/api/v1/data/transport/opensky-flights`
   - Upstream: OpenSky Network public endpoints
   - Access: Free with public limits
   - Value: adds aviation movement pressure/risk context to global monitoring

---

## P2 - Not immediate (scraping or higher-maintenance)

1. `/api/v1/data/economic/central-bank-calendar`
   - Type: Scraping aggregation (Fed, ECB, BoE, BoJ event calendars)
   - Reason not immediate: frequent markup changes, maintenance overhead

2. `/api/v1/data/commodities/futures-settlement`
   - Type: Scraping delayed settlement pages across exchanges
   - Reason not immediate: legal/usage policy checks and parser fragility

3. `/api/v1/data/maritime/port-congestion`
   - Type: Scraping public port authority dashboards
   - Reason not immediate: inconsistent schemas across ports, normalization burden

4. `/api/v1/data/energy/lng-shipping-news`
   - Type: Scraping + NLP extraction from public reports
   - Reason not immediate: weaker structure quality and higher false-positive risk

---

## Recommended implementation sequence

1. Close P0 internal endpoint gaps already referenced by product code.
2. Add World Bank + Eurostat + OECD as the first new source trio.
3. Add Open-Meteo and ReliefWeb for real-time event enrichment.
4. Expand sanctions to UK/Canada.
5. Keep scraping items behind explicit legal + reliability review.

