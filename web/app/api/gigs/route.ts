import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};
    if (status && status !== "ALL") {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { requiredSkills: { contains: search } },
      ];
    }

    const gigs = await prisma.gig.findMany({
      where,
      orderBy: { scrapedAt: "desc" },
      take: 100,
    });

    return Response.json(gigs);
  } catch (error) {
    console.error("[API] Failed to fetch gigs:", error);
    return Response.json({ error: "Failed to fetch gigs" }, { status: 500 });
  }
}
