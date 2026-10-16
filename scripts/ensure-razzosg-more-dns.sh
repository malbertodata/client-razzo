#!/usr/bin/env bash
# Creates proxied A record more.razzosg.ch → origin (same as www).
# Requires CLOUDFLARE_API_TOKEN with Zone:Read + DNS:Edit on razzosg.ch.
set -euo pipefail

ZONE_ID="${RAZZOSG_ZONE_ID:-9e82490e45801c8ee9399227bea7d7dd}"
ORIGIN_IP="${RAZZOSG_ORIGIN_IP:-116.203.69.21}"
TOKEN="${CLOUDFLARE_API_TOKEN:?Set CLOUDFLARE_API_TOKEN with DNS edit on razzosg.ch}"

existing="$(curl -sS -H "Authorization: Bearer $TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records?name=more.razzosg.ch")"

if echo "$existing" | grep -q '"success":true' && echo "$existing" | grep -q '"result":\[{' ; then
  echo "more.razzosg.ch DNS record already exists."
  exit 0
fi

curl -sS -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  --data "{\"type\":\"A\",\"name\":\"more\",\"content\":\"$ORIGIN_IP\",\"proxied\":true,\"ttl\":1}" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); sys.exit(0 if d.get('success') else (print(d),1)[1])"

echo "Created more.razzosg.ch → $ORIGIN_IP (proxied)."
