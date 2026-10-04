"""P0 contract tests: filter scoping, analytics 404, filings dedupe."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from finuties_api.errors import feature_not_found_response
from finuties_api.query_contract import dedupe_filing_rows, resolve_list_filters
from finuties_api.serve import create_app

SAMPLE_ROWS = {
    ("sec", "beneficial-ownership"): [
        {"issuer_cik": "0001863934", "owner_name": "Wrong Issuer"},
        {"issuer_cik": "0000320193", "owner_name": "Apple Holder"},
    ],
    ("sec", "executive-compensation"): [
        {"company_cik": "1901037", "executive_name": "Wrong Co"},
        {"company_cik": "0000320193", "executive_name": "Tim Cook"},
    ],
    ("market", "short-interest"): [
        {"symbol": "TEMPF", "short_interest": 1},
        {"symbol": "AAPL", "short_interest": 2},
        {"symbol": "TEMR", "short_interest": 3},
    ],
    ("sec", "filings"): [
        {
            "accession_number": "0001140361-26-015711",
            "cik": "320193",
            "form_type": "8-K",
            "filed_at": "2026-04-20",
        },
        {
            "accession_number": "000114036126015711",
            "cik": "0000320193",
            "form_type": "8-K",
            "filed_at": "2026-04-20",
        },
        {
            "accession_number": "0000320193-26-000006",
            "cik": "320193",
            "form_type": "10-Q",
            "filed_at": "2026-01-30",
        },
    ],
}


def _provider(domain: str, resource: str):
    return SAMPLE_ROWS.get((domain, resource), [])


@pytest.fixture
def client() -> TestClient:
    return TestClient(create_app(_provider))


def test_beneficial_ownership_cik_alias_scopes_issuer(client: TestClient) -> None:
    res = client.get("/api/v1/sec/beneficial-ownership", params={"cik": "0000320193", "limit": 10})
    assert res.status_code == 200
    body = res.json()
    assert body["items"]
    assert all(row["issuer_cik"] in ("0000320193", "320193") for row in body["items"])
    assert "cik" in body["query_feedback"]["ignored_filters"]
    assert body["items"][0]["owner_name"] == "Apple Holder"


def test_executive_compensation_cik_alias_scopes_company(client: TestClient) -> None:
    res = client.get("/api/v1/sec/executive-compensation", params={"cik": "0000320193", "limit": 10})
    assert res.status_code == 200
    body = res.json()
    assert len(body["items"]) == 1
    assert body["items"][0]["executive_name"] == "Tim Cook"


def test_short_interest_symbol_scopes_rows(client: TestClient) -> None:
    res = client.get("/api/v1/market/short-interest", params={"symbol": "AAPL", "limit": 10})
    assert res.status_code == 200
    body = res.json()
    assert len(body["items"]) == 1
    assert body["items"][0]["symbol"] == "AAPL"
    assert "symbol" not in body["query_feedback"].get("ignored_filters", [])


def test_unknown_feature_name_is_404_with_stable_body(client: TestClient) -> None:
    res = client.get(
        "/api/v1/analytics/features/latest",
        params={"entity_key": "AAPL", "feature_name": "__audit_unknown_feature__"},
    )
    assert res.status_code == 404
    assert res.json()["detail"] == feature_not_found_response("__audit_unknown_feature__")


def test_known_feature_name_stays_200(client: TestClient) -> None:
    res = client.get(
        "/api/v1/analytics/features/latest",
        params={"entity_key": "AAPL", "feature_name": "insider_flow_v1"},
    )
    assert res.status_code == 200
    assert res.json()["feature_name"] == "insider_flow_v1"


def test_filings_dedupe_padded_cik_and_accession(client: TestClient) -> None:
    res = client.get("/api/v1/sec/filings", params={"symbol": "AAPL", "limit": 50})
    assert res.status_code == 200
    items = res.json()["items"]
    accessions = [i["accession_number"] for i in items]
    assert len(accessions) == 2
    assert "0001140361-26-015711" in accessions
    assert "000114036126015711" not in accessions


def test_filings_spy_unmapped_empty_with_reason(client: TestClient) -> None:
    res = client.get("/api/v1/sec/filings", params={"symbol": "SPY", "limit": 5})
    assert res.status_code == 200
    body = res.json()
    assert body["items"] == []
    assert body["query_feedback"]["empty_reason"] == "SYMBOL_NOT_MAPPED_TO_CIK"


def test_resolve_list_filters_maps_cik_to_issuer_cik() -> None:
    filters, feedback = resolve_list_filters(
        "sec",
        "beneficial-ownership",
        {"cik": "320193", "limit": "5"},
    )
    assert filters == {"issuer_cik": "320193"}
    assert "cik" in feedback["ignored_filters"]


def test_dedupe_filing_rows_unit() -> None:
    rows = dedupe_filing_rows(SAMPLE_ROWS[("sec", "filings")])
    keys = {(r.get("accession_number"), r.get("cik")) for r in rows}
    assert len(keys) == 2
