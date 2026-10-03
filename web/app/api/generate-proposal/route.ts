import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateProposal } from "@/src/services/ai";

export async function POST(req: NextRequest) {
  try {
    const { gigId, userSkills, userName, userBio, apiKey: bodyApiKey, language } =
      await req.json();

    const gig = await prisma.gig.findUnique({ where: { id: gigId } });
    if (!gig) {
      return Response.json({ error: "Gig not found" }, { status: 404 });
    }

    const apiKey = bodyApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY_HERE") {
      return Response.json(
        {
          error:
            "GEMINI_API_KEY not configured. Add your key in Settings or .env.local",
        },
        { status: 400 }
      );
    }

    const proposal = await generateProposal({
      gig,
      userSkills: userSkills || [],
      userName: userName || "Freelancer",
      userBio: userBio || "",
      apiKey,
      language: language || "arabic",
    });

    await prisma.gig.update({
      where: { id: gigId },
      data: { proposal, status: "APPLIED" },
    });

    return Response.json({ proposal });
  } catch (error) {
    console.error("[AI] Proposal generation failed:", error);
    return Response.json(
      { error: (error as Error).message || "Proposal generation failed" },
      { status: 500 }
    );
  }
}
