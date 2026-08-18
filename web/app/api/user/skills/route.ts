import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { email, name, bio, skills } = await req.json();

  try {
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name,
        bio,
        skills: {
          set: [],
          connectOrCreate: (skills as string[]).map((s) => ({
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
          connectOrCreate: (skills as string[]).map((s) => ({
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
