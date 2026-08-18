import { PrismaClient } from '../../src/generated/prisma/client.js';
import { hashPassword, verifyPassword } from '../utils/passwordHasher.js';
import { generateSecureToken } from '../utils/cryptoUtils.js';
import { TokenService } from './tokenService.js';
import { EmailService } from './emailService.js';
import { AUTH_ERROR_CODES } from '../../src/features/auth/types/auth.errors.js';

export class AuthService {
  constructor(
    private prisma: PrismaClient,
    private tokenService: TokenService,
    private emailService: EmailService
  ) {}

  /**
   * Registers a new user with email and password.
   */
  async register(data: { email: string; password: string; name: string }) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      const error = new Error('Email already exists');
      (error as any).code = AUTH_ERROR_CODES.EMAIL_ALREADY_EXISTS;
      throw error;
    }

    const passwordHash = await hashPassword(data.password);
    const verificationToken = generateSecureToken();
    const verificationExpiry = new Date();
    verificationExpiry.setHours(verificationExpiry.getHours() + 24); // 24 hour expiry

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash,
        verificationToken,
        verificationExpiry,
      },
    });

    // Send verification email async (don't await so request is faster)
    this.emailService.sendVerificationEmail(user.email, verificationToken).catch(console.error);

    return user;
  }

  /**
   * Authenticates a user and issues tokens.
   */
  async login(data: { email: string; password: string; rememberMe: boolean }) {
    const user = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user || !user.passwordHash) {
      const error = new Error('Invalid credentials');
      (error as any).code = AUTH_ERROR_CODES.INVALID_CREDENTIALS;
      throw error;
    }

    const isValid = await verifyPassword(data.password, user.passwordHash);
    if (!isValid) {
      const error = new Error('Invalid credentials');
      (error as any).code = AUTH_ERROR_CODES.INVALID_CREDENTIALS;
      throw error;
    }

    const accessToken = this.tokenService.generateAccessToken(user.id);
    const ttlDays = data.rememberMe ? 30 : 7;
    const refreshToken = await this.tokenService.generateRefreshToken(user.id, ttlDays);

    return { user, accessToken, refreshToken };
  }

  /**
   * Refreshes a session using a refresh token.
   */
  async refreshSession(refreshToken: string) {
    const userId = await this.tokenService.validateRefreshToken(refreshToken);
    
    if (!userId) {
      const error = new Error('Invalid refresh token');
      (error as any).code = AUTH_ERROR_CODES.REFRESH_TOKEN_INVALID;
      throw error;
    }

    // Invalidate the old token (token rotation)
    await this.tokenService.invalidateRefreshToken(refreshToken);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      const error = new Error('User not found');
      (error as any).code = AUTH_ERROR_CODES.SESSION_INVALID;
      throw error;
    }

    const newAccessToken = this.tokenService.generateAccessToken(user.id);
    // Inherit the same TTL configuration ideally, but for now default to 7 days on rotation
    const newRefreshToken = await this.tokenService.generateRefreshToken(user.id, 7);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  /**
   * Logs a user out by invalidating their specific refresh token.
   */
  async logout(refreshToken: string) {
    if (refreshToken) {
      await this.tokenService.invalidateRefreshToken(refreshToken);
    }
  }

  /**
   * Initiates the password reset flow.
   */
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    
    // Always return silently to prevent email enumeration
    if (!user) return;

    const resetToken = generateSecureToken();
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1); // 1 hour expiry

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    });

    this.emailService.sendPasswordResetEmail(user.email, resetToken).catch(console.error);
  }

  /**
   * Completes the password reset flow.
   */
  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { resetToken: token },
    });

    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      const error = new Error('Invalid or expired reset token');
      (error as any).code = AUTH_ERROR_CODES.RESET_TOKEN_INVALID;
      throw error;
    }

    const passwordHash = await hashPassword(newPassword);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    // Invalidate all active sessions for security
    await this.tokenService.invalidateAllRefreshTokens(user.id);
  }

  /**
   * Recovers username/email.
   */
  async forgotUsername(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return; // Prevent enumeration
    
    // We use email as the primary identifier, so we send the email back
    this.emailService.sendForgotUsernameEmail(user.email, user.email).catch(console.error);
  }

  /**
   * Verifies an email address using the token sent via email.
   */
  async verifyEmail(token: string) {
    const user = await this.prisma.user.findUnique({
      where: { verificationToken: token },
    });

    if (!user || !user.verificationExpiry || user.verificationExpiry < new Date()) {
      const error = new Error('Invalid or expired verification token');
      (error as any).code = AUTH_ERROR_CODES.VERIFICATION_TOKEN_INVALID;
      throw error;
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        verificationToken: null,
        verificationExpiry: null,
      },
    });

    return true;
  }

  /**
   * Resends the verification email.
   */
  async resendVerification(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.isEmailVerified) return;

    const verificationToken = generateSecureToken();
    const verificationExpiry = new Date();
    verificationExpiry.setHours(verificationExpiry.getHours() + 24);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { verificationToken, verificationExpiry },
    });

    this.emailService.sendVerificationEmail(user.email, verificationToken).catch(console.error);
  }
}
