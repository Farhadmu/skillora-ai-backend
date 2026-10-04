import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { DataStoreService, UserEntity } from '../../database/data-store.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { Role } from '../../common/enums/roles.enum';

@Injectable()
export class AuthService {
  constructor(
    private readonly dataStore: DataStoreService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = Array.from(this.dataStore.users.values()).find(
      (u) => u.email.toLowerCase() === dto.email.toLowerCase(),
    );
    if (existing) {
      throw new ConflictException('An account with this email already exists.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const userId = `usr-${Date.now()}`;
    const newUser: UserEntity = {
      id: userId,
      email: dto.email.toLowerCase(),
      passwordHash,
      name: dto.name,
      role: dto.role || Role.LEARNER,
      headline: dto.headline || 'Skillora Explorer',
      createdAt: new Date().toISOString(),
    };

    this.dataStore.users.set(userId, newUser);

    // Initialize default profile if learner
    if (newUser.role === Role.LEARNER) {
      this.dataStore.profiles.set(userId, {
        userId,
        name: newUser.name,
        email: newUser.email,
        headline: newUser.headline || '',
        bio: 'Welcome to my Skillora AI verified profile.',
        degree: '',
        institution: '',
        graduationYear: '',
        targetRole: 'Full-Stack Software Engineer',
        targetCompanies: [],
        preferredMode: 'remote',
        weeklyHours: 15,
        readinessScore: 60,
        completenessScore: 40,
        skills: [],
        readinessDimensions: {
          technical: 60,
          problemSolving: 60,
          projects: 55,
          communication: 65,
          interview: 50,
          roleAlignment: 60,
          practical: 55,
        },
      });
    }

    const tokens = await this.generateTokens(newUser);
    return {
      user: this.sanitizeUser(newUser),
      tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = Array.from(this.dataStore.users.values()).find(
      (u) => u.email.toLowerCase() === dto.email.toLowerCase(),
    );
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user);
    user.refreshToken = tokens.refreshToken;
    return {
      user: this.sanitizeUser(user),
      tokens,
    };
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

  private async generateTokens(user: UserEntity) {
    const payload = { sub: user.id, email: user.email, role: user.role, name: user.name };
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
    const { passwordHash, refreshToken, ...safe } = user;
    return safe;
  }
}
