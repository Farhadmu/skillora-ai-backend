import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CourseDocument = Course & Document;
export type LearningResourceDocument = LearningResource & Document;
export type SavedResourceDocument = SavedResource & Document;
export type CohortDocument = Cohort & Document;
export type EnrollmentDocument = Enrollment & Document;

@Schema({ _id: false })
export class CourseLesson {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  title: string;

  @Prop({ default: 15 })
  durationMinutes: number;

  @Prop({ default: 'video', enum: ['video', 'article', 'interactive', 'quiz'] })
  type: string;

  @Prop({ default: '' })
  contentUrl?: string;

  @Prop({ default: '' })
  summary?: string;
}

export const CourseLessonSchema = SchemaFactory.createForClass(CourseLesson);

@Schema({ _id: false })
export class CourseModule {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  title: string;

  @Prop({ type: [CourseLessonSchema], default: [] })
  lessons: CourseLesson[];
}

export const CourseModuleSchema = SchemaFactory.createForClass(CourseModule);

@Schema({ timestamps: true, collection: 'courses' })
export class Course {
  @Prop({ index: true })
  id?: string;

  @Prop({ required: true, trim: true, index: true })
  title: string;

  @Prop({ default: null, index: true })
  educatorId?: string;

  @Prop({ required: true, default: 'Skillora Lead Faculty' })
  educatorName: string;

  @Prop({ required: true, index: true })
  domain: string;

  @Prop({ default: 'Intermediate', enum: ['Beginner', 'Intermediate', 'Advanced'] })
  level: string;

  @Prop({ default: 4.8, min: 0, max: 5 })
  rating: number;

  @Prop({ default: 0 })
  enrolledLearners: number;

  @Prop({ default: 6 })
  modulesCount: number;

  @Prop({ required: true })
  description: string;

  @Prop({ type: [CourseModuleSchema], default: [] })
  modules: CourseModule[];

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: 'published', enum: ['draft', 'published', 'archived'] })
  status: string;
}

export const CourseSchema = SchemaFactory.createForClass(Course);
CourseSchema.index({ title: 'text', description: 'text', tags: 'text' });

@Schema({ timestamps: true, collection: 'learning_resources' })
export class LearningResource {
  @Prop({ required: true, trim: true, index: true })
  title: string;

  @Prop({ required: true })
  url: string;

  @Prop({
    required: true,
    enum: ['article', 'video', 'documentation', 'interactive', 'book', 'course'],
    default: 'documentation',
  })
  type: string;

  @Prop({ required: true, index: true })
  category: string;

  @Prop({ required: true, index: true })
  skillName: string;

  @Prop({ default: 20 })
  estimatedMinutes: number;

  @Prop({ default: 'Intermediate', enum: ['Beginner', 'Intermediate', 'Advanced'] })
  difficulty: string;

  @Prop({ default: 4.8 })
  rating: number;
}

export const LearningResourceSchema = SchemaFactory.createForClass(LearningResource);
LearningResourceSchema.index({ skillName: 1, difficulty: 1 });

@Schema({ timestamps: true, collection: 'saved_resources' })
export class SavedResource {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  resourceId: string;

  @Prop({ default: () => new Date() })
  savedAt: Date;
}

export const SavedResourceSchema = SchemaFactory.createForClass(SavedResource);
SavedResourceSchema.index({ userId: 1, resourceId: 1 }, { unique: true });

@Schema({ timestamps: true, collection: 'cohorts' })
export class Cohort {
  @Prop({ index: true })
  id?: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, index: true })
  courseId: string;

  @Prop({ required: true })
  courseTitle: string;

  @Prop({ required: true, index: true })
  educatorId: string;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ default: 40 })
  capacity: number;

  @Prop({ default: 0 })
  enrolledCount: number;

  @Prop({ default: 'active', enum: ['upcoming', 'active', 'completed'] })
  status: string;
}

export const CohortSchema = SchemaFactory.createForClass(Cohort);

@Schema({ timestamps: true, collection: 'enrollments' })
export class Enrollment {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  studentName: string;

  @Prop({ required: true })
  studentEmail: string;

  @Prop({ required: true, index: true })
  courseId: string;

  @Prop({ default: null, index: true })
  cohortId?: string;

