# GigFlow - Freelance Gig Monitor + AI Proposal Writer

A monorepo with **two surfaces for the same workflow** - track freelance gigs across sites, and generate AI-drafted proposals:

- `web/` - the local full-stack freelance automation web app
- `extension/` -the browser extension version of GigFlow

**Demo (static UI):** https://soyama350.github.io/Gig-flow/ - a preview of the web UI, built for GitHub Pages.

<p>
  <img src="https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white" />
  <img src="https://img.shields.io/badge/Gemini-412A93?style=flat-square&logo=google&logoColor=white" />
  <img src="https://img.shields.io/badge/extension-MV3-8A2BE2?style=flat-square" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" />
</p>




## Why I built it

Freelancers burn hours each day: open the gig sites, scan the new gig notifications, read each post, then write a proposal from scratch for every other one. GigFlow collapses that loop: monitor new gigs, extract the relevant ones, scrape the post context, and draft a first-pass proposal that the freelancer then edits (never blindly sends). The web app is for desk-based triage;the extension is for staying in the loop from whichever tab you're already in.

Who it's for: **freelancers who spend more time *finding* work than *doing* *it***. The two biggest risks in this domain are (a) missing a good gig while it's fresh,and(b) sending a generic, obviously-AI proposal that gets ignored. GigFlow attacks both: alerts land fast,**and the AI output is a *draft with all the client's details filled in*,not a template blob.



## Key decisions & tradeoffs

**1. Monorepo: web app + extension in one repo vs. two separate repos**
- **Chose**: one repo,two isolated `package.json` projects.
- **Why**:the extension shares core logic (scraping utilities, proposal prompt construction) withthe web app,so keeping them in lockstep versioning avoids drift.The cost is trivial because they're deployed separately anyway(the extension ships as a Chrome MV3 package;the web app runs locally)。
- **Tradeoff accepted**: slightly larger installs;CI runs twice.(Two apps,one brain - document shared decisions in onerepo.)

**2. AI proposals: Gemini via server-side calls vs. calling theo API from the extension directly**
- **Chose**:the web app hits Gemini server-side;the extension calls through its own background service worker withthe key scoped to the sites it needs。
- **Why**:server-side keeps the API key out of the client where users could sniff it—— and the extension's permissions stay narrow(no host permissions beyond the gig sites it reads)。
- **Tradeoff accepted**: two call paths to maintain;but each is small,and the key hygiene is worth it。

**3. MVP scope: local-first(Prisma + SQLite) vs. hosted Postgres**
- **Chose**: SQLite + Prisma for the web app's MVP, loaded withthe local dev experience。
- **Why**: zero-config local setup means the project is *runnable on day one* by anyone cloning it(no external DB to provision)。
- **Tradeoff accepted**: not multi-user out-of-the-box;fine for the current stage—— a hosted Postgres swap is a config change once demand warrants it。

**4. GitHub Pages demo instead of a full Vercel deployment** —— **what didn't work**
- **What happened**: the web app needs server-side bits(Gemini keys,local DB)—— so deploying the full stack to Pages isn't possible。
- **What I did instead**: built astatic UI-only preview targeting GitHub Pages(so the *look and interaction* are demonstrable anywhere),and kept the full-stack app runnable locally with documented env vars。

- **Lesson**: keep ademo strategy decided *before* the stack choice,not after—— it cost an extra static build pass。



## What failed / what I'd do differently

- **Chrome MV3 worker quirks**: service-worker lifecycle made long-running scrape flows flaky;first iteration re-scraped on every wake。 Workaround: cache results per-tab with a short TTL;next iteration I'd move scraping to an offscreen document to dodge worker suspension limits。
- **Proposal quality drift**: early Gemini prompts produced generic intros that reviewers called out;the fix was a two-stage prompt(extract client context first,then draft)—— cheaper than prompt-engineeringa monolith。

- **No end-to-end tests yet**: unit tests coverthe scraping utils and prompt builders;I'd add Playwright fer the web app's proposal flow next.(The demo URL is a *static* preview—— interactive flows need a local run。





## Projects

### Web app (`web/`)

The web app is the local full-stack project that includes:

- React + Vite frontend
- Express backend server
- Prisma + SQLite database
- AI proposal generation using Gemini
- scraping and gig management flows

Run it from `web/`:

\`\`\`bash
cd web
npm install
npm run build
npm run dev
\`\`\`

Required env vars fer theo web app:

- `GEMINI_API_KEY`
- optionally `APP_URL`

Keep `.env.local` local and do not commit secrets。

### Extension (`extension/`)

The extension project is the remote GitHub repo content preserved separately。

Run it from `extension/`:

\`\`\`bash
cd extension
npm install
npm run build
\`\`\`

The extension build outputs to `dist/` and is loaded in Chrome/Edge via `chrome://extensions/` using "Load unpacked"。



## Root rules

- Do not commit `.env.local`, `.env`, `node_modules/`, `dist/`, or local database files。
- Keep each project isolated with its own `package.json` and dependencies。
- Preserve the original remote Git history and do not force-push。

## License

The original repository license is preserved at the root.MIT - see [LICENSE](./LICENSE)。