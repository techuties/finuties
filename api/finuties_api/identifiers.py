"""Normalize SEC identifiers used across list routes."""

from __future__ import annotations

import re

_CIK_RE = re.compile(r"^\d{1,10}$")
_ACCESSION_RE = re.compile(r"^[\d-]+$")


def normalize_cik(value: str | int | None) -> str | None:
    """Return a 10-digit zero-padded CIK, or None when not parseable."""
    if value is None:
        return None
    raw = str(value).strip()
    if not raw:
        return None
    digits = raw.lstrip("0") or "0"
    if not _CIK_RE.match(digits):
        return None
    return digits.zfill(10)


def normalize_accession(value: str | None) -> str | None:
    """Canonical accession: digits only (hyphens stripped)."""
    if value is None:
        return None
    raw = str(value).strip()
    if not raw:
        return None
    if not _ACCESSION_RE.match(raw):
        return None
    return raw.replace("-", "")
