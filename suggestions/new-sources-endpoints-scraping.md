# New source, endpoint, and scraping suggestions

Date checked: 2026-06-20

## Scope

This file lists new data sources and endpoint families that would add the most value to the FinUties data catalog and related entity workflows. Priority favors sources that are:

1. free to use,
2. directly accessible without an API key or login,
3. structured as JSON, CSV, TSV, or stable delimited text,
4. materially different from existing registry coverage.

## Existing coverage checked

The current terminal registry is centered in `terminal/src/lib/source-registry.ts` and defines 51 API endpoint paths. It already covers:

- Politics/conflict: UCDP, ACLED placeholder, GDELT, GPR.
- Nature/disasters: USGS earthquakes, GDACS, NOAA weather alerts, EM-DAT.
- Maritime/fishing: Global Fishing Watch vessel events.
- Economy/trade/markets: ECB FX, CoinGecko crypto, IMF, UN Comtrade, CFTC legacy/disaggregated COT.
- Environment/ESG: EPA TRI facilities.
- Health/demographics/food/development: WHO, JMP, UN population, UNHCR, IOM, FAO, USDA WASDE, WFP, World Bank, UNDP, UNESCO, ILO, ITU.
- Climate/biodiversity/sanctions: NASA/NOAA/NSIDC/Copernicus-style climate datasets, GBIF, IUCN, OFAC, EU, UN sanctions.

Entity workflows outside the registry also call SEC and market endpoints, including filings, insider transactions, beneficial ownership, holdings, financial statements, agreements, stock info, stock prices, investors, news items, and search suggestions.

## Live accessibility checks

Representative probes were run from the development VM. These sources returned usable structured data:

| Source | Probe result | Example endpoint |
| --- | --- | --- |
| SEC submissions | 200 JSON | `https://data.sec.gov/submissions/CIK0000320193.json` |
| SEC company facts | 200 JSON | `https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json` |
| Treasury FiscalData debt | 200 JSON | `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny?sort=-record_date&page[size]=1` |
| GLEIF LEI records | 200 JSON:API | `https://api.gleif.org/api/v1/lei-records?page[size]=1` |
| NASA EONET | 200 JSON body | `https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=1` |
| NOAA SWPC K index | 200 JSON | `https://services.swpc.noaa.gov/json/planetary_k_index_1m.json` |
| Nasdaq listed symbols | 200 pipe-delimited text | `https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt` |
| Open-Meteo forecast | 200 JSON | `https://api.open-meteo.com/v1/forecast?latitude=40.71&longitude=-74.01&hourly=temperature_2m&forecast_days=1` |
| BTS border crossings | 200 JSON | `https://data.transportation.gov/resource/keg4-3bc2.json?$limit=1` |
| BLS public API | 200 JSON | `https://api.bls.gov/publicAPI/v2/timeseries/data/CUSR0000SA0?startyear=2024&endyear=2024` |
| Federal Reserve Data Download | 200 CSV | `https://www.federalreserve.gov/datadownload/Output.aspx?rel=H15&series=bf17364827e38702b42a58cf8eaa3f78&lastObs=5&filetype=csv&label=include&layout=seriescolumn&type=package` |
| Eurostat dissemination API | 200 JSON | `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/une_rt_m?geo=DE&sex=T&age=TOTAL&s_adj=SA&unit=PC_ACT&lastTimePeriod=1` |

Sources checked but not ranked as immediate:

- ReliefWeb v2 returned 403 until an approved appname is requested.
- OpenAQ v3 returned 401 and should be treated as authenticated.
- NASA FIRMS global active-fire API requires a free MAP_KEY.
- NVD CVE 2.0 is documented as free without a key for low-volume use, but live probes timed out from this VM; use only after retry/rate-limit validation.
- Nasdaq current halt and Reg SHO probe URLs returned HTML instead of direct feed data from this VM; validate the exact downloadable files before implementation.

## Ranked implementation backlog

### 1. High value and immediate

#### 1.1 US Treasury FiscalData API

- Proposed catalog ids: `treasury_debt_to_penny`, `treasury_interest_expense`, `treasury_auctions`.
- Proposed FinUties paths:
  - `/api/v1/data/treasury/debt-to-penny`
  - `/api/v1/data/treasury/interest-expense`
  - `/api/v1/data/treasury/auctions`
- External examples:
  - `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny`
  - `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/avg_interest_rates`
  - `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/auctions_query?filter=security_type:eq:Bill&sort=-auction_date&page[size]=10`
