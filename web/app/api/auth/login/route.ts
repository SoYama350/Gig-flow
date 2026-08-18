import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/lib/auth/authService";
import { loginRateLimiter } from "@/lib/auth/rateLimiter";
import { setRefreshCookie } from "@/lib/auth/cookies";
import { authErrorResponse } from "@/lib/auth/errorResponse";
import { TOKEN_CONFIG } from "@/src/features/auth/types/auth.constants";

export async function POST(req: NextRequest) {
  const limiter = await loginRateLimiter();
  if (limiter.limited) {
    return Response.json({ code: limiter.code, message: limiter.message }, { status: 429 });
  }

  try {
    const { email, password, rememberMe } = await req.json();
    const { user, accessToken, refreshToken } = await authService.login({
      email,
      password,
      rememberMe,
    });

    const ttlDays = rememberMe
      ? TOKEN_CONFIG.REMEMBER_ME_REFRESH_TTL_DAYS
      : TOKEN_CONFIG.DEFAULT_REFRESH_TTL_DAYS;

    const res = NextResponse.json({ user: serializeUser(user), accessToken });
    setRefreshCookie(res, refreshToken, ttlDays);
    return res;
  } catch (error) {
    return authErrorResponse(error);
  }
}

function serializeUser(user: any) {
  return {
    id: user.id,
    email: user.email,
    username: user.username ?? null,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    name: user.name ?? null,
    bio: user.bio ?? null,
    isEmailVerified: user.isEmailVerified,
    termsAccepted: user.termsAccepted,
    marketingEmails: user.marketingEmails,
    createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt,
    oauthProviders: user.googleId ? ["google"] : [],
  };
}
