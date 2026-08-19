#!/usr/bin/env python3
"""Fail closed when credential-shaped content is about to enter Git.

The scanner intentionally reports only paths, commits, and rule identifiers.
It never prints matched content, so running it is safe even when a finding is
real. Its TOML configuration is committed at the repository root.
"""

from __future__ import annotations

import argparse
import fnmatch
import re
import subprocess
import sys
import tomllib
from pathlib import Path
from urllib.parse import unquote, urlparse


ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / ".secret-scanner.toml"


def git_bytes(*args: str) -> bytes:
    return subprocess.run(
        ["git", *args],
        cwd=ROOT,
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    ).stdout


def git_text(*args: str) -> str:
    return git_bytes(*args).decode("utf-8", "replace")


def load_config() -> tuple[list[tuple[str, re.Pattern[str]]], dict[str, object]]:
    with CONFIG_PATH.open("rb") as config_file:
        config = tomllib.load(config_file)

    rules = [
        (rule["id"], re.compile(rule["regex"]))
        for rule in config.get("rules", [])
    ]
    if not rules:
        raise RuntimeError("Secret scanner configuration has no rules.")
    return rules, config.get("allowlist", {})


def is_allowed_path(path: str, allowlist: dict[str, object]) -> bool:
    return any(
        fnmatch.fnmatch(path, pattern)
        for pattern in allowlist.get("path_globs", [])
    )


def is_example_postgres_url(value: str, allowlist: dict[str, object]) -> bool:
    parsed = urlparse(value.rstrip("),.;'\""))
    password = unquote(parsed.password or "").lower()
    if not password:
        return True
    if any(
        fragment in password
        for fragment in allowlist.get("postgres_password_fragments", [])
    ):
        return True

    # A password scoped to an isolated Docker Compose PostgreSQL host is not a
    # remotely usable database credential. Keep this exception host-bound so
    # any external database URL or managed host is blocked.
    return (
        (parsed.hostname or "").lower()
        in allowlist.get("postgres_local_hosts", [])
    )


def scan_content(
    label: str,
    path: str,
    content: bytes,
    rules: list[tuple[str, re.Pattern[str]]],
    allowlist: dict[str, object],
) -> list[str]:
    if is_allowed_path(path, allowlist) or b"\0" in content:
        return []

    text = content.decode("utf-8", "replace")
    findings: list[str] = []
    for rule_id, pattern in rules:
        for match in pattern.finditer(text):
            if rule_id == "postgres-url-with-password" and is_example_postgres_url(
                match.group(0), allowlist
            ):
                continue
            findings.append(f"{label}: {path} [{rule_id}]")
            break
    return findings


def nul_paths(*args: str) -> list[str]:
    return [
        entry.decode("utf-8", "surrogateescape")
        for entry in git_bytes(*args).split(b"\0")
        if entry
    ]


def scan_paths(
    label: str,
    paths: list[str],
    reader,
    rules: list[tuple[str, re.Pattern[str]]],
    allowlist: dict[str, object],
) -> list[str]:
    findings: list[str] = []
    for path in paths:
        try:
            content = reader(path)
        except subprocess.CalledProcessError:
            # A rename/delete can race with index state; it cannot add a secret.
            continue
        findings.extend(scan_content(label, path, content, rules, allowlist))
    return findings


def scan_staged(
    rules: list[tuple[str, re.Pattern[str]]], allowlist: dict[str, object]
) -> list[str]:
    paths = nul_paths(
        "diff",
        "--cached",
        "--name-only",
        "-z",
        "--diff-filter=ACMR",
    )
    return scan_paths(
        "staged",
        paths,
        lambda path: git_bytes("show", f":{path}"),
        rules,
        allowlist,
    )


def scan_working_tree(
    rules: list[tuple[str, re.Pattern[str]]], allowlist: dict[str, object]
) -> list[str]:
    paths = nul_paths("ls-files", "-z")
    return scan_paths(
        "working-tree",
        paths,
        lambda path: (ROOT / path).read_bytes(),
        rules,
        allowlist,
    )


def commits_for_range(revision_range: str) -> list[str]:
    return git_text("rev-list", revision_range).splitlines()


def scan_commit(
    commit: str,
    rules: list[tuple[str, re.Pattern[str]]],
    allowlist: dict[str, object],
) -> list[str]:
    paths = nul_paths(
        "diff-tree",
        "--root",
        "--no-commit-id",
        "-r",
        "--name-only",
        "-z",
        "--diff-filter=AM",
        commit,
    )
    return scan_paths(
        f"commit {commit[:12]}",
        paths,
        lambda path: git_bytes("show", f"{commit}:{path}"),
        rules,
        allowlist,
    )


def scan_history(
    revision_range: str | None,
    rules: list[tuple[str, re.Pattern[str]]],
    allowlist: dict[str, object],
) -> list[str]:
    commits = (
        commits_for_range(revision_range)
        if revision_range
        else git_text("rev-list", "--all", "--reflog").splitlines()
    )
    findings: list[str] = []
    for commit in commits:
        findings.extend(scan_commit(commit, rules, allowlist))
    return findings


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Scan Git content without printing credential values."
    )
    modes = parser.add_mutually_exclusive_group(required=True)
    modes.add_argument("--staged", action="store_true", help="Scan staged files.")
    modes.add_argument(
        "--working-tree", action="store_true", help="Scan all tracked working files."
    )
    modes.add_argument(
        "--range",
        metavar="OLD..NEW",
        help="Scan files introduced or modified by commits in a Git revision range.",
    )
    modes.add_argument(
        "--history",
        action="store_true",
        help="Scan every commit reachable from every ref and reflog.",
    )
    args = parser.parse_args()

    try:
        rules, allowlist = load_config()
        if args.staged:
            findings = scan_staged(rules, allowlist)
        elif args.working_tree:
            findings = scan_working_tree(rules, allowlist)
        else:
            findings = scan_history(args.range, rules, allowlist)
    except (OSError, RuntimeError, subprocess.CalledProcessError, tomllib.TOMLDecodeError) as error:
        print(f"Secret scan could not complete: {error}", file=sys.stderr)
        return 2

    findings = sorted(set(findings))
    if findings:
        print("Secret scan blocked this operation. Matched values are intentionally hidden.", file=sys.stderr)
        for finding in findings:
            print(f"  {finding}", file=sys.stderr)
        return 1

    print("Secret scan passed; no configured credential patterns found.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())