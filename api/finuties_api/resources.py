"""Per-resource filter contracts (mirrors GET /api/v1/resources/.../query-options)."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ResourceContract:
    domain: str
    resource: str
    filter_params: frozenset[str]
    """Query aliases accepted on the HTTP surface (mapped before filtering)."""
    param_aliases: dict[str, str]


RESOURCE_CONTRACTS: dict[tuple[str, str], ResourceContract] = {
    ("sec", "beneficial-ownership"): ResourceContract(
        domain="sec",
        resource="beneficial-ownership",
        filter_params=frozenset({"issuer_cik", "owner_cik"}),
        param_aliases={"cik": "issuer_cik"},
    ),
    ("sec", "executive-compensation"): ResourceContract(
        domain="sec",
        resource="executive-compensation",
        filter_params=frozenset({"company_cik", "executive_name", "fiscal_year"}),
        param_aliases={"cik": "company_cik"},
    ),
    ("market", "short-interest"): ResourceContract(
        domain="market",
        resource="short-interest",
        filter_params=frozenset({"jurisdiction", "report_type", "symbol"}),
        param_aliases={},
    ),
    ("sec", "filings"): ResourceContract(
        domain="sec",
        resource="filings",
        filter_params=frozenset(
            {
                "accession_number",
                "cik",
                "download_status",
                "form_type",
                "parse_status",
            }
        ),
        param_aliases={},
    ),
}


def get_contract(domain: str, resource: str) -> ResourceContract:
    key = (domain, resource)
    if key not in RESOURCE_CONTRACTS:
        raise KeyError(f"unknown resource contract: {domain}/{resource}")
    return RESOURCE_CONTRACTS[key]
