# 1. OBJECTIVE

Convert the existing GigFlow app (Vite + React + Express SPA) into a **Next.js App Router** app that satisfies the FlyRank FE-04 "Capstone skeleton, deployed" assignment, and deploy it to a live Vercel preview URL.

The brief requires: Next.js with Server Components by default, file-based routes with a root layout, placeholder pages for every screen, Tailwind design tokens, a health-check page that renders fetched data, a Git-connected Vercel preview deployment, and no secrets committed.

Priority: ship a clean FE-04-compliant skeleton first (Steps 1–7 are independently shippable). Feature preservation of the existing auth + gig logic (Steps 8–10) builds on top of that skeleton. No database migration is in scope for this phase — SQLite stays local-only; the deployed preview uses a mock fetch on the health-check page so no DB is needed for the build/deploy to pass.

# 2. CONTEXT SUMMARY

**Current state of the repo** (verified by reading files, not just the `claude.md` memory file which is stale):
The repo is a monorepo at `/workspace/project/Gig-flow` with two projects:
- `web/` — the full-stack app this migration targets
- `extension/` — a browser extension version (out of scope; leave untouched)

**`web/` current stack:**
- Vite 6 + React 19 SPA, client-side routing via `react-router-dom` (`BrowserRouter`, `Routes`, `Route`)
- Express 4 custom server (`web/server.ts`) serving the API and Vite middleware in dev
- Prisma 7 + `@prisma/adapter-better-sqlite3`, SQLite (`dev.db`), generated client at `web/src/generated/prisma`
- TailwindCSS v4 with `@theme` design tokens in `web/src/index.css` (Inter + JetBrains Mono fonts, dark glassmorphism palette)
- Auth: JWT access token (held in-memory client-side) + refresh token (httpOnly cookie). Services under `web/server/services/` (`authService`, `tokenService`, `oauthService`, `emailService`), middleware under `web/server/middleware/` (`authenticate`, `csrfProtection`, `rateLimiter`, `requireAuth`). Prisma models `User` and `RefreshToken` back this.
- UI components: `Sidebar`, `Dashboard`, `GigsFeed`, `Analytics`, `Profile`, `Settings`, plus a full `features/auth` client module (forms, context, hooks).

**Express endpoints to convert into Next.js Route Handlers:**
- Auth (`/api/auth/*`): register, login, refresh, logout, me, forgot-password, reset-password, forgot-username, verify-email, resend-verification, oauth/:provider, oauth/:provider/callback
- Gigs: `POST /api/scrape`, `GET /api/gigs`, `PATCH /api/gigs/:id/status`, `PATCH /api/gigs/:id/proposal`, `POST /api/generate-proposal`, `POST /api/test-key`, `DELETE /api/gigs/all`
- User: `POST /api/user/skills`, `GET /api/user/:email`
- Stats: `GET /api/stats`

**Screens that must become routed placeholder pages:** login, register, forgot-password, reset-password, dashboard, gigs feed, analytics, profile, settings — plus the required `/health` page.

**Constraints / decisions (agreed with user):**
- Decision 1 = A: Express routes → Next.js Route Handlers; Prisma accessed from the server side within Next.js.
- Decision 2 = A (FE-04 compliance first): health-check uses a mock fetch; no DB migration now. SQLite stays local-only; hosted-DB migration is a later Build-phase task.
- Same repo (do not create a new repo — Git history preserved). Next.js lives inside `web/`.
- `/health` is the health-check route, rendering fetched (mock) data.

**Security note:** the current `web/vite.config.ts` injects `process.env.GEMINI_API_KEY` into the client bundle. This must NOT be reproduced in Next.js — keep the key server-only (no `NEXT_PUBLIC_` prefix) so it never ships to the browser. The `.gitignore` already excludes `.env*` and `*.db`, so secrets are not committed today and must stay that way.

