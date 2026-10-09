import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SkillDocument = Skill & Document;
export type SkillEvidenceDocument = SkillEvidence & Document;

@Schema({ timestamps: true, collection: 'skills' })
export class Skill {
  @Prop({ index: true })
  id?: string;

  @Prop({ required: true, unique: true, trim: true, index: true })
  name: string;

  @Prop({ trim: true, lowercase: true, sparse: true, index: true })
  slug?: string;

  @Prop({ required: true, index: true })
  category: string;

  @Prop({ default: 'General' })
  subcategory: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ default: 'Intermediate', enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'] })
  difficulty: string;

  @Prop({ type: [String], default: [] })
  prerequisites: string[];

  @Prop({ type: [String], default: [] })
  relatedSkills: string[];

  @Prop({ type: [String], default: [] })
  roles: string[];

  @Prop({ type: [String], default: [] })
  industries: string[];

  @Prop({ default: 80, min: 0, max: 100 })
  industryDemandScore: number;

  @Prop({ default: 'High', enum: ['Exploding', 'High', 'Steady', 'Declining'] })
  marketTrend: string;

  @Prop({ type: [Object], default: [] })
  learningResources: Array<{
    title: string;
    url: string;
    type: 'article' | 'video' | 'documentation' | 'interactive';
  }>;
}

export const SkillSchema = SchemaFactory.createForClass(Skill);
SkillSchema.index({ name: 'text', description: 'text', category: 'text' });
SkillSchema.index({ category: 1, industryDemandScore: -1 });

@Schema({ timestamps: true, collection: 'skill_evidence' })
export class SkillEvidence {
  @Prop({ index: true })
  id?: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  skillId: string;

  @Prop({ required: true })
  skillName: string;

  @Prop({
    required: true,
    enum: ['ASSESSMENT', 'PROJECT', 'CODE_REVIEW', 'INTERVIEW', 'GITHUB_COMMIT', 'WORK_HISTORY'],
  })
  evidenceType: string;

  @Prop({ required: true })
  title: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ default: null })
  score?: number;

  @Prop({ default: '' })
  referenceUrl?: string;

  @Prop({ default: true })
  verified: boolean;

  @Prop({
    default: 'VERIFIED',
    enum: ['DECLARED', 'PRACTICED', 'ASSESSED', 'PROJECT_DEMONSTRATED', 'VERIFIED'],
    index: true,
  })
  status: string;

  @Prop({ default: 'Skillora Assessment Engine' })
  issuer: string;
}


export const SkillEvidenceSchema = SchemaFactory.createForClass(SkillEvidence);
SkillEvidenceSchema.index({ userId: 1, skillName: 1 });

export type UserSkillDocument = UserSkill & Document;

@Schema({ timestamps: true, collection: 'user_skills' })
export class UserSkill {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  skillId: string;

  @Prop({ required: true, trim: true, index: true })
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
    index: true,
  })
  source: string;

  @Prop({ default: false, index: true })
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

export const UserSkillSchema = SchemaFactory.createForClass(UserSkill);
UserSkillSchema.index({ userId: 1, skillId: 1 }, { unique: true });
UserSkillSchema.index({ userId: 1, verified: 1 });
