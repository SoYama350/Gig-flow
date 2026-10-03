# Performance audit

## Method

- Started the local app with `cd web && npm run dev`.
- Attempted a real Lighthouse run with `npx lighthouse http://localhost:3000 --chrome-flags='--headless --no-sandbox --disable-dev-shm-usage'`.
- Captured the exact command and note the environmental limitation: Chrome temp cleanup failed with `EPERM`, which prevented a completed Lighthouse score in this environment.

## Findings

- The production build is lean, and the app's first-load bundle appears small for a Next.js app.
- The app avoids unnecessary runtime complexity by keeping the core flow in server actions/route handlers rather than a heavy client framework.
- The main performance risk is not obvious bloat but the lack of a fully completed automated Lighthouse run in this environment.

## Actual evidence

- `npm run build` succeeded in the project.
- The generated route output from Next.js shows a modest initial load footprint and successful static generation for the app routes.
- A complete Lighthouse score was not produced because the browser environment blocked Chrome temp cleanup.

## Note

This report intentionally does not claim a fabricated score. The honest result is: production build was verified, the local app ran, and a Lighthouse audit was attempted but blocked by environment permissions.
