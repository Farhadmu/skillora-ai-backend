import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Role } from '../../common/enums/roles.enum';

export type UserDocument = User & Document;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true, unique: true, index: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, enum: Role, default: Role.LEARNER, index: true })
  role: Role;

  @Prop({ default: '' })
  avatar: string;

  @Prop({ default: '' })
  headline: string;

  @Prop({ default: false, index: true })
  isVerified: boolean;

  @Prop({ default: null, index: true })
  verificationTokenHash?: string;

  @Prop({ default: null })
  verificationTokenExpires?: Date;

  @Prop({ default: null, index: true })
  passwordResetTokenHash?: string;

  @Prop({ default: null })
  passwordResetExpires?: Date;

  @Prop({ default: null })
  refreshTokenHash?: string;

  // Role-specific onboarding fields
  @Prop({ default: '' })
  country?: string;

  @Prop({ default: '' })
  educationLevel?: string;

  @Prop({ default: '' })
  careerInterest?: string;

  @Prop({ default: '' })
  institution?: string;

  @Prop({ default: '' })
  teachingArea?: string;

  @Prop({ default: 0 })
  experienceYears?: number;

  @Prop({ default: '' })
  companyName?: string;

  @Prop({ default: '' })
  companySize?: string;

  @Prop({ default: '' })
  industry?: string;

  @Prop({ default: '' })
  jobTitle?: string;

  @Prop({ default: 'active', enum: ['active', 'suspended', 'deactivated'], index: true })
  status: string;

  @Prop({ default: null })
  lastLoginAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ email: 1, role: 1 });
UserSchema.index({ status: 1, createdAt: -1 });
