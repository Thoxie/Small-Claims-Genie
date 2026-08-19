#!/usr/bin/env python3
"""Redact credential-shaped values from a portable SQL data export.

The project intentionally commits a reference-data export. This utility keeps
that backup useful without preserving live provider credentials that can appear
in synchronized Stripe metadata, especially webhook signing secrets.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path


REDACTIONS: tuple[tuple[re.Pattern[str], str], ...] = (
    (
        re.compile(r"whsec_[A-Za-z0-9_-]{16,}"),
        "REDACTED_STRIPE_WEBHOOK_SIGNING_SECRET",
    ),
    (
        re.compile(r"sk_(?:live|test)_[A-Za-z0-9_-]{16,}"),
        "REDACTED_STRIPE_API_KEY",
    ),
    (
        re.compile(r"sk-ant-api[A-Za-z0-9_-]{12,}"),
        "REDACTED_ANTHROPIC_API_KEY",
    ),
    (
        re.compile(r"sk-proj-[A-Za-z0-9_-]{12,}"),
        "REDACTED_OPENAI_API_KEY",
    ),
    (
        re.compile(r"(?:ghp_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{20,})"),
        "REDACTED_GITHUB_TOKEN",
    ),
)


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: redact-db-export-secrets.py <sql-export-path>", file=sys.stderr)
        return 2

    export_path = Path(sys.argv[1])
    text = export_path.read_text(encoding="utf-8")
    total = 0

    for pattern, replacement in REDACTIONS:
        text, replacements = pattern.subn(replacement, text)
        total += replacements

    export_path.write_text(text, encoding="utf-8")
    print(f"Redacted {total} credential-shaped value(s) from {export_path}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())