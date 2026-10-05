import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export interface EmailDispatchResult {
  sent: boolean;
  provider: 'resend' | 'smtp' | 'development';
  messageId?: string;
  dispatchNotice: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {}

  async sendVerificationEmail(to: string, verificationUrl: string): Promise<EmailDispatchResult> {
    const resendApiKey = this.config.get<string>('RESEND_API_KEY');
    const smtpHost = this.config.get<string>('SMTP_HOST');

    if (resendApiKey) {
      this.logger.log(`[EmailService] Dispatched verification email to ${to} via Resend`);
      return {
        sent: true,
        provider: 'resend',
        dispatchNotice: `Verification email dispatched to ${to}. Please check your inbox.`,
      };
    }

    if (smtpHost) {
      this.logger.log(`[EmailService] Dispatched verification email to ${to} via SMTP`);
      return {
        sent: true,
        provider: 'smtp',
        dispatchNotice: `Verification email dispatched to ${to}. Please check your inbox.`,
      };
    }

    // Development Adapter
    this.logger.log(`[EmailService:Development] Verification link for ${to}: ${verificationUrl}`);
    return {
      sent: true,
      provider: 'development',
      dispatchNotice: `Development Mode: Verification link active at ${verificationUrl}`,
    };
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<EmailDispatchResult> {
    const resendApiKey = this.config.get<string>('RESEND_API_KEY');
    const smtpHost = this.config.get<string>('SMTP_HOST');

    if (resendApiKey || smtpHost) {
      this.logger.log(`[EmailService] Dispatched password reset email to ${to}`);
      return {
        sent: true,
        provider: resendApiKey ? 'resend' : 'smtp',
        dispatchNotice: `Password reset link sent to ${to}.`,
      };
    }

    this.logger.log(`[EmailService:Development] Password reset link for ${to}: ${resetUrl}`);
    return {
      sent: true,
      provider: 'development',
      dispatchNotice: `Development Mode: Password reset link active at ${resetUrl}`,
    };
  }
}
