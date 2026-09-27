import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { PrismaClient } from '../../src/generated/prisma/client.js';

// In a real app, these should come from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-development-key-change-me';
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
    return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
  }

  /**
   * Verifies an access token and returns its payload.
   * Throws if invalid or expired.
   */
  verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  }

  /**
   * Generates a secure, opaque refresh token and stores it in the database.
   */
  async generateRefreshToken(userId: string, ttlDays: number): Promise<string> {
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + ttlDays);

    await this.prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });

    return token;
  }

  /**
   * Validates a refresh token against the database.
   * Returns the userId if valid, or null if invalid/expired.
   */
  async validateRefreshToken(token: string): Promise<string | null> {
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token },
    });

    if (!storedToken) return null;

    if (storedToken.expiresAt < new Date()) {
      // Clean up expired token
      await this.invalidateRefreshToken(token);
      return null;
    }

    return storedToken.userId;
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
