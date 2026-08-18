# GigFlow Monorepo

This repository contains two related projects that live together in one monorepo:

- `web/` — the local full-stack freelance automation web app
- `extension/` — the browser extension version of GigFlow

## Projects

### Web app (`web/`)
The web app is the local full-stack project that includes:

- React + Vite frontend
- Express backend server
- Prisma + SQLite database
- AI proposal generation using Gemini
- scraping and gig management flows

Run it from `web/`:

```bash
cd web
npm install
npm run build
npm run dev
```

Required env vars for the web app:

- `GEMINI_API_KEY`
- optionally `APP_URL`

Keep `.env.local` local and do not commit secrets.

### Extension (`extension/`)
The extension project is the remote GitHub repo content preserved separately.

Run it from `extension/`:

```bash
cd extension
npm install
npm run build
```

The extension build outputs to `dist/` and is loaded in Chrome/Edge via `chrome://extensions/` using "Load unpacked".

## Root rules

- Do not commit `.env.local`, `.env`, `node_modules/`, `dist/`, or local database files.
- Keep each project isolated with its own `package.json` and dependencies.
- Preserve the original remote Git history and do not force-push.

## License

The original repository license is preserved at the root.