- Why high value: fills a sovereign debt, rates, issuance, and fiscal risk gap with official structured data.
- Directness: free JSON API, no key observed.
- Suggested first fields: `record_date`, `tot_pub_debt_out_amt`, `debt_held_public_amt`, `intragov_hold_amt`, `security_type`, `security_term`, `auction_date`, `high_yield`, `bid_to_cover_ratio`, `avg_interest_rate_amt`.
- Notes: FiscalData APIs support filtering, sorting, pagination, and field selection. Add pagination guards and schema-normalized decimal parsing.

#### 1.2 SEC XBRL frames and company facts

- Proposed catalog ids: `sec_xbrl_company_facts`, `sec_xbrl_frames`.
- Proposed FinUties paths:
  - `/api/v1/data/sec/company-facts`
  - `/api/v1/data/sec/xbrl-frames`
- External examples:
  - `https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json`
  - `https://data.sec.gov/api/xbrl/frames/us-gaap/Revenues/USD/CY2023Q4I.json`
- Why high value: existing entity financial-statement views can be complemented by cross-company, standardized factor tables for fundamentals, sector comparisons, and screeners.
- Directness: free JSON, no key; SEC requires a descriptive User-Agent.
- Suggested first fields: `cik`, `entityName`, `taxonomy`, `concept`, `unit`, `fy`, `fp`, `frame`, `val`, `accn`, `filed`.
- Notes: Do not duplicate the existing filings/financial-statements UI. Position this as normalized fundamentals and cross-issuer frames.

#### 1.3 GLEIF LEI records

- Proposed catalog ids: `gleif_lei_records`, `gleif_relationships`.
- Proposed FinUties paths:
  - `/api/v1/data/entities/lei-records`
  - `/api/v1/data/entities/lei-relationships`
- External examples:
  - `https://api.gleif.org/api/v1/lei-records?page[size]=1`
  - `https://api.gleif.org/api/v1/lei-records?filter[entity.legalName]=Apple&page[size]=5`
- Why high value: improves issuer, counterparty, parent, and jurisdiction resolution for SEC entities, sanctions entities, and market data.
- Directness: free JSON:API, no key observed.
- Suggested first fields: `lei`, `legal_name`, `jurisdiction`, `legal_form`, `entity_status`, `registration_status`, `initial_registration_date`, `last_update_date`, `managing_lou`.
- Notes: Add entity matching carefully; LEI legal names often differ from ticker or SEC names.

#### 1.4 BLS Public Data API

- Proposed catalog ids: `bls_cpi`, `bls_unemployment`, `bls_payrolls`.
- Proposed FinUties paths:
  - `/api/v1/data/economic/bls/cpi`
  - `/api/v1/data/economic/bls/labor`
- External example:
  - `https://api.bls.gov/publicAPI/v2/timeseries/data/CUSR0000SA0?startyear=2024&endyear=2024`
- Why high value: fills US inflation, labor, earnings, and sector-level macro series that are central for market dashboards.
- Directness: free JSON without registration for low-volume requests.
- Suggested first fields: `seriesID`, `year`, `period`, `periodName`, `value`, `footnotes`.
- Notes: The unregistered API has range and rate limits. Start with a curated series list instead of open-ended series discovery.

#### 1.5 Federal Reserve Data Download Program

- Proposed catalog ids: `fed_h15_rates`, `fed_h41_balance_sheet`.
- Proposed FinUties paths:
  - `/api/v1/data/fed/h15-rates`
  - `/api/v1/data/fed/h41-balance-sheet`
- External example:
  - `https://www.federalreserve.gov/datadownload/Output.aspx?rel=H15&series=bf17364827e38702b42a58cf8eaa3f78&lastObs=5&filetype=csv&label=include&layout=seriescolumn&type=package`
- Why high value: avoids FRED API-key dependency while adding official rates and Fed balance-sheet data.
- Directness: free CSV, no key observed.
- Suggested first fields: `date`, `series_id`, `series_name`, `value`, `frequency`, `units`.
- Notes: Series ids are opaque. Ship a small curated map for H.15 Treasury yields, SOFR-related rates, and H.4.1 aggregates.

#### 1.6 Eurostat Dissemination API

- Proposed catalog ids: `eurostat_unemployment`, `eurostat_hicp`, `eurostat_gdp`.
- Proposed FinUties path: `/api/v1/data/economic/eurostat`
- External example:
  - `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/une_rt_m?geo=DE&sex=T&age=TOTAL&s_adj=SA&unit=PC_ACT&lastTimePeriod=1`
- Why high value: adds official EU macro and labor data to complement IMF/World Bank coverage.
- Directness: free JSON, no key observed.
- Suggested first fields: `dataset`, `geo`, `time`, `unit`, `indicator`, `value`.
- Notes: The response is SDMX-like and dimension-indexed. Implement a reusable flattening helper.

