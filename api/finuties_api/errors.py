"""Stable HTTP error bodies for contract-sensitive routes."""

from __future__ import annotations

from typing import Any

KNOWN_ANALYTICS_FEATURES = frozenset(
    {
        "insider_flow_v1",
        "supplier_concentration_v1",
        "company_analytics_v1",
        "company_event_impact_v1",
    }
)


def feature_not_found_response(feature_name: str) -> dict[str, Any]:
    return {
        "error": {
            "code": "UNKNOWN_FEATURE_NAME",
            "message": f"No registered analytics feature pack for feature_name={feature_name!r}.",
            "feature_name": feature_name,
        }
    }


def validate_analytics_feature_name(feature_name: str) -> None:
    if feature_name not in KNOWN_ANALYTICS_FEATURES:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail=feature_not_found_response(feature_name))