  @Prop({ default: 0, min: 0, max: 100 })
  progressPercent: number;

  @Prop({ default: 'active', enum: ['active', 'completed', 'dropped'] })
  status: string;

  @Prop({ default: () => new Date() })
  enrolledAt: Date;

  @Prop({ default: () => new Date() })
  lastActiveAt: Date;
}

export const EnrollmentSchema = SchemaFactory.createForClass(Enrollment);
EnrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true });

export type LearningProgressDocument = LearningProgress & Document;

@Schema({ timestamps: true, collection: 'learning_progress' })
export class LearningProgress {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  courseId: string;

  @Prop({ type: [String], default: [] })
  completedLessonIds: string[];

  @Prop({ default: '' })
  lastLessonId?: string;

  @Prop({ default: 0, min: 0, max: 100 })
  percentComplete: number;

  @Prop({ default: () => new Date(), index: true })
  lastStudiedAt: Date;
}

export const LearningProgressSchema = SchemaFactory.createForClass(LearningProgress);
LearningProgressSchema.index({ userId: 1, courseId: 1 }, { unique: true });

export type AssignmentDocument = Assignment & Document;
export type AssignmentSubmissionDocument = AssignmentSubmission & Document;

@Schema({ _id: false })
export class RubricCriterion {
  @Prop({ required: true })
  criteria: string;

  @Prop({ default: 25, min: 1 })
  maxPoints: number;

  @Prop({ default: '' })
  description?: string;
}

export const RubricCriterionSchema = SchemaFactory.createForClass(RubricCriterion);

@Schema({ timestamps: true, collection: 'assignments' })
export class Assignment {
  @Prop({ required: true, unique: true, index: true })
  id: string;

  @Prop({ required: true, index: true })
  educatorId: string;

  @Prop({ default: 'Skillora Lead Faculty' })
  educatorName: string;

  @Prop({ required: true, index: true })
  courseId: string;

  @Prop({ default: null, index: true })
  cohortId?: string;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, index: true })
  targetSkill: string;

  @Prop({ type: [RubricCriterionSchema], default: [] })
  rubric: RubricCriterion[];

  @Prop({ default: 100, min: 1 })
  totalPoints: number;

  @Prop({ default: null })
  dueDate?: Date;

  @Prop({ default: 'published', enum: ['draft', 'published', 'archived'], index: true })
  status: string;
}

export const AssignmentSchema = SchemaFactory.createForClass(Assignment);
AssignmentSchema.index({ courseId: 1, status: 1 });
AssignmentSchema.index({ educatorId: 1 });

@Schema({ timestamps: true, collection: 'assignment_submissions' })
export class AssignmentSubmission {
  @Prop({ required: true, unique: true, index: true })
  id: string;

  @Prop({ required: true, index: true })
  assignmentId: string;

  @Prop({ required: true })
  assignmentTitle: string;

  @Prop({ required: true, index: true })
  courseId: string;

  @Prop({ default: null, index: true })
  cohortId?: string;

  @Prop({ required: true, index: true })
  learnerId: string;

  @Prop({ required: true })
  learnerName: string;

  @Prop({ required: true })
  learnerEmail: string;

  @Prop({ required: true })
  content: string;

  @Prop({ default: '' })
  repositoryUrl?: string;

  @Prop({ default: 1 })
  submissionVersion: number;

  @Prop({
    default: 'submitted',
    enum: ['submitted', 'under_review', 'reviewed', 'revision_requested'],
    index: true,
  })
  status: string;

  @Prop({ default: null })
  score?: number;

  @Prop({ type: [Object], default: [] })
  rubricScores?: Array<{ criteria: string; pointsAwarded: number; feedback?: string }>;

  @Prop({ default: '' })
  feedback?: string;

  @Prop({ default: null, index: true })
  reviewerId?: string;

  @Prop({ default: null })
  reviewedAt?: Date;

  @Prop({ default: () => new Date() })
  submittedAt: Date;
}

export const AssignmentSubmissionSchema = SchemaFactory.createForClass(AssignmentSubmission);
AssignmentSubmissionSchema.index({ assignmentId: 1, learnerId: 1 });
AssignmentSubmissionSchema.index({ learnerId: 1, status: 1 });
