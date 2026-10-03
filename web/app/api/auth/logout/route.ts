import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authService } from "@/lib/auth/authService";
import { clearRefreshCookie } from "@/lib/auth/cookies";
import { requireAuth } from "@/lib/auth/requireAuth";

export async function POST() {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  const cookieStore = await cookies();
  const currentRefreshToken = cookieStore.get("refresh_token")?.value;

  try {
    await authService.logout(currentRefreshToken ?? "");
  } catch {
    // ignore server-side failures — clear locally regardless
  }

  const res = NextResponse.json({ message: "Logged out successfully" });
  clearRefreshCookie(res);
  return res;
}