**Known follow-up (not in this plan's scope):** `better-sqlite3` is a native dependency and Prisma must `generate` on Vercel. The skeleton does not import Prisma, so no DB connection is needed at build/deploy time. Real persistent data on the preview requires a hosted DB (Turso/Vercel Postgres) — deferred to the Build phase.

# 3. APPROACH OVERVIEW

**Approach:** In-place migration of `web/` to Next.js App Router, preserving existing features as Route Handlers and Client Components where interactivity is required.

**Why this approach:**
- Next.js App Router is the explicit requirement (Server Components by default, Client Components for interactivity). Vite + React cannot satisfy this.
- Converting Express routes to Route Handlers keeps everything in one deployable Next.js app — idiomatic and the simplest path to Git-connected Vercel previews.
- A mock-fetched health-check page meets the brief's Foundations/skeleton bar (a mentor confirmed mock fetch is acceptable) and keeps the preview deployable without a hosted database.

**Tradeoff considered:** A SPA fallback / `output: export` static build was rejected because it cannot support Route Handlers or Server Components, which the brief requires. A separate Express service was rejected (Decision 1B) as more moving parts and harder on Vercel.

**Structure:** Next.js App Router inside `web/` with route groups:
- `app/layout.tsx` — root layout (html/body, fonts, global CSS, `AuthProvider`)
- `app/(auth)/` — login, register, forgot-password, reset-password (centered card layout)
- `app/(app)/` — dashboard, gigs, analytics, profile, settings (sidebar shell layout + auth guard)
- `app/health/page.tsx` — Server Component rendering a mock fetch
- `app/api/...` — Route Handlers mirroring the Express endpoints

**Phasing:** Steps 1–7 produce an independently-shippable FE-04-compliant skeleton (stubs, mock health-check, Vercel deploy). Steps 8–10 preserve the real features (Route Handlers + migrated client components). The user can stop after the skeleton if they only need FE-04 compliance.

# 4. IMPLEMENTATION STEPS

### Step 1 — Add Next.js to `web/` and reconfigure the package
- **Goal:** Install Next.js, rewrite `package.json` scripts for Next.js dev/build/start, and remove Vite-only build tooling from the build pipeline.
- **Method:** `npm install next` in `web/`. Add `next dev` / `next build` / `next start` scripts (keep `lint` as `tsc --noEmit`). Add a `prebuild`/`postinstall` step running `prisma generate` so the client exists for later feature work. Keep existing deps (react, prisma, genai, axios, cheerio, bcryptjs, jsonwebtoken, etc.). Remove the `esbuild` server-bundle build and the Vite-based `build` script since Next.js handles the build. Do NOT delete `vite.config.ts` / `index.html` / `server.ts` yet — they are removed in Step 6 to keep things working during migration.
- **Reference:** `web/package.json`

### Step 2 — Create Next.js config and move design tokens into the app
- **Goal:** Configure Next.js and carry over the Tailwind v4 theme so the design system is intact.
- **Method:** Create `web/next.config.ts` (React StrictMode on; `serverExternalPackages: ['@prisma/adapter-better-sqlite3', 'better-sqlite3']` to avoid bundling native modules). Create `web/postcss.config.mjs` with `@tailwindcss/postcss` (Tailwind v4 style). Create `web/app/globals.css` by copying the contents of `web/src/index.css` (the `@import "tailwindcss"` + `@theme {}` block and custom classes). Keep the `@/` path alias — update `web/tsconfig.json` to add `"paths": { "@/*": ["./*"] }` and Next.js-recommended `lib`/`moduleResolution` settings.
- **Reference:** `web/src/index.css`, `web/tsconfig.json`

### Step 3 — Build the root layout
- **Goal:** Establish the root Server Component layout that wraps every route (required by the brief: "root layout, navigation").
- **Method:** Create `web/app/layout.tsx` as a Server Component: `<html lang="en"><body>` with the dark background + font classes, importing `globals.css`, configuring `next/font` for Inter (and JetBrains Mono where used). Wrap children in the client `AuthProvider` (migrated in Step 8; until then, a thin client wrapper or the real `AuthProvider` once moved). Add metadata (title/description, mirroring `web/index.html`).
- **Reference:** `web/index.html`, `web/src/features/auth/context/AuthProvider.tsx`

### Step 4 — Scaffold routed placeholder pages for every screen
- **Goal:** Every screen from the spec exists as a routed placeholder (FE-04 criterion). Server Components by default.
- **Method:** Create the following Server Component pages, each rendering a simple styled placeholder ("Coming soon" / title) using the existing design tokens:
  - `app/(auth)/login/page.tsx`, `register/`, `forgot-password/`, `reset-password/`
  - `app/(app)/dashboard/page.tsx`, `gigs/page.tsx`, `analytics/page.tsx`, `profile/page.tsx`, `settings/page.tsx`
  - `app/page.tsx` — redirect to `/dashboard` (or `/login` if guarding)
  - Create `app/(app)/layout.tsx` (sidebar shell + navigation, placeholder auth guard) and `app/(auth)/layout.tsx` (centered card shell) so the two shells are shared.
- **Reference:** `web/src/App.tsx` (screen list), `web/src/components/Sidebar.tsx`

### Step 5 — Add the health-check page with a mock fetch
- **Goal:** A page that renders fetched data (brief requirement). Foundations phase → mock fetch is accepted.
- **Method:** Create `app/health/page.tsx` as an async Server Component that fetches from a mock source — e.g. an async function returning a small JSON object (`{ status: "ok", service: "GigFlow", time, gigs: <mock number> }`) or a free public test API. Render the data in the styled card. This demonstrates server-side data fetching and rendering without needing the database.
- **Reference:** new file `web/app/health/page.tsx`

### Step 6 — Remove the Vite/Express SPA artifacts
- **Goal:** Eliminate the old stack so there's one build system and no build errors.
- **Method:** Delete `web/server.ts`, `web/vite.config.ts`, `web/index.html`, and `web/src/main.tsx` (Next.js owns entry now). Move shared client code under `web/src/` that the components need (e.g. `features/auth`, `services`, `components`) so they're importable by app routes; keep the directory layout, just re-home entry points. Ensure `react-router-dom` is no longer used for routing (it can remain installed if `features/auth` still imports it transiently, but routes must be Next.js file routes — migrate in Step 8/10).
- **Reference:** `web/server.ts`, `web/src/main.tsx`

### Step 7 — Connect to Vercel and confirm preview deploys
- **Goal:** Live preview URL that builds on every push (brief deliverable).
- **Method:** Add `web/.env.example` documenting `GEMINI_API_KEY` (and `JWT_SECRET`/`APP_URL` if used) with placeholder values only — never real keys. Push the skeleton to the existing repo branch. Import the repo into Vercel (root = `web/`, framework = Next.js), confirm the preview build succeeds with no build errors, and set env var structure (add the key names in the Vercel dashboard; do not commit values). Record the preview URL for the submission.
- **Reference:** `web/.gitignore`, Vercel project settings
- **Checkpoint:** After this step the FE-04 skeleton is complete and deployable — Steps 1–7 are independently shippable.

### Step 8 — Migrate server logic to Next.js Route Handlers (DB + AI)
- **Goal:** Preserve the gig/user/stats/scraper/AI endpoints as Route Handlers, server-side only.
- **Method:** Create a single Prisma client singleton (`web/lib/prisma.ts`) using `PrismaBetterSqlite3` pointing at `dev.db` (local dev). Convert endpoints to Route Handlers under `app/api/`:
  - `app/api/scrape/route.ts` (POST)
  - `app/api/gigs/route.ts` (GET), `app/api/gigs/all/route.ts` (DELETE), `app/api/gigs/[id]/status/route.ts` (PATCH), `app/api/gigs/[id]/proposal/route.ts` (PATCH)
  - `app/api/generate-proposal/route.ts` (POST), `app/api/test-key/route.ts` (POST)
  - `app/api/user/skills/route.ts` (POST), `app/api/user/[email]/route.ts` (GET)
  - `app/api/stats/route.ts` (GET)
  Reuse the existing `src/services/scraper.ts` and `src/services/ai.ts` logic. Read `GEMINI_API_KEY` from `process.env` server-side only (never expose to client).
- **Reference:** `web/server.ts`, `web/src/services/scraper.ts`, `web/src/services/ai.ts`

### Step 9 — Migrate auth endpoints to Route Handlers
- **Goal:** Preserve the auth system (JWT + refresh cookie + verification + OAuth) as Route Handlers.
- **Method:** Port `web/server/services/*` and `web/server/middleware/*` into server-side `lib/auth/` utilities (token verify, rate-limit via in-memory map or simple check, requireAuth as a helper that reads the cookie/access token). Create `app/api/auth/*/route.ts` files mirroring `authRoutes.ts`: register, login, refresh, logout, me, forgot-password, reset-password, forgot-username, verify-email, resend-verification, and `oauth/[provider]` + `oauth/[provider]/callback`. Preserve httpOnly refresh-token cookie behavior using Next.js `cookies()`/`Set-Cookie` headers. Keep `better-sqlite3`/Prisma access server-only.
- **Reference:** `web/server/routes/authRoutes.ts`, `web/server/services/authService.ts`, `web/server/middleware/requireAuth.ts`

### Step 10 — Wire migrated client components into the placeholder pages
- **Goal:** Replace stub pages with the real UI, using Client Components only where interactivity is needed.
- **Method:** Mark interactive components (`'use client'`) — the existing `Sidebar`, `Dashboard`, `GigsFeed`, `Analytics`, `Profile`, `Settings`, and `features/auth` forms — and import them into the corresponding `app/(app)/*` and `app/(auth)/*` pages. Convert `react-router-dom` navigation (`Navigate`, `Routes`) to Next.js `next/navigation` (`useRouter`, `redirect`). Replace the `activeTab` state switching with real file-based routes (each page owns its own content). Implement the `(app)` auth guard using the migrated auth context / middleware helper. Keep Server Components as the default; only the leaves that need hooks/events become Client Components.
- **Reference:** `web/src/App.tsx`, `web/src/components/*`, `web/src/features/auth/components/*`

# 5. TESTING AND VALIDATION

**Local validation (after skeleton, Steps 1–7):**
- `cd web && npm run dev` starts Next.js with no errors; every routed page (`/`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/dashboard`, `/gigs`, `/analytics`, `/profile`, `/settings`, `/health`) loads without a build/runtime error.
- `/health` renders fetched (mock) data visibly on the page.
- Responsive check: pages render correctly at 375px and 1280px viewports (DevTools device toolbar).
- `npm run build` completes with no errors and no TypeScript failures.
- No `NEXT_PUBLIC_`-prefixed secrets in any client bundle; `grep -r "GEMINI_API_KEY" web/app` returns only server files; `.env*` and `*.db` remain untracked (`git status` clean of secrets).

**Deploy validation (Step 7):**
- Push triggers a Vercel preview build that succeeds (no build errors).
- The Vercel preview URL loads and renders the skeleton pages and `/health` without error.
- Env vars are configured in the Vercel dashboard (not in the repo).

**Feature validation (after Steps 8–10):**
- Each Route Handler returns the same responses as the original Express endpoints: `GET /api/gigs`, `GET /api/stats`, `POST /api/scrape`, `PATCH /api/gigs/:id/status`, `POST /api/generate-proposal`, `POST /api/user/skills`, `GET /api/user/:email`, `POST /api/test-key`, `DELETE /api/gigs/all`.
- Auth flow works: register → verify-email → login (sets access token + refresh cookie) → protected pages load → logout clears cookie. `POST /api/auth/refresh` issues a new access token from the cookie.
- Interactive components (sidebar nav, gig status changes, proposal generation/edit, profile save, settings) behave as before, now across file-based routes.
- No client component imports server-only code (Prisma, JWT secret, scraper internals) — build does not tree-shake secrets into the client.

**Success criteria (mapped to FE-04 evaluation):**
1. Preview URL loads with no build errors ✅ (Step 7)
2. Every screen from the spec exists as a routed placeholder ✅ (Step 4)
3. Responsive at 375px and 1280px ✅ (Step 4 + validation)
4. No secrets in the repo ✅ (Steps 7, 8 — `.env.example` only, server-only keys)
5. Live preview URL + repo link shared in the submission ✅ (Step 7)
