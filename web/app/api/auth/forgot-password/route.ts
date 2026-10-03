import { NextRequest } from "next/server";
import { authService } from "@/lib/auth/authService";
import { loginRateLimiter } from "@/lib/auth/rateLimiter";
import { authErrorResponse } from "@/lib/auth/errorResponse";

export async function POST(req: NextRequest) {
  const limiter = await loginRateLimiter();
  if (limiter.limited) {
    return Response.json({ code: limiter.code, message: limiter.message }, { status: 429 });
  }

  try {
    const { email } = await req.json();
    await authService.forgotPassword(email);
    return Response.json(
      { message: "If an account with that email exists, a reset link has been sent." }
    );
  } catch (error) {
    return authErrorResponse(error);
  }
}
