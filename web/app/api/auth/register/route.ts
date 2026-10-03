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
    const { email, password, name } = await req.json();
    const user = await authService.register({ email, password, name });

    return Response.json(
      { message: "Registration successful. Please verify your email.", user: serializeUser(user) },
      { status: 201 }
    );
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
