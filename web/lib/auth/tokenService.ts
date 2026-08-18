import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/prisma";

const JWT_SECRET =
  process.env.JWT_SECRET || "super-secret-development-key-change-me";
const ACCESS_TOKEN_EXPIRES_IN = "15m";

interface TokenPayload {
  userId: string;
}

class TokenServiceImpl {
  generateAccessToken(userId: string): string {
    const payload: TokenPayload = { userId };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
  }

  verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  }

  async generateRefreshToken(userId: string, ttlDays: number): Promise<string> {
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + ttlDays);

    await prisma.refreshToken.create({
      data: { token, userId, expiresAt },
    });

    return token;
  }

  async validateRefreshToken(token: string): Promise<string | null> {
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token },
    });

    if (!storedToken) return null;

    if (storedToken.expiresAt < new Date()) {
      await this.invalidateRefreshToken(token);
      return null;
    }

    return storedToken.userId;
  }

  async invalidateRefreshToken(token: string): Promise<void> {
    try {
      await prisma.refreshToken.delete({ where: { token } });
    } catch {
      // ignore if it doesn't exist
    }
  }

  async invalidateAllRefreshTokens(userId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { userId } });
  }
}

export const tokenService = new TokenServiceImpl();
