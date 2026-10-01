import { Router } from 'express';
import { createAuthRoutes } from './authRoutes.js';
import { AuthService } from '../services/authService.js';
import { OAuthService } from '../services/oauthService.js';
import { TokenService } from '../services/tokenService.js';
import { EmailService } from '../services/emailService.js';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import { GoogleOAuthProvider } from '../services/googleOAuthProvider.js';

export function createApiRouter(prisma: PrismaClient) {
  const router = Router();

  const tokenService = new TokenService(prisma);
  const emailService = new EmailService();
  const authService = new AuthService(prisma, tokenService, emailService);
  const oauthService = new OAuthService(prisma, tokenService);

  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const googleRedirectUri = process.env.GOOGLE_REDIRECT_URI ?? `${process.env.APP_URL ?? 'http://localhost:3000'}/api/auth/oauth/google/callback`;

  if (googleClientId && googleClientSecret) {
    oauthService.registerProvider('google', new GoogleOAuthProvider(googleClientId, googleClientSecret, googleRedirectUri));
  }

  const authRouter = createAuthRoutes(authService, oauthService);

  router.use('/auth', authRouter);

  // We could also move existing /gigs and /user routes into their own files
  // and mount them here: router.use('/gigs', gigRouter), etc.

  return router;
}
