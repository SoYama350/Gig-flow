import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateOAuthState, matchesOAuthState } from './utils/oauthState.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const extensionDir = path.resolve(rootDir, '..', 'gigflow-extension');
process.env.JWT_SECRET ??= 'test-secret';

const { TokenService } = await import('./services/tokenService.js');

test('oauth state generator creates random values', () => {
  const first = generateOAuthState();
  const second = generateOAuthState();

  assert.notEqual(first, second);
  assert.equal(first.length, 64);
});

test('oauth state validation catches mismatched values', () => {
  const valid = generateOAuthState();
  const invalid = generateOAuthState();

  assert.equal(matchesOAuthState(valid, valid), true);
  assert.equal(matchesOAuthState(valid, invalid), false);
  assert.equal(matchesOAuthState(undefined, valid), false);
});

test('refresh token rotation preserves remember me lifetime', async () => {
  let created: any = null;
  const prisma = {
    $transaction: async (fn: (tx: any) => Promise<any>) => fn({
      refreshToken: {
        findUnique: async ({ where }: { where: { token: string } }) => ({
          token: where.token,
          userId: 'user-123',
          expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
          rememberMe: true,
        }),
        delete: async () => undefined,
        create: async (data: any) => { created = data; return data; },
      },
    }),
  };

  const service = new TokenService(prisma as any);
  const result = await service.rotateRefreshToken('legacy-token');

  assert.equal(result?.userId, 'user-123');
  assert.equal(result?.rememberMe, true);
  assert.equal(created.data.rememberMe, true);
  assert.ok(new Date(created.data.expiresAt).getTime() > Date.now() + 29 * 24 * 60 * 60 * 1000);
});

test('expired refresh tokens are rejected and invalidated', async () => {
  let deleted = false;
  const prisma = {
    refreshToken: {
      findUnique: async () => ({
        token: 'expired-token',
        userId: 'user-456',
        rememberMe: false,
        expiresAt: new Date(Date.now() - 60_000),
      }),
      delete: async () => { deleted = true; },
    },
  };

  const service = new TokenService(prisma as any);
  const result = await service.validateRefreshToken('expired-token');

  assert.equal(result, null);
  assert.equal(deleted, true);
});

test('settings route uses the authenticated API client instead of raw fetch calls', () => {
  const settingsPath = path.join(rootDir, 'src', 'components', 'Settings.tsx');
  const source = fs.readFileSync(settingsPath, 'utf8');

  assert.match(source, /httpClient\.post\("\/api\/test-key"\)/);
  assert.doesNotMatch(source, /fetch\(\s*"\/api\/test-key"/);
  assert.match(source, /httpClient\.delete\("\/api\/gigs\/all"\)/);
});

test('extension proposal state is normalized to proposal-ready rather than applied', () => {
  const storageSource = fs.readFileSync(path.join(extensionDir, 'src', 'services', 'storage.ts'), 'utf8');
  const appSource = fs.readFileSync(path.join(extensionDir, 'src', 'App.tsx'), 'utf8');

  assert.match(storageSource, /gig\.status\s*===\s*'APPLIED'\s*\?\s*'PROPOSAL_READY'/);
  assert.match(appSource, /status:\s*'PROPOSAL_READY'/);
  assert.doesNotMatch(appSource, /status:\s*'APPLIED'\s*\}/);
});
