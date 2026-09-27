/**
 * Service for sending transactional emails.
 * Currently uses console.log for development.
 * Designed to be easily swapped with SendGrid, Resend, or AWS SES later.
 */
export class EmailService {
  
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const link = `http://localhost:3000/verify-email?token=${token}`;
    
    // In production, send real email here
    console.log('\n======================================================');
    console.log(`✉️  EMAIL SENT TO: ${email}`);
    console.log(`Subject: Verify your GigFlow account`);
    console.log(`Body: Click here to verify your email:\n${link}`);
    console.log('======================================================\n');
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const link = `http://localhost:3000/reset-password?token=${token}`;
    
    // In production, send real email here
    console.log('\n======================================================');
    console.log(`✉️  EMAIL SENT TO: ${email}`);
    console.log(`Subject: Reset your GigFlow password`);
    console.log(`Body: Click here to reset your password:\n${link}`);
    console.log(`If you didn't request this, safely ignore this email.`);
    console.log('======================================================\n');
  }

  async sendForgotUsernameEmail(email: string, username: string): Promise<void> {
    // In production, send real email here
    console.log('\n======================================================');
    console.log(`✉️  EMAIL SENT TO: ${email}`);
    console.log(`Subject: Your GigFlow Username Recovery`);
    console.log(`Body: The account associated with this email is:\n${username}`);
    console.log('======================================================\n');
  }
}
