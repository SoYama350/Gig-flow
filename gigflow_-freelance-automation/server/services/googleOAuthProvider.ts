import { OAuthProvider, OAuthUserData } from './oauthService.js';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

export class GoogleOAuthProvider implements OAuthProvider {
  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly redirectUri: string,
  ) {}

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
      state,
    });

    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  async getUserData(code: string): Promise<OAuthUserData> {
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const text = await tokenResponse.text();
      throw new Error(`Google OAuth token exchange failed: ${text}`);
    }

    const tokenData = await tokenResponse.json() as { access_token?: string };
    if (!tokenData.access_token) {
      throw new Error('Google OAuth token exchange succeeded without an access token');
    }

    const userResponse = await fetch(GOOGLE_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      const text = await userResponse.text();
      throw new Error(`Google userinfo lookup failed: ${text}`);
    }

    const userData = await userResponse.json() as {
      sub?: string;
      email?: string;
      name?: string;
      given_name?: string;
      family_name?: string;
    };

    if (!userData.email || !userData.sub) {
      throw new Error('Google account did not return an email or provider identifier');
    }

    const displayName = userData.name ?? `${userData.given_name ?? ''} ${userData.family_name ?? ''}`.trim();

    return {
      id: userData.sub,
      email: userData.email,
      name: displayName || userData.email.split('@')[0],
    };
  }
}
