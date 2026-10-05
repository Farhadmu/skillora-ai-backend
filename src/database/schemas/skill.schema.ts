import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SkillDocument = Skill & Document;
export type SkillEvidenceDocument = SkillEvidence & Document;

@Schema({ timestamps: true, collection: 'skills' })
export class Skill {
  @Prop({ required: true, unique: true, trim: true, index: true })
  name: string;

  @Prop({ required: true, unique: true, trim: true, lowercase: true, index: true })
  slug: string;

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

  @Prop({ default: 'Skillora Assessment Engine' })
  issuer: string;
}

export const SkillEvidenceSchema = SchemaFactory.createForClass(SkillEvidence);
SkillEvidenceSchema.index({ userId: 1, skillName: 1 });
