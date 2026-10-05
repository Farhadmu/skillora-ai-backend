import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type InterviewSessionDocument = InterviewSession & Document;
export type InterviewFeedbackDocument = InterviewFeedback & Document;

@Schema({ timestamps: true, collection: 'interview_sessions' })
export class InterviewSession {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  candidateName: string;

  @Prop({ required: true, index: true })
  targetRole: string;

  @Prop({
    required: true,
    enum: ['Technical', 'Behavioral', 'Coding', 'System Design', 'HR'],
    default: 'Technical',
  })
  interviewType: string;

  @Prop({
    default: 'Mid',
    enum: ['Entry', 'Mid', 'Senior', 'Lead'],
  })
  difficulty: string;

  @Prop({
    default: 'in_progress',
    enum: ['in_progress', 'completed', 'abandoned'],
    index: true,
  })
  status: string;

  @Prop({ type: [Object], default: [] })
  questions: Array<{
    id: string;
    prompt: string;
    followUps?: string[];
    expectedKeyPoints?: string[];
  }>;

  @Prop({ type: [Object], default: [] })
  exchanges: Array<{
    question: string;
    userAnswer: string;
    feedback: string;
    score: number;
    timestamp: Date;
  }>;

  @Prop({ default: 0 })
  currentQuestionIndex: number;

  @Prop({ default: () => new Date() })
  startedAt: Date;

  @Prop({ default: null })
  completedAt?: Date;
}

export const InterviewSessionSchema = SchemaFactory.createForClass(InterviewSession);

@Schema({ timestamps: true, collection: 'interview_feedback' })
export class InterviewFeedback {
  @Prop({ required: true, index: true })
  sessionId: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  targetRole: string;

  @Prop({ required: true, min: 0, max: 100 })
  overallScore: number;

  @Prop({ default: 70, min: 0, max: 100 })
  technicalAccuracy: number;

  @Prop({ default: 75, min: 0, max: 100 })
  communication: number;

  @Prop({ default: 70, min: 0, max: 100 })
  problemSolving: number;

  @Prop({ default: 80, min: 0, max: 100 })
  clarity: number;

  @Prop({ default: 75, min: 0, max: 100 })
  roleAlignment: number;

  @Prop({ type: [String], default: [] })
  strengths: string[];

  @Prop({ type: [String], default: [] })
  weaknesses: string[];

  @Prop({ type: [String], default: [] })
  recommendedPractice: string[];

  @Prop({ default: 'Mid-Level' })
  nextInterviewLevel: string;

  @Prop({ default: () => new Date() })
  completedAt: Date;
}

export const InterviewFeedbackSchema = SchemaFactory.createForClass(InterviewFeedback);
InterviewFeedbackSchema.index({ userId: 1, completedAt: -1 });
