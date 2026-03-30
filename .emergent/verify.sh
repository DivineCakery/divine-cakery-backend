#!/bin/bash
# /app/.emergent/verify.sh
# Checks that all fixes are correctly applied. Prints PASS/FAIL per check.
set -uo pipefail

PASS=0
FAIL=0
APP_NAME="reports-timezone-bug"

check() {
  local name="$1"
  local result="$2"  # 0=pass, non-0=fail
  local detail="$3"
  if [ "$result" -eq 0 ]; then
    echo "PASS: $name — $detail"
    PASS=$((PASS + 1))
  else
    echo "FAIL: $name — $detail"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== Verification: $(date) ==="
echo ""

# CHECK 1: EXPO_TUNNEL_SUBDOMAIN in supervisor conf
if grep -q "EXPO_TUNNEL_SUBDOMAIN=prep-route-admin
  check "supervisor-env" 0 "EXPO_TUNNEL_SUBDOMAIN=prep-route-admin
else
  check "supervisor-env" 1 "EXPO_TUNNEL_SUBDOMAIN missing from supervisor conf"
fi

# CHECK 2: EXPO_TUNNEL_SUBDOMAIN in .env
if grep -q "^EXPO_TUNNEL_SUBDOMAIN=prep-route-admin
  check "dotenv" 0 "EXPO_TUNNEL_SUBDOMAIN=prep-route-admin
else
  check "dotenv" 1 "EXPO_TUNNEL_SUBDOMAIN missing from .env"
fi

# CHECK 3: app.json does NOT have expo-image in plugins
if grep -q '"expo-image"' /app/frontend/app.json 2>/dev/null; then
  check "app-json-plugins" 1 "expo-image still in plugins (causes crash)"
else
  check "app-json-plugins" 0 "expo-image not in plugins"
fi

# CHECK 4: app.json output is "single" not "static"
if grep -q '"output".*"single"' /app/frontend/app.json 2>/dev/null; then
  check "app-json-output" 0 "web output is 'single'"
elif grep -q '"output".*"static"' /app/frontend/app.json 2>/dev/null; then
  check "app-json-output" 1 "web output is 'static' (causes SSR crash loop)"
else
  check "app-json-output" 1 "web output setting not found"
fi

# CHECK 5: Expo process is running
if supervisorctl status expo 2>/dev/null | grep -q "RUNNING"; then
  check "expo-running" 0 "expo process is RUNNING"
else
  check "expo-running" 1 "expo process is NOT running"
fi

# CHECK 6: Tunnel URL matches expected
TUNNEL_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | python3 -c "import json,sys; [print(t['public_url']) for t in json.load(sys.stdin).get('tunnels',[]) if t.get('proto')=='https']" 2>/dev/null || echo "")
if [ "$TUNNEL_URL" = "https://${APP_NAME}.ngrok.io" ]; then
  check "tunnel-url" 0 "tunnel is https://${APP_NAME}.ngrok.io"
else
  check "tunnel-url" 1 "tunnel is '${TUNNEL_URL}', expected https://${APP_NAME}.ngrok.io"
fi

# CHECK 7: Manifest accessible via tunnel
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://${APP_NAME}.ngrok.io/" -H "expo-platform: android" -H "Accept: application/expo+json" --connect-timeout 10 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  check "manifest-reachable" 0 "manifest returns HTTP 200 via tunnel"
else
  check "manifest-reachable" 1 "manifest returned HTTP $HTTP_CODE"
fi

# CHECK 8: apply.sh exists and is executable
if [ -x /app/.emergent/apply.sh ]; then
  check "apply-script" 0 "apply.sh exists and is executable"
else
  check "apply-script" 1 "apply.sh missing or not executable"
fi

# CHECK 9: Boot hook — supervisor applyfixes program exists in conf.d
if [ -f /etc/supervisor/conf.d/applyfixes.conf ]; then
  check "boot-hook" 0 "applyfixes.conf present in supervisor conf.d"
else
  check "boot-hook" 1 "applyfixes.conf missing from supervisor conf.d"
fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
