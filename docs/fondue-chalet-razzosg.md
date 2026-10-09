# Fondue Chalet 2026 (razzosg.ch)

Standalone repo for temporary campaign landings until the full `razzosg.ch` site ships.

## Public URLs

| Audience | Path |
|----------|------|
| Booking hub (default) | `/buchen` · `/en/book` |
| Chalet poster (QR) | `https://www.razzosg.ch/fondue-chalet` → `/reservieren` (+ UTMs) |
| Business mailing | `https://www.razzosg.ch/firmenfeier` → `/reservieren` (+ UTMs) |
| Associations / clubs | `https://www.razzosg.ch/vereinsfeier` → `/reservieren` (+ UTMs) |
| Medical practices | `https://www.razzosg.ch/praxisfeier` → `/reservieren` (+ UTMs) |

Legacy aliases (same tracking): `/chalet-aussen`, `/unternehmen`, `/vereine`.

`/` → `/buchen` · `/en` → `/en/book`

## Config

Edit [`src/config/campaign.json`](../src/config/campaign.json) — copy, UTMs, Aleno URLs. Replace `REPLACE_CHALET_AMPHITHEATER` with the Amphitheater Aleno `k=` token.

## Local dev

```bash
cp .env.example .env   # optional: analytics IDs
npm install
npm run dev
```

Open http://localhost:4321/reservieren

Short links (same redirects as production; `npm run dev` on port **4321**):

| Channel | Local URL |
|---------|-----------|
| Chalet QR | http://localhost:4321/fondue-chalet |
| Firmenfeier | http://localhost:4321/firmenfeier |
| Vereinsfeier | http://localhost:4321/vereinsfeier |
| Praxisfeier (Arztpraxen) | http://localhost:4321/praxisfeier |

After `npm run build`, `npm run preview` serves the same paths on port **3000** (e.g. http://localhost:3000/fondue-chalet).

Production-like preview (static + Umami proxy):

```bash
npm run build
UMAMI_WEBSITE_ID=… ANALYTICS_PROXY_PATH=… npm run preview
```

## Deploy (Coolify)

1. Point **razzosg.ch** / **www.razzosg.ch** at this app.
2. Set build args / env: `PUBLIC_UMAMI_WEBSITE_ID`, `PUBLIC_ANALYTICS_PROXY_PATH` (same token as Razzo NFC site).
3. Set runtime env on the container: `UMAMI_WEBSITE_ID`, `ANALYTICS_PROXY_PATH`, optional `UMAMI_UPSTREAM_URL`.
4. Build command: `npm run build` — start command: `node server.mjs`.

WordPress at `www.razzo.sg` is unchanged.