#### 1.7 Open-Meteo weather and climate APIs

- Proposed catalog ids: `openmeteo_forecast`, `openmeteo_historical_weather`.
- Proposed FinUties paths:
  - `/api/v1/data/weather/openmeteo-forecast`
  - `/api/v1/data/weather/openmeteo-history`
- External examples:
  - `https://api.open-meteo.com/v1/forecast?latitude=40.71&longitude=-74.01&hourly=temperature_2m&forecast_days=1`
  - `https://archive-api.open-meteo.com/v1/archive?latitude=40.71&longitude=-74.01&start_date=2024-01-01&end_date=2024-01-07&daily=temperature_2m_max,precipitation_sum`
- Why high value: adds point weather and historical weather without a key, useful for commodities, agriculture, energy demand, and disaster context.
- Directness: free JSON, no key observed.
- Suggested first fields: `latitude`, `longitude`, `time`, `variable`, `value`, `unit`, `timezone`.
- Notes: Normalize into long-form observations because callers will request different hourly/daily variables.

#### 1.8 NASA EONET natural events

- Proposed catalog id: `nasa_eonet_events`.
- Proposed FinUties path: `/api/v1/data/disasters/eonet`
- External example:
  - `https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=10`
- Why high value: complements GDACS and USGS with NASA event categories such as wildfires, volcanoes, storms, sea/lake ice, and dust/haze.
- Directness: free structured response, no key observed.
- Suggested first fields: `id`, `title`, `category`, `status`, `closed`, `geometry_date`, `latitude`, `longitude`, `source_url`.
- Notes: EONET geometries can be points or polygons. Store centroid fields for maps and preserve raw geometry where possible.

#### 1.9 NOAA Space Weather Prediction Center feeds

- Proposed catalog ids: `noaa_swpc_kp`, `noaa_swpc_alerts`.
- Proposed FinUties paths:
  - `/api/v1/data/space-weather/kp-index`
  - `/api/v1/data/space-weather/alerts`
- External examples:
  - `https://services.swpc.noaa.gov/json/planetary_k_index_1m.json`
  - `https://services.swpc.noaa.gov/products/alerts.json`
- Why high value: adds satellite, aviation, grid, and communications risk signals not covered by current weather/disaster sources.
- Directness: free JSON, no key observed.
- Suggested first fields: `time_tag`, `kp_index`, `estimated_kp`, `alert_id`, `message`, `issue_datetime`.
- Notes: Keep a separate category or map it under nature/climate until a space-weather category exists.

#### 1.10 BTS border crossing and transportation Socrata data

- Proposed catalog ids: `bts_border_crossings`, `bts_freight`.
- Proposed FinUties path: `/api/v1/data/trade/border-crossings`
- External example:
  - `https://data.transportation.gov/resource/keg4-3bc2.json?$limit=1`
- Why high value: adds near-operational logistics and North American border flow indicators that complement UN Comtrade's annual trade statistics.
- Directness: free Socrata JSON, no app token required for low-volume requests.
- Suggested first fields: `port_name`, `state`, `port_code`, `border`, `date`, `measure`, `value`, `latitude`, `longitude`.
- Notes: Socrata pagination and query syntax can be handled with a reusable adapter.

#### 1.11 Nasdaq Trader symbol directory

- Proposed catalog id: `nasdaq_symbol_directory`.
- Proposed FinUties path: `/api/v1/data/market/symbol-directory`
- External examples:
  - `https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt`
  - `https://www.nasdaqtrader.com/dynamic/SymDir/otherlisted.txt`
- Why high value: adds official-ish listed symbol metadata, ETF flags, test issue flags, round lot size, and listing market details for market search/resolution.
- Directness: free pipe-delimited text, no key observed for symbol files.
- Suggested first fields: `symbol`, `security_name`, `market_category`, `test_issue`, `financial_status`, `round_lot_size`, `etf`, `nextshares`.
- Notes: The files include footer rows such as `File Creation Time`; the parser must skip them.

### 2. High value, near-immediate after small validation

#### 2.1 CFTC Socrata COT expansions

- Proposed catalog ids: `cftc_tff_futures`, `cftc_tff_combined`, `cftc_supplemental_cit`.
- External examples:
  - `https://publicreporting.cftc.gov/resource/gpe5-46if.json`
  - `https://publicreporting.cftc.gov/resource/yw9f-hn96.json`
  - `https://publicreporting.cftc.gov/resource/4zgm-a668.json`
