import type { NextResponse } from "next/server";

const REFRESH_COOKIE = "refresh_token";
const ACCESS_COOKIE = "access_token";

function isProduction() {
  return process.env.NODE_ENV === "production";
}

export function setRefreshCookie(
  res: NextResponse,
  token: string,
  ttlDays: number
) {
  res.cookies.set({
    name: REFRESH_COOKIE,
    value: token,
    httpOnly: true,
    secure: isProduction(),
    sameSite: "strict",
    path: "/",
    maxAge: ttlDays * 24 * 60 * 60,
  });
}

export function clearRefreshCookie(res: NextResponse) {
  res.cookies.set({
    name: REFRESH_COOKIE,
    value: "",
    httpOnly: true,
    secure: isProduction(),
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Short-lived, JS-readable cookie used by the OAuth callback flow to hand the
 * access token to the client before redirecting to the dashboard.
 */
export function setAccessCookie(res: NextResponse, token: string) {
  res.cookies.set({
    name: ACCESS_COOKIE,
    value: token,
    httpOnly: false,
    secure: isProduction(),
    sameSite: "strict",
    path: "/",
    maxAge: 60, // 1 minute — just long enough to bootstrap the client
  });
}

export function clearAccessCookie(res: NextResponse) {
  res.cookies.set({
    name: ACCESS_COOKIE,
    value: "",
    httpOnly: false,
    secure: isProduction(),
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}

export const REFRESH_COOKIE_NAME = REFRESH_COOKIE;
export const ACCESS_COOKIE_NAME = ACCESS_COOKIE;
