import { NextRequest, NextResponse } from "next/server";
import { oauthService } from "@/lib/auth/oauthService";
import { setRefreshCookie, setAccessCookie } from "@/lib/auth/cookies";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const code = req.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=oauth_failed", req.url));
  }

  try {
    const { accessToken, refreshToken } = await oauthService.handleCallback(
      provider,
      code
    );

    const res = NextResponse.redirect(new URL("/dashboard", req.url));
    setRefreshCookie(res, refreshToken, 30);
    setAccessCookie(res, accessToken);
    return res;
  } catch {
    return NextResponse.redirect(new URL("/login?error=oauth_failed", req.url));
  }
}
