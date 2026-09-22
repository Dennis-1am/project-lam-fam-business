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

# Site operations (2026-09)

## Branding
- Website name is **E-Life Trending** (formerly "Lam Life Shop"). Single source of truth in `lib/site.ts` (`siteConfig.name`); `app/layout.tsx` now derives the `<title>` from it.

## Production stack (all run from this Mac)
- `next start` (production build) on port 3000, kept alive by launchd service `com.lamfamily.catalog`.
- **Caddy** reverse-proxies ports 80/443 → 127.0.0.1:3000 (`/opt/homebrew/etc/Caddyfile`), with automatic Let's Encrypt certs.
- **DuckDNS** keeps `elife-trending.duckdns.org` (live / primary) and `lamfamily.duckdns.org` (legacy, still served by Caddy for the transition) pointed at the house's public IP. DuckDNS update script: `scripts/duckdns-update.sh` (the token is in `.env` as `DUCK_DNS_TOKEN` — never put it in committed files). It's scheduled by launchd.
- Ship code changes with `./scripts/deploy.sh` (backs up `prisma/prod.db`, migrates prod DB, rebuilds, restarts the service).
- Old public address `https://lamfamily.duckdns.org` still works via Caddy. The old `TRANSLATE_REFERER` was updated in `.env` / `.env.example` to the new domain; if the Google Cloud Translate API key has a website restriction it must list the new domain too.

## Home-LAN access (no NAT loopback)
- The Xfinity gateway has **no NAT loopback**: devices on the home wifi cannot reach the public domain through the router even though it's live on the internet.
- Fix: **dnsmasq** runs on this Mac (config `/opt/homebrew/etc/dnsmasq.conf`) and answers `*.duckdns.org` for both domains at the Mac's LAN IP (`10.0.0.76`), forwarding everything else to public resolvers. Started via `sudo brew services start dnsmasq`; config has query logging to `/tmp/dnsmasq.log` (owned by `nobody` until `sudo chmod 644`).
- A home device uses the real domain by setting its DNS server to `10.0.0.76` (iPad: Settings → Wi-Fi → i → Configure DNS → Manual → `10.0.0.76`).

### Known gotcha (iPad at home)
Setting the iPad's wifi DNS manually to `10.0.0.76` sometimes makes the iPad lose ALL other internet (LAN still works; DNS still resolves via dnsmasq). Root cause was investigated but never pinned down. Recovery: set iOS wifi DNS back to **Automatic**; at home browse `http://10.0.0.76:3000` instead. The public `https://elife-trending.duckdns.org` works from anywhere outside the house.
