# FinUties

Public-market data for you — one governed REST and MCP contract over filings, ownership, equities, positioning, rates, economics, calendar, and pipeline health, with published freshness.

This repo is the **community Terminal** (customizable UI + updateable cards) and example notebooks. The hosted product is at [www.finuties.com](https://www.finuties.com) (API: [data.finuties.com](https://data.finuties.com), Terminal: [terminal.finuties.com](https://terminal.finuties.com)).

Developed by TechUties. **Not a broker. Not investment advice.**

## Download → deploy

Anybody can start immediately. This repo is the client. It does **not** include ingest, collectors, or the hosted platform.

```bash
git clone https://github.com/techuties/finuties.git
cd finuties/terminal
npm install
npm run dev
```

Open the local URL. With no extra env, the client calls `https://data.finuties.com`.

### Login or API key

1. **Login** at [finuties.com](https://www.finuties.com) (account, [public test](https://www.finuties.com/free-public-test/), or Settings) and copy your `fin_sk_...` key, **or**
2. **Sandbox key** (about 72 hours):

```bash
curl -sS -X POST https://data.finuties.com/api/v1/auth/sandbox
```

Paste the key on the Terminal connect page. The community app uses API-key auth in the browser; account login lives on finuties.com.

Free public-test keys are **P0 data + MCP only** — not analytics packs and not a paid assistant.

### Point at another API (optional)

```bash
cp .env.example .env
# PUBLIC_API_ORIGIN=https://data.finuties.com
```

Leave `PUBLIC_API_ORIGIN` unset to keep the hosted default.

### Cards

Dashboard cards register through `src/lib/card-registry.ts` (`registerCard`). Keep `type` ids stable so saved layouts keep working. Add or edit a module under `src/lib/cards/`.

## Status

Honest snapshot — this is a **community client**, not the open-sourced platform.

| What | State |
| --- | --- |
| **Try it** | Clone → key (login or sandbox) → `cd terminal && npm install && npm run dev`. |
| **Community Terminal** | Open subset of the hosted app. Same `fin_sk_...` key. |
| **Explore labels** | Conflict, climate, sanctions, and maritime are labeled **(research)** — visible, not a commercial P0 offer. |
| **CI** | GitHub Actions on push/PR to `main`: notebook static validation + Terminal unit tests. Branch protection is not enabled. |
| **Not in this repo** | Ingest, collectors, API server, analytics node, trading, ops runbooks. Point the client at the hosted API. |
| **Not in this client** | Data-ops `/admin` and Workbench `/analyze` stay on the hosted Terminal (`terminal.finuties.com`). This tree does not ship those routes. |

Open draft PRs from the Cursor bot (endpoint source suggestions) are triaged separately — they are not merged by default.

## Optional: notebooks

Python 3.12. Same key as the Terminal.

```bash
python3.12 -m pip install -r notebooks/requirements.txt
cp notebooks/.env.example notebooks/.env   # FINUTIES_API_KEY=fin_sk_...
jupyter lab notebooks/00_start_here.ipynb
```

| Notebook | What it does | Live endpoint |
| --- | --- | --- |
| `notebooks/00_start_here.ipynb` | Key check, `/health`, `/api/v1/status/p0`, recipes, one query | `/health`, `/api/v1/status/p0`, `/api/v1/recipes`, `/api/v1/cftc/legacy_futures-facts` |
| `notebooks/money_flow/latest_cot_data_example.ipynb` | Wheat COT net positioning and 26-week z-score | `/api/v1/cftc/legacy_futures-facts` |
| `notebooks/commodities/commodities_snapshot_baseline.ipynb` | Brent price, returns, 12-month vol | `/api/v1/development/wb-commodity-prices` |
| `notebooks/macro_indicators/macro_series_baseline.ipynb` | CPI-U EWMA and 12-month change | `/api/v1/data/economic/bls` |
| `notebooks/equity_flows/equity_flow_baseline.ipynb` | 13F top-company concentration | `/api/v1/holdings/top-companies` |
| `notebooks/risk_models/volatility_regime_baseline.ipynb` | Crypto 24h risk snapshot | `/api/v1/data/crypto/prices` |

`/api/v1/data/commodities/prices` and `/api/v1/data/macro/series` are not live routes (404). The notebooks above use endpoints that returned 200 when checked.

`commodities_snapshot_baseline` and `volatility_regime_baseline` are research notebooks (World Bank commodity prices; crypto 24h). They are not P0 commercial SLOs. Empty or partial pulls should be named, not smoothed.

## Replayable evidence

Research trust here is **rerun the same query**, not a logo wall. After each live call, print:

1. HTTP method + path (and query params)
2. Pull timestamp (UTC) and any `as_of` / `generated_at` the payload returns
3. Row count — say empty or partial instead of inventing values
4. Source family if the payload names one (e.g. CFTC, BLS, SEC 13F)

That is the public-repo analog of a `## Try this query` block. A key is required (sandbox ~72 hours, or a public-test / account key). Public-test keys are **P0 data + MCP only** — not news, not analytics packs, not a hosted assistant.

This repo does **not** prove customers, freshness SLOs, or ingest health. We do not publish partner logos or citeable usage metrics from here.

## This directory

This folder **is** the public GitHub working tree (`techuties/finuties`). Public work lives here: `terminal/` and `notebooks/`. If this checkout is `finuties-public/` inside the private monorepo: the hosted Terminal is `../edge/terminal/` (different app; do not merge blindly). The private tree gitignores `finuties-public/` on purpose.

## Notes

- MIT License (see `LICENSE`).
- Keep keys in local `.env` files. Never commit them.
- `tools/validate-notebooks.mjs` rejects secrets and empty code cells.
