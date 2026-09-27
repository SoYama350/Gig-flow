import { Router } from 'express';
import { AuthService } from '../services/authService.js';
import { OAuthService } from '../services/oauthService.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { loginRateLimiter } from '../middleware/rateLimiter.js';
import { TOKEN_CONFIG } from '../../src/features/auth/types/auth.constants.js';

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
      const { user, accessToken, refreshToken } = await authService.login({ email, password, rememberMe });
      
      const ttlDays = rememberMe ? TOKEN_CONFIG.REMEMBER_ME_REFRESH_TTL_DAYS : TOKEN_CONFIG.DEFAULT_REFRESH_TTL_DAYS;
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

      const { accessToken, refreshToken } = await authService.refreshSession(currentRefreshToken);
      
      // Assume default TTL for refreshed tokens unless we store the preference
      setRefreshCookie(res, refreshToken, TOKEN_CONFIG.DEFAULT_REFRESH_TTL_DAYS);

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
      const provider = req.params.provider;
      const state = req.query.state as string || 'default_state';
      const url = oauthService.getAuthUrl(provider, state);
      res.redirect(url);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  router.get('/oauth/:provider/callback', async (req, res, next) => {
    try {
      const provider = req.params.provider;
      const code = req.query.code as string;
      
      const { accessToken, refreshToken } = await oauthService.handleCallback(provider, code);
      
      setRefreshCookie(res, refreshToken, 30); // 30 days for OAuth

      // Redirect back to frontend which will extract token (could use query params or postMessage)
      // For a SPA, usually we redirect to a special route that saves token and redirects to dashboard.
      // But we are storing access token in memory. So we can't just redirect with it securely unless it's a short-lived query param.
      // A common pattern is setting it as a cookie that JS can read, or redirecting to a success page that passes it to the parent window.
      // To keep it simple and secure: we redirect, the client reads the refresh token cookie automatically.
      // BUT our client needs the access token. 
      // Solution for this architecture: we redirect to a front-end route /oauth/callback?access_token=... (short lived).
      res.redirect(`/oauth/callback?access_token=${accessToken}`);
    } catch (error) {
      res.redirect('/login?error=oauth_failed');
    }
  });

  return router;
}
