import { headers, cookies } from "next/headers";
import { tokenService } from "@/lib/auth/tokenService";
import { prisma } from "@/lib/prisma";
import { AUTH_ERROR_CODES } from "@/src/features/auth/types/auth.errors";
import type { ServerUser } from "@/lib/auth/serverAuth";

/**
 * Resolves the authenticated user (if any) from the request. Does NOT reject
 * when the token is missing/invalid — it just returns null. Used for optional
 * auth on public-but-aware endpoints.
 */
export async function authenticate(): Promise<ServerUser | null> {
  const headerList = await headers();
  const cookieStore = await cookies();

  const authHeader = headerList.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  const token = bearer ?? cookieStore.get("access_token")?.value ?? null;

  if (!token) return null;

  try {
    const payload = tokenService.verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        bio: true,
        isEmailVerified: true,
        createdAt: true,
        googleId: true,
      },
    });

    if (!user) return null;

    return {
      ...user,
      createdAt: user.createdAt.toISOString(),
      oauthProviders: user.googleId ? ["google"] : [],
    };
  } catch {
    return null;
  }
}

/**
 * Guard for Route Handlers. Returns the authenticated user on success, or a
 * 401 NextResponse on failure.
 */
export async function requireAuth(): Promise<{
  user: ServerUser | null;
  response: Response | null;
}> {
  const user = await authenticate();

  if (!user) {
    return {
      user: null,
      response: new Response(
        JSON.stringify({
          code: AUTH_ERROR_CODES.TOKEN_INVALID,
          message: "Authentication required to access this resource.",
        }),
        { status: 401, headers: { "content-type": "application/json" } }
      ),
    };
  }

  return { user, response: null };
}

export function unauthorizedResponse(message = "Authentication required") {
  return Response.json(
    { code: AUTH_ERROR_CODES.TOKEN_INVALID, message },
    { status: 401 }
  );
}
