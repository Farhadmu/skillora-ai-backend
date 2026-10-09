import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { User, UserDocument } from '../../database/schemas/user.schema';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret || jwtSecret.length < 32 || jwtSecret.includes('skillora_super_secret')) {
      throw new Error('FATAL: Strong JWT_SECRET must be configured in environment');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: any) {
    const query: any[] = [{ id: payload.sub }];
    if (isValidObjectId(payload.sub)) {
      query.push({ _id: payload.sub });
    }

    const user = await this.userModel.findOne({ $or: query }).lean();
    if (!user) {
      throw new UnauthorizedException('Token refers to a non-existent user account');
    }

    return {
      id: user.id || (user as any)._id?.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
      companyName: user.companyName,
    };
  }
}
