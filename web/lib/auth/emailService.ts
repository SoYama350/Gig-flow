/**
 * Service for sending transactional emails.
 * Currently logs to console for development; swap with SendGrid/Resend/SES later.
 */
class EmailServiceImpl {
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const baseUrl = process.env.APP_URL || "http://localhost:3000";
    const link = `${baseUrl}/verify-email?token=${token}`;
    console.log(`\n✉️  EMAIL → ${email}\n  Subject: Verify your GigFlow account\n  Body: ${link}\n`);
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const baseUrl = process.env.APP_URL || "http://localhost:3000";
    const link = `${baseUrl}/reset-password?token=${token}`;
    console.log(`\n✉️  EMAIL → ${email}\n  Subject: Reset your GigFlow password\n  Body: ${link}\n`);
  }

  async sendForgotUsernameEmail(email: string, username: string): Promise<void> {
    console.log(`\n✉️  EMAIL → ${email}\n  Subject: Your GigFlow Username Recovery\n  Body: ${username}\n`);
  }
}

export const emailService = new EmailServiceImpl();
