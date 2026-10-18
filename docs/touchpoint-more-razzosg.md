# Touchpoint: more.razzosg.ch/touch

Same page as local dev [`http://localhost:5001/de/nfc/touch`](http://localhost:5001/de/nfc/touch) — public URL has **no** `/de/` prefix; middleware rewrites to `/de/nfc/touch` internally.

Served by the **hospitality web** app, not `razzosg-landings`.

## Public URL (NFC / QR)

```text
https://more.razzosg.ch/touch
```

Bare `https://more.razzosg.ch/` → 302 to `/touch` when `defaultCodename` is `touch` ([`razzo.json`](../../hospitality_websites/apps/web/src/config/nfc/razzo.json)).

Legacy equivalents: `https://nfc.razzo.sg/touch`, `https://more.razzo.sg/touch`.

## Infrastructure

| Layer | Action |
|-------|--------|
| **DNS** | `more.razzosg.ch` → same proxied origin as `www.razzosg.ch` |
| **Coolify** | `https://more.razzosg.ch` on the **web** app (already added) |
| **Content** | [`apps/web/src/config/nfc/razzo.json`](../../hospitality_websites/apps/web/src/config/nfc/razzo.json) or Touchpoints in admin when feature **`nfc`** is on |

## Local dev

```bash
cd ../hospitality_websites
LOCAL_DEV_SITE_SLUG=razzo pnpm dev:web
# Internal path (what Astro renders):
open http://localhost:5001/de/nfc/touch
# Production-shaped host + path:
curl -sL -H 'Host: more.razzosg.ch' http://127.0.0.1:5001/touch
```

## NFC tag

```text
https://more.razzosg.ch/touch
```

## Analytics (Umami)

When the site has an `analyticsProxyPath` and a Umami website id (from the site row or `PUBLIC_UMAMI_WEBSITE_ID` / `UMAMI_WEBSITE_ID` on the **web** app — same UUID as the fondue landings app), the touch page loads the deferred stats script. Events go to the same Umami website as chalet (`fondue_click` vs `nfc_*` are different event names). Custom events:

| Event | When | Payload |
|-------|------|---------|
| (pageview) | Automatic | URL path |
| `nfc_view` | Page open (retried until Umami loads) | `codename` |
| `nfc_click` | Any tracked link or footer target | `link` (e.g. `instagram`, `phone`, `privacy`) |
| `locale_switch` | DE/EN switcher | `to` (`de` or `en`) |

Local dev with the NFC stub has no Umami IDs unless you use a real site row or env.
