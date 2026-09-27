import { Request, Response, NextFunction } from 'express';
import { AUTH_ERROR_CODES } from '../../src/features/auth/types/auth.errors.js';

/**
 * Guard middleware that ensures a user is authenticated.
 * Must be used AFTER the authenticate middleware.
 * Rejects the request with 401 if req.user is not set.
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      code: AUTH_ERROR_CODES.TOKEN_INVALID,
      message: 'Authentication required to access this resource.',
    });
  }
  next();
};
