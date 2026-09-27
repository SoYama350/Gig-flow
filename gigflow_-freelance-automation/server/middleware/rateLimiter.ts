import { Request, Response, NextFunction } from 'express';
import { AUTH_ERROR_CODES } from '../../src/features/auth/types/auth.errors.js';

// Simple in-memory rate limiter for development.
// In production, use Redis (e.g., rate-limit-redis) to support distributed servers.
const ipAttempts = new Map<string, { count: number; firstAttemptAt: number }>();

/**
 * Creates a rate limiting middleware.
 * @param maxAttempts Maximum allowed requests in the time window
 * @param windowMinutes Time window in minutes
 */
export const createRateLimiter = (maxAttempts: number = 5, windowMinutes: number = 15) => {
  const windowMs = windowMinutes * 60 * 1000;

  return (req: Request, res: Response, next: NextFunction) => {
    // Get IP address (trust proxy should be configured in Express if behind a load balancer)
    const ip = req.ip || req.socket.remoteAddress || 'unknown';

    const now = Date.now();
    const record = ipAttempts.get(ip);

    if (!record) {
      ipAttempts.set(ip, { count: 1, firstAttemptAt: now });
      return next();
    }

    if (now - record.firstAttemptAt > windowMs) {
      // Window expired, reset
      ipAttempts.set(ip, { count: 1, firstAttemptAt: now });
      return next();
    }

    if (record.count >= maxAttempts) {
      return res.status(429).json({
        code: AUTH_ERROR_CODES.TOO_MANY_ATTEMPTS,
        message: 'Too many requests. Please try again later.',
      });
    }

    record.count++;
    ipAttempts.set(ip, record);
    next();
  };
};

// Pre-configured limiters
export const loginRateLimiter = createRateLimiter(5, 15); // 5 attempts per 15 minutes
export const apiRateLimiter = createRateLimiter(100, 1);  // 100 requests per minute
