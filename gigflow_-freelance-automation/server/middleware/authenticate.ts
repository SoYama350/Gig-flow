import { Request, Response, NextFunction } from 'express';
import { TokenService } from '../services/tokenService.js';
import { PrismaClient } from '../../src/generated/prisma/client.js';

// Extend Express Request to hold the authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: any; // Ideally typed to User without sensitive fields
    }
  }
}

/**
 * Middleware that extracts the JWT from the Authorization header,
 * verifies it, and attaches the user object to the request.
 * It does NOT reject the request if the token is missing or invalid — it just leaves req.user undefined.
 * (Use requireAuth to enforce authentication).
 */
export const authenticate = (tokenService: TokenService, prisma: PrismaClient) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];

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

      if (user) {
        req.user = {
          ...user,
          oauthProviders: user.googleId ? ['google'] : [],
        };
      }
    } catch (error) {
      // Token invalid or expired — just silently leave req.user undefined
    }

    next();
  };
};