- Why high value: current registry includes legacy and disaggregated COT; TFF and supplemental CIT add financial-futures and commodity index trader positioning.
- Directness: public Socrata JSON, typically no key for low-volume access.
- Blocker: validate field names and avoid duplicating existing CFTC wrappers.

#### 2.2 OECD / SDMX data APIs

- Proposed catalog ids: `oecd_main_economic_indicators`, `oecd_trade`, `oecd_cli`.
- Why high value: high-quality cross-country macro indicators, leading indicators, trade, and national accounts.
- Directness: public APIs exist, but endpoint formats have changed across OECD data portals.
- Blocker: validate the current API base and dimension syntax before implementation.

#### 2.3 World Bank additional targeted datasets

- Proposed catalog ids: `wb_debt_statistics`, `wb_doing_business_archive`, `wb_logistics_performance`.
- Why high value: current registry has World Bank poverty/governance/education, but not debt-service, logistics, and business environment indicators.
- Directness: public World Bank API generally requires no key.
- Blocker: prevent generic World Bank duplication by shipping curated indicator packs and clear labels.

#### 2.4 NVD CVE 2.0

- Proposed catalog id: `nvd_cves`.
- Proposed FinUties path: `/api/v1/data/cyber/cves`
- External example:
  - `https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=CVE-2024-3094`
- Why high value: adds cyber vulnerability risk, which is relevant for geopolitical risk, company monitoring, and operational risk.
- Directness: documented free endpoint, optional free API key for higher rate limits.
- Blocker: live probes timed out from this VM; validate from production network and add strict retry/backoff/rate limits.

### 3. Valuable but not immediate

#### 3.1 ReliefWeb humanitarian reports and disasters

- Why valuable: high-quality humanitarian crisis updates and tagged reports.
- External base: `https://api.reliefweb.int/v2/reports`
- Blocker: v2 returned 403 without an approved appname. Request approved appname before implementation.

#### 3.2 OpenAQ air quality

- Why valuable: global air-quality observations with station metadata.
- External base: `https://api.openaq.org/v3/`
- Blocker: v3 returned 401. Treat as authenticated and only implement if an API key is acceptable.

#### 3.3 NASA FIRMS active fire

- Why valuable: near-real-time global active fire detections, strong for commodities, climate, and disaster monitoring.
- External base: `https://firms.modaps.eosdis.nasa.gov/api/area/csv/[MAP_KEY]/VIIRS_NOAA20_NRT/world/1`
- Blocker: requires a free MAP_KEY and global daily queries can be very large.

#### 3.4 EIA Open Data

- Why valuable: US and global energy production, inventory, consumption, and price series.
- Blocker: API key required for normal use. Consider if keys are acceptable for server-side ingestion.

#### 3.5 ENTSO-E Transparency Platform

- Why valuable: European power generation, load, price, outage, and cross-border flow data.
- Blocker: free registration token required; XML-heavy schema and rate limits.

#### 3.6 Copernicus Climate Data Store

- Why valuable: authoritative reanalysis and climate indicators.
- Blocker: account/API key and queued jobs; better for offline batch ingestion than direct interactive fetches.

#### 3.7 Global Energy Monitor data

- Why valuable: power plants, pipelines, terminals, coal mines, and energy infrastructure.
- Blocker: downloads are high value but require license review and bulk-file normalization.

## Implementation notes

- Add new catalog-facing sources through `terminal/src/lib/source-registry.ts` with stable `id` and `endpoint` values.
- Add typed fetch wrappers in `terminal/src/lib/global-data-api.ts` only for sources that need custom query helpers; otherwise `fetchSource` can cover generic table views.
- Prefer a small reusable adapter set:
  - JSON API adapter with pagination.
  - Socrata adapter for `$limit`, `$offset`, `$select`, `$where`, `$order`.
  - CSV/delimited adapter with footer skipping and schema coercion.
  - SDMX/dimension flattener for Eurostat/OECD-like responses.
- Mark sources as `placeholder: true` only when the backend route exists but is not populated. Avoid adding UI registry entries before at least one sample query works end-to-end.
- For external APIs with required User-Agent or app identity, keep that configuration server-side and document it in the backend adapter.

## Suggested next implementation order

1. Treasury FiscalData debt and rates.
2. BLS CPI/labor curated series.
3. GLEIF LEI records for entity enrichment.
4. Open-Meteo forecast/history.
5. Eurostat macro flattening.
6. NASA EONET events.
7. NOAA SWPC space-weather alerts.
8. BTS border crossings.
9. Nasdaq symbol directory.
10. SEC XBRL frames, after reconciling with existing SEC financial-statement endpoints.
