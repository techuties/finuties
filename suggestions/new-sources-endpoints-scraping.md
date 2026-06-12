# New Sources, Endpoints, and Scraping Suggestions

This backlog reviews the currently exposed FinUties endpoint families and proposes new upstream sources to implement next. The emphasis is on sources that are free, directly reachable without secrets, and useful for terminal cards, global maps, notebooks, or backend ingestion.

Endpoint probes were run from the agent environment on 2026-06-12 using small sample requests and a FinUties User-Agent.

## Priority rubric

- **P0 - immediate:** public endpoint returned HTTP 200 from the agent environment, no API key observed, structured JSON/CSV, clear product value.
- **P1 - near-term:** public and useful, but either overlaps current endpoints, has heavier parsing/volume concerns, or needs stricter rate-limit handling.
- **P2 - free but gated:** likely free, but requires a key, approved app name, account, or provider review.
- **P3 - not immediate / scraping:** blocked by browser challenge, regional restrictions, unofficial terms, or fragile scraping.

## Current endpoint families reviewed

The terminal app currently treats `https://data.finuties.com` as the API origin and keeps global source metadata in `terminal/src/lib/source-registry.ts`. Current sources already cover:

- **Politics/conflict:** UCDP, GDELT, GPR, and an ACLED placeholder.
- **Nature/disasters/weather:** USGS earthquakes, GDACS, NOAA weather alerts, EM-DAT.
- **Maritime:** Global Fishing Watch vessel events.
- **Economy/trade/markets:** ECB FX, CoinGecko crypto, IMF, UN Comtrade, CFTC COT, BLS/BEA macro cards, Treasury/NY Fed rate cards, SEC/market/holdings endpoints.
- **Environment/health/demographics/food/development/climate/biodiversity/sanctions:** EPA TRI, WHO/JMP, UN/UNHCR/IOM, FAO/USDA/WFP, World Bank/UNDP/UNESCO/ILO/ITU, NASA/NOAA/NSIDC/Copernicus/VIIRS, GBIF/IUCN, OFAC/EU/UN sanctions.

Preferred FinUties path style remains `/api/v1/data/{domain}/{resource}` for global sources, with domain-specific roots such as `/api/v1/sec/...`, `/api/v1/market/...`, `/api/v1/rates/...`, and `/api/v1/cftc/...` where already established.

## P0 - high value and directly accessible

