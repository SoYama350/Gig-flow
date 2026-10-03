import { cookies, headers } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

const JWT_SECRET =
  process.env.JWT_SECRET || "super-secret-development-key-change-me";

export interface ServerAuthState {
  isAuthenticated: boolean;
  user: ServerUser | null;
}

export interface ServerUser {
  id: string;
  email: string;
  name: string | null;
  bio: string | null;
  isEmailVerified: boolean;
  createdAt: string;
  oauthProviders: string[];
}

/**
 * Reads the access token from the Authorization header (or falls back to the
 * `access_token` cookie used by the OAuth callback flow) and resolves the
 * authenticated user, if any. Safe to call from Server Components.
 */
export async function getAuthState(): Promise<ServerAuthState> {
  const headerList = await headers();
  const cookieStore = await cookies();

  const authHeader = headerList.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  const token = bearer ?? cookieStore.get("access_token")?.value ?? null;

  if (!token) {
    return { isAuthenticated: false, user: null };
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
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

    if (!user) {
      return { isAuthenticated: false, user: null };
    }

    return {
      isAuthenticated: true,
      user: {
        ...user,
        createdAt: user.createdAt.toISOString(),
        oauthProviders: user.googleId ? ["google"] : [],
      },
    };
  } catch {
    // Invalid token OR database unavailable — degrade to unauthenticated so the
    // layout never crashes (important on preview deploys with no hosted DB).
    return { isAuthenticated: false, user: null };
  }
}
