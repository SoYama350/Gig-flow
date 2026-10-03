# GigFlow — AI Memory File

> Last updated: 2026-05-27 | Read this first every session before touching any code.

---

## 🗂️ Project Overview

**GigFlow** is a full-stack freelance automation app that:
- Scrapes Arabic freelance gigs from **Mostaql** (mostaql.com/projects)
- Stores them in a local **SQLite** database via **Prisma**
- Lets the user manage gig statuses (NEW → VIEWED → APPLIED → ARCHIVED)
- Generates **AI-written Arabic proposals** using **Gemini 2.0 Flash**
- Has a dark glassmorphism UI built with **React + Vite + TailwindCSS v4**

---

## 🛠️ Tech Stack

| Layer      | Tech                                       |
|------------|--------------------------------------------|
| Frontend   | React 19, TypeScript, Vite 6, TailwindCSS v4, Motion (Framer) |
| Backend    | Express 4, tsx (dev), Node.js              |
| Database   | SQLite via Prisma 7 + `@prisma/adapter-better-sqlite3` |
| AI         | `@google/genai` → `gemini-2.0-flash`      |
| Scraping   | axios + cheerio (Mostaql HTML parsing)    |
| Fonts      | Inter (UI), JetBrains Mono (code)         |

---

## 📁 File Map

```
gigflow_-freelance-automation/
├── server.ts                 # Express API server + Vite middleware
├── src/
│   ├── App.tsx               # Root component, state management, API calls
│   ├── main.tsx              # React entry point
│   ├── index.css             # TailwindCSS v4 theme + custom classes
│   ├── components/
│   │   ├── Sidebar.tsx       # Icon-only sidebar (72px), tooltips
│   │   ├── Dashboard.tsx     # Stats cards + quick actions
│   │   ├── GigsFeed.tsx      # Gig list with filters, proposals
│   │   └── Profile.tsx       # User profile / onboarding form
│   ├── services/
│   │   ├── scraper.ts        # MostaqlScraper class (axios + cheerio)
│   │   └── ai.ts             # generateProposal() using Gemini
│   └── generated/            # Prisma auto-generated client
├── prisma/
│   └── schema.prisma         # User, Skill, Gig models (SQLite)
├── package.json
├── vite.config.ts
├── tsconfig.json
├── .env.local                # GEMINI_API_KEY goes here
└── dev.db                    # SQLite database file
```

---

