import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProjectDocument = Project & Document;
export type ProjectSubmissionDocument = ProjectSubmission & Document;
export type CodeReviewDocument = CodeReview & Document;
export type PortfolioDocument = Portfolio & Document;
export type AchievementDocument = Achievement & Document;
export type CertificateDocument = Certificate & Document;

@Schema({ timestamps: true, collection: 'projects' })
export class Project {
  @Prop({ index: true })
  id?: string;

  @Prop({ required: true, trim: true, index: true })
  title: string;

  @Prop({ required: true, index: true })
  category: string;

  @Prop({
    required: true,
    enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
    default: 'Intermediate',
  })
  difficulty: string;

  @Prop({ type: [String], required: true, index: true })
  targetSkills: string[];

  @Prop({ required: true })
  brief: string;

  @Prop({ default: '' })
  architecture: string;

  @Prop({ type: [String], default: [] })
  milestones: string[];

  @Prop({ type: [String], default: [] })
  techStack: string[];

  @Prop({ default: 15 })
  estimatedHours: number;

  @Prop({ default: '' })
  starterGithubRepo?: string;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);

@Schema({ timestamps: true, collection: 'project_submissions' })
export class ProjectSubmission {
  @Prop({ required: true, index: true })
  projectId: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  projectTitle: string;

  @Prop({ required: true })
  githubRepoUrl: string;

  @Prop({ default: '' })
  liveDemoUrl?: string;

  @Prop({ default: '' })
  notes?: string;

  @Prop({
    default: 'submitted',
    enum: ['submitted', 'under_review', 'approved', 'needs_revision'],
    index: true,
  })
  status: string;

  @Prop({ default: () => new Date(), index: true })
  submittedAt: Date;
}

export const ProjectSubmissionSchema = SchemaFactory.createForClass(ProjectSubmission);
ProjectSubmissionSchema.index({ userId: 1, projectId: 1 });

@Schema({ timestamps: true, collection: 'code_reviews' })
export class CodeReview {
  @Prop({ required: true, index: true })
  submissionId: string;

  @Prop({ required: true, index: true })
  projectId: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ default: 'AI_ARCHITECT', enum: ['AI_ARCHITECT', 'FACULTY'] })
  reviewerType: string;

  @Prop({ required: true, min: 0, max: 100 })
  overallScore: number;

  @Prop({ type: Object, default: {} })
  categories: {
    correctness: number;
    quality: number;
    architecture: number;
    readability: number;
    scalability: number;
    testing: number;
    documentation: number;
  };

  @Prop({ required: true })
  feedback: string;

  @Prop({ type: [String], default: [] })
  suggestions: string[];

  @Prop({ type: [String], default: [] })
  securityRisks: string[];

  @Prop({ default: () => new Date() })
  reviewedAt: Date;
}

export const CodeReviewSchema = SchemaFactory.createForClass(CodeReview);

@Schema({ timestamps: true, collection: 'portfolios' })
export class Portfolio {
  @Prop({ required: true, unique: true, index: true })
  userId: string;

  @Prop({ required: true, unique: true, index: true, lowercase: true, trim: true })
  slug: string;

  @Prop({ required: true })
  title: string;

  @Prop({ default: '' })
  bio: string;

  @Prop({ default: true })
  isPublic: boolean;

  @Prop({ type: [String], default: [] })
  featuredProjects: string[];

  @Prop({ type: [String], default: [] })
  verifiedSkills: string[];
}

export const PortfolioSchema = SchemaFactory.createForClass(Portfolio);

@Schema({ timestamps: true, collection: 'achievements' })
export class Achievement {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  badgeCode: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ default: 'Award' })
  icon: string;

  @Prop({ default: () => new Date() })
  unlockedAt: Date;
}

export const AchievementSchema = SchemaFactory.createForClass(Achievement);
AchievementSchema.index({ userId: 1, badgeCode: 1 }, { unique: true });

@Schema({ timestamps: true, collection: 'certificates' })
export class Certificate {
  @Prop({ required: true, unique: true, index: true })
  certificateId: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  recipientName: string;

  @Prop({ required: true })
  title: string;

  @Prop({ default: 'Skillora AI Verification Authority' })
  issuer: string;

  @Prop({ default: () => new Date() })
  issueDate: Date;

  @Prop({ required: true })
  verificationUrl: string;

  @Prop({ type: [String], default: [] })
  skillsCredentialed: string[];
}

export const CertificateSchema = SchemaFactory.createForClass(Certificate);

export type ProjectTaskDocument = ProjectTask & Document;

@Schema({ timestamps: true, collection: 'project_tasks' })
export class ProjectTask {
  @Prop({ required: true, index: true })
  projectId: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ default: 1 })
  order: number;

  @Prop({ default: 60 })
  estimatedMinutes: number;

  @Prop({ default: '' })
  validationCriteria: string;
}

export const ProjectTaskSchema = SchemaFactory.createForClass(ProjectTask);
ProjectTaskSchema.index({ projectId: 1, order: 1 });

export type GitHubConnectionDocument = GitHubConnection & Document;

@Schema({ timestamps: true, collection: 'github_connections' })
export class GitHubConnection {
  @Prop({ required: true, unique: true, index: true })
  userId: string;

  @Prop({ required: true, trim: true })
  githubUsername: string;

  @Prop({ default: '' })
  accessToken?: string;

  @Prop({ type: [Object], default: [] })
  syncedRepos: Array<{
    repoName: string;
    repoUrl: string;
    stars: number;
    primaryLanguage: string;
    lastSyncedAt: Date;
    verifiedSkills: string[];
  }>;

  @Prop({ default: 0 })
  totalCommitsVerified: number;

  @Prop({ default: () => new Date() })
  lastSyncedAt: Date;
}

export const GitHubConnectionSchema = SchemaFactory.createForClass(GitHubConnection);
