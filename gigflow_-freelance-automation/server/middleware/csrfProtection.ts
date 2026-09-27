import { Request, Response, NextFunction } from 'express';
import { generateSecureToken } from '../utils/cryptoUtils.js';

/**
 * Middleware that implements Double Submit Cookie pattern for CSRF protection.
 * 
 * 1. GET requests inject a CSRF token into a non-httpOnly cookie (so JS can read it).
 * 2. State-mutating requests (POST, PATCH, DELETE) require the client to send the
 *    token back in the X-CSRF-Token header. The server compares the cookie to the header.
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Methods that don't mutate state are safe
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    // Ensure a CSRF cookie exists for the client to read
    if (!req.cookies['csrf_token']) {
      res.cookie('csrf_token', generateSecureToken(16), {
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        httpOnly: false, // Must be readable by client JS
      });
    }
    return next();
  }

  // For state-mutating requests, verify the token
  const cookieToken = req.cookies['csrf_token'];
  const headerToken = req.headers['x-csrf-token'];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    // In dev mode, we might want to bypass CSRF for easier testing if configured
    if (process.env.NODE_ENV === 'development' && process.env.BYPASS_CSRF === 'true') {
      return next();
    }

    return res.status(403).json({
      code: 'CSRF_FAILED',
      message: 'Invalid or missing CSRF token',
    });
  }

  next();
};
