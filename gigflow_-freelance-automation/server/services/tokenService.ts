import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { PrismaClient } from '../../src/generated/prisma/client.js';

const getJwtSecret = () => process.env.JWT_SECRET || 'development-secret-change-me';
const ACCESS_TOKEN_EXPIRES_IN = '15m'; // 15 minutes

interface TokenPayload {
  userId: string;
}

export class TokenService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Generates a short-lived JWT access token.
   */
  generateAccessToken(userId: string): string {
    const payload: TokenPayload = { userId };
    return jwt.sign(payload, getJwtSecret(), { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
  }

  /**
   * Verifies an access token and returns its payload.
   * Throws if invalid or expired.
   */
  verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, getJwtSecret()) as TokenPayload;
  }

  /**
   * Generates a secure, opaque refresh token and stores it in the database.
   */
  async generateRefreshToken(userId: string, ttlDays: number, rememberMe = false): Promise<string> {
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + ttlDays);

    await this.prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
        rememberMe,
      },
    });

    return token;
  }

  async rotateRefreshToken(token: string): Promise<{ userId: string; refreshToken: string; rememberMe: boolean } | null> {
    return this.prisma.$transaction(async (tx) => {
      const storedToken = await tx.refreshToken.findUnique({
        where: { token },
      });

      if (!storedToken) return null;

      if (storedToken.expiresAt < new Date()) {
        await tx.refreshToken.delete({ where: { token } });
        return null;
      }

      const ttlDays = storedToken.rememberMe ? 30 : 7;
      const nextToken = uuidv4();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + ttlDays);

      await tx.refreshToken.delete({ where: { token } });
      await tx.refreshToken.create({
        data: {
          token: nextToken,
          userId: storedToken.userId,
          expiresAt,
          rememberMe: storedToken.rememberMe,
        },
      });

      return {
        userId: storedToken.userId,
        refreshToken: nextToken,
        rememberMe: storedToken.rememberMe,
      };
    });
  }

  /**
   * Validates a refresh token against the database.
   * Returns the userId if valid, or null if invalid/expired.
   */
  async validateRefreshToken(token: string): Promise<{ userId: string; rememberMe: boolean } | null> {
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token },
    });

    if (!storedToken) return null;

    if (storedToken.expiresAt < new Date()) {
      await this.invalidateRefreshToken(token);
      return null;
    }

    return {
      userId: storedToken.userId,
      rememberMe: storedToken.rememberMe,
    };
  }

  /**
   * Deletes a refresh token from the database.
   */
  async invalidateRefreshToken(token: string): Promise<void> {
    try {
      await this.prisma.refreshToken.delete({ where: { token } });
    } catch (e) {
      // Ignore if it doesn't exist
    }
  }

  /**
   * Invalidates all refresh tokens for a user (e.g., global sign out, password reset).
   */
  async invalidateAllRefreshTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }
}
