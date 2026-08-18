import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { MostaqlScraper, KhamsatScraper } from "@/src/services/scraper";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const platform = body.platform;
    const pages = 2;
    let gigs: Awaited<ReturnType<typeof MostaqlScraper.fetchLatestGigs>> = [];

    const targetPlatform = platform === "khamsat" ? "Khamsat" : "Mostaql";

    if (platform === "khamsat") {
      gigs = await KhamsatScraper.fetchLatestGigs(pages);
    } else {
      gigs = await MostaqlScraper.fetchLatestGigs(pages);
    }

    const userSkills = body.skills;
    if (Array.isArray(userSkills) && userSkills.length > 0) {
      gigs = gigs.filter((gig) => {
        const textToSearch = (
          gig.title +
          " " +
          gig.description +
          " " +
          (gig.requiredSkills || []).join(" ")
        ).toLowerCase();
        return userSkills.some((s: string) => textToSearch.includes(s.toLowerCase()));
      });
    }

    let newCount = 0;
    for (const gig of gigs) {
      try {
        await prisma.gig.upsert({
          where: { url: gig.url },
          update: {
            title: gig.title,
            description: gig.description,
            budget: gig.budget,
            requiredSkills: gig.requiredSkills.join(", "),
          },
          create: {
            title: gig.title,
            description: gig.description,
            budget: gig.budget,
            url: gig.url,
            platform: targetPlatform,
            requiredSkills: gig.requiredSkills.join(", "),
          },
        });
        newCount++;
      } catch (dbError) {
        console.warn(`[DB] Could not save gig ${gig.url}:`, dbError);
      }
    }

    return Response.json({
      message: "Scraping completed",
      total: gigs.length,
      processed: newCount,
    });
  } catch (error) {
    console.error("[SCRAPER] Failed:", error);
    return Response.json(
      { error: "Scraping failed. The target site may be blocking requests." },
      { status: 500 }
    );
  }
}
