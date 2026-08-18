import { NextRequest } from "next/server";
import { oauthService } from "@/lib/auth/oauthService";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;

  try {
    const state = req.nextUrl.searchParams.get("state") || "default_state";
    const url = oauthService.getAuthUrl(provider, state);
    return Response.redirect(url);
  } catch (error) {
    return Response.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
