"""Minimal FastAPI surface exercising the P0 query contract (for tests and local dev)."""

from __future__ import annotations

from typing import Any, Callable, Mapping, Sequence

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import JSONResponse

from finuties_api.errors import validate_analytics_feature_name
from finuties_api.query_contract import apply_row_filters, dedupe_filing_rows, resolve_list_filters

RowProvider = Callable[[str, str], Sequence[Mapping[str, Any]]]


def create_app(row_provider: RowProvider) -> FastAPI:
    app = FastAPI(title="FinUties API (contract slice)")

    @app.get("/api/v1/analytics/features/latest")
    def analytics_features_latest(
        entity_key: str = Query(...),
        feature_name: str = Query(...),
    ) -> JSONResponse:
        validate_analytics_feature_name(feature_name)
        return JSONResponse(
            {
                "entity_key": entity_key,
                "feature_name": feature_name,
                "count": 0,
                "items": [],
            }
        )

    @app.get("/api/v1/{domain}/{resource}")
    def list_resource(
        domain: str,
        resource: str,
        request: Request,
        limit: int = Query(50, ge=1, le=500),
        offset: int = Query(0, ge=0),
    ) -> JSONResponse:
        raw = {k: v for k, v in request.query_params.multi_items() if k not in ("limit", "offset")}
        # Flatten multi: last wins (matches typical Starlette QueryDict)
        params = dict(raw)

        symbol_to_cik = None
        if domain == "sec" and resource == "filings" and "symbol" in params:
            sym = str(params["symbol"]).strip().upper()
            symbol_to_cik = _SYMBOL_CIK_MAP.get(sym)

        filters, feedback = resolve_list_filters(
            domain,
            resource,
            params,
            symbol_to_cik=symbol_to_cik,
        )

        if domain == "sec" and resource == "filings" and "symbol" in params and symbol_to_cik is None:
            feedback["empty_reason"] = "SYMBOL_NOT_MAPPED_TO_CIK"
            feedback["symbol"] = params["symbol"]
            return JSONResponse(
                _list_envelope(domain, resource, [], limit, offset, feedback),
            )

        rows = list(row_provider(domain, resource))
        if domain == "sec" and resource == "filings":
            rows = dedupe_filing_rows(rows)
        scoped = apply_row_filters(domain, resource, rows, filters)
        scoped = scoped[offset : offset + limit]

        return JSONResponse(_list_envelope(domain, resource, scoped, limit, offset, feedback))

    return app


def _list_envelope(
    domain: str,
    resource: str,
    items: list[dict[str, Any]],
    limit: int,
    offset: int,
    feedback: dict[str, Any],
) -> dict[str, Any]:
    return {
        "domain": domain,
        "resource": resource,
        "total": None,
        "limit": limit,
        "offset": offset,
        "items": items,
        "query_feedback": feedback,
    }


# Test / demo symbol map (AAPL only — SPY unmapped mirrors production contract tests).
_SYMBOL_CIK_MAP = {
    "AAPL": "0000320193",
}
