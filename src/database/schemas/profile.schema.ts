import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type ProfileDocument = Profile & Document;

@Schema({ _id: false })
export class ProfileSkill {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ default: 'General' })
  category: string;

  @Prop({ default: 0, min: 0, max: 100 })
  proficiency: number;

  @Prop({ default: 0, min: 0, max: 100 })
  confidence: number;

  @Prop({
    default: 'SELF-DECLARED',
    enum: ['SELF-DECLARED', 'AI-INFERRED', 'ASSESSMENT-VERIFIED', 'PROJECT-VERIFIED'],
  })
  source: string;

  @Prop({ default: false })
  verified: boolean;

  @Prop({ type: [String], default: [] })
  evidence: string[];

  @Prop({ default: null })
  assessmentScore?: number;

  @Prop({ default: null })
  lastAssessedAt?: Date;

  @Prop({ default: 0, min: 0, max: 100 })
  learningProgress: number;
}

export const ProfileSkillSchema = SchemaFactory.createForClass(ProfileSkill);

@Schema({ _id: false })
export class ReadinessDimensions {
  @Prop({ default: 60, min: 0, max: 100 })
  technical: number;

  @Prop({ default: 60, min: 0, max: 100 })
  problemSolving: number;

  @Prop({ default: 55, min: 0, max: 100 })
  projects: number;

  @Prop({ default: 65, min: 0, max: 100 })
  communication: number;

  @Prop({ default: 50, min: 0, max: 100 })
  interview: number;

  @Prop({ default: 60, min: 0, max: 100 })
  roleAlignment: number;

  @Prop({ default: 55, min: 0, max: 100 })
  practical: number;
}

export const ReadinessDimensionsSchema = SchemaFactory.createForClass(ReadinessDimensions);

@Schema({ timestamps: true, collection: 'profiles' })
export class Profile {
  @Prop({ required: true, unique: true, index: true })
  userId: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, lowercase: true, trim: true })
  email: string;

  @Prop({ default: '' })
  headline: string;

  @Prop({ default: '' })
  bio: string;

  @Prop({ default: '' })
  degree: string;

  @Prop({ default: '' })
  institution: string;

  @Prop({ default: '2025' })
  graduationYear: string;

  @Prop({ default: 'Full-Stack Software Engineer', index: true })
  targetRole: string;

  @Prop({ type: [String], default: [] })
  targetCompanies: string[];

  @Prop({ default: 'remote', enum: ['remote', 'hybrid', 'onsite'] })
  preferredMode: string;

  @Prop({ default: 15 })
  weeklyHours: number;

  @Prop({ default: 60, min: 0, max: 100, index: true })
  readinessScore: number;

  @Prop({ default: 45, min: 0, max: 100 })
  completenessScore: number;

  @Prop({ type: [ProfileSkillSchema], default: [] })
  skills: ProfileSkill[];

  @Prop({ default: '' })
  githubUrl?: string;

  @Prop({ default: '' })
  portfolioUrl?: string;

  @Prop({ default: '' })
  linkedinUrl?: string;

  @Prop({ default: '' })
  resumeUrl?: string;

  @Prop({ default: null })
  activeRoadmapId?: string;

  @Prop({ type: ReadinessDimensionsSchema, default: () => ({}) })
  readinessDimensions: ReadinessDimensions;

  @Prop({ type: [Object], default: [] })
  education: Array<{
    institution: string;
    degree: string;
    fieldOfStudy: string;
    startYear: string;
    endYear: string;
  }>;

  @Prop({ type: [Object], default: [] })
  experience: Array<{
    company: string;
    role: string;
    duration: string;
    highlights: string[];
  }>;
}

export const ProfileSchema = SchemaFactory.createForClass(Profile);
ProfileSchema.index({ targetRole: 1, readinessScore: -1 });
ProfileSchema.index({ 'skills.name': 1 });