| Source | Suggested FinUties endpoint | Upstream sample tested | Access result | Why it is valuable | Implementation notes |
| --- | --- | --- | --- | --- | --- |
| SEC EDGAR Company Facts | `/api/v1/sec/company-facts` | `https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json` | 200 JSON | Company-level fundamentals directly from SEC XBRL; useful for normalized financial statement facts, KPI cards, and notebooks. | Requires SEC-compliant User-Agent and CIK normalization. Overlaps existing SEC financial statements, so implement as source/audit layer or fact drill-down. |
| SEC EDGAR Submissions | `/api/v1/sec/submissions` | `https://data.sec.gov/submissions/CIK0000320193.json` | 200 JSON | Official company filing history, accession numbers, form mix, and recent filing metadata. | Reuse existing SEC filing concepts; add CIK/ticker resolver and cache recent filings aggressively. |
| US Treasury Fiscal Data | `/api/v1/data/economy/treasury-fiscal` | `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny?sort=-record_date&page%5Bsize%5D=1` | 200 JSON | Expands beyond rate/debt cards into debt composition, auctions, daily statements, receipts, outlays, and fiscal balance. | API supports filters, sort, pagination. Start with debt-to-penny and auction datasets, then add dataset registry discovery. |
| NASA POWER weather and solar | `/api/v1/data/climate/nasa-power` | `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M&community=RE&longitude=0&latitude=0&start=20250101&end=20250101&format=JSON` | 200 JSON | Free point weather, renewable energy, and agro-climate variables for risk, agriculture, and energy analysis. | Good fit for parameterized point queries. Cache by lat/lon/date/parameter and expose a small approved parameter set first. |
| Eurostat dissemination API | `/api/v1/data/economy/eurostat` | `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/une_rt_m?lang=en&geo=DE&sex=T&age=Y15-74&s_adj=SA&unit=PC_ACT&time=2025-01` | 200 JSON | High-value EU unemployment, inflation, national accounts, energy, trade, population, and industry series. | Add dataset allowlist instead of a fully generic proxy. Normalize dimensions and country codes. |
| BLS public API | `/api/v1/data/macro/bls-public-series` | `https://api.bls.gov/publicAPI/v2/timeseries/data/LNS14000000?startyear=2025&endyear=2025` | 200 JSON | No-key access to core US labor/inflation series; useful for notebooks and macro cards. | Current app already has BLS macro endpoints; use this to broaden public series coverage or document the upstream fallback. |
| USGS Water Services | `/api/v1/data/water/usgs-observations` | `https://waterservices.usgs.gov/nwis/iv/?format=json&sites=01646500&period=P1D&parameterCd=00060` | 200 JSON | Streamflow, gauges, drought/flood context, and water risk by site. | Start with instantaneous values for discharge and gauge height. Add site metadata and map points. |
| NOAA NWS stations and observations | `/api/v1/data/weather/observations` | `https://api.weather.gov/stations?limit=1` | 200 GeoJSON | Complements existing NOAA alerts with station metadata, current observations, forecasts, zones, and gridpoints. | Requires User-Agent. Use GeoJSON mapping for station points; add observation endpoint after station lookup. |
| Open-Meteo forecast/archive | `/api/v1/data/weather/open-meteo` | `https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current=temperature_2m` | 200 JSON | Very easy free weather forecasts, historical weather, marine, flood, and air-quality variants. | Non-government provider; check usage terms before production. Excellent for fast prototypes and notebooks. |
| Coinbase Exchange public market data | `/api/v1/data/crypto/coinbase-ticker` | `https://api.exchange.coinbase.com/products/BTC-USD/ticker` | 200 JSON | Direct crypto ticker/candles/order-book data without the regional block observed on Binance. | Useful fallback/second source beside CoinGecko. Add product allowlist and rate-limit handling. |
| OpenAlex scholarly graph | `/api/v1/data/research/openalex-works` | `https://api.openalex.org/works?filter=from_publication_date:2026-01-01&per-page=1` | 200 JSON | Free research, institution, funder, author, and topic data for innovation and macro trend analysis. | Add email/user-agent etiquette. Start with works by topic/date and institution/funder profiles. |
| Wikidata SPARQL | `/api/v1/data/reference/wikidata` | `https://query.wikidata.org/sparql?...&format=json` | 200 JSON | Entity reference layer for country/company identifiers, relationships, sectors, exchanges, and metadata enrichment. | Do not expose arbitrary SPARQL initially. Ship curated query templates and cache responses. |
| OpenSanctions dataset index | `/api/v1/data/governance/opensanctions` | `https://data.opensanctions.org/datasets/latest/index.json` | 200 JSON | Broad sanctions, PEP, enforcement, and risk datasets that can complement OFAC/EU/UN lists. | Large downstream datasets; confirm license and choose focused datasets before ingestion. |
| UK OFSI consolidated sanctions CSV | `/api/v1/data/governance/sanctions/uk` | `https://ofsistorage.blob.core.windows.net/publishlive/2022format/ConList.csv` | 200 CSV | Adds UK sanctions coverage as a natural peer to OFAC, EU, and UN sanctions. | CSV is large; stream/download in ingestion job and normalize names, aliases, regimes, and dates. |

## P1 - direct but best after scoped design

| Source | Suggested endpoint | Access result | Reason to defer slightly |
| --- | --- | --- | --- |
| World Bank indicator API | `/api/v1/data/development/world-bank-indicators` | 200 JSON | The app already exposes several World Bank-derived development endpoints. Add only if a generic indicator-series endpoint is useful for notebooks or user-selected indicators. |
| Treasury Fiscal Data dataset catalog | `/api/v1/data/economy/treasury-datasets` | Same public API family as tested Treasury endpoint | Valuable for discovery, but the catalog-to-endpoint mapping should be curated to avoid a generic unbounded proxy. |
| NOAA NWS gridpoints/forecast zones | `/api/v1/data/weather/forecasts` | Same public API family as tested stations endpoint | High value for weather cards, but gridpoint lookup and caching need a small resolver workflow. |
| SEC bulk submissions/company facts archives | `/api/v1/sec/bulk-archives` | Same public provider as tested SEC endpoints | Better as backend ingestion than request-time API because payloads are large. |
| OpenSanctions focused datasets | `/api/v1/data/governance/peps` | index returned 200 | Pick specific datasets and license posture before adding UI-facing endpoints. |

