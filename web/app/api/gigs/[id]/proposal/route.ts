import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { proposal } = await req.json();

    if (typeof proposal !== "string") {
      return Response.json({ error: "Invalid proposal text" }, { status: 400 });
    }

    const gig = await prisma.gig.update({
      where: { id },
      data: { proposal },
    });

    return Response.json(gig);
  } catch (error) {
    console.error("[API] Failed to save proposal:", error);
    return Response.json({ error: "Failed to save proposal" }, { status: 500 });
  }
}
