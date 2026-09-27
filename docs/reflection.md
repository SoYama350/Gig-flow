# Reflection

The hardest part was not building the initial gig workflow—it was making the existing product behave like a production app instead of a demo. The repository already had a useful product idea and strong architecture, but the capstone requirements force a different standard: the app needs real evidence, graceful failure states, accessible forms, and honest documentation. That is harder than adding one more feature because every success path must be validated and every failure mode must be safe.

It was difficult because the project already blended server routes, client UI, auth, Prisma, and AI generation in a way that made it easy to hide problems behind a friendly demo UI. For example, the AI route and the main gig page were implicitly relying on success, while the app had no consistent user-visible error boundaries for API or key failures. The real work was not rewriting the app; it was tightening the assumptions and making the interface honest when the external stack is not available.

If I were to do this again, I would start by defining the public product workflow and the exact production requirements upfront, then add tests around the main path and the failure cases before polishing the UI. That would have reduced the number of trial-and-error fixes when the app was being audited for accessibility and runtime safety.

One surprising lesson was how much of production readiness is about clear user states rather than flashy functionality. An app can look modern and still fail the capstone if it silently hides missing API keys, empty data, or broken AI output. The main improvements were not just in code quality but in making the app explicit about what is happening and what users can do next.
