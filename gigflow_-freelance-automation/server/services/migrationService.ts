import { PrismaClient } from "../../src/generated/prisma/client.js";

export async function runDatabaseMigrationsAndSeed(prisma: PrismaClient) {
  try {
    // 1. Seed Opportunity Sources
    const defaultSources = [
      {
        key: "mostaql",
        displayName: "Mostaql (مستقل)",
        type: "scraper",
        enabled: true,
        configJson: JSON.stringify({ baseUrl: "https://mostaql.com/projects", pages: 2 }),
      },
      {
        key: "khamsat",
        displayName: "Khamsat (خمسات)",
        type: "scraper",
        enabled: true,
        configJson: JSON.stringify({ baseUrl: "https://khamsat.com/community/requests", pages: 2 }),
      },
      {
        key: "weworkremotely",
        displayName: "We Work Remotely",
        type: "rss",
        enabled: true,
        configJson: JSON.stringify({ feedUrl: "https://weworkremotely.com/categories/remote-programming-jobs.rss" }),
      },
      {
        key: "remoteok",
        displayName: "RemoteOK",
        type: "api",
        enabled: true,
        configJson: JSON.stringify({ apiUrl: "https://remoteok.com/api" }),
      },
    ];

    for (const src of defaultSources) {
      await prisma.opportunitySource.upsert({
        where: { key: src.key },
        update: {
          displayName: src.displayName,
          type: src.type,
          configJson: src.configJson,
        },
        create: src,
      });
    }

    // 2. Backfill existing Gigs into Opportunities
    const existingGigs = await prisma.gig.findMany();
    let backfilledCount = 0;

    for (const gig of existingGigs) {
      const fingerprint = `${gig.platform.toLowerCase()}:${gig.url}`;
      await prisma.opportunity.upsert({
        where: { fingerprint },
        update: {
          title: gig.title,
          description: gig.description,
          canonicalUrl: gig.url,
          platform: gig.platform,
          requiredSkills: gig.requiredSkills,
        },
        create: {
          platform: gig.platform,
          title: gig.title,
          description: gig.description,
          canonicalUrl: gig.url,
          requiredSkills: gig.requiredSkills,
          fingerprint,
          scrapedAt: gig.scrapedAt,
        },
      });
      backfilledCount++;
    }

    // 3. Ensure Demo User has a default Proposal Guide Document
    const demoUser = await prisma.user.findFirst({ where: { email: "demo@gigflow.local" } });
    if (demoUser) {
      const existingDoc = await prisma.userDocument.findFirst({
        where: { userId: demoUser.id, type: "PROPOSAL_GUIDE" },
      });

      if (!existingDoc) {
        await prisma.userDocument.create({
          data: {
            userId: demoUser.id,
            name: "Standard High-Conversion Proposal Guide",
            type: "PROPOSAL_GUIDE",
            status: "READY",
            extractedText: `GUIDELINES FOR WINNING PROPOSALS:
1. Greet the client by name if mentioned, or use a warm, professional greeting.
2. Directly acknowledge the specific problem/scope in the first 2 sentences.
3. Reference concrete relevant technical stack and past project outcomes without bluffing.
4. Provide a clear 3-step action plan or methodology for this specific job.
5. Provide a realistic milestone delivery timeframe.
6. Close with an inviting, consultative question about their timeline or preferred architecture.
7. Keep tone confident, concise, and helpful (never generic copy-paste).`,
          },
        });
      }
    }

    console.log(`[MIGRATION] Completed seed & backfill: ${backfilledCount} opportunities synchronized.`);
  } catch (error) {
    console.error("[MIGRATION] Migration error:", error);
  }
}
