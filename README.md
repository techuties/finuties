# FinUties

FinUties is the core project. This public repository includes two open-source offerings: `FinUites Terminal Community` (the `terminal/` application built with Astro + SolidJS) and the `notebooks/` collection for API-based analysis workflows in Python. The project is published under the MIT License.

A hosted version is available and accessible online, so you can explore the platform without local setup. Visit `https://www.finuties.com` to access the live environment.

## Project Structure

```mermaid
flowchart TD
    A[FinUties] --> B[terminal/]
    A --> C[notebooks/]
    A --> D[tools/]
    A --> E[deploy/]

    B --> B1[src/pages]
    B --> B2[src/components]
    B --> B3[src/lib]
    B --> B4[public]
    B --> B5[tests]

    C --> C1[Commodities]
    C --> C2[Equity Flows]
    C --> C3[Macro Indicators]
    C --> C4[Money FLow]
    C --> C5[Risk Models]
    C --> C6[requirements.txt + .env.example]

    D --> D1[validate-notebooks.mjs]
    E --> E1[Dockerfile + docker-compose.yml + Caddyfile]
```

## Quick Start

### Web Terminal
1. `cd terminal`
2. `npm install`
3. `npm run dev`

### Notebooks
1. Create `notebooks/.env` from `notebooks/.env.example`
2. Install dependencies from `notebooks/requirements.txt`
3. Run the notebooks in your preferred Jupyter environment to query and analyze data from the FinUties API

## Notes

- Notebook safety checks are enforced via `tools/validate-notebooks.mjs` (including secret-pattern checks).
- Keep API keys in local `.env` files only; never commit secrets.
