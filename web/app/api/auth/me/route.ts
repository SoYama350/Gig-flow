import { requireAuth } from "@/lib/auth/requireAuth";

export async function GET() {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  return Response.json({ user: auth.user });
}
