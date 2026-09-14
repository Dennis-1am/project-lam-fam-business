# Family Business Catalog

A product showcase website with an Instagram-style catalog feed. Owners log in to upload product images, and edit prices and descriptions. No cart or checkout — this is a showcase catalog.

Built with Next.js 16 (App Router), Prisma + SQLite, and a lightweight custom session auth.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000. The catalog shows the seeded sample product.

Development needs no `.env` file — the committed `.env.development` (dev database, dev credentials) is picked up automatically. A `.env` with production values is only created on the machine that hosts the live site (see the prod/dev database section).

## Admin access

- Sign in at `/admin/login`.
- Default credentials come from `.env` (production) or `.env.development` (dev) — `ADMIN_USERNAME` / `ADMIN_PASSWORD`. Change them before going live, and set a long random `AUTH_SECRET` (e.g. `openssl rand -hex 32`).

## What you can do

| Area | Actions |
|---|---|
| `/` | Browse the catalog feed (square image cards). Click a card for the full listing with an image gallery. |
| `/admin` | List products; create, edit, and delete them. |
| `/admin/new` | Create a product: title, price, description, and upload multiple images for one listing. |
| `/admin/[id]/edit` | Edit price/description, add or remove images. |
| `/api/upload` | Image upload endpoint (admin-only, validates type/size). Files are saved under `public/uploads/`. |

## Data model

- **Product** — `id`, `title`, `description`, `priceCents` (stored as cents to avoid floating-point issues), timestamps.
- **Image** — `url`, `position`, belongs to a product. Many images per listing, shown in position order.

## Scripts

```bash
npm run dev          # start dev server (uses prisma/dev.db)
npm run build        # production build
npm run start        # run production build
npm run lint         # eslint
npm run db:seed      # top up sample products/tags against the DEV db (safe: skips if 75+ exist)
npm run db:reset     # DEV ONLY: drop DEV db, re-migrate, re-seed (wipes the DEV database)
npm run db:migrate   # DEV ONLY: create/apply migrations against the DEV database
npm run db:deploy    # apply migrations to the PRODUCTION database (what scripts/deploy.sh runs)
npm run db:snapshot  # copy the production database into the dev database (develop against real data)
```

## Development vs production database

There are two separate SQLite databases — never confuse them:

| File | Used by | Config |
|---|---|---|
| `prisma/prod.db` | The live site (`next start`, launchd service) | `.env` → `DATABASE_URL` |
| `prisma/dev.db` | `npm run dev` and dev Prisma commands | `.env.development` → `DATABASE_URL` |

- `next dev` loads `.env.development` first, so the dev server always reads the dev database.
- All dev Prisma commands (`db:seed`, `db:reset`, `db:migrate`) are wrapped with `dotenv-cli -e .env.development`, so they can **only** touch `prisma/dev.db`.
- The production database is only ever touched by the running `next start` service and `npm run db:deploy` (from `scripts/deploy.sh`).

**Red lines**

- Never run a bare `prisma` command against the production database. If you need a prod Prisma command, it goes through `db:deploy` (deploys migrations) and nothing else.
- `scripts/deploy.sh` backs up `prod.db` before migrating, but always make your own copy before any risky production work:
  ```bash
  cp prisma/prod.db prisma/prod.db.bak-manual
  ```
- To pull real production data into the dev database (quicker than seeding):
  ```bash
  npm run db:snapshot   # copies prod.db → dev.db
  ```

On any other machine (work laptop, new clone), development just works: `npm install && npm run dev` reads the committed `.env.development` and uses that machine's own local `prisma/dev.db`. It can never reach this machine's production database.

## Configuration

Everything lives in `.env` (production) and `.env.development` (dev):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | SQLite file path (`file:./prod.db` in `.env`, `file:./dev.db` in `.env.development`) |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Admin sign-in credentials |
| `AUTH_SECRET` | Used to sign session cookies |

Site name, tagline, and currency are in `lib/site.ts`.