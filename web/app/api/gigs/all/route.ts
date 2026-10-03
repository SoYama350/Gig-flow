import { prisma } from "@/lib/prisma";

export async function DELETE() {
  try {
    await prisma.gig.deleteMany({});
    return Response.json({ message: "All gigs deleted" });
  } catch (error) {
    console.error("[API] Failed to delete gigs:", error);
    return Response.json({ error: "Failed to delete gigs" }, { status: 500 });
  }
}
