# GigFlow — Agent Memory

## Current State (2026-08-18): Next.js App Router (FlyRank FE-04 capstone)

GigFlow's web app was migrated from a Vite + React + Express SPA to a
**Next.js 15 App Router** app. The legacy Express `server/` directory was
deleted; all auth + gig + AI logic now lives as Route Handlers under
`web/app/api/`.

### Stack
- **Framework**: Next.js 15.5 (App Router), React 19, TypeScript
- **Styling**: TailwindCSS v4 (`@import "tailwindcss"` + `@theme {}`)
- **DB**: SQLite via Prisma 7 + `@prisma/adapter-better-sqlite3`
  (client generated to `web/src/generated/prisma/`)
- **AI**: `@google/genai` → `gemini-2.0-flash`
- **Auth**: JWT in httpOnly cookies; `web/lib/auth/` utilities

### Layout / Routes (`web/app/`)
- `app/layout.tsx` — root layout (Server Component), wraps all routes
- `app/(auth)/` — login, register, forgot-password, reset-password (+ layout)
- `app/(app)/` — dashboard, gigs, analytics, profile, settings (+ auth-guard layout)
- `app/health/page.tsx` — **Server Component** rendering server-fetched data
- `app/api/auth/*`, `app/api/gigs/*`, `app/api/scrape`, `app/api/stats`,
  `app/api/generate-proposal`, `app/api/test-key`, `app/api/user/*` — Route Handlers

### Client component rules
- Server Components by default. Only files using hooks/effects/browser APIs
  carry `"use client"` (auth hooks/utils/components, shared `useDebounce`,
  `httpClient`, `authService`).
- Legacy client feature code lives under `web/src/features/auth/` and uses
  `next/link` + `next/navigation` (NOT `react-router-dom`).
- `web/src/components/{Analytics,GigsFeed,Profile,Settings}.tsx` are retained
  from the old SPA but are NOT yet wired into App Router pages (placeholders
  are in `app/(app)/*/page.tsx`). Migrate them next if needed.

### Next.js 15 specifics
- `headers()` / `cookies()` are async — `await` them in Route Handlers.
- `requireAuth()` returns `{ user: ServerUser | null; response: Response | null }`.
- `loginRateLimiter()` is async (awaits `headers()`); callers `await` it.

### Build & dev
```bash
cd web
npm run dev      # http://localhost:3000
npm run build    # next build (type-checks)
vercel build --prod --yes   # produces .vercel/output (prebuilt)
```

### Deployment (Vercel)
- `web/vercel.json` configures the project (Next.js preset).
- **Live preview URL**: https://temporary-zippy-flint-64eeppf.vercel.app
  (anonymous temporary deploy; expires — redeploy with the workflow or CLI).
- **Git-connected previews**: `.github/workflows/vercel-preview.yml`
  builds + deploys a Vercel preview on every push to `main` and on PRs
  (comments the preview URL on the PR). Requires GitHub repo secrets:
  `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`. Set these in
  GitHub → Settings → Secrets and variables → Actions, then link the
  repo to a Vercel project (`vercel link` locally once).
- To redeploy anonymously from this environment:
  ```bash
  cd web && vercel build --prod --yes && vercel deploy --prebuilt --temporary --yes
  ```

### Deployment (GitHub Pages — static UI demo)
- `.github/workflows/github-pages.yml` builds a fully static export
  (`output: 'export'`, basePath `/Gig-flow`) and deploys to GitHub Pages
  on every push to `main`.
- `web/scripts/ghpages-build.mjs` temporarily moves `app/api` out (route
  handlers can't be statically exported), builds, restores it.
- `npm run build:ghpages` runs the same locally → `web/out/`.
- In static mode the (app)/(auth) layouts skip server auth so the UI
  renders without a backend (demo skeleton); API routes are absent, so
  form submissions won't authenticate — use Vercel for the full app.
- **One-time setup (admin only, UI)**: GitHub → Repo → Settings → Pages →
  "Build and deployment" Source = **GitHub Actions**. The fine-grained
  `GITHUB_TOKEN` used here lacks the Pages REST scope, so this cannot be
  done via API. After enabling, re-run the "Deploy to GitHub Pages" workflow
  → site goes live at `https://<owner>.github.io/Gig-flow/`.
- Expected live Pages URL once enabled: https://soyama350.github.io/Gig-flow/

### Secrets
- `.env.example` documents server-only keys (`GEMINI_API_KEY`, `JWT_SECRET`,
  `APP_URL`). **Never** prefix with `NEXT_PUBLIC_`. Set real values in the
  Vercel dashboard, never in git. `.gitignore` excludes `.env*` (except
  `.env.example`), `dev.db`, `.next/`, `out/`, `next-env.d.ts`.

### API routes that need runtime env / DB
- `/api/stats`, `/api/gigs`, `/api/scrape`, `/api/generate-proposal`,
  `/api/user/*` require `GEMINI_API_KEY` and/or the SQLite DB on the
  serverless runtime; without them they return 500 (expected on a
  bare preview deploy). Auth routes are resilient (try/catch, no-DB safe).

### Known follow-ups
- Wire `web/src/components/{Analytics,GigsFeed,Profile,Settings}.tsx`
  into `app/(app)/*/page.tsx` (currently placeholders).
- Optional: dark/light mode toggle (still default premium dark).
