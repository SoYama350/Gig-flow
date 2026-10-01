import { Router } from 'express';
import { AuthService } from '../services/authService.js';
import { OAuthService } from '../services/oauthService.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { loginRateLimiter } from '../middleware/rateLimiter.js';
import { TOKEN_CONFIG } from '../../src/features/auth/types/auth.constants.js';
import { createOAuthStateCookieOptions, generateOAuthState, matchesOAuthState } from '../utils/oauthState.js';

export function createAuthRoutes(authService: AuthService, oauthService: OAuthService): Router {
  const router = Router();

  const setRefreshCookie = (res: any, token: string, ttlDays: number) => {
    res.cookie('refresh_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: ttlDays * 24 * 60 * 60 * 1000,
    });
  };

  const clearRefreshCookie = (res: any) => {
    res.clearCookie('refresh_token');
  };

  router.post('/register', loginRateLimiter, async (req, res, next) => {
    try {
      const { email, password, name } = req.body;
      const user = await authService.register({ email, password, name });
      res.status(201).json({ message: 'Registration successful. Please verify your email.', user });
    } catch (error) {
      next(error);
    }
  });

  router.post('/login', loginRateLimiter, async (req, res, next) => {
    try {
      const { email, password, rememberMe } = req.body;
      const { user, accessToken, refreshToken, rememberMe: sessionRememberMe } = await authService.login({ email, password, rememberMe });

      const ttlDays = sessionRememberMe ? TOKEN_CONFIG.REMEMBER_ME_REFRESH_TTL_DAYS : TOKEN_CONFIG.DEFAULT_REFRESH_TTL_DAYS;
      setRefreshCookie(res, refreshToken, ttlDays);

      res.json({ user, accessToken });
    } catch (error) {
      next(error);
    }
  });

  router.post('/refresh', async (req, res, next) => {
    try {
      const currentRefreshToken = req.cookies['refresh_token'];
      if (!currentRefreshToken) {
        return res.status(401).json({ code: 'TOKEN_INVALID', message: 'No refresh token provided' });
      }

      const { accessToken, refreshToken, rememberMe } = await authService.refreshSession(currentRefreshToken);
      const ttlDays = rememberMe ? TOKEN_CONFIG.REMEMBER_ME_REFRESH_TTL_DAYS : TOKEN_CONFIG.DEFAULT_REFRESH_TTL_DAYS;
      setRefreshCookie(res, refreshToken, ttlDays);

      res.json({ accessToken, expiresIn: TOKEN_CONFIG.ACCESS_TOKEN_TTL_SECONDS });
    } catch (error) {
      clearRefreshCookie(res);
      next(error);
    }
  });

  router.post('/logout', requireAuth, async (req, res, next) => {
    try {
      const currentRefreshToken = req.cookies['refresh_token'];
      await authService.logout(currentRefreshToken);
      clearRefreshCookie(res);
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  });

  router.get('/me', requireAuth, (req, res) => {
    res.json({ user: req.user });
  });

  router.post('/forgot-password', loginRateLimiter, async (req, res, next) => {
    try {
      await authService.forgotPassword(req.body.email);
      res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
    } catch (error) {
      next(error);
    }
  });

  router.post('/reset-password', async (req, res, next) => {
    try {
      const { token, newPassword } = req.body;
      await authService.resetPassword(token, newPassword);
      res.json({ message: 'Password reset successful. You can now log in.' });
    } catch (error) {
      next(error);
    }
  });

  router.post('/forgot-username', loginRateLimiter, async (req, res, next) => {
    try {
      await authService.forgotUsername(req.body.email);
      res.json({ message: 'If an account with that email exists, your username has been sent.' });
    } catch (error) {
      next(error);
    }
  });

  router.get('/verify-email', async (req, res, next) => {
    try {
      const token = req.query.token as string;
      await authService.verifyEmail(token);
      res.json({ message: 'Email verified successfully', verified: true });
    } catch (error) {
      next(error);
    }
  });

  router.post('/resend-verification', requireAuth, async (req, res, next) => {
    try {
      await authService.resendVerification(req.user!.id);
      res.json({ message: 'Verification email sent' });
    } catch (error) {
      next(error);
    }
  });

  // OAuth endpoints
  router.get('/oauth/:provider', (req, res) => {
    try {
      const provider = req.params.provider.toLowerCase();
      const state = generateOAuthState();
      res.cookie('oauth_state', state, createOAuthStateCookieOptions());

      const url = oauthService.getAuthUrl(provider, state);
      res.redirect(url);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  router.get('/oauth/:provider/callback', async (req, res, next) => {
    try {
      const provider = req.params.provider.toLowerCase();
      const code = req.query.code as string;
      const requestState = req.query.state as string | undefined;
      const cookieState = req.cookies?.oauth_state as string | undefined;

      if (!matchesOAuthState(cookieState, requestState)) {
        return res.status(400).redirect('/login?error=oauth_state_invalid');
      }

      const { refreshToken } = await oauthService.handleCallback(provider, code, requestState);

      setRefreshCookie(res, refreshToken, 30);
      res.clearCookie('oauth_state');

      const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
      res.redirect(`${frontendUrl}/oauth/callback`);
    } catch (error) {
      res.clearCookie('oauth_state');
      res.redirect('/login?error=oauth_failed');
    }
  });

  return router;
}
