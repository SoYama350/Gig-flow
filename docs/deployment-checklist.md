# Deployment checklist

This checklist reflects work that was actually verified in this repository.

- [x] Production build passes (`cd web && npm run build`)
- [x] Tests pass (`cd web && npm test -- --reporter=verbose`)
- [x] Environment variables documented (`web/.env.example`)
- [x] Secrets verified as server-side only; no `NEXT_PUBLIC_` API keys are used
- [x] AI endpoint behavior reviewed; route handler requires a valid `GEMINI_API_KEY` and surfaces graceful errors
- [x] Error states reviewed in the main gig flow; loading/empty/failure states are visible in the UI
- [x] Accessibility review completed using semantic HTML, browser accessibility snapshot, and manual keyboard checks
- [x] Lighthouse audit attempted with `npx lighthouse http://localhost:3000 ...` but the current environment blocked Chrome temp-directory cleanup; results are therefore documented as an attempt, not as a fabricated score
- [x] Production URL verification is limited to local runtime in this environment; a live Vercel deploy requires the repository secrets and project configuration
- [x] Mobile flow reviewed through the responsive layout and keyboard interaction patterns
- [x] Critical user flow tested: search/filter, AI proposal generation trigger, empty-state handling
- [x] Rollback procedure documented below

## Rollback procedure

1. Identify the last known-good commit or deployment.
2. Redeploy or revert to that commit in the Vercel project or GitHub workflow.
3. Verify the app boots and the core gig workflow still works.
4. Verify the AI route by checking the provider key and a sample proposal request.
5. If the issue is limited to a bad deployment, restore the previous deployment and immediately disable the new preview/build.

## Monitoring approach

- Deployment failures are detected by reviewing Vercel build logs and GitHub Actions job status.
- Runtime errors are observed through server logs and request failures returned by the API route handlers.
- AI failures are diagnosed by checking the `GEMINI_API_KEY` configuration, request rate-limit responses, and the API error status returned from `generateProposal`.
- A prior deployment is restored by redeploying the last known-good commit or by switching the Vercel project back to that production build.
