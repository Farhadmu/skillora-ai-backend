import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CareerGoalDocument = CareerGoal & Document;
export type CareerRecommendationDocument = CareerRecommendation & Document;
export type SkillGapDocument = SkillGap & Document;

@Schema({ timestamps: true, collection: 'career_goals' })
export class CareerGoal {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, trim: true })
  targetRole: string;

  @Prop({ default: 'Technology & AI' })
  targetIndustry: string;

  @Prop({ default: '$90,000 - $140,000' })
  targetSalary: string;

  @Prop({ default: '6 months', enum: ['3 months', '6 months', '12 months', '24 months'] })
  timeframe: string;

  @Prop({ default: 'Worldwide Remote' })
  preferredLocation: string;

  @Prop({ default: 'remote', enum: ['remote', 'hybrid', 'onsite'] })
  remotePreference: string;

  @Prop({ default: 'active', enum: ['active', 'achieved', 'paused'] })
  status: string;
}

export const CareerGoalSchema = SchemaFactory.createForClass(CareerGoal);
CareerGoalSchema.index({ userId: 1, status: 1 });

@Schema({ timestamps: true, collection: 'career_recommendations' })
export class CareerRecommendation {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  roleTitle: string;

  @Prop({ required: true, min: 0, max: 100 })
  matchScore: number;

  @Prop({ default: 'High', enum: ['Exploding', 'High', 'Moderate'] })
  marketDemand: string;

  @Prop({ default: '$100k - $160k' })
  salaryRange: string;

  @Prop({ required: true })
  whyThisCareer: string;

  @Prop({ required: true })
  whyNow: string;

  @Prop({ type: [String], default: [] })
  transferableSkills: string[];

  @Prop({ type: [String], default: [] })
  missingSkills: string[];

  @Prop({ type: [String], default: [] })
  recommendedNextSteps: string[];

  @Prop({ default: 85, min: 0, max: 100 })
  confidenceScore: number;
}

export const CareerRecommendationSchema = SchemaFactory.createForClass(CareerRecommendation);
CareerRecommendationSchema.index({ userId: 1, matchScore: -1 });

@Schema({ _id: false })
export class SkillGapItem {
  @Prop({ required: true })
  skillName: string;

  @Prop({ default: 0, min: 0, max: 100 })
  currentProficiency: number;

  @Prop({ required: true, min: 0, max: 100 })
  targetProficiency: number;

  @Prop({ required: true, min: 0, max: 100 })
  gapDistance: number;

  @Prop({ required: true, enum: ['Critical', 'High', 'Moderate', 'Low'] })
  priority: string;

  @Prop({ type: [String], default: [] })
  prerequisites: string[];

  @Prop({ default: 10 })
  estimatedHours: number;
}

export const SkillGapItemSchema = SchemaFactory.createForClass(SkillGapItem);

@Schema({ timestamps: true, collection: 'skill_gaps' })
export class SkillGap {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  targetRole: string;

  @Prop({ default: 60, min: 0, max: 100 })
  readinessScore: number;

  @Prop({ default: 40, min: 0, max: 100 })
  overallGapPercentage: number;

  @Prop({ type: [SkillGapItemSchema], default: [] })
  criticalGaps: SkillGapItem[];

  @Prop({ type: [String], default: [] })
  learningSequence: string[];

  @Prop({ default: () => new Date() })
  calculatedAt: Date;
}

export const SkillGapSchema = SchemaFactory.createForClass(SkillGap);
SkillGapSchema.index({ userId: 1, targetRole: 1 });

export type CareerDocument = Career & Document;

@Schema({ timestamps: true, collection: 'careers' })
export class Career {
  @Prop({ required: true, unique: true, trim: true, index: true })
  title: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  slug: string;

  @Prop({ required: true, index: true })
  domain: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: [String], required: true, index: true })
  coreSkills: string[];

  @Prop({ default: 85, min: 0, max: 100 })
  marketDemandScore: number;

  @Prop({ default: '$100,000 - $160,000' })
  averageSalaryRange: string;

  @Prop({ type: [String], default: [] })
  entryRequirements: string[];
}

export const CareerSchema = SchemaFactory.createForClass(Career);
CareerSchema.index({ title: 'text', description: 'text', coreSkills: 'text' });

export type CareerPathDocument = CareerPath & Document;

@Schema({ timestamps: true, collection: 'career_paths' })
export class CareerPath {
  @Prop({ required: true, index: true })
  fromRole: string;

  @Prop({ required: true, index: true })
  toRole: string;

  @Prop({ default: 'Moderate', enum: ['Easy', 'Moderate', 'Challenging', 'Pivot'] })
  transitionDifficulty: string;

  @Prop({ type: [String], default: [] })
  requiredNewSkills: string[];

  @Prop({ default: 4 })
  estimatedMonths: number;

  @Prop({ default: '' })
  roadmapSummary: string;
}

export const CareerPathSchema = SchemaFactory.createForClass(CareerPath);
CareerPathSchema.index({ fromRole: 1, toRole: 1 });
