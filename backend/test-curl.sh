#!/usr/bin/env bash
# Smoke tests — run on the server after setup.
set -euo pipefail
BASE="${BINDEX_URL:-http://localhost:1880}"

pass() { printf "  \033[32mPASS\033[0m %s\n" "$1"; }
fail() { printf "  \033[31mFAIL\033[0m %s\n" "$1"; exit 1; }
check() {
    local body="$1" needle="$2" label="$3"
    echo "$body" | grep -q "$needle" && pass "$label" || fail "$label — expected '$needle' in: $body"
}

echo "=== BINDEX smoke tests (${BASE}) ==="
echo ""

# ── Health ────────────────────────────────────────────────────────────────────
echo "--- Health ---"
R=$(curl -sf "$BASE/api/system/health")
check "$R" '"db":"ok"' "health check"

# ── Parts CRUD ────────────────────────────────────────────────────────────────
echo "--- Parts CRUD ---"
R=$(curl -sf -X POST "$BASE/api/parts" \
  -H "Content-Type: application/json" \
  -d '{"name":"Smoke NE555","category":"IC","package":"DIP","qty":10,"min_qty":2}')
check "$R" '"name":"Smoke NE555"' "create part"
ID=$(echo "$R" | grep -o '"id":[0-9]*' | grep -o '[0-9]*' | head -1)

R=$(curl -sf "$BASE/api/parts/$ID")
check "$R" '"name":"Smoke NE555"' "get part"

R=$(curl -sf -X PATCH "$BASE/api/parts/$ID" \
  -H "Content-Type: application/json" \
  -d '{"qty":20}')
check "$R" '"qty":20' "patch qty"

# ── Dispense & add-stock ──────────────────────────────────────────────────────
echo "--- Dispense / add-stock ---"
R=$(curl -sf -X POST "$BASE/api/parts/$ID/dispense" \
  -H "Content-Type: application/json" \
  -d '{"qty":3,"actor":"workbench"}')
check "$R" '"dispensed":3' "dispense"

# insufficient stock guard
HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/parts/$ID/dispense" \
  -H "Content-Type: application/json" \
  -d '{"qty":9999,"actor":"workbench"}')
[ "$HTTP" = "400" ] && pass "insufficient stock → 400" || fail "insufficient stock guard: expected 400, got $HTTP"

R=$(curl -sf -X POST "$BASE/api/parts/$ID/add-stock" \
  -H "Content-Type: application/json" \
  -d '{"qty":5,"supplier":"robu.in","unit_cost":12.5}')
check "$R" '"added":5' "add stock"

# ── Events ────────────────────────────────────────────────────────────────────
echo "--- Events ---"
R=$(curl -sf "$BASE/api/parts/$ID/events")
check "$R" '"kind":"dispense"' "events contain dispense"
check "$R" '"kind":"add"' "events contain add"

# ── Search ────────────────────────────────────────────────────────────────────
echo "--- Search ---"
R=$(curl -sf "$BASE/api/parts?q=Smoke+NE555")
check "$R" '"name":"Smoke NE555"' "search by name"

R=$(curl -sf "$BASE/api/parts?low=true")
check "$R" '"items"' "low-stock filter"

# ── CSV export ────────────────────────────────────────────────────────────────
echo "--- CSV ---"
R=$(curl -sf "$BASE/api/csv")
check "$R" "Name,Quantity,Type,Voltage,Package,Description,Place" "csv header"
check "$R" "Smoke NE555" "csv contains created part"

# ── Delete ────────────────────────────────────────────────────────────────────
echo "--- Delete ---"
curl -sf -X DELETE "$BASE/api/parts/$ID"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/parts/$ID")
[ "$HTTP" = "404" ] && pass "delete → 404" || fail "delete: expected 404, got $HTTP"

echo ""
echo "All smoke tests passed."
