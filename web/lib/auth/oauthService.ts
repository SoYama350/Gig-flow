import { prisma } from "@/lib/prisma";
import { tokenService } from "@/lib/auth/tokenService";
import { AUTH_ERROR_CODES } from "@/src/features/auth/types/auth.errors";

export interface OAuthUserData {
  id: string;
  email: string;
  name: string;
}

export interface OAuthProvider {
  getAuthUrl(state: string): string;
  getUserData(code: string): Promise<OAuthUserData>;
}

interface AuthError extends Error {
  code: string;
}

function authError(message: string, code: string): AuthError {
  const error = new Error(message) as AuthError;
  error.code = code;
  return error;
}

/**
 * Google OAuth provider. Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
 * env vars plus APP_URL for the redirect URI. Returns a placeholder auth URL
 * until the keys are configured.
 */
class GoogleOAuthProvider implements OAuthProvider {
  private clientId = process.env.GOOGLE_CLIENT_ID;
  private clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  private redirectUri = `${process.env.APP_URL || "http://localhost:3000"}/api/auth/oauth/google/callback`;

  getAuthUrl(state: string): string {
    if (!this.clientId) {
      throw authError(
        "Google OAuth is not configured (GOOGLE_CLIENT_ID missing)",
        AUTH_ERROR_CODES.OAUTH_FAILED
      );
    }

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async getUserData(code: string): Promise<OAuthUserData> {
    if (!this.clientId || !this.clientSecret) {
      throw authError(
        "Google OAuth is not configured",
        AUTH_ERROR_CODES.OAUTH_FAILED
      );
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      throw authError("Failed to exchange OAuth code", AUTH_ERROR_CODES.OAUTH_FAILED);
    }

    const tokens = (await tokenRes.json()) as { access_token: string };

    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { authorization: `Bearer ${tokens.access_token}` },
    });

    if (!profileRes.ok) {
      throw authError("Failed to fetch Google profile", AUTH_ERROR_CODES.OAUTH_FAILED);
    }

    const profile = (await profileRes.json()) as {
      id: string;
      email: string;
      name: string;
    };

    return { id: profile.id, email: profile.email, name: profile.name };
  }
}

class OAuthServiceImpl {
  private providers = new Map<string, OAuthProvider>();

  constructor() {
    this.registerProvider("google", new GoogleOAuthProvider());
  }

  registerProvider(name: string, provider: OAuthProvider) {
    this.providers.set(name, provider);
  }

  getAuthUrl(providerName: string, state: string): string {
    const provider = this.providers.get(providerName);
    if (!provider) throw authError(`OAuth provider ${providerName} not found`, AUTH_ERROR_CODES.OAUTH_FAILED);
    return provider.getAuthUrl(state);
  }

  async handleCallback(providerName: string, code: string) {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw authError(
        `OAuth provider ${providerName} not found`,
        AUTH_ERROR_CODES.OAUTH_FAILED
      );
    }

    try {
      const oauthData = await provider.getUserData(code);

      let user = await prisma.user.findUnique({
        where: { email: oauthData.email },
      });

      if (user) {
        if (!user.googleId && providerName === "google") {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { googleId: oauthData.id },
          });
        }
      } else {
        user = await prisma.user.create({
          data: {
            email: oauthData.email,
            name: oauthData.name,
            isEmailVerified: true,
            ...(providerName === "google" ? { googleId: oauthData.id } : {}),
          },
        });
      }

      const accessToken = tokenService.generateAccessToken(user.id);
      const refreshToken = await tokenService.generateRefreshToken(user.id, 30);

      return { user, accessToken, refreshToken };
    } catch (err) {
      console.error("[OAuthService] Error during callback handling:", err);
      throw authError("OAuth authentication failed", AUTH_ERROR_CODES.OAUTH_FAILED);
    }
  }
}

export const oauthService = new OAuthServiceImpl();
