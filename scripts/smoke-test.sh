#!/usr/bin/env bash
# Small Claims Genie — API Smoke Test
# Runs fast checks against the dev API server to catch regressions before publishing.
# Usage: bash scripts/smoke-test.sh
# Requires: curl, jq

set -euo pipefail

API="http://localhost:18080"
PASS=0
FAIL=0
ERRORS=()

green() { echo -e "\033[32m✔  $1\033[0m"; }
red()   { echo -e "\033[31m✘  $1\033[0m"; }

check() {
  local name="$1"
  local expected_status="$2"
  local actual_status="$3"
  local body="$4"

  if [[ "$actual_status" == "$expected_status" ]]; then
    green "$name (HTTP $actual_status)"
    PASS=$((PASS + 1))
  else
    red "$name — expected HTTP $expected_status, got $actual_status"
    FAIL=$((FAIL + 1))
    ERRORS+=("$name: expected $expected_status got $actual_status — $body")
  fi
}

echo ""
echo "========================================"
echo "  Small Claims Genie API Smoke Test"
echo "========================================"
echo ""

# ── Health check ────────────────────────────────────────────────────────────
RESP=$(curl -s -o /tmp/sc_body.txt -w "%{http_code}" "$API/api/healthz")
BODY=$(cat /tmp/sc_body.txt)
check "GET /api/healthz — server is up" "200" "$RESP" "$BODY"

# ── Auth enforcement — unauthenticated calls should return 401 ───────────────
RESP=$(curl -s -o /tmp/sc_body.txt -w "%{http_code}" "$API/api/cases")
BODY=$(cat /tmp/sc_body.txt)
check "GET /api/cases without auth → 401" "401" "$RESP" "$BODY"

RESP=$(curl -s -o /tmp/sc_body.txt -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d '{"title":"test","claimType":"Money Owed"}' \
  "$API/api/cases")
BODY=$(cat /tmp/sc_body.txt)
check "POST /api/cases without auth → 401" "401" "$RESP" "$BODY"

RESP=$(curl -s -o /tmp/sc_body.txt -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d '{"content":"hello"}' \
  "$API/api/cases/1/chat")
BODY=$(cat /tmp/sc_body.txt)
check "POST /api/cases/:id/chat without auth → 401" "401" "$RESP" "$BODY"

RESP=$(curl -s -o /tmp/sc_body.txt -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  "$API/api/cases/1/documents")
BODY=$(cat /tmp/sc_body.txt)
check "POST /api/cases/:id/documents without auth → 401" "401" "$RESP" "$BODY"

# ── Counties endpoint — public, returns all 58 CA counties ──────────────────
RESP=$(curl -s -o /tmp/sc_body.txt -w "%{http_code}" "$API/api/counties")
BODY=$(cat /tmp/sc_body.txt)
check "GET /api/counties — returns 200" "200" "$RESP" "$BODY"
COUNT=$(echo "$BODY" | jq 'length' 2>/dev/null || echo "0")
if [[ "$COUNT" -ge 58 ]]; then
  green "GET /api/counties — returns all 58 counties ($COUNT found)"
  PASS=$((PASS + 1))
else
  red "GET /api/counties — expected 58 counties, got $COUNT"
  FAIL=$((FAIL + 1))
  ERRORS+=("Counties count: expected >= 58, got $COUNT")
fi

# ── Vite proxy — /api calls from frontend port should reach API ──────────────
VITE_PORT="${PORT:-18304}"
RESP=$(curl -s -o /tmp/sc_body.txt -w "%{http_code}" "http://localhost:$VITE_PORT/api/healthz")
BODY=$(cat /tmp/sc_body.txt)
check "GET /api/healthz via Vite proxy (port $VITE_PORT) — proxy is active" "200" "$RESP" "$BODY"

RESP=$(curl -s -o /tmp/sc_body.txt -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fake-token-for-proxy-test" \
  -d '{"content":"test"}' \
  "http://localhost:$VITE_PORT/api/cases/999/chat")
BODY=$(cat /tmp/sc_body.txt)
check "POST /api/cases/:id/chat via Vite proxy forwards Authorization header → 401 not missing-auth" "401" "$RESP" "$BODY"
if echo "$BODY" | grep -q "Invalid or expired token"; then
  green "  └─ Authorization header correctly forwarded by Vite proxy"
  PASS=$((PASS + 1))
elif echo "$BODY" | grep -q "missing or malformed"; then
  red "  └─ Vite proxy is STRIPPING the Authorization header (regression!)"
  FAIL=$((FAIL + 1))
  ERRORS+=("Vite proxy strips Authorization header on POST — the proxy fix may be broken")
fi

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "========================================"
TOTAL=$((PASS + FAIL))
if [[ $FAIL -eq 0 ]]; then
  echo -e "\033[32m  All $TOTAL checks passed. Safe to publish.\033[0m"
else
  echo -e "\033[31m  $FAIL / $TOTAL checks FAILED. Do not publish until fixed:\033[0m"
  for err in "${ERRORS[@]}"; do
    echo -e "\033[31m    • $err\033[0m"
  done
fi
echo "========================================"
echo ""
exit $FAIL
