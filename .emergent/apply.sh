#!/bin/bash
# /app/.emergent/apply.sh
# Idempotent script to apply persistent fixes to ephemeral locations.
# Safe to run repeatedly. Invoked automatically on every boot.
set -euo pipefail

LOG="/app/.emergent/apply.log"
SUPERVISOR_CONF="/etc/supervisor/conf.d/supervisord.conf"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"; }

log "=== apply.sh starting ==="

# ---------- FIX 1: EXPO_TUNNEL_SUBDOMAIN in supervisor conf ----------
# The platform QR code at share-preview encodes exp://<app-name>.ngrok.io
# Expo must use that as its tunnel subdomain via EXPO_TUNNEL_SUBDOMAIN env var.
# The supervisor environment line is ephemeral (reset each boot from template).

APP_NAME="reports-timezone-bug"

if [ -f "$SUPERVISOR_CONF" ]; then
  if grep -q 'EXPO_TUNNEL_SUBDOMAIN' "$SUPERVISOR_CONF"; then
    log "FIX1: EXPO_TUNNEL_SUBDOMAIN already present in supervisor conf — skipping"
  else
    # Append EXPO_TUNNEL_SUBDOMAIN to the expo program's environment line
    sed -i "/^\[program:expo\]/,/^\[/ s|^environment=\(.*\)|environment=\1,EXPO_TUNNEL_SUBDOMAIN=\"${APP_NAME}\"|" "$SUPERVISOR_CONF"
    if grep -q "EXPO_TUNNEL_SUBDOMAIN=\"${APP_NAME}\"" "$SUPERVISOR_CONF"; then
      log "FIX1: Injected EXPO_TUNNEL_SUBDOMAIN=${APP_NAME} into supervisor conf"
    else
      log "FIX1: FAILED to inject EXPO_TUNNEL_SUBDOMAIN"
      exit 1
    fi
  fi
else
  log "FIX1: WARNING — supervisor conf not found at $SUPERVISOR_CONF (too early?)"
fi

# ---------- FIX 2: Ensure EXPO_TUNNEL_SUBDOMAIN in /app/frontend/.env ----------
# The entrypoint has a sed that updates this line if it exists.
# We ensure the line exists so the entrypoint sed is not a no-op.
ENV_FILE="/app/frontend/.env"
if [ -f "$ENV_FILE" ]; then
  if grep -q '^EXPO_TUNNEL_SUBDOMAIN=' "$ENV_FILE"; then
    log "FIX2: EXPO_TUNNEL_SUBDOMAIN already in .env — skipping"
  else
    echo "EXPO_TUNNEL_SUBDOMAIN=${APP_NAME}" >> "$ENV_FILE"
    log "FIX2: Appended EXPO_TUNNEL_SUBDOMAIN=${APP_NAME} to .env"
  fi
else
  log "FIX2: WARNING — .env not found"
fi

# ---------- FIX 3: Ensure app.json has correct config ----------
# expo-image must NOT be in plugins (causes crash). output must be "single" not "static".
APP_JSON="/app/frontend/app.json"
if [ -f "$APP_JSON" ]; then
  NEEDS_FIX=false

  if grep -q '"expo-image"' "$APP_JSON"; then
    log "FIX3: Found expo-image in plugins — will be fixed by verify, flagging"
    NEEDS_FIX=true
  fi

  if grep -q '"output": "static"' "$APP_JSON"; then
    log "FIX3: Found output:static — will be fixed by verify, flagging"
    NEEDS_FIX=true
  fi

  if [ "$NEEDS_FIX" = true ]; then
    # Remove "expo-image" from plugins array (handle trailing comma cases)
    # Use python for safe JSON manipulation
    python3 -c "
import json, re

with open('$APP_JSON', 'r') as f:
    content = f.read()

# Remove trailing commas before } or ] (JSON5 → JSON)
cleaned = re.sub(r',\s*([\]}])', r'\1', content)

data = json.loads(cleaned)

# Fix 1: Remove expo-image from plugins
plugins = data.get('expo', {}).get('plugins', [])
data['expo']['plugins'] = [p for p in plugins if p != 'expo-image']

# Fix 2: Change output from static to single
web = data.get('expo', {}).get('web', {})
if web.get('output') == 'static':
    web['output'] = 'single'

with open('$APP_JSON', 'w') as f:
    json.dump(data, f, indent=2)
    f.write('\n')
"
    log "FIX3: Corrected app.json (removed expo-image plugin, set output=single)"
  else
    log "FIX3: app.json already correct — skipping"
  fi
else
  log "FIX3: WARNING — app.json not found"
fi

# ---------- Reload supervisor if we changed config ----------
if command -v supervisorctl &>/dev/null; then
  supervisorctl reread &>/dev/null 2>&1 || true
  supervisorctl update &>/dev/null 2>&1 || true
  log "Supervisor config reloaded"
fi

log "=== apply.sh completed successfully ==="
