# Terminal dependency audit

Last run: 2026-09-23 (community `terminal/` package).

## Summary

| Metric | Before upgrades | After upgrades |
| --- | --- | --- |
| **npm audit** | 21 (3 critical, 12 high, 4 moderate, 2 low) | **0** |
| **Primary drivers** | `astro@5`, transitive `vite`/`sharp`/`svgo`/`h3`, `echarts@5`, `maplibre-gl@5` | Resolved via targeted major bumps |

## Packages upgraded (direct dependencies)

| Package | Before (range) | After (range) | Why |
| --- | --- | --- | --- |
| `astro` | `^5.0.0` | `^7.3.4` | Critical/high Astro advisories (XSS, SSRF, path checks, sharp chain) |
| `@astrojs/solid-js` | `^5.1.3` | `^7.0.2` | Peer alignment with Astro 7 / Vite 8 |
| `echarts` | `^5.5.0` | `^6.1.0` | Moderate XSS advisory (GHSA-fgmj-fm8m-jvvx) |
| `maplibre-gl` | `^5.18.0` | `^6.11.1` | Critical XSS sanitizer bypass (GHSA-jrc7-96c5-q579) |

Transitive fixes landed via the lockfile refresh (e.g. `vite`, `sharp`, `svgo`, `h3`, `browserslist`, `defu`, `devalue`, `@babel/core`).

## Astro 7 code adjustments

Small, required compile/runtime updates (no product behavior change):

- `ViewTransitions` → `ClientRouter` (`astro:transitions`) in `src/layouts/DashboardLayout.astro`.
- Connect page inline scripts: use `define:vars` instead of ternary/`JSON.stringify` expressions inside `is:inline` blocks (`src/pages/index.astro`) — Astro 7’s compiler rejects those patterns.
- `vite.build.rollupOptions.output.manualChunks`: object form → function (Rolldown / Vite 8).

## Runtime requirements

`terminal/package.json` declares:

- **Node** `>=22.12.0` (Astro 7 engine)
- **npm** `>=9.6.5`

GitHub Actions CI already uses Node 22. Local dev on Node 20.x will not satisfy Astro 7; use Node 22.12+ (LTS).

### npm `EBADENGINE` warning (not a CVE)

After install you may see `undici@8.x` preferring Node `>=22.19.0` while CI/dev uses 22.12–22.18. This is an engine hint from a transitive dependency, not an `npm audit` finding. Upgrading the VM to Node 22.19+ silences it; audit remains clean.

## Local dev CORS and API proxy (2026-09-23)

**Finding:** Browsers blocked connect (`fetch` to `/api/v1/auth/me`) when the community client pointed at `https://data.finuties.com` from `http://localhost:4321` — the API’s CORS allowlist targets `https://terminal.finuties.com`, not local origins.

**Mitigation (community client only):**

- `astro.config.mjs` — Vite `server.proxy` for `/api` and `/health` → `https://data.finuties.com` (override target with `FINUTIES_DEV_PROXY_TARGET` if needed).
- `src/lib/api-origin.ts` — in `import.meta.env.DEV`, default API base is same-origin; stored `data.finuties.com` bases are rewritten to the dev origin; localhost is allowed without `PUBLIC_ALLOW_NON_FINUTIES_API`.
- **Production builds** (`npm run build`) still default to `https://data.finuties.com`; the FinUties-host allowlist is unchanged unless you explicitly set `PUBLIC_ALLOW_NON_FINUTIES_API=true`.

`npm run preview` serves the production bundle from localhost and does **not** enable the dev proxy — use `npm run dev` for local connect testing, or deploy like the hosted Terminal.

## Residual risk posture

- **Production**: static export (`output: "static"`). Dev-server-only issues in `vite`/`esbuild` affect local `npm run dev`, not the built site on a static host.
- **API keys**: stored in the browser (`localStorage` via the connect flow), not in server env. Optional `terminal/.env` only sets `PUBLIC_*` build-time overrides (see `terminal/.env.example`). Never commit `.env` or keys.
- **echarts / maplibre**: chart and map libraries; keep user-controlled HTML out of chart options and map popups (standard XSS hygiene).

## Re-run the audit

From `terminal/`:

```bash
npm ci          # or npm install after package.json changes
npm test
npm run build
npm audit
```

Save audit output for records:

```bash
npm audit --json > /tmp/terminal-audit.json
```

To inspect direct vs transitive issues:

```bash
npm audit --omit=dev
```

Do **not** run `npm audit fix --force` without re-running tests and `npm run build`; major bumps need explicit review (as with Astro 7 and maplibre 6).

## Before-upgrade snapshot (reference)

Top-level audit themes on the pre-upgrade lockfile:

- **Critical**: `astro` (multiple GHSA entries), `maplibre-gl` (after partial transitive bump still on vulnerable 5.x until direct bump).
- **High**: `vite`, `browserslist`, `defu`, `h3`, `js-yaml`, `smol-toml`, `sharp` (via astro), `svgo` (via astro).
- **Moderate**: `devalue`, `echarts`, `baseline-browser-mapping`.

All cleared in the current lockfile as of the date above.
