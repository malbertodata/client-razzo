# Coolify env — Razzo Fondue (`razzosg.ch`)

Source: Client Podium **production** `cp.sites` where `slug = 'razzo'`, `status = live` (Oct 2026).

| CP field | Value |
|----------|--------|
| `public_domain_apex` | `razzosg.ch` |
| `domain` | `www.razzosg.ch` |
| `analytics_proxy_path` | see below |
| `umami_website_id` | set in Agency + Coolify (from Umami UI) |

Do **not** use the old **staging** proxy token `338ca50006e1635ca87d24199992d00b`.

## Coolify — copy/paste

| Variable | Build-time | Runtime | Value |
|----------|------------|---------|-------|
| `PUBLIC_ANALYTICS_PROXY_PATH` | yes | — | `a2a2ab20899f180a873248bcf4cc6695` |
| `ANALYTICS_PROXY_PATH` | — | yes | `a2a2ab20899f180a873248bcf4cc6695` |
| `PUBLIC_UMAMI_WEBSITE_ID` | yes | — | `33a0be4d-aa57-4282-b5d4-424952f97e7b` |
| `UMAMI_WEBSITE_ID` | — | yes | `33a0be4d-aa57-4282-b5d4-424952f97e7b` |
| `UMAMI_UPSTREAM_URL` | — | optional | `https://analytics.clientpodium.com` |
| `PORT` | — | yes | `3000` |

Mark the `PUBLIC_*` variables as **Available at Buildtime** in Coolify. After changing `PUBLIC_UMAMI_WEBSITE_ID`, **redeploy** (Astro bakes it into HTML).

## Umami

- Website **Razzo** on [analytics.clientpodium.com](https://analytics.clientpodium.com).
- Copy **Website ID** from edit screen or URL `/websites/{uuid}/…`.
- Umami domain (one field): **`www.razzosg.ch`**. Use Coolify redirect so **`razzosg.ch` → `www.razzosg.ch`** (or the reverse) — then one hostname in Umami is enough.

## Agency (recommended)

Client Podium → Site **Razzo** → **Umami** = same UUID as Coolify (keeps CP and standalone app aligned).

## Local

```bash
cp .env.example .env   # or use repo .env (gitignored)
npm run build
npm run preview
# http://localhost:3000/buchen — Network: /a2a2ab20899f180a873248bcf4cc6695/stats
```
