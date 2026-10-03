import { headers } from "next/headers";
import { AUTH_ERROR_CODES } from "@/src/features/auth/types/auth.errors";

interface RateRecord {
  count: number;
  firstAttemptAt: number;
}

const ipAttempts = new Map<string, RateRecord>();

async function getClientIp(): Promise<string> {
  // headers() is async in Next 15.
  try {
    const headerList = await headers();
    const forwarded = headerList.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0].trim();
    const realIp = headerList.get("x-real-ip");
    if (realIp) return realIp;
  } catch {
    // ignore — fall back to unknown
  }
  return "unknown";
}

/**
 * Creates an in-memory rate limiter. Sufficient for a single-instance deploy;
 * use Redis in production for distributed servers.
 */
export function createRateLimiter(maxAttempts = 5, windowMinutes = 15) {
  const windowMs = windowMinutes * 60 * 1000;

  return async () => {
    const ip = await getClientIp();
    const now = Date.now();
    const record = ipAttempts.get(ip);

    if (!record) {
      ipAttempts.set(ip, { count: 1, firstAttemptAt: now });
      return { limited: false as const };
    }

    if (now - record.firstAttemptAt > windowMs) {
      ipAttempts.set(ip, { count: 1, firstAttemptAt: now });
      return { limited: false as const };
    }

    if (record.count >= maxAttempts) {
      return {
        limited: true as const,
        code: AUTH_ERROR_CODES.TOO_MANY_ATTEMPTS,
        message: "Too many requests. Please try again later.",
      };
    }

    record.count++;
    ipAttempts.set(ip, record);
    return { limited: false as const };
  };
}

export const loginRateLimiter = createRateLimiter(5, 15);
