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
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { Profile, ProfileDocument } from '../../database/schemas/profile.schema';
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
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Profile.name) private readonly profileModel: Model<ProfileDocument>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
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
    const existing = await this.userModel.findOne({ email: emailKey }).lean();
    if (existing) {
      throw new ConflictException('An account with this email already exists.');
    }

    // 2. Validate password strength
    if (dto.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const userId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const role = dto.role || Role.LEARNER;

    // 3. Generate secure verification token (SHA-256 hashed in database)
    const rawVerificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenHash = crypto
      .createHash('sha256')
      .update(rawVerificationToken)
      .digest('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const headline =
      dto.headline?.trim() ||
      (role === Role.LEARNER
        ? 'Skillora AI Learner'
        : role === Role.EDUCATOR
        ? 'Skillora Educator'
        : 'Hiring Partner at Skillora');

    const createdUser = await this.userModel.create({
      id: userId,
      email: emailKey,
      passwordHash,
      name: dto.name.trim(),
      role,
      headline,
      isVerified: false,
      verificationTokenHash,
      verificationTokenExpires,
      country: dto.country?.trim() || '',
      educationLevel: dto.educationLevel?.trim() || '',
      careerInterest: dto.careerInterest?.trim() || '',
      institution: dto.institution?.trim() || '',
      teachingArea: dto.teachingArea?.trim() || '',
      experienceYears: dto.experienceYears ? Number(dto.experienceYears) : 0,
      companyName: dto.companyName?.trim() || '',
      companySize: dto.companySize?.trim() || '',
      industry: dto.industry?.trim() || '',
      jobTitle: dto.jobTitle?.trim() || '',
      status: 'active',
    });

    // 4. Initialize default learner profile if LEARNER
    if (role === Role.LEARNER) {
      await this.profileModel.create({
        userId,
        name: createdUser.name,
        email: createdUser.email,
        headline,
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

    const tokens = await this.generateTokens(createdUser);
    createdUser.refreshToken = tokens.refreshToken;
    await createdUser.save();

    const appUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'https://skillora-ai-frontend.vercel.app';
    const verificationUrl = `${appUrl}/verify-email?token=${rawVerificationToken}`;

    const dispatch = await this.emailService.sendVerificationEmail(emailKey, verificationUrl);

    this.logger.log(
      `[AUTH] New registration for ${emailKey} (${role}). Verification status: ${dispatch.dispatchNotice}`,
    );

    return {
      message: dispatch.dispatchNotice,
      user: this.sanitizeUser(createdUser.toObject ? createdUser.toObject() : createdUser),
      tokens,
    };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    if (!dto.token) {
      throw new BadRequestException('Verification token is required.');
    }

    const incomingHash = crypto.createHash('sha256').update(dto.token.trim()).digest('hex');

    const user = await this.userModel.findOne({ verificationTokenHash: incomingHash });
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

    user.isVerified = true;
    user.verificationTokenHash = undefined;
    user.verificationTokenExpires = undefined;

    const tokens = await this.generateTokens(user);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    this.logger.log(`[AUTH] Account successfully verified: ${user.email} (${user.role})`);

    return {
      success: true,
      message: 'Email address verified successfully. Welcome to Skillora AI!',
      user: this.sanitizeUser(user.toObject ? user.toObject() : user),
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

    const user = await this.userModel.findOne({ email: emailKey });
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

    const rawVerificationToken = crypto.randomBytes(32).toString('hex');
    user.verificationTokenHash = crypto
      .createHash('sha256')
      .update(rawVerificationToken)
      .digest('hex');
    user.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    this.resendRateLimits.set(emailKey, now);
    await user.save();

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

    const user = await this.userModel.findOne({ email: emailKey });
    if (!user) {
      this.recordFailedAttempt(emailKey);
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      this.recordFailedAttempt(emailKey);
      throw new UnauthorizedException('Invalid email or password.');
    }

    this.failedLoginAttempts.delete(emailKey);

    const tokens = await this.generateTokens(user);
    user.refreshToken = tokens.refreshToken;
    user.lastLoginAt = new Date();
    await user.save();

    return {
      message: 'Login successful.',
      user: this.sanitizeUser(user.toObject ? user.toObject() : user),
      tokens,
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const emailKey = dto.email.toLowerCase().trim();
    const user = await this.userModel.findOne({ email: emailKey });

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
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await user.save();

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
    const user = await this.userModel.findOne({ passwordResetTokenHash: incomingHash });

    if (!user) {
      throw new BadRequestException('Invalid or expired password reset token.');
    }

    if (user.passwordResetExpires && new Date() > new Date(user.passwordResetExpires)) {
      throw new BadRequestException('Password reset token has expired. Please request a new one.');
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpires = undefined;
    user.refreshToken = undefined; // Invalidate all active sessions

    await user.save();

    this.logger.log(`[AUTH] Password successfully reset for user ${user.email}`);

    return {
      success: true,
      message: 'Your password has been reset successfully. Please log in with your new password.',
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const query: any[] = [{ id: userId }];
    if (isValidObjectId(userId)) query.push({ _id: userId });

    const user = await this.userModel.findOne({ $or: query });
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
    user.refreshToken = undefined;
    await user.save();

    return {
      success: true,
      message: 'Password has been updated successfully. Active sessions revoked.',
    };
  }

  async logout(userId: string) {
    const query: any[] = [{ id: userId }];
    if (isValidObjectId(userId)) query.push({ _id: userId });

    await this.userModel.updateOne({ $or: query }, { $set: { refreshToken: null, refreshTokenHash: null } });
    return { success: true, message: 'Logged out successfully.' };
  }

  async logoutAll(userId: string) {
    const query: any[] = [{ id: userId }];
    if (isValidObjectId(userId)) query.push({ _id: userId });

    await this.userModel.updateOne({ $or: query }, { $set: { refreshToken: null, refreshTokenHash: null } });
    return { success: true, message: 'All active sessions have been invalidated.' };
  }

  async refreshToken(token: string) {
    const refreshSecret = this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
    try {
      const payload = this.jwtService.verify(token, {
        secret: refreshSecret,
      });

      const query: any[] = [{ id: payload.sub }];
      if (isValidObjectId(payload.sub)) query.push({ _id: payload.sub });

      const user = await this.userModel.findOne({ $or: query });
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Session revocation check: active session requires a valid registered refresh token
      if (!user.refreshToken) {
        throw new UnauthorizedException('Session has been revoked or logged out. Please log in again.');
      }

      // Token rotation check: verify incoming token matches the one in database
      if (user.refreshToken !== token) {
        // Reuse detection: revoke all sessions immediately
        user.refreshToken = undefined;
        await user.save();
        throw new UnauthorizedException('Refresh token reuse detected. Session revoked.');
      }

      const tokens = await this.generateTokens(user);
      user.refreshToken = tokens.refreshToken;
      await user.save();

      return {
        user: this.sanitizeUser(user.toObject ? user.toObject() : user),
        tokens,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async getMe(userId: string) {
    const query: any[] = [{ id: userId }];
    if (isValidObjectId(userId)) query.push({ _id: userId });

    const user = await this.userModel.findOne({ $or: query }).lean();
    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    const actualUserId = user.id || (user as any)._id?.toString();
    const profile = await this.profileModel.findOne({ userId: actualUserId }).lean();

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

  private async generateTokens(user: any) {
    const userId = user.id || user._id?.toString();
    const payload = {
      sub: userId,
      email: user.email,
      role: user.role,
      name: user.name,
      isVerified: user.isVerified ?? false,
    };

    const jwtSecret = this.configService.getOrThrow<string>('JWT_SECRET');
    const refreshSecret = this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');

    const accessToken = this.jwtService.sign(payload, {
      secret: jwtSecret,
      expiresIn: '24h',
    });
    const refreshToken = this.jwtService.sign(
      { ...payload, jti: crypto.randomUUID() },
      {
        secret: refreshSecret,
        expiresIn: '7d',
      },
    );
    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: any) {
    const {
      passwordHash,
      refreshToken,
      refreshTokenHash,
      verificationTokenHash,
      passwordResetTokenHash,
      ...safe
    } = user;
    return {
      ...safe,
      id: user.id || user._id?.toString(),
    };
  }
}
