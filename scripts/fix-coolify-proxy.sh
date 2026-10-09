#!/bin/bash
set -euo pipefail
# Regenerates proxy compose without app `labels:` (fixes "services.labels must be a mapping").
PROXY_DIR="${PROXY_DIR:-/data/coolify/proxy}"
if [ ! -d "$PROXY_DIR" ]; then
  echo "Missing $PROXY_DIR — run on hospitality-prod-1 or set PROXY_DIR." >&2
  exit 1
fi
cd "$PROXY_DIR"
# Reads CF_DNS_API_TOKEN from current compose or backup path ($1).
SOURCE="${1:-docker-compose.yml}"
if [[ "$SOURCE" != /* ]]; then
  SOURCE="$PROXY_DIR/$SOURCE"
fi
CF=$(grep 'CF_DNS_API_TOKEN' "$SOURCE" | head -1 | sed 's/^[[:space:]]*-[[:space:]]*//')
if [ -z "$CF" ] || [ "$CF" = "CF_DNS_API_TOKEN=REPLACE_ME" ]; then
  echo "No CF_DNS_API_TOKEN in $SOURCE — set the rotated token in environment first." >&2
  exit 1
fi
cat > docker-compose.yml << EOF
name: coolify-proxy
networks:
  coolify:
    external: true
services:
  traefik:
    container_name: coolify-proxy
    image: traefik:v3.6
    restart: unless-stopped
    extra_hosts:
      - host.docker.internal:host-gateway
    environment:
      - ${CF}
    networks:
      - coolify
    ports:
      - 80:80
      - 443:443
      - 443:443/udp
    healthcheck:
      test: wget -qO- http://localhost:80/ping || exit 1
      interval: 4s
      timeout: 2s
      retries: 5
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /data/coolify/proxy/:/traefik
    command:
      - --ping=true
      - --ping.entrypoint=http
      - --api.dashboard=true
      - --entrypoints.http.address=:80
      - --entrypoints.https.address=:443
      - --providers.file.directory=/traefik/dynamic/
      - --providers.file.watch=true
      - --providers.docker=true
      - --providers.docker.exposedbydefault=false
      - --certificatesresolvers.letsencrypt.acme.dnschallenge=true
      - --certificatesresolvers.letsencrypt.acme.dnschallenge.provider=cloudflare
      - --certificatesresolvers.letsencrypt.acme.storage=/traefik/acme.json
      - --certificatesresolvers.letsencrypt-http.acme.httpchallenge=true
      - --certificatesresolvers.letsencrypt-http.acme.httpchallenge.entrypoint=http
      - --certificatesresolvers.letsencrypt-http.acme.storage=/traefik/acme-http.json
      - --certificatesresolvers.letsencrypt-http.acme.email=admin@clientpodium.com
EOF
docker compose config >/dev/null
echo "Config OK. Starting proxy..."
docker compose up -d
docker ps --filter name=coolify-proxy