## P2 - free or public, but not directly accessible from this run

| Source | Probe result | Why it is still interesting | Next action |
| --- | --- | --- | --- |
| US Census Data API | Returned a "Missing Key" HTML page for ACS sample request | High-value US demographics, business, housing, and geography data. | Treat as free-key integration; add only if FinUties can hold a Census key. |
| OpenAQ v3 | 401 JSON for unauthenticated locations request | Global air-quality observations fit environment/climate cards. | Requires API key or approved token flow. |
| ReliefWeb API | 403 JSON requiring approved `appname`; v1 returned 410 | Humanitarian crises, reports, disasters, and country updates. | Request approved app name before implementation. |
| FEMA OpenFEMA | 403 HTML from the agent environment | Disaster declarations, public assistance, mitigation, and emergency management data. | Recheck from production network or use downloadable bulk files if accessible. |
| FRED | Known free API key requirement | Core macro time series would be valuable where BLS/BEA/Treasury do not cover enough. | Add only as keyed integration or via allowed public CSV mirrors. |
| EIA API | Known API key requirement for current API | Energy production, inventories, prices, grid data. | Free-key integration; useful but less aligned with "directly accessible" preference. |
| ACLED | Current registry has a placeholder; provider requires access controls | Best-in-class political violence/protest events. | Implement only after license/access approval. |

## P3 - not immediate / scraping candidates

| Source | Probe result | Risk | Recommendation |
| --- | --- | --- | --- |
| Stooq CSV downloads | 200 HTML browser-verification page, not CSV, from the agent environment | Browser challenge makes automated ingestion brittle. | Do not prioritize unless a stable licensed mirror is available. |
| Binance public ticker | 451 JSON from the agent environment | Regional/legal restriction from this runtime. | Prefer Coinbase or CoinGecko for immediate crypto data. |
| Yahoo Finance query/download endpoints | Not probed in this run | Unofficial API surface and terms risk. | Keep as "not immediate" scraping fallback only. |
| Companies House API | Free but API-key based | Key management and country-specific scope. | Consider later for UK company registry coverage. |
| Web pages without documented API or bulk files | N/A | Layout churn, robots/terms risk, unclear provenance. | Prefer official APIs, stable CSV/JSON downloads, or provider-approved bulk datasets. |

## Suggested implementation sequence

1. **UK sanctions:** add OFSI CSV ingestion to complete the sanctions set with a very clear schema and high compliance value.
2. **Treasury Fiscal Data expansion:** add curated datasets for debt composition and auction results.
3. **NOAA observations + USGS water:** add mappable hazard/weather/water observations that complement existing alerts and earthquakes.
4. **SEC company facts/submissions:** expose official raw fact/submission drill-downs or use them to audit existing SEC-derived endpoints.
5. **Eurostat + NASA POWER:** add international macro/climate coverage with parameter allowlists.
6. **OpenSanctions focused datasets:** add only after selecting datasets and confirming license/volume.

## Endpoint entry template for future additions

```markdown
### Provider name

- **Suggested id:** `snake_case_id`
- **Suggested endpoint:** `/api/v1/data/{domain}/{resource}`
- **Upstream URL:** `https://...`
- **Access:** direct public | free key | approved app name | scraping
- **Verified result:** HTTP status, content type, date checked
- **Geo type:** point | centroid | country | none
- **Primary fields:** field names to normalize
- **Implementation target:** `source-registry.ts`, card, notebook, ingestion job, or backend proxy
- **Notes:** rate limits, licensing, overlap with existing source IDs
```
