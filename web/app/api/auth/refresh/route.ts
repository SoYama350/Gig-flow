import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authService } from "@/lib/auth/authService";
import { setRefreshCookie, clearRefreshCookie } from "@/lib/auth/cookies";
import { authErrorResponse } from "@/lib/auth/errorResponse";
import { TOKEN_CONFIG } from "@/src/features/auth/types/auth.constants";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const currentRefreshToken = cookieStore.get("refresh_token")?.value;

    if (!currentRefreshToken) {
      return Response.json(
        { code: "TOKEN_INVALID", message: "No refresh token provided" },
        { status: 401 }
      );
    }

    const { accessToken, refreshToken } = await authService.refreshSession(
      currentRefreshToken
    );

    const res = NextResponse.json({
      accessToken,
      expiresIn: TOKEN_CONFIG.ACCESS_TOKEN_TTL_SECONDS,
    });
    setRefreshCookie(res, refreshToken, TOKEN_CONFIG.DEFAULT_REFRESH_TTL_DAYS);
    return res;
  } catch (error) {
    const res = authErrorResponse(error);
    const nextRes = NextResponse.json(
      { code: "TOKEN_INVALID", message: "Invalid refresh token" },
      { status: 401 }
    );
    clearRefreshCookie(nextRes);
    return nextRes;
  }
}
