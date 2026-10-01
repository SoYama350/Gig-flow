import crypto from 'node:crypto';

export function generateOAuthState(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function createOAuthStateCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 10 * 60 * 1000,
  };
}

export function matchesOAuthState(cookieState: string | undefined, requestState: string | undefined): boolean {
  if (!cookieState || !requestState) {
    return false;
  }

  if (cookieState.length !== requestState.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(cookieState, 'hex'),
      Buffer.from(requestState, 'hex')
    );
  } catch {
    return false;
  }
}
