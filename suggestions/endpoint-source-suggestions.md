# Endpoint, Source, and Scraping Suggestions

Generated: 2026-06-18

## Existing coverage snapshot

The current terminal source registry and dashboard cards already cover:

- Conflict and geopolitical risk: UCDP, ACLED placeholder, GDELT events, GPR.
- Natural hazards and weather: USGS earthquakes, GDACS, NOAA weather alerts, EM-DAT.
- Maritime and trade: Global Fishing Watch vessel events, UN Comtrade.
- Markets and macro: ECB FX, CoinGecko crypto, IMF indicators, CFTC COT reports, BLS/BEA macro cards, NY Fed rates, Treasury yields/debt cards.
- ESG, health, demographics, food, development, climate, biodiversity, and sanctions: EPA TRI, WHO, JMP, UN population/refugees/urbanization/migration, FAO, USDA WASDE, WFP, World Bank slices, UNDP, UNESCO, ILO, ITU, NASA/NOAA climate feeds, GBIF/IUCN, OFAC/EU/UN sanctions.

The list below avoids duplicating those surfaces unless the proposed endpoint adds materially new data depth.

## Priority guide

- P0 - High value and immediate: free, directly accessible, no account or API key. Smoke-tested from the cloud agent VM where possible.
- P1 - High value with discovery work: free/direct, but requires dataset-code discovery, SDMX parsing, chunking, or coordinate strategy.
- P2 - Useful but not immediate: free or public, but needs approval, a free key, legal review, or heavier ingestion.
- P3 - Scraping/watchlist: value is plausible, but API access is weak, HTML-first, or terms need review.

## P0 - High value and immediate

