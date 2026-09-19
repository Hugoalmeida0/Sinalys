# Sinalys

Full-stack Next.js app (App Router) deployed natively on Vercel. Frontend and API (Route Handlers under `app/api/`) live in a single project — no separate backend service.

## Getting Started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Structure

- `app/` — pages and layouts (App Router)
- `app/api/` — API route handlers (serverless functions on Vercel)
- `lib/` — shared client/server helpers
- `.env.example` — env var template; `NEXT_PUBLIC_*` keys are exposed to the browser, all others are server-only

## Deploy

Push to a Vercel-connected Git repository, or run `vercel` from the CLI.
