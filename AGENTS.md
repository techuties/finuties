## Cursor Cloud specific instructions

This is a minimal documentation/quickstart repository containing a single Jupyter notebook (`quickstart.ipynb`) and a LICENSE file. There is no application server, build system, test suite, or linter to run.

### What it does

The notebook is a client-side quickstart guide for the **FinUties API** (`https://data.finuties.com`), a financial data aggregation REST API. It demonstrates health checks, authentication, querying, pagination, and error handling.

### Running the notebook

```
jupyter notebook --no-browser --ip=0.0.0.0 --port=8888 --ServerApp.token='' quickstart.ipynb
```

Or run cells directly with Python — the notebook uses only `requests` and `pandas`.

### Key caveats

- **No `requirements.txt` or `pyproject.toml` exists.** Dependencies are `requests`, `pandas`, and `jupyter` (installed via pip).
- **No tests, lint, or build commands exist** in this repo. There is nothing to run beyond the notebook itself.
- Cells in sections 1–2 (health check, resource catalog) and section 7 (error handling) work **without authentication**. Sections 3–6 require a FinUties account (JWT login or API key set as `TOKEN`).
- The API base URL defaults to `https://data.finuties.com` but can be overridden via the `FINUTIES_API_URL` environment variable.
