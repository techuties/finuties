# New sources, endpoints, and scraping candidates

Created: 2026-06-24

## Scope reviewed

Current FinUties Terminal coverage already includes registered sources for:

- Politics/conflict: UCDP, ACLED placeholder, GDELT, GPR.
- Nature/disasters/weather: USGS earthquakes, GDACS, NOAA weather alerts, EM-DAT.
- Maritime/trade/economy: Global Fishing Watch events, ECB FX rates, CoinGecko, IMF, UN Comtrade, CFTC COT.
- ESG/development/health/demographics/food/climate/biodiversity/sanctions: EPA TRI, WHO/JMP, UN population/UNHCR/IOM, FAO/USDA/WFP, World Bank/UNDP/UNESCO/ILO/ITU, NASA/NOAA/NSIDC/ERA5/VIIRS, GBIF/IUCN, OFAC/EU/UN sanctions.
- Dashboard-only endpoints also use SEC filings, SEC insider transactions, holdings/top companies, macro BLS/BEA, rates, EIA energy, and economic calendar endpoints.

The list below prioritizes new or under-covered sources that are free and directly accessible without account setup. "Direct" means a GET request works with no API key; some sources still require responsible headers, rate limits, attribution, or caching.

## Priority scale

- Immediate: no-key public endpoint, high product value, straightforward JSON/CSV parsing.
- High: no-key public endpoint but needs more modeling, pagination, SDMX handling, or scope control.
- Medium: useful but lower fit, narrower geography, or higher normalization effort.
- Not immediate: free but key-gated, registration-gated, unstable scraping, or duplicate with existing sources.

## Immediate candidates

| Rank | Source | Suggested internal endpoint | Public access | Value | Implementation notes |
| --- | --- | --- | --- | --- | --- |
| 1 | U.S. Treasury Fiscal Data API | `/api/v1/data/fiscal/treasury-debt`, `/api/v1/data/fiscal/daily-treasury`, `/api/v1/data/fiscal/auctions` | `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny?page[size]=1` | Adds debt, cash balance, auction, revenue/spending, and average interest-rate data that fits macro/rates dashboards. | REST JSON, no key. Use `fields`, `filter`, `sort`, and `page[size]`; cache daily. |
| 2 | SEC EDGAR XBRL company facts and concepts | `/api/v1/sec/company-facts`, `/api/v1/sec/company-concept`, `/api/v1/sec/company-tickers` | `https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json`, `https://www.sec.gov/files/company_tickers.json` | Converts existing SEC coverage from filings/events into standardized fundamentals and line-item time series. | No key, but SEC requires a descriptive `User-Agent`. Normalize CIK/ticker lookup first; cache heavily. |
| 3 | FDIC BankFind Suite | `/api/v1/data/banking/fdic-institutions`, `/api/v1/data/banking/fdic-financials`, `/api/v1/data/banking/fdic-failures` | `https://banks.data.fdic.gov/api/institutions?filters=STALP:CA%20AND%20ACTIVE:1&limit=1&format=json` | Adds U.S. bank profiles, failures, branch locations, balance-sheet summaries, deposits, and institution-level risk context. | REST JSON, no key required for normal use. Use API filters instead of broad crawls. |
| 4 | Open-Meteo forecast and historical weather | `/api/v1/data/weather/open-meteo-forecast`, `/api/v1/data/weather/open-meteo-history` | `https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current=temperature_2m` | Adds current/historical weather by coordinate for commodities, logistics, agriculture, and location risk. | No key for non-commercial use; attribution required. Start with coordinate+date bounded queries. |
| 5 | NASA EONET natural events | `/api/v1/data/disasters/eonet-events` | `https://eonet.gsfc.nasa.gov/api/v3/events?limit=1&status=open` | Complements GDACS with NASA-curated wildfires, severe storms, volcanoes, sea/lake ice, landslides, and related imagery links. | JSON and GeoJSON endpoints. Map-friendly geometry; de-duplicate against GDACS by event/date/location. |
| 6 | NOAA SWPC space weather | `/api/v1/data/space-weather/swpc-kp`, `/api/v1/data/space-weather/swpc-forecast` | `https://services.swpc.noaa.gov/json/planetary_k_index_1m.json`, `https://services.swpc.noaa.gov/json/45-day-forecast.json` | Adds geomagnetic/solar risk signals for satellites, aviation, power grids, communications, and risk dashboards. | Static JSON files update frequently. Keep snapshots small and cache by product update cadence. |

## High-value candidates

