"""Resolve query params and apply equality filters for governed list routes."""

from __future__ import annotations

from typing import Any, Mapping, MutableMapping, Sequence

from finuties_api.identifiers import normalize_accession, normalize_cik
from finuties_api.resources import ResourceContract, get_contract

_RESERVED_QUERY_KEYS = frozenset(
    {
        "limit",
        "offset",
        "include_total",
        "order_by",
        "order_dir",
    }
)


class MissingRequiredFilterError(ValueError):
    """Raised when a caller passed only an unknown alias for a required scope."""

    def __init__(self, resource: str, expected_param: str, received: str) -> None:
        super().__init__(f"{resource} requires {expected_param}= (received {received}=)")
        self.resource = resource
        self.expected_param = expected_param
        self.received = received


def resolve_list_filters(
    domain: str,
    resource: str,
    raw_params: Mapping[str, str],
    *,
    symbol_to_cik: str | None = None,
) -> tuple[dict[str, str], dict[str, Any]]:
    """
    Map HTTP query params to resource filters and build query_feedback metadata.

    symbol_to_cik: when set (filings symbol remap), the symbol filter is converted to cik.
    """
    contract = get_contract(domain, resource)
    accepted = sorted(contract.filter_params)
    ignored: list[str] = []
    effective: MutableMapping[str, str] = {}

    feedback: dict[str, Any] = {
        "accepted_filters": accepted,
        "ignored_filters": ignored,
    }

    for key, value in raw_params.items():
        if key in _RESERVED_QUERY_KEYS:
            continue
        if value is None or str(value).strip() == "":
            continue

        canonical = contract.param_aliases.get(key, key)
        if canonical in contract.filter_params:
            effective[canonical] = str(value).strip()
            if key != canonical and key not in ignored:
                ignored.append(key)
            continue
        if key not in ignored:
            ignored.append(key)

    if domain == "sec" and resource == "filings" and symbol_to_cik:
        if "symbol" in raw_params and str(raw_params["symbol"]).strip():
            effective["cik"] = symbol_to_cik
            feedback["symbol_remapped_to_cik"] = symbol_to_cik
            feedback["remapped_from"] = "symbol"
            if "symbol" not in ignored:
                ignored.append("symbol")

    return dict(effective), feedback


def apply_row_filters(
    domain: str,
    resource: str,
    rows: Sequence[Mapping[str, Any]],
    filters: Mapping[str, str],
) -> list[dict[str, Any]]:
    """Apply equality filters in Python (used in tests and post-fetch guards)."""
    if not filters:
        return [dict(r) for r in rows]

    contract = get_contract(domain, resource)
    out: list[dict[str, Any]] = []
    for row in rows:
        if _row_matches(contract, row, filters):
            out.append(dict(row))
    return out


def _row_matches(
    contract: ResourceContract,
    row: Mapping[str, Any],
    filters: Mapping[str, str],
) -> bool:
    for key, want in filters.items():
        if key not in contract.filter_params:
            continue
        if contract.domain == "sec" and contract.resource == "beneficial-ownership" and key == "issuer_cik":
            got = normalize_cik(row.get("issuer_cik"))
            if normalize_cik(want) != got:
                return False
            continue
        if contract.domain == "sec" and contract.resource == "executive-compensation" and key == "company_cik":
            got = normalize_cik(row.get("company_cik"))
            if normalize_cik(want) != got:
                return False
            continue
        if contract.domain == "market" and contract.resource == "short-interest" and key == "symbol":
            got = str(row.get("symbol") or "").strip().upper()
            if got != str(want).strip().upper():
                return False
            continue
        if contract.domain == "sec" and contract.resource == "filings" and key == "cik":
            got = normalize_cik(row.get("cik"))
            if normalize_cik(want) != got:
                return False
            continue
        if contract.domain == "sec" and contract.resource == "filings" and key == "accession_number":
            got = normalize_accession(row.get("accession_number"))
            if normalize_accession(want) != got:
                return False
            continue
        if str(row.get(key) or "") != str(want):
            return False
    return True


def dedupe_filing_rows(rows: Sequence[Mapping[str, Any]]) -> list[dict[str, Any]]:
    """
    One filing per accession (hyphen vs bare) per issuer CIK (padded vs bare).
    Keeps the row with the hyphenated accession when both exist.
    """
    best: dict[tuple[str, str], dict[str, Any]] = {}
    for row in rows:
        acc = normalize_accession(row.get("accession_number"))
        cik = normalize_cik(row.get("cik"))
        if not acc or not cik:
            key = (acc or "", cik or "")
        else:
            key = (acc, cik)
        existing = best.get(key)
        if existing is None:
            best[key] = dict(row)
            continue
        raw = str(row.get("accession_number") or "")
        existing_raw = str(existing.get("accession_number") or "")
        if "-" in raw and "-" not in existing_raw:
            best[key] = dict(row)
    return list(best.values())
