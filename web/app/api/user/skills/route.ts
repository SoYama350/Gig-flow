import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { email, name, bio, skills } = await req.json();

  const skillArray: string[] = Array.isArray(skills)
    ? skills
    : typeof skills === "string"
    ? skills.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  try {
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name,
        bio,
        skills: {
          set: [],
          connectOrCreate: skillArray.map((s) => ({
            where: { name: s },
            create: { name: s },
          })),
        },
      },
      create: {
        email,
        name,
        bio,
        skills: {
          connectOrCreate: skillArray.map((s) => ({
            where: { name: s },
            create: { name: s },
          })),
        },
      },
      include: { skills: true },
    });

    return Response.json(user);
  } catch (error) {
    console.error("[API] Onboarding failed:", error);
    return Response.json({ error: "Onboarding failed" }, { status: 500 });
  }
}