| Rank | Source | Suggested internal endpoint | Public access | Value | Implementation notes |
| --- | --- | --- | --- | --- | --- |
| 7 | OECD Data Explorer SDMX | `/api/v1/data/economic/oecd-cli`, `/api/v1/data/economic/oecd-cpi`, `/api/v1/data/economic/oecd-short-term` | `https://sdmx.oecd.org/public/rest/dataflow/all/all`; example data: `https://sdmx.oecd.org/public/rest/data/OECD.SDD.STES,DSD_STES@DF_CLI/.M.LI...AA...H?startPeriod=2023-02&dimensionAtObservation=AllDimensions&format=csvfilewithlabels` | High-quality macro indicators: composite leading indicators, CPI/PPI, trade, labour, business tendency, national accounts. | Free but rate-limited. Prefer hand-picked flows and generated static query templates over generic SDMX browsing. |
| 8 | World Bank Indicators API expansion | `/api/v1/data/development/worldbank-indicators` | `https://api.worldbank.org/v2/country/US/indicator/NY.GDP.MKTP.CD?format=json&per_page=1` | Existing development endpoints cover selected WB themes; a generic indicator adapter would unlock thousands of country-year series. | No key. Avoid duplicating current named endpoints; expose curated indicator groups first. |
| 9 | USGS Water Services | `/api/v1/data/water/usgs-instantaneous`, `/api/v1/data/water/usgs-sites` | `https://waterservices.usgs.gov/nwis/iv/?format=json&sites=01646500&parameterCd=00060&period=P1D` | Adds streamflow, gauge height, groundwater, and flood/drought context for infrastructure, agriculture, and climate risk. | No key. WaterML JSON is nested; start with station metadata and latest values by state/parameter. |
| 10 | ECB Data Portal SDMX beyond FX | `/api/v1/data/economic/ecb-rates`, `/api/v1/data/economic/ecb-bank-balance-sheets` | `https://data-api.ecb.europa.eu/service/data/EXR/D.USD.EUR.SP00.A?lastNObservations=1&format=csvdata` | Extends existing ECB FX into euro-area rates, monetary aggregates, bank balance sheets, securities holdings, and APP/PEPP data. | No key. Reuse a narrow SDMX/CSV parser; cache by series frequency. |
| 11 | UK Sanctions List | `/api/v1/data/governance/sanctions/uk` | `https://sanctionslist.fcdo.gov.uk/docs/UK-Sanctions-List.csv` | Adds a major sanctions jurisdiction missing from the current OFAC/EU/UN set. | Direct static CSV/XML. Note that the UK Sanctions List replaced the old OFSI consolidated list in 2026. |

## Medium candidates

| Source | Suggested internal endpoint | Public access | Why not immediate |
| --- | --- | --- | --- |
| OpenAlex | `/api/v1/data/research/openalex-works`, `/api/v1/data/research/openalex-institutions` | `https://api.openalex.org/works?per-page=1` | Useful for innovation, university, and entity-intelligence workflows, but outside the current finance/geopolitical core. |
| Nominatim / OpenStreetMap geocoding | `/api/v1/data/geo/geocode` | `https://nominatim.openstreetmap.org/search?q=Berlin&format=json&limit=1` | Direct and useful, but public endpoint has strict usage policy; better as enrichment with caching, not high-volume product data. |
| Overpass API | `/api/v1/data/geo/osm-overpass` | `https://overpass-api.de/api/interpreter` | Powerful for ports, pipelines, mines, facilities, and POIs, but query design and rate-limit discipline are non-trivial. |
| Wikidata SPARQL | `/api/v1/data/entities/wikidata` | `https://query.wikidata.org/sparql` | Good entity enrichment source; needs careful query limits, result caching, and schema mapping. |
| EU Open Data Portal datasets | `/api/v1/data/eu/open-data-catalog` | `https://data.europa.eu/api/hub/search/datasets?limit=1` | Valuable discovery/catalog layer, but each downstream dataset has different formats and licenses. |
| Canada sanctions | `/api/v1/data/governance/sanctions/canada` | Public consolidated list downloads from Government of Canada | Useful jurisdictional expansion, but should follow UK sanctions after the parser pattern is proven. |

## Not immediate / watchlist

| Source | Reason to defer | Possible path later |
| --- | --- | --- |
| U.S. Census statistical data API | Data queries now require a Census API key as of 2026. | Keep as free key-gated candidate; useful for U.S. demographic/economic subnational data if key management is added. |
| FRED | Free but requires API key. Current macro stack already has rates/BLS/BEA-style coverage. | Add if server-side secret management and rate governance are ready. |
| EIA API v2 | Free key required; existing app already has an internal EIA energy endpoint. | Expand only when the current energy endpoint needs more granularity. |
| ACLED full API | Registration/licensing required for useful current coverage, and registry already contains an ACLED placeholder. | Keep placeholder; implement only after access terms are settled. |
| OpenAQ v3 | Useful air-quality data, but current access generally expects an API key/account. | Revisit if project accepts key-gated environmental sources. |
| IUCN Red List live API | Typically token-gated; registry already has IUCN-style source coverage. | Prefer existing cached/internal source unless live refresh is required. |
| Yahoo Finance unofficial endpoints | Direct but unofficial and prone to blocking/schema changes. | Avoid for production; use only as user-side examples or replace with official exchange/vendor data. |
| Web scraping news/government pages | High maintenance and legal/robots ambiguity compared with public APIs/downloads above. | Use only for sources with stable published CSV/XML/JSON downloads and explicit reuse terms. |

## Suggested implementation order

1. Add Treasury Fiscal Data as the first new endpoint family because it is direct JSON, high finance relevance, and low schema ambiguity.
2. Add SEC company facts/concepts next to enrich current SEC cards and equity notebooks with normalized fundamentals.
3. Add FDIC BankFind for bank/institution risk coverage.
4. Add Open-Meteo and NASA EONET together as new weather/disaster layers with map-ready shapes.
5. Add NOAA SWPC as a small, low-cost event/risk card.
6. Add OECD, World Bank generic indicators, USGS water, ECB SDMX, and UK sanctions after the ingestion framework is comfortable with CSV/SDMX/static downloads.

## Live endpoint checks performed

Representative requests returned HTTP 200 on 2026-06-24:

- U.S. Treasury Fiscal Data: `debt_to_penny?page[size]=1`.
- NASA EONET: `events?limit=1&status=open`.
- Open-Meteo: current forecast for Berlin coordinates.
- World Bank: U.S. GDP indicator, JSON, one row.
- NOAA SWPC: `planetary_k_index_1m.json`.
- SEC: `company_tickers.json`.
- OECD: `dataflow/all/all` and the official CLI CSV example.
- FDIC: active California institutions, one row.
- USGS Water Services: one-day discharge values for station `01646500`.
- ECB Data Portal: one USD/EUR FX observation in CSV format.
- UK Sanctions List: static CSV download.
