# Razzo landings (razzosg.ch)

Standalone **Fondue Chalet 2026** campaign site for Client Podium / Razzo.

- **Domain:** `www.razzosg.ch` (apex `razzosg.ch` redirects to www). Unknown paths on production → `https://www.razzo.sg/` (see [docs](docs/fondue-chalet-razzosg.md)).
- **Config:** `src/config/campaign.json`
- **Ops:** [docs/fondue-chalet-razzosg.md](docs/fondue-chalet-razzosg.md)

Touchpoints (NFC link hub) live in [`hospitality_websites`](../../hospitality_websites) **web** app — e.g. [`https://more.razzosg.ch/touch`](docs/touchpoint-more-razzosg.md) (same as `/de/nfc/touch` locally). Chalet short links on this repo stay on `www.razzosg.ch`.

## Quick start (local)

```bash
npm install
npm run dev
```

http://localhost:4321/buchen (root redirects here) · http://localhost:4321/en/book
