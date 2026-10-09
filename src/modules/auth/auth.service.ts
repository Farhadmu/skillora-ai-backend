import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { DataStoreService, UserEntity } from '../../database/data-store.service';
import {
  RegisterDto,
  LoginDto,
  VerifyEmailDto,
  ResendVerificationDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from './dto/auth.dto';
import { Role } from '../../common/enums/roles.enum';

import { EmailService } from '../../common/services/email.service';

interface RateLimitRecord {
  count: number;
  firstAttemptAt: number;
  lastAttemptAt: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly failedLoginAttempts: Map<string, RateLimitRecord> = new Map();
  private readonly resendRateLimits: Map<string, number> = new Map();

  constructor(
    private readonly dataStore: DataStoreService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    // 1. Strictly forbid ADMIN role in public registration
    if (dto.role === Role.ADMIN) {
      throw new ForbiddenException(
        'Admin accounts cannot be registered publicly. They must be provisioned via secure backend governance.',
      );
    }

    const emailKey = dto.email.toLowerCase().trim();
    const existing = Array.from(this.dataStore.users.values()).find(
      (u) => u.email.toLowerCase() === emailKey,
    );
    if (existing) {
      throw new ConflictException('An account with this email already exists.');
    }

    // 2. Validate password strength
    if (dto.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const userId = `usr-${Date.now()}`;
    const role = dto.role || Role.LEARNER;

    // 3. Generate secure verification token (SHA-256 hashed in database)
    const rawVerificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenHash = crypto
      .createHash('sha256')
      .update(rawVerificationToken)
      .digest('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    const newUser: UserEntity = {
      id: userId,
      email: emailKey,
      passwordHash,
      name: dto.name.trim(),
      role,
      headline:
        dto.headline?.trim() ||
        (role === Role.LEARNER
          ? 'Skillora AI Learner'
          : role === Role.EDUCATOR
          ? 'Skillora Educator'
          : 'Hiring Partner at Skillora'),
      createdAt: new Date().toISOString(),
      isVerified: false,
      verificationTokenHash,
      verificationTokenExpires,
      // Role-specific onboarding fields
      country: dto.country?.trim(),
      educationLevel: dto.educationLevel?.trim(),
      careerInterest: dto.careerInterest?.trim(),
      institution: dto.institution?.trim(),
      teachingArea: dto.teachingArea?.trim(),
      experienceYears: dto.experienceYears,
      companyName: dto.companyName?.trim(),
      companySize: dto.companySize?.trim(),
      industry: dto.industry?.trim(),
      jobTitle: dto.jobTitle?.trim(),
    };

    this.dataStore.saveUser(newUser);

    // 4. Initialize default learner profile if LEARNER
    if (role === Role.LEARNER) {
      this.dataStore.saveProfile({
        userId,
        name: newUser.name,
        email: newUser.email,
        headline: newUser.headline || 'Skillora Learner',
        bio: 'Welcome to my Skillora AI verified workforce intelligence profile.',
        degree: dto.educationLevel || '',
        institution: dto.institution || '',
        graduationYear: '2025',
        targetRole: dto.careerInterest || 'Full-Stack Software Engineer',
        targetCompanies: [],
        preferredMode: 'remote',
        weeklyHours: 15,
        readinessScore: 0,
        completenessScore: 30,
        skills: [],
        readinessDimensions: {
          technical: 0,
          problemSolving: 0,
          projects: 0,
          communication: 0,
          interview: 0,
          roleAlignment: 0,
          practical: 0,
        },
      });
    }

    const tokens = await this.generateTokens(newUser);
    const appUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'https://skillora-ai-frontend.vercel.app';
    const verificationUrl = `${appUrl}/verify-email?token=${rawVerificationToken}`;

    const dispatch = await this.emailService.sendVerificationEmail(emailKey, verificationUrl);

    this.logger.log(
      `[AUTH] New registration for ${emailKey} (${role}). Verification status: ${dispatch.dispatchNotice}`,
    );

    return {
      message: dispatch.dispatchNotice,
      user: this.sanitizeUser(newUser),
      tokens,
    };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    if (!dto.token) {
      throw new BadRequestException('Verification token is required.');
    }

    const incomingHash = crypto.createHash('sha256').update(dto.token.trim()).digest('hex');

    const user = Array.from(this.dataStore.users.values()).find(
      (u) => u.verificationTokenHash === incomingHash,
    );

    if (!user) {
      throw new BadRequestException(
        'Invalid or expired verification token. If your account is already verified, you can log in directly.',
      );
    }

    if (user.verificationTokenExpires && new Date() > new Date(user.verificationTokenExpires)) {
      throw new BadRequestException(
        'Verification token has expired. Please request a new verification link.',
      );
    }

    // Mark as verified and invalidate token
    user.isVerified = true;
    user.verificationTokenHash = null;
    user.verificationTokenExpires = null;

    const tokens = await this.generateTokens(user);
    user.refreshToken = tokens.refreshToken;

    this.dataStore.saveUser(user);

    this.logger.log(`[AUTH] Account successfully verified: ${user.email} (${user.role})`);

    return {
      success: true,
      message: 'Email address verified successfully. Welcome to Skillora AI!',
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  async resendVerification(dto: ResendVerificationDto) {
    const emailKey = dto.email.toLowerCase().trim();

    // Rate limiting: 60 second cooldown per email
    const lastSent = this.resendRateLimits.get(emailKey);
    const now = Date.now();
    if (lastSent && now - lastSent < 60000) {
      const waitSeconds = Math.ceil((60000 - (now - lastSent)) / 1000);
      throw new HttpException(
        `Please wait ${waitSeconds} seconds before requesting another verification email.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = Array.from(this.dataStore.users.values()).find(
      (u) => u.email.toLowerCase() === emailKey,
    );

    // If already verified or doesn't exist, return clean message to prevent enumeration
    if (!user) {
      return {
        success: true,
        message: 'If an unverified account with this email exists, a verification link has been dispatched.',
      };
    }

    if (user.isVerified) {
      return {
        success: true,
        alreadyVerified: true,
        message: 'This account is already verified. You may log in directly.',
      };
    }

    // Generate new token
    const rawVerificationToken = crypto.randomBytes(32).toString('hex');
    user.verificationTokenHash = crypto
      .createHash('sha256')
      .update(rawVerificationToken)
      .digest('hex');
    user.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    this.resendRateLimits.set(emailKey, now);

    this.dataStore.saveUser(user);

    const appUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'https://skillora-ai-frontend.vercel.app';
    const verificationUrl = `${appUrl}/verify-email?token=${rawVerificationToken}`;
    const dispatch = await this.emailService.sendVerificationEmail(emailKey, verificationUrl);

    return {
      success: true,
      message: dispatch.dispatchNotice,
    };
  }

  async login(dto: LoginDto) {
    const emailKey = dto.email.toLowerCase().trim();

    // Brute-force protection: Max 5 failed attempts in 15 minutes
    const attemptRecord = this.failedLoginAttempts.get(emailKey);
    const now = Date.now();
    if (attemptRecord) {
      if (now - attemptRecord.firstAttemptAt < 15 * 60 * 1000 && attemptRecord.count >= 5) {
        const remainingMinutes = Math.ceil((15 * 60 * 1000 - (now - attemptRecord.firstAttemptAt)) / 60000);
        throw new HttpException(
          `Too many failed login attempts. Account temporarily locked for security. Please try again in ${remainingMinutes} minutes or reset your password.`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      } else if (now - attemptRecord.firstAttemptAt >= 15 * 60 * 1000) {
        this.failedLoginAttempts.delete(emailKey);
      }
    }

    const user = Array.from(this.dataStore.users.values()).find(
      (u) => u.email.toLowerCase() === emailKey,
    );
    if (!user) {
      this.recordFailedAttempt(emailKey);
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      this.recordFailedAttempt(emailKey);
      throw new UnauthorizedException('Invalid email or password.');
    }

    // Successful login: clear failed attempts
    this.failedLoginAttempts.delete(emailKey);

    const tokens = await this.generateTokens(user);
    user.refreshToken = tokens.refreshToken;
    this.dataStore.saveUser(user);

    return {
      message: 'Login successful.',
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const emailKey = dto.email.toLowerCase().trim();
    const user = Array.from(this.dataStore.users.values()).find(
      (u) => u.email.toLowerCase() === emailKey,
    );

    if (!user) {
      return {
        success: true,
        message: 'If an account exists with that email address, password reset instructions have been sent.',
      };
    }

    const rawResetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetTokenHash = crypto
      .createHash('sha256')
      .update(rawResetToken)
      .digest('hex');
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    this.dataStore.saveUser(user);

    const appUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'https://skillora-ai-frontend.vercel.app';
    const resetUrl = `${appUrl}/reset-password?token=${rawResetToken}`;
    const dispatch = await this.emailService.sendPasswordResetEmail(emailKey, resetUrl);

    return {
      success: true,
      message: dispatch.dispatchNotice,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    if (!dto.token || !dto.newPassword) {
      throw new BadRequestException('Token and new password are required.');
    }

    if (dto.newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters long.');
    }

    const incomingHash = crypto.createHash('sha256').update(dto.token.trim()).digest('hex');
    const user = Array.from(this.dataStore.users.values()).find(
      (u) => u.passwordResetTokenHash === incomingHash,
    );

    if (!user) {
      throw new BadRequestException('Invalid or expired password reset token.');
    }

    if (user.passwordResetExpires && new Date() > new Date(user.passwordResetExpires)) {
      throw new BadRequestException('Password reset token has expired. Please request a new one.');
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    user.passwordResetTokenHash = null;
    user.passwordResetExpires = null;
    user.refreshToken = null; // Invalidate current session

    this.dataStore.saveUser(user);

    this.logger.log(`[AUTH] Password successfully reset for user ${user.email}`);

    return {
      success: true,
      message: 'Your password has been reset successfully. Please log in with your new password.',
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = this.dataStore.users.get(userId);
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const isMatch = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Current password does not match.');
    }

    if (dto.newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters long.');
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    this.dataStore.saveUser(user);

    return {
      success: true,
      message: 'Password has been updated successfully.',
    };
  }

  async logout(userId: string) {
    const user = this.dataStore.users.get(userId);
    if (user) {
      user.refreshToken = undefined;
      this.dataStore.saveUser(user);
    }
    return { success: true, message: 'Logged out successfully.' };
  }

  async logoutAll(userId: string) {
    const user = this.dataStore.users.get(userId);
    if (user) {
      user.refreshToken = undefined;
      this.dataStore.saveUser(user);
    }
    return { success: true, message: 'All active sessions have been invalidated.' };
  }

  async refreshToken(token: string) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_REFRESH_SECRET || 'skillora_super_secret_refresh_key_2026',
      });
      const user = this.dataStore.users.get(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const tokens = await this.generateTokens(user);
      user.refreshToken = tokens.refreshToken;
      return {
        user: this.sanitizeUser(user),
        tokens,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async getMe(userId: string) {
    const user = this.dataStore.users.get(userId);
    if (!user) {
      throw new NotFoundException('User profile not found');
    }
    const profile = this.dataStore.profiles.get(userId);
    return {
      user: this.sanitizeUser(user),
      profile,
    };
  }

  private recordFailedAttempt(email: string) {
    const now = Date.now();
    const existing = this.failedLoginAttempts.get(email);
    if (!existing) {
      this.failedLoginAttempts.set(email, {
        count: 1,
        firstAttemptAt: now,
        lastAttemptAt: now,
      });
    } else {
      existing.count += 1;
      existing.lastAttemptAt = now;
    }
  }

  private async generateTokens(user: UserEntity) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      isVerified: user.isVerified ?? false,
    };
    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET || 'skillora_super_secret_access_key_2026',
      expiresIn: '24h',
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'skillora_super_secret_refresh_key_2026',
      expiresIn: '7d',
    });
    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: UserEntity) {
    const { passwordHash, refreshToken, verificationTokenHash, passwordResetTokenHash, ...safe } =
      user;
    return safe;
  }
}
