# Coolify proxy — razzosg.ch (Client Podium server)

Operations for **Traefik** on `hospitality-prod-1` (`116.203.69.21`). Keep **`CF_DNS_API_TOKEN`** (rotated **`clientpodium-traefik-dns01`**) identical in:

1. `/data/coolify/proxy/docker-compose.yml` on the server  
2. **Coolify → Servers → Proxy → Configuration** (Save), **before** any **Restart proxy**

If Coolify’s saved YAML is broken, **Restart proxy** overwrites the good on-disk file and takes all sites offline.

## `services.labels must be a mapping`

Invalid **proxy** YAML (often app Traefik labels pasted into **Proxy → Configuration**). Do **not** paste the fix script into the Hetzner console (heredocs/`$` break easily).

**A — From your Mac (best):**

```bash
cd /Users/markusalbert/Development/Projects/client_razzo
bash scripts/upload-fix-proxy.sh
```

Uses `scp` + `ssh` to run [`scripts/fix-coolify-proxy.sh`](../scripts/fix-coolify-proxy.sh) on the server.

**B — On the server, download (after script is on GitHub `main`):**

```bash
cd /data/coolify/proxy
curl -fsSL -o fix-coolify-proxy.sh \
  https://raw.githubusercontent.com/malbertodata/client-razzo/main/scripts/fix-coolify-proxy.sh
chmod +x fix-coolify-proxy.sh
bash fix-coolify-proxy.sh
```

**C — No script:** restore a good backup, edit **one line** (token only):

```bash
cd /data/coolify/proxy/backups
ls -lt docker-compose*.yml | head -3
cp docker-compose.<pick-recent>.yml ../docker-compose.yml
nano ../docker-compose.yml
```

In `nano`: set `CF_DNS_API_TOKEN=…` to your current token; **delete** any top-level `labels:` under `services:` (keep only the `traefik:` service). Then:

```bash
cd /data/coolify/proxy
docker compose config && docker compose up -d
```

**Then:** paste the same `docker-compose.yml` into **Coolify → Proxy → Configuration → Save**.

## Site down (404 / connection refused)

On the **Hetzner console** (lowercase commands):

```bash
cd /data/coolify/proxy/backups
cp docker-compose.2026-05-10_07-59-28.75f6bf08.yml ../docker-compose.yml
cd ..
docker compose up -d
```

Ensure **`CF_DNS_API_TOKEN`** in that file matches the **current** rotated token, then paste the same file into **Coolify → Proxy → Configuration → Save**.

## HTTPS for razzosg.ch (DNS + optional HTTP resolver)

**DNS-01** uses Cloudflare; zone **`razzosg.ch`** must be in the Client Podium account and the Traefik token must allow **DNS Edit** for that zone.

After rotating the token, update **`docker-compose.yml`**, then either:

- **Option A — extend running compose (recommended):** run [`scripts/fix-coolify-proxy.sh`](../scripts/fix-coolify-proxy.sh) on the server (reads token from current `docker-compose.yml`, adds `provider=cloudflare` + `letsencrypt-http` resolver, **no `labels:` block**):

  ```bash
  cd /data/coolify/proxy
  bash fix-coolify-proxy.sh   # copy script contents to the server first
  docker compose config && echo OK
  ```

  Sync the same YAML into **Coolify → Proxy → Configuration → Save** before the next proxy restart.

- **Option B — razzosg via HTTP-01 only (optional):** after Option A, in Coolify open **razzosg-landings → General → Labels → Container labels**. That editor appears only when label mode is **Managed manually**; with **Read-only labels** (Coolify default), skip this — use DNS-01 only. If you switch to manual (not recommended unless you know Traefik labels), add in the UI only (not API):

  ```text
  traefik.http.routers.https-0-v2zbo9z5xmzvaumaioinu25a.tls.certresolver=letsencrypt-http
  traefik.http.routers.https-1-v2zbo9z5xmzvaumaioinu25a.tls.certresolver=letsencrypt-http
  ```

  Redeploy the app. **FQDN must stay** `https://www.razzosg.ch,https://razzosg.ch` (www first).

Verify:

```bash
echo | openssl s_client -connect razzosg.ch:443 -servername www.razzosg.ch 2>/dev/null | openssl x509 -noout -issuer
```

Expect **Let's Encrypt**, not `TRAEFIK DEFAULT CERT`.

Then in Coolify: **Server → Proxy → Redirect HTTP→HTTPS** on, **razzosg-landings → Force HTTPS** on, redeploy app.

## DNS (Cloudflare) — razzosg.ch

Zone **`razzosg.ch`** lives in the **Client Podium** Cloudflare account. Traefik renewals use **DNS-01** (token above); public web records are separate from ACME TXT records.

### Records

| Name | Type | Content | Proxy |
|------|------|---------|--------|
| `@` | **A** | `116.203.69.21` | **Proxied** (orange cloud) |
| `www` | **A** | `116.203.69.21` | **Proxied** (orange cloud) |
| `more` | **A** | `116.203.69.21` | **Proxied** — touchpoints (`more.razzosg.ch/touch` → **web** app, not razzosg-landings) |
| `@` / `www` | **AAAA** | — | **Do not add** origin IPv6 until Hetzner IPv6 + firewall + Traefik are verified (see below) |

Do **not** mix **proxied A** with **DNS-only AAAA** — that caused ACME/HTTPS flakiness in the past.

### Cloudflare settings

- **SSL/TLS → Overview:** **Full (strict)** while Traefik serves **Let's Encrypt** on the origin. Avoid **Flexible**.
- **Network → IPv6 compatibility:** **On** — visitors can use IPv6 at the Cloudflare edge without an origin **AAAA** record.

### Verify (from your Mac)

```bash
dig +short A www.razzosg.ch
# Proxied: Cloudflare anycast IPs (not 116.203.69.21)
# DNS-only: 116.203.69.21 — turn proxy on in the dashboard

dig +short AAAA www.razzosg.ch
# May show Cloudflare AAAA when proxied; no manual origin AAAA in DNS tab

curl -sSI https://www.razzosg.ch/ | grep -i cf-ray
# Proxied: cf-ray header present

echo | openssl s_client -connect www.razzosg.ch:443 -servername www.razzosg.ch 2>/dev/null | openssl x509 -noout -issuer -dates
# Expect Let's Encrypt (or valid edge chain), not TRAEFIK DEFAULT CERT
```

### Optional origin AAAA (later only)

1. Hetzner: stable primary IPv6; firewall allows **80/443** on IPv6.  
2. On server: `curl -6 -I http://[<ipv6>]/ping` and HTTPS with SNI succeed **direct to origin**.  
3. In Cloudflare: add **AAAA** (same names as **A**), **Proxied**. Re-run openssl and watch Traefik ACME through one renewal.

## Sync Coolify UI with disk (after token rotation)

1. On server: `cat /data/coolify/proxy/docker-compose.yml` (confirm rotated `CF_DNS_API_TOKEN`).
2. **Coolify → Servers → Proxy → Configuration** — paste the **same** YAML → **Save** (do **not** Restart proxy until `docker compose config` succeeds on disk).
3. Only then use **Restart proxy** from Coolify if needed.

## Coolify app domains (www canonical)

- **FQDN order:** `https://www.razzosg.ch,https://razzosg.ch` (www first avoids 404 on redeploy).
- **Redirect:** `www` (apex → www).
- Repo site URL: `https://www.razzosg.ch` in [`astro.config.mjs`](../astro.config.mjs).

Reference compose template (no secrets): [`coolify-proxy-docker-compose.yml`](coolify-proxy-docker-compose.yml).
