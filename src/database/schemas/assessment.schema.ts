import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type AssessmentDocument = Assessment & Document;
export type AssessmentAttemptDocument = AssessmentAttempt & Document;

@Schema({ _id: false })
export class AssessmentQuestion {
  @Prop({ required: true })
  id: string;

  @Prop({
    required: true,
    enum: ['mcq', 'multiple_select', 'coding', 'scenario', 'short_answer', 'conceptual'],
    default: 'mcq',
  })
  type: string;

  @Prop({ required: true })
  prompt: string;

  @Prop({ type: [String], default: [] })
  options?: string[];

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  correctAnswer: any;

  @Prop({ default: '' })
  explanation: string;

  @Prop({ default: '' })
  starterCode?: string;

  @Prop({ default: 10 })
  points: number;

  @Prop({ default: 'Apply', enum: ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'] })
  bloomsLevel: string;
}

export const AssessmentQuestionSchema = SchemaFactory.createForClass(AssessmentQuestion);

@Schema({ timestamps: true, collection: 'assessments' })
export class Assessment {
  @Prop({ index: true })
  id?: string;

  @Prop({ required: true, trim: true, index: true })
  title: string;

  @Prop({ required: true, index: true })
  category: string;

  @Prop({ required: true, index: true })
  skillName: string;

  @Prop({
    required: true,
    enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
    default: 'Intermediate',
    index: true,
  })
  difficulty: string;

  @Prop({ default: 20 })
  durationMinutes: number;

  @Prop({ default: 70 })
  passingScore: number;

  @Prop({ default: 5 })
  questionsCount: number;

  @Prop({ type: [AssessmentQuestionSchema], default: [] })
  questions: AssessmentQuestion[];

  @Prop({ default: null, index: true })
  educatorId?: string;

  @Prop({ default: true })
  isVerified: boolean;
}

export const AssessmentSchema = SchemaFactory.createForClass(Assessment);
AssessmentSchema.index({ skillName: 1, difficulty: 1 });

@Schema({ timestamps: true, collection: 'assessment_attempts' })
export class AssessmentAttempt {
  @Prop({ index: true })
  id?: string;

  @Prop({ required: true, index: true })
  assessmentId: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  assessmentTitle: string;

  @Prop({ required: true, index: true })
  skillName: string;

  @Prop({ required: true, min: 0, max: 100, index: true })
  score: number;

  @Prop({ required: true, index: true })
  passed: boolean;

  @Prop({ required: true })
  totalQuestions: number;

  @Prop({ required: true })
  correctAnswers: number;

  @Prop({ default: 0 })
  timeSpentSeconds: number;

  @Prop({ type: [Object], default: [] })
  answers: Array<{
    questionId: string;
    userAnswer: any;
    isCorrect: boolean;
    feedback: string;
  }>;

  @Prop({ type: [String], default: [] })
  misconceptions: string[];

  @Prop({ default: () => new Date(), index: true })
  completedAt: Date;
}

export const AssessmentAttemptSchema = SchemaFactory.createForClass(AssessmentAttempt);
AssessmentAttemptSchema.index({ userId: 1, skillName: 1, completedAt: -1 });
