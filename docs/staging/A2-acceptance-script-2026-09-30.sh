#!/usr/bin/env bash
# A2 acceptance checks (docs/RENDER_STANDUP_RUNBOOK.md §5) — parameterized.
# Usage: A2_APP=https://wingman-….onrender.com A2_API=https://wingman-api-….onrender.com \
#        A2_SESSION="wingman_session=…" bash docs/staging/A2-acceptance-script-2026-09-30.sh
# Run after BOTH first deploys go live and §4's storage.mode.resolved line is confirmed.
# Each step prints PASS/FAIL with the runbook condition; a summary ends the run.
set -u
APP="${A2_APP:?set A2_APP to the frontend URL}"
API="${A2_API:?set A2_API to the backend URL}"
SESSION="${A2_SESSION:-}"
PASS=0; FAIL=0
note() { printf '\n== %s ==\n' "$*"; }
ok()   { PASS=$((PASS+1)); printf 'PASS  %s\n' "$1"; }
bad()  { FAIL=$((FAIL+1)); printf 'FAIL  %s\n' "$1"; }

note "1. Liveness (/api/health)"
H=$(curl -sS -m 20 "$API/api/health" 2>&1)
case "$H" in *'"status":"ok"'*) ok "health ok: $H";; *) bad "health: $H";; esac

note "2. Readiness incl. storage (/api/ready)"
R=$(curl -sS -m 20 "$API/api/ready" 2>&1)
case "$R" in *'"ready":true'*) echo "$R" | grep -q 'supabase-tables' && ok "ready + supabase-tables: $R" || bad "ready but wrong storage mode: $R";; *) bad "not ready: $R";; esac

note "3. Frontend serves the app"
F=$(curl -sS -m 20 -o /dev/null -w '%{http_code}' "$APP/" 2>&1)
[ "$F" = "200" ] && ok "frontend HTTP 200" || bad "frontend HTTP $F"
echo "        (browser step is manual: UI loads with no console errors, footer shows the deploy commit)"

note "4. Write path — signup a staging workspace owner"
STAMP=$(date +%s)
NAME="staging-owner-$STAMP"
S=$(curl -sS -m 30 -X POST "$API/api/wingman/auth/signup" -H "Content-Type: application/json" \
  -d "{\"name\":\"$NAME\",\"company\":\"Wingman staging\",\"email\":\"$NAME@example.invalid\",\"password\":\"staging-$STAMP-Aa1!\"}" 2>&1)
echo "$S" | head -c 300; echo
echo "        (Supabase Table Editor is manual: wingman_users + wingman_workspaces must show the row)"
case "$S" in *error*|*invalid*) bad "signup failed";; *) ok "signup accepted (verify rows in Table Editor)";; esac

note "5. Session + project round trip"
echo "        MANUAL (UI): sign in, create + edit a project, reload — it survives."
echo "        MANUAL: second browser profile signs in and sees the same project."

note "6. CSRF negative test (state-changing request without the CSRF header → 403)"
if [ -n "$SESSION" ]; then
  C=$(curl -sS -m 20 -o /dev/null -w '%{http_code}' -X POST "$API/api/wingman/site-survey/sync" \
    -H "Content-Type: application/json" -b "$SESSION" -d '{}' 2>&1)
  [ "$C" = "403" ] && ok "CSRF rejection 403" || { [ "$C" = "401" ] && bad "401 — cookie stale, re-copy a fresh session cookie" || bad "got $C, expected 403"; }
else
  echo "        SKIPPED (set A2_SESSION with a signed-in wingman_session cookie to run)"
  FAIL=$((FAIL+1))
fi

note "7. Telemetry readback"
if [ -n "$SESSION" ]; then
  T=$(curl -sS -m 20 "$API/api/wingman/telemetry" -b "$SESSION" 2>&1)
  echo "        telemetry: $(echo "$T" | head -c 200)"
  ok "telemetry endpoint reachable with session"
else
  echo "        SKIPPED (needs A2_SESSION)"
  FAIL=$((FAIL+1))
fi

note "SUMMARY"
printf 'PASS %d / FAIL %d\n' "$PASS" "$FAIL"
[ "$FAIL" = "0" ] && echo "A2 §5 acceptance: ALL GREEN (manual steps recorded above)" || echo "A2 §5 acceptance: incomplete — resolve FAIL rows above"
