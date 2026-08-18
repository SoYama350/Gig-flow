import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [totalGigs, newGigs, appliedGigs, archivedGigs, totalUsers] =
      await Promise.all([
        prisma.gig.count(),
        prisma.gig.count({ where: { status: "NEW" } }),
        prisma.gig.count({ where: { status: "APPLIED" } }),
        prisma.gig.count({ where: { status: "ARCHIVED" } }),
        prisma.user.count(),
      ]);

    return Response.json({
      totalGigs,
      newGigs,
      appliedGigs,
      archivedGigs,
      totalUsers,
    });
  } catch (error) {
    console.error("[API] Failed to fetch stats:", error);
    return Response.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