## 🗄️ Database Schema (Prisma)

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  bio       String?
  skills    Skill[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Skill {
  id    String @id @default(uuid())
  name  String @unique
  users User[]
}

model Gig {
  id             String   @id @default(uuid())
  title          String
  description    String
  budget         String?
  platform       String   @default("Mostaql")
  url            String   @unique
  requiredSkills String?
  scrapedAt      DateTime @default(now())
  matchScore     Float?
  status         String   @default("NEW")
  proposal       String?
}
```

---

## 🌐 API Endpoints

| Method | Path                       | Description                          |
|--------|----------------------------|--------------------------------------|
| POST   | /api/scrape                | Trigger Mostaql scrape               |
| GET    | /api/gigs                  | Fetch gigs (supports ?status=, ?search=) |
| PATCH  | /api/gigs/:id/status       | Update gig status                    |
| POST   | /api/generate-proposal     | Generate AI proposal for a gig       |
| POST   | /api/user/skills           | Create/update user profile           |
| GET    | /api/user/:email           | Get user profile by email            |
| GET    | /api/stats                 | Get dashboard stats                  |

---

## 🎨 Design System

- **Background**: `#0a0a0f` (dark-950)
- **Card surface**: `rgba(22,22,37,0.8)` glassmorphism with blur
- **Accent**: Indigo `#6366f1` (accent-500/600)
- **Secondary**: Cyan `#06b6d4`, Emerald `#10b981`
- **Status badge classes**: `.status-new`, `.status-viewed`, `.status-applied`, `.status-archived`
- **Buttons**: `.btn-primary` (indigo gradient), `.btn-ghost` (transparent)
- **Cards**: `.glass-card` with hover glow effect
- **Tooltips**: `.tooltip-wrapper` with `data-tooltip` attr

---

## ✅ What Was Done (Completed Sessions)

### Session 1-2: Foundation
- [x] Created full project from scratch (Vite + React + Express + Prisma)
- [x] Set up SQLite database with Prisma adapter
- [x] Built Mostaql scraper (listing + detail pages, batch fetch)
- [x] Built AI proposal generator (Gemini 2.0 Flash, Arabic output)
- [x] Dark glassmorphism UI with TailwindCSS v4
- [x] Sidebar navigation (Dashboard, Gigs, Profile)
- [x] GigsFeed with status filters, search, skill matching
- [x] Profile page with skill management
- [x] Toast notification system
- [x] AnimatePresence transitions

### Session 4 (This session): Major Feature Upgrades & Bugfixes
- [x] Created `claude.md` memory file for AI continuity
- [x] **localStorage persistence** — profile (name, email, bio, skills) auto-saves/restores
- [x] **lastScraped tracking** — stored in localStorage, shown on Dashboard header
- [x] **Auto-scrape interval** — configurable in Settings, runs setInterval in App.tsx
- [x] **Settings page** — API key (show/hide/test), scrape interval, platform selector, danger zone
- [x] **Dashboard upgrade** — apply rate progress bar, clickable stat cards, last scraped time, better quick actions
- [x] **GigsFeed upgrade**:
  - Bulk selection with checkboxes → bulk mark Viewed/Applied/Archive
  - Match score % badge (green/amber/grey based on % threshold)
  - Auto-mark VIEWED when external link clicked
  - Export to CSV button
  - Inline proposal editing (textarea before copying) and **saving edits back to SQLite DB**
  - "Regenerate" label when proposal already exists
  - Status counts next to filter tabs
- [x] **Profile upgrade** — skill tag chips (click to add/remove), quick-add presets, Enter-to-add, dynamic avatar initial
- [x] **Sidebar upgrade** — added Settings tab icon, avatar click → profile, and **modern bottom navigation bar for mobile views**
- [x] **Server upgrade** — `/api/test-key`, `/api/gigs/all` (DELETE), API key from request body, and `PATCH /api/gigs/:id/proposal` endpoint
- [x] **Analytics Tab** — Added high-end custom page featuring KPI card indicators (Apply Rate, View Rate, Avg Match, Proposal counts), dynamic 14-day activity bar charts, interactive status breakdown bars, and highlight demand owned skills tracking
- [x] **Bilingual Proposal Support** — Fully integrated language selector toggle (Arabic / English) for custom localized AI generation
- [x] **Fixed interval re-init bug** — implemented proper `useCallback` with explicit interval cleanup and an `onSettingsSaved` event channel
- [x] **Khamsat Scraper Support** — Created full `KhamsatScraper` engine matching community request posts and automated keyphrase skill tag mapping
- [x] **Multi-page Scraping Pagination** — Added full pagination support (pages 1 & 2 scraped by default) for a deeper gig database
- [x] **Native Browser Notifications** — Implemented browser Notification API permissions and system-level alerts triggered when auto-scraping finds new freelance gigs

---

## 🔄 Current Issues / Upgrade Backlog

### 🐛 Known Bugs to Fix
*(No active bugs found)*

### 🚀 Upgrades Planned / Backlog
1. **Dark/light mode toggle** — option to switch between dark and light mode (currently default premium dark)

---

## 🔑 Environment Setup

```env
# .env.local
GEMINI_API_KEY=your_gemini_api_key_here
```

---

## 🚀 Dev Commands

```bash
npm run dev      # Start dev server on http://localhost:3000
npm run build    # Build production bundle
npm run lint     # TypeScript check
```

---

## ⚠️ Important Notes

- Prisma client is generated to `src/generated/prisma/` (not default location)
- Server uses `@prisma/adapter-better-sqlite3` (NOT the default Prisma engine)
- TailwindCSS v4 uses `@import "tailwindcss"` + `@theme {}` block (NOT v3 config)
- The app uses `motion/react` (NOT `framer-motion`) for animations
- Mostaql is Arabic — all scraped content is RTL; proposals use `dir="rtl"`
- The scraper may get 503/403 blocked — handled gracefully with error messages
- DB file: `dev.db` in project root (SQLite)

---

## 📝 Next Session Instructions

When picking up this project:
1. Read this file first
2. Check the "Current Issues" section above
3. Continue from where the backlog left off
4. Update this file's "Completed" section after finishing work
5. Update "Current Issues" with any new bugs found

