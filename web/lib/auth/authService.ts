import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/passwordHasher";
import { generateSecureToken } from "@/lib/auth/cryptoUtils";
import { tokenService } from "@/lib/auth/tokenService";
import { emailService } from "@/lib/auth/emailService";
import { AUTH_ERROR_CODES } from "@/src/features/auth/types/auth.errors";

interface AuthError extends Error {
  code: string;
}

function authError(message: string, code: string): AuthError {
  const error = new Error(message) as AuthError;
  error.code = code;
  return error;
}

class AuthServiceImpl {
  async register(data: { email: string; password: string; name: string }) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw authError("Email already exists", AUTH_ERROR_CODES.EMAIL_ALREADY_EXISTS);
    }

    const passwordHash = await hashPassword(data.password);
    const verificationToken = generateSecureToken();
    const verificationExpiry = new Date();
    verificationExpiry.setHours(verificationExpiry.getHours() + 24);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash,
        verificationToken,
        verificationExpiry,
      },
    });

    emailService
      .sendVerificationEmail(user.email, verificationToken)
      .catch(console.error);

    return user;
  }

  async login(data: { email: string; password: string; rememberMe: boolean }) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user || !user.passwordHash) {
      throw authError("Invalid credentials", AUTH_ERROR_CODES.INVALID_CREDENTIALS);
    }

    const isValid = await verifyPassword(data.password, user.passwordHash);
    if (!isValid) {
      throw authError("Invalid credentials", AUTH_ERROR_CODES.INVALID_CREDENTIALS);
    }

    const accessToken = tokenService.generateAccessToken(user.id);
    const ttlDays = data.rememberMe ? 30 : 7;
    const refreshToken = await tokenService.generateRefreshToken(user.id, ttlDays);

    return { user, accessToken, refreshToken };
  }

  async refreshSession(refreshToken: string) {
    const userId = await tokenService.validateRefreshToken(refreshToken);

    if (!userId) {
      throw authError(
        "Invalid refresh token",
        AUTH_ERROR_CODES.REFRESH_TOKEN_INVALID
      );
    }

    await tokenService.invalidateRefreshToken(refreshToken);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw authError("User not found", AUTH_ERROR_CODES.SESSION_INVALID);
    }

    const newAccessToken = tokenService.generateAccessToken(user.id);
    const newRefreshToken = await tokenService.generateRefreshToken(user.id, 7);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  async logout(refreshToken: string) {
    if (refreshToken) {
      await tokenService.invalidateRefreshToken(refreshToken);
    }
  }

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return;

    const resetToken = generateSecureToken();
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1);

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    });

    emailService.sendPasswordResetEmail(user.email, resetToken).catch(console.error);
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { resetToken: token } });

    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      throw authError(
        "Invalid or expired reset token",
        AUTH_ERROR_CODES.RESET_TOKEN_INVALID
      );
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetToken: null, resetTokenExpiry: null },
    });

    await tokenService.invalidateAllRefreshTokens(user.id);
  }

  async forgotUsername(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return;

    emailService.sendForgotUsernameEmail(user.email, user.email).catch(console.error);
  }

  async verifyEmail(token: string) {
    const user = await prisma.user.findUnique({
      where: { verificationToken: token },
    });

    if (!user || !user.verificationExpiry || user.verificationExpiry < new Date()) {
      throw authError(
        "Invalid or expired verification token",
        AUTH_ERROR_CODES.VERIFICATION_TOKEN_INVALID
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        verificationToken: null,
        verificationExpiry: null,
      },
    });

    return true;
  }

  async resendVerification(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.isEmailVerified) return;

    const verificationToken = generateSecureToken();
    const verificationExpiry = new Date();
    verificationExpiry.setHours(verificationExpiry.getHours() + 24);

    await prisma.user.update({
      where: { id: user.id },
      data: { verificationToken, verificationExpiry },
    });

    emailService
      .sendVerificationEmail(user.email, verificationToken)
      .catch(console.error);
  }
}

export const authService = new AuthServiceImpl();
