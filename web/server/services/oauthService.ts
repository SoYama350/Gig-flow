import { PrismaClient } from '../../src/generated/prisma/client.js';
import { TokenService } from './tokenService.js';
import { AUTH_ERROR_CODES } from '../../src/features/auth/types/auth.errors.js';

export interface OAuthUserData {
  id: string; // Provider-specific ID
  email: string;
  name: string;
}

export interface OAuthProvider {
  /**
   * Generates the authorization URL to redirect the user to.
   */
  getAuthUrl(state: string): string;
  /**
   * Exchanges the auth code for user data.
   */
  getUserData(code: string): Promise<OAuthUserData>;
}

export class OAuthService {
  private providers: Map<string, OAuthProvider> = new Map();

  constructor(
    private prisma: PrismaClient,
    private tokenService: TokenService
  ) {}

  registerProvider(name: string, provider: OAuthProvider) {
    this.providers.set(name, provider);
  }

  getAuthUrl(providerName: string, state: string): string {
    const provider = this.providers.get(providerName);
    if (!provider) throw new Error(`OAuth provider ${providerName} not found`);
    return provider.getAuthUrl(state);
  }

  async handleCallback(providerName: string, code: string) {
    const provider = this.providers.get(providerName);
    if (!provider) {
      const error = new Error(`OAuth provider ${providerName} not found`);
      (error as any).code = AUTH_ERROR_CODES.OAUTH_FAILED;
      throw error;
    }

    try {
      const oauthData = await provider.getUserData(code);
      
      // Find or create user
      let user = await this.prisma.user.findUnique({
        where: { email: oauthData.email },
      });

      if (user) {
        // Link account if not already linked
        if (!user.googleId && providerName === 'google') {
          user = await this.prisma.user.update({
            where: { id: user.id },
            data: { googleId: oauthData.id },
          });
        }
      } else {
        // Create new user (automatically verified since it's via OAuth)
        user = await this.prisma.user.create({
          data: {
            email: oauthData.email,
            name: oauthData.name,
            isEmailVerified: true,
            ...(providerName === 'google' ? { googleId: oauthData.id } : {}),
          },
        });
      }

      // Generate tokens
      const accessToken = this.tokenService.generateAccessToken(user.id);
      const refreshToken = await this.tokenService.generateRefreshToken(user.id, 30); // 30 days default for OAuth

      return { user, accessToken, refreshToken };

    } catch (err) {
      console.error('[OAuthService] Error during callback handling:', err);
      const error = new Error('OAuth authentication failed');
      (error as any).code = AUTH_ERROR_CODES.OAUTH_FAILED;
      throw error;
    }
  }
}
