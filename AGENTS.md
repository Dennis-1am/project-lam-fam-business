<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Browser compatibility

Tailwind v4 compiles `translate-*`, `rotate-*`, and `scale-*` utilities to the modern `translate`/`rotate`/`scale` CSS properties (`scale: var(...)`), not `transform: translate(...)`. Safari only supports these from v14.1 (2021), so content centered with `absolute` + `-translate-y-1/2` renders in the wrong position on older Safari (a past regression in `components/product-form.tsx`).

Rules:
- Center overlays/inset content with flexbox (`flex items-center`) or plain `absolute` offsets + padding — never `top-1/2`/`left-1/2` + `-translate-*`.
- For hover animations, prefer the classic `transform` property: use `transition-[transform]` + `group-hover:[transform:scale(1.05)]` (works everywhere) instead of `transition-transform` + `group-hover:scale-*`.
- Do not reintroduce `-translate-y-1/2`, `scale-*`, or `rotate-*` utilities for layout on this app.

# Site operations (updated 2026-10)

## Branding
- Website name is **E-Life Shop** (formerly "E-Life Trending", originally "Lam Life Shop"). Single source of truth in `lib/site.ts` (`siteConfig.name`); `app/layout.tsx` now derives the `<title>` from it. The public domain is still `elife-trending.duckdns.org`.

## Production stack (all run from this Mac)
- `next start` (production build) on port 3000, kept alive by launchd service `com.lamfamily.catalog`.
- **Caddy** reverse-proxies ports 80/443 → 127.0.0.1:3000 (`/opt/homebrew/etc/Caddyfile`), with automatic Let's Encrypt certs.
- **DuckDNS** keeps `elife-trending.duckdns.org` pointed at the house's public IP. DuckDNS update script: `scripts/duckdns-update.sh` (the token is in `.env` as `DUCK_DNS_TOKEN` — never put it in committed files). It's scheduled by launchd.
- Ship code changes with `./scripts/deploy.sh` (backs up `prisma/prod.db`, migrates prod DB, rebuilds, restarts the service).
- The old `TRANSLATE_REFERER` was updated in `.env` / `.env.example` to the new domain; if the Google Cloud Translate API key has a website restriction it must list the new domain too.

## Home-LAN access (NAT loopback, resolved)
- The current router **does support NAT loopback** (verified 2026-10-05: `curl --resolve elife-trending.duckdns.org:443:73.188.115.35` returned 200 in ~65ms; traceroute hop 1 is already the public IP). Devices on the home wifi can therefore reach `https://elife-trending.duckdns.org` directly, with DNS left on **Automatic**.
- The old Xfinity gateway had no NAT loopback, so it required a **dnsmasq** DNS override (`address=/elife-trending.duckdns.org/10.0.0.76`) plus manual DNS `10.0.0.76` on each device. That was removed on 2026-10-05: no dnsmasq process, no `sh.brew.dnsmasq` LaunchDaemon, port 53 free, and `/tmp/dnsmasq.log` deleted. Backups of the old config and disabled plist are in the system temp dir if ever needed.

### Gotcha: port 3000 is NOT reachable from the LAN
`next start` binds to `127.0.0.1:3000` only, so `http://10.0.0.76:3000` is **connection-refused** from other devices. There is no LAN-IP fallback for the site — Caddy on :443 is the only in-house path. Use the public https domain.
