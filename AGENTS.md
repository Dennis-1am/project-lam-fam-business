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