| Rank | Source | Why it is valuable | Access | Upstream endpoint examples | Suggested FinUties endpoints | Implementation notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Elexon Insights / BMRS GB electricity | Real-time and historical GB power generation, demand, fuel mix, balancing. Strong fit for energy, commodities, climate, and macro dashboards. | No auth. Public JSON REST. | `https://data.elexon.co.uk/bmrs/api/v1/generation/outturn/summary?startTime=2026-06-17T00:00:00Z&endTime=2026-06-17T01:00:00Z&format=json`; OpenAPI: `https://data.elexon.co.uk/swagger/v1/swagger.json` | `/api/v1/data/energy/gb-generation`, `/api/v1/data/energy/gb-demand-forecast`, `/api/v1/data/energy/gb-fuel-mix` | Use the OpenAPI paths for parameter validation. `/generation/outturn/summary` smoke-tested with 200. Some dataset paths need exact date parameter discovery. |
| 2 | U.S. Treasury Fiscal Data expanded | Current cards expose yields/debt, but Fiscal Data adds auctions, interest expense, average debt rates, monthly receipts/outlays, and spending by function. | No auth. Public JSON/CSV REST. | `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/auctions_query?sort=-auction_date&page[size]=10&format=json`; `.../v2/accounting/od/interest_expense`; `.../v1/accounting/mts/mts_table_5` | `/api/v1/data/fiscal/treasury-auctions`, `/api/v1/data/fiscal/interest-expense`, `/api/v1/data/fiscal/monthly-statement` | Reuse existing Treasury/rates UI concepts. Fiscal Data supports `fields`, `filter`, `sort`, and `page[size]`. |
| 3 | SEC EDGAR XBRL CompanyFacts / Frames | Existing SEC coverage has filings and insider transactions; XBRL facts add fundamentals, financial statement concepts, and cross-company frames. | No API key. Requires descriptive `User-Agent`; respect SEC rate limits. | `https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json`; `https://data.sec.gov/submissions/CIK0000320193.json`; `https://data.sec.gov/api/xbrl/frames/us-gaap/Assets/USD/CY2024Q4I.json` | `/api/v1/sec/company-facts`, `/api/v1/sec/company-concepts`, `/api/v1/sec/xbrl-frames`, `/api/v1/sec/company-submissions` | Add ticker-to-CIK resolver using `https://www.sec.gov/files/company_tickers.json`. Cache aggressively; one CompanyFacts response can be large. |
| 4 | NASA EONET v3 | Near-real-time curated natural events: wildfires, storms, volcanoes, sea/lake ice, dust, landslides. Complements GDACS and USGS. | No auth. Public JSON REST. | `https://eonet.gsfc.nasa.gov/api/v3/events?limit=5&days=20&status=open`; categories and sources are also exposed in v3. | `/api/v1/data/disasters/eonet`, `/api/v1/data/nature/events` | Normalize geometries to source registry point/centroid records. Good dashboard card candidate for "Natural Events". |
| 5 | Open-Meteo | Free forecasts, historical weather from 1940, air quality, marine, flood, and model-run data without a key. Strong for weather risk, agricultural analysis, and climate baselines. | No auth for non-commercial use. JSON REST. | `https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current=temperature_2m&timezone=UTC`; `https://archive-api.open-meteo.com/v1/archive?...` | `/api/v1/data/weather/open-meteo/forecast`, `/api/v1/data/weather/open-meteo/archive`, `/api/v1/data/weather/open-meteo/air-quality` | Coordinate-driven API. Start with point queries and saved watchlist locations before trying global grids. |
| 6 | NOAA CO-OPS Tides and Currents | Live and historical water levels, tide predictions, currents, wind, pressure, and station metadata. Valuable for ports, storm surge, coastal risk, and maritime cards. | No auth. Public JSON/CSV REST. | `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=latest&station=8518750&product=water_level&datum=MLLW&units=metric&time_zone=gmt&format=json`; station metadata: `https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json` | `/api/v1/data/maritime/tides`, `/api/v1/data/maritime/water-levels`, `/api/v1/data/maritime/noaa-stations` | Needs station discovery and per-station polling. Start with major ports and coastal financial centers. |
| 7 | World Bank generic Indicators API | Repo has selected World Bank slices; a generic wrapper unlocks about 16k indicators and 45+ databases with the same interface. | No auth. Public JSON/XML/JSON-stat REST. | `https://api.worldbank.org/v2/country/us/indicator/NY.GDP.MKTP.CD?format=json&per_page=1`; `https://api.worldbank.org/v2/source`; `https://api.worldbank.org/v2/source/{source_id}/indicators` | `/api/v1/data/worldbank/indicators`, `/api/v1/data/worldbank/sources`, `/api/v1/data/worldbank/source-indicators` | Keep existing curated endpoints, but add a discoverable generic endpoint for notebooks and advanced users. |
| 8 | Eurostat Statistics API | EU GDP, inflation, labor, energy, trade, demographics, government finance, and regional series in JSON-stat. Fills Europe-specific macro gaps. | No auth. Public REST. | `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nama_10_gdp?format=JSON&lang=EN&geo=DE&na_item=B1GQ&unit=CLV10_MEUR&time=2023` | `/api/v1/data/europe/eurostat`, `/api/v1/data/europe/eurostat/datasets` | Implement as a dataset-code plus filter wrapper. Add curated aliases for GDP, HICP, unemployment, energy prices, and government debt. |

## P1 - High value with discovery work

| Source | Why it matters | Access | Candidate endpoints | Why not P0 |
| --- | --- | --- | --- | --- |
| OECD Data Explorer SDMX | Composite leading indicators, productivity, trade, inflation, national accounts, business confidence, and country comparisons. | No auth. Public SDMX REST. | `https://sdmx.oecd.org/public/rest/data/OECD.SDD.STES,DSD_STES@DF_CLI/.M.LI...AA...H?startPeriod=2023-02&dimensionAtObservation=AllDimensions&format=csvfilewithlabels` | Smoke-tested CSV 200, but each dataset needs SDMX dimension discovery and curated aliases to be useful. |
| BIS Statistics API | Global liquidity, credit, debt securities, property prices, effective exchange rates, banking statistics. Very high finance value. | No auth. Public SDMX REST. | Dataflows: `https://stats.bis.org/api/v1/dataflow/BIS/all/all`; data pattern: `https://stats.bis.org/api/v1/data/{flow}/{key}/all?...` | Dataflow endpoint smoke-tested 200; a sample data selector returned 404, so implement discovery before hard-coding series. |
| NASA POWER | Solar radiation, wind, temperature, precipitation, agroclimate and renewable-energy inputs back to 1981/NRT. | No auth. Public JSON/CSV REST. | `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M&community=SB&longitude=0&latitude=0&start=20240101&end=20240101&format=JSON` | Coordinate-driven and can be slow for broad regions. Best implemented as point/regional jobs with parameter allowlists. |
| GDELT 2.1 DOC / Global Knowledge Graph | Existing GDELT event endpoint could be expanded with article search, tone, themes, people, organizations, and media mentions. | No auth. Public HTTP endpoints. | DOC API and GKG export URLs from GDELT 2.1 | Adds unstructured/news-scale volume. Needs careful rate limiting, deduplication, and source credibility treatment. |
| Federal Reserve Financial Data Download / public CSV surfaces | FRED often needs a free key, but several Federal Reserve CSV downloads and H.4.1/H.8/H.15 surfaces are direct. | Mixed: some direct CSV, some free-key. | Federal Reserve public CSV/download endpoints per release | Worth a source-by-source review because the repo already has NY Fed and macro cards. |

## P2 - Useful but not immediate

| Source | Value | Blocker or caveat | Candidate route if adopted |
| --- | --- | --- | --- |
| ReliefWeb v2 | Curated humanitarian reports, disasters, countries, and source metadata from UN OCHA. Strong for crisis and disaster intelligence. | API is public/read-only but now requires a pre-approved `appname`; a smoke test with an unapproved appname returned 403. | `/api/v1/data/humanitarian/reliefweb-reports`, `/api/v1/data/humanitarian/reliefweb-disasters` |
| NASA FIRMS | Active fire detections from MODIS/VIIRS; useful for commodities, insurance, supply chain, and disaster monitoring. | Free but requires a MAP_KEY for most API use. | `/api/v1/data/disasters/firms-fires` |
| EIA Open Data | U.S. and international energy prices, supply, demand, stocks, electricity, petroleum, gas. | API generally requires a free API key, though some bulk downloads may be direct. | `/api/v1/data/energy/eia-series`, `/api/v1/data/energy/eia-electricity` |
| ENTSO-E Transparency Platform | European electricity generation, load, cross-border flows, outages, and prices. | Free account/API token required and terms should be reviewed. | `/api/v1/data/energy/eu-power` |
| OpenAQ v3 | Air quality measurements and locations. | Recent API versions commonly require a free key; terms and quotas need confirmation. | `/api/v1/data/environment/air-quality` |
| ACLED production ingestion | Existing registry has an ACLED placeholder. Filling it would materially improve conflict/protest coverage. | Free access exists for some users, but API access and licensing are not as frictionless as UCDP/GDELT. | Existing `/api/v1/data/conflicts/acled` |

## P3 - Scraping and watchlist candidates

| Candidate | Potential value | Suggested approach | Risk |
| --- | --- | --- | --- |
| Central bank release calendars and speeches | Market-moving policy events, speeches, minutes, and statements beyond generic economic calendars. | Prefer RSS/JSON feeds where available; scrape only for banks without structured feeds. | Terms and page stability vary by institution. |
| Port authority advisories and congestion pages | Port closures, disruptions, strikes, berth congestion, canal advisories. | Start with official RSS/press-release pages for major ports/canals, then normalize events to maritime alerts. | Mostly HTML-first and heterogeneous. |
| Exchange market notices | Trading halts, listing changes, holiday schedules, market status. | Use official exchange APIs/RSS where available; scrape only public notices with permissive terms. | Licensing can be restrictive. |
| Government procurement and sanctions press releases | Early signals before structured databases update. | Use official RSS feeds and document parsers; avoid broad web scraping. | Entity resolution and deduplication are hard. |

## Smoke-test evidence

Representative requests run from the cloud agent VM on 2026-06-18:

- NASA EONET events: 200 JSON.
- Open-Meteo forecast: 200 JSON.
- U.S. Treasury Fiscal Data auctions: 200 JSON.
- NOAA CO-OPS water level: 200 JSON.
- World Bank WDI indicator: 200 JSON.
- Eurostat GDP JSON-stat query: 200 JSON.
- SEC CompanyFacts with a descriptive User-Agent: 200 JSON.
- NASA POWER daily point data: 200 JSON.
- OECD SDMX CSV query: 200 CSV.
- BIS dataflow discovery: 200 JSON; sample hard-coded data selector returned 404, so discovery is required.
- Elexon OpenAPI and `/generation/outturn/summary`: 200 JSON.
- ReliefWeb v2 with a placeholder appname: 403 JSON, consistent with the need for a pre-approved appname.
