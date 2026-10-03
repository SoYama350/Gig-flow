import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    const { email } = await params;
    const user = await prisma.user.findUnique({
      where: { email: decodeURIComponent(email) },
      include: { skills: true },
    });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    return Response.json(user);
  } catch (error) {
    console.error("[API] Failed to fetch user:", error);
    return Response.json({ error: "User not found" }, { status: 500 });
  }
}
