import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type CompanyDocument = Company & Document;
export type JobDocument = Job & Document;
export type JobApplicationDocument = JobApplication & Document;
export type SavedJobDocument = SavedJob & Document;

@Schema({ timestamps: true, collection: 'companies' })
export class Company {
  @Prop({ required: true, trim: true, index: true })
  name: string;

  @Prop({ default: '' })
  logo: string;

  @Prop({ default: '' })
  domain: string;

  @Prop({ required: true, index: true })
  industry: string;

  @Prop({ default: '50-200' })
  size: string;

  @Prop({ default: 'San Francisco, CA' })
  location: string;

  @Prop({ default: true })
  verified: boolean;

  @Prop({ default: '' })
  about: string;

  @Prop({ default: 0 })
  openJobsCount: number;

  @Prop({ default: null, index: true })
  ownerUserId?: string;
}

export const CompanySchema = SchemaFactory.createForClass(Company);

@Schema({ timestamps: true, collection: 'jobs' })
export class Job {
  @Prop({ required: true, index: true })
  companyId: string;

  @Prop({ required: true })
  companyName: string;

  @Prop({ default: '' })
  companyLogo: string;

  @Prop({ required: true, trim: true, index: true })
  title: string;

  @Prop({ default: 'Engineering' })
  department: string;

  @Prop({ default: 'Remote' })
  location: string;

  @Prop({ required: true, enum: ['remote', 'hybrid', 'onsite'], default: 'remote', index: true })
  mode: string;

  @Prop({ default: '$110,000 - $150,000' })
  salaryRange: string;

  @Prop({ required: true, enum: ['Entry', 'Mid', 'Senior', 'Lead'], default: 'Mid', index: true })
  experienceLevel: string;

  @Prop({ type: [String], required: true, index: true })
  requiredSkills: string[];

  @Prop({ type: [String], default: [] })
  preferredSkills: string[];

  @Prop({ required: true })
  description: string;

  @Prop({ type: [String], default: [] })
  responsibilities: string[];

  @Prop({ type: [String], default: [] })
  requirements: string[];

  @Prop({ default: () => new Date(), index: true })
  postedAt: Date;

  @Prop({ default: 0 })
  applicantsCount: number;

  @Prop({
    default: 'published',
    enum: ['published', 'draft', 'closed'],
    index: true,
  })
  status: string;

  @Prop({ default: null, index: true })
  creatorUserId?: string;
}

export const JobSchema = SchemaFactory.createForClass(Job);
JobSchema.index({ title: 'text', description: 'text', requiredSkills: 'text' });
JobSchema.index({ status: 1, postedAt: -1 });

@Schema({ timestamps: true, collection: 'job_applications' })
export class JobApplication {
  @Prop({ required: true, index: true })
  jobId: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  candidateName: string;

  @Prop({ default: '' })
  candidateEmail: string;

  @Prop({ required: true })
  jobTitle: string;

  @Prop({ required: true })
  companyName: string;

  @Prop({ default: '' })
  companyId: string;

  @Prop({ default: 75, min: 0, max: 100, index: true })
  matchScore: number;

  @Prop({
    default: 'applied',
    enum: ['applied', 'screening', 'shortlisted', 'interview', 'final', 'hired', 'rejected'],
    index: true,
  })
  status: string;

  @Prop({ default: () => new Date(), index: true })
  appliedAt: Date;

  @Prop({ default: '' })
  notes?: string;

  @Prop({ default: '' })
  resumeUrl?: string;

  @Prop({ type: [String], default: [] })
  matchedSkills: string[];

  @Prop({ type: [String], default: [] })
  missingSkills: string[];
}

export const JobApplicationSchema = SchemaFactory.createForClass(JobApplication);
JobApplicationSchema.index({ userId: 1, jobId: 1 }, { unique: true });
JobApplicationSchema.index({ jobId: 1, status: 1 });

@Schema({ timestamps: true, collection: 'saved_jobs' })
export class SavedJob {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  jobId: string;

  @Prop({ default: () => new Date() })
  savedAt: Date;
}

export const SavedJobSchema = SchemaFactory.createForClass(SavedJob);
SavedJobSchema.index({ userId: 1, jobId: 1 }, { unique: true });

export type JobRequirementDocument = JobRequirement & Document;

@Schema({ timestamps: true, collection: 'job_requirements' })
export class JobRequirement {
  @Prop({ required: true, index: true })
  jobId: string;

  @Prop({ required: true })
  skillName: string;

  @Prop({ default: 75, min: 0, max: 100 })
  minimumProficiency: number;

  @Prop({ default: true })
  mandatory: boolean;

  @Prop({ default: 1 })
  weight: number;
}

export const JobRequirementSchema = SchemaFactory.createForClass(JobRequirement);
JobRequirementSchema.index({ jobId: 1, skillName: 1 });

export type CandidateMatchDocument = CandidateMatch & Document;

@Schema({ timestamps: true, collection: 'candidate_matches' })
export class CandidateMatch {
  @Prop({ required: true, index: true })
  jobId: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, min: 0, max: 100, index: true })
  overallScore: number;

  @Prop({ type: [String], default: [] })
  matchedSkills: string[];

  @Prop({ type: [String], default: [] })
  missingSkills: string[];

  @Prop({ default: '' })
  aiRationale: string;

  @Prop({ default: () => new Date(), index: true })
  calculatedAt: Date;
}

export const CandidateMatchSchema = SchemaFactory.createForClass(CandidateMatch);
CandidateMatchSchema.index({ jobId: 1, overallScore: -1 });
CandidateMatchSchema.index({ userId: 1, jobId: 1 }, { unique: true });

export type ShortlistDocument = Shortlist & Document;

@Schema({ timestamps: true, collection: 'shortlists' })
export class Shortlist {
  @Prop({ required: true, index: true })
  employerUserId: string;

  @Prop({ required: true, index: true })
  companyId: string;

  @Prop({ required: true, index: true })
  jobId: string;

  @Prop({ required: true, index: true })
  candidateUserId: string;

  @Prop({ default: '' })
  notes?: string;

  @Prop({ default: () => new Date() })
  addedAt: Date;
}

export const ShortlistSchema = SchemaFactory.createForClass(Shortlist);
ShortlistSchema.index({ employerUserId: 1, jobId: 1, candidateUserId: 1 }, { unique: true });

export type HiringPipelineDocument = HiringPipeline & Document;

@Schema({ timestamps: true, collection: 'hiring_pipelines' })
export class HiringPipeline {
  @Prop({ required: true, index: true })
  companyId: string;

  @Prop({ required: true, index: true })
  jobId: string;

  @Prop({ required: true, index: true })
  applicationId: string;

  @Prop({ required: true, index: true })
  candidateUserId: string;

  @Prop({
    required: true,
    enum: ['applied', 'screening', 'shortlisted', 'technical_interview', 'final_interview', 'offered', 'hired', 'rejected'],
    default: 'applied',
    index: true,
  })
  stage: string;

  @Prop({ type: [Object], default: [] })
  stageHistory: Array<{
    stage: string;
    changedAt: Date;
    changedByUserId: string;
    notes?: string;
  }>;
}

export const HiringPipelineSchema = SchemaFactory.createForClass(HiringPipeline);
HiringPipelineSchema.index({ companyId: 1, stage: 1 });
HiringPipelineSchema.index({ applicationId: 1 }, { unique: true });
