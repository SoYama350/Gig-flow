import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const VALID_STATUSES = ["NEW", "VIEWED", "APPLIED", "ARCHIVED"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status } = await req.json();

    if (!VALID_STATUSES.includes(status)) {
      return Response.json({ error: "Invalid status" }, { status: 400 });
    }

    const gig = await prisma.gig.update({
      where: { id },
      data: { status },
    });

    return Response.json(gig);
  } catch (error) {
    console.error("[API] Failed to update status:", error);
    return Response.json({ error: "Failed to update status" }, { status: 500 });
  }
}
