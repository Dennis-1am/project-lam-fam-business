# Family Business Catalog

A product showcase website with an Instagram-style catalog feed. Owners log in to upload product images, and edit prices and descriptions. No cart or checkout — this is a showcase catalog.

Built with Next.js 16 (App Router), Prisma + SQLite, and a lightweight custom session auth.

## Getting started

```bash
npm install
cp .env.example .env   # then edit the values
npm run db:seed        # creates the sample product + placeholder images
npm run dev
```

Open http://localhost:3000. The catalog shows the seeded sample product.

## Admin access

- Sign in at `/admin/login`.
- Default credentials come from `.env` (`ADMIN_USERNAME` / `ADMIN_PASSWORD`). Change them before going live, and set a long random `AUTH_SECRET` (e.g. `openssl rand -hex 32`).

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
npm run dev          # start dev server
npm run build        # production build
npm run start        # run production build
npm run lint         # eslint
npm run db:seed      # seed/refresh sample product
npm run db:reset     # drop DB, re-migrate, re-seed
```

## Configuration

Everything lives in `.env`:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | SQLite file path (`file:./dev.db`) |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Admin sign-in credentials |
| `AUTH_SECRET` | Used to sign session cookies |

Site name, tagline, and currency are in `lib/site.ts`.

## Deploying to production

1. Push to GitHub and import the repo on Vercel.
2. **Database:** SQLite is for local dev. On Vercel use a hosted Postgres — create a free Neon/Supabase database and set `DATABASE_URL` to its connection string. Run `npx prisma migrate deploy` (and seed once) against it. The schema is provider-agnostic, so no code changes are needed.
3. **Images:** `public/uploads` does not persist on Vercel's serverless runtime. For production, swap `lib/storage.ts` to save/delete via a blob service such as [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) (the `next.config.ts` remote pattern for Vercel Blob is already set). Keep the `/api/upload` route and the `deleteUploadFile` call sites unchanged.
4. Set `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `AUTH_SECRET` in the Vercel environment.