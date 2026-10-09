import { Module, Global, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MongooseModule, InjectModel } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import {
  User, UserSchema,
  Session, SessionSchema,
  Profile, ProfileSchema,
  Skill, SkillSchema, SkillDocument,
  SkillEvidence, SkillEvidenceSchema,
  UserSkill, UserSkillSchema,
  Career, CareerSchema,
  CareerGoal, CareerGoalSchema,
  CareerPath, CareerPathSchema,
  CareerRecommendation, CareerRecommendationSchema,
  SkillGap, SkillGapSchema,
  Company, CompanySchema, CompanyDocument,
  Job, JobSchema, JobDocument,
  JobRequirement, JobRequirementSchema,
  JobApplication, JobApplicationSchema,
  SavedJob, SavedJobSchema,
  CandidateMatch, CandidateMatchSchema,
  Shortlist, ShortlistSchema,
  HiringPipeline, HiringPipelineSchema,
  Course, CourseSchema, CourseDocument,
  LearningResource, LearningResourceSchema,
  SavedResource, SavedResourceSchema,
  Cohort, CohortSchema,
  Enrollment, EnrollmentSchema,
  Assignment, AssignmentSchema,
  AssignmentSubmission, AssignmentSubmissionSchema,
  InterviewInvitation, InterviewInvitationSchema,
  LearningProgress, LearningProgressSchema,
  Roadmap, RoadmapSchema,
  Assessment, AssessmentSchema, AssessmentDocument,
  AssessmentAttempt, AssessmentAttemptSchema,
  Project, ProjectSchema, ProjectDocument,
  ProjectSubmission, ProjectSubmissionSchema,
  ProjectTask, ProjectTaskSchema,
  CodeReview, CodeReviewSchema,
  Portfolio, PortfolioSchema,
  Achievement, AchievementSchema,
  Certificate, CertificateSchema,
  GitHubConnection, GitHubConnectionSchema,
  Interview, InterviewSchema,
  InterviewSession, InterviewSessionSchema,
  InterviewFeedback, InterviewFeedbackSchema,
  Notification, NotificationSchema,
  Conversation, ConversationSchema,
  Message, MessageSchema,
  AnalyticsEvent, AnalyticsEventSchema,
  AIUsage, AIUsageSchema,
  AuditLog, AuditLogSchema,
  Subscription, SubscriptionSchema,
  KnowledgeDocument, KnowledgeDocumentSchema,
  KnowledgeChunk, KnowledgeChunkSchema,
} from './schemas';
import {
  SEED_COMPANIES,
  SEED_SKILLS,
  SEED_JOBS,
  SEED_ASSESSMENTS,
  SEED_COURSES,
  SEED_PROJECTS,
} from './seed-data';

const FEATURE_SCHEMAS = [
  { name: User.name, schema: UserSchema },
  { name: Session.name, schema: SessionSchema },
  { name: Profile.name, schema: ProfileSchema },
  { name: Skill.name, schema: SkillSchema },
  { name: SkillEvidence.name, schema: SkillEvidenceSchema },
  { name: UserSkill.name, schema: UserSkillSchema },
  { name: Career.name, schema: CareerSchema },
  { name: CareerGoal.name, schema: CareerGoalSchema },
  { name: CareerPath.name, schema: CareerPathSchema },
  { name: CareerRecommendation.name, schema: CareerRecommendationSchema },
  { name: SkillGap.name, schema: SkillGapSchema },
  { name: Company.name, schema: CompanySchema },
  { name: Job.name, schema: JobSchema },
  { name: JobRequirement.name, schema: JobRequirementSchema },
  { name: JobApplication.name, schema: JobApplicationSchema },
  { name: SavedJob.name, schema: SavedJobSchema },
  { name: CandidateMatch.name, schema: CandidateMatchSchema },
  { name: Shortlist.name, schema: ShortlistSchema },
  { name: HiringPipeline.name, schema: HiringPipelineSchema },
  { name: Course.name, schema: CourseSchema },
  { name: LearningResource.name, schema: LearningResourceSchema },
  { name: SavedResource.name, schema: SavedResourceSchema },
  { name: Cohort.name, schema: CohortSchema },
  { name: Enrollment.name, schema: EnrollmentSchema },
  { name: Assignment.name, schema: AssignmentSchema },
  { name: AssignmentSubmission.name, schema: AssignmentSubmissionSchema },
  { name: InterviewInvitation.name, schema: InterviewInvitationSchema },
  { name: LearningProgress.name, schema: LearningProgressSchema },
  { name: Roadmap.name, schema: RoadmapSchema },
  { name: Assessment.name, schema: AssessmentSchema },
  { name: AssessmentAttempt.name, schema: AssessmentAttemptSchema },
  { name: Project.name, schema: ProjectSchema },
  { name: ProjectSubmission.name, schema: ProjectSubmissionSchema },
  { name: ProjectTask.name, schema: ProjectTaskSchema },
  { name: CodeReview.name, schema: CodeReviewSchema },
  { name: Portfolio.name, schema: PortfolioSchema },
  { name: Achievement.name, schema: AchievementSchema },
  { name: Certificate.name, schema: CertificateSchema },
  { name: GitHubConnection.name, schema: GitHubConnectionSchema },
  { name: Interview.name, schema: InterviewSchema },
  { name: InterviewSession.name, schema: InterviewSessionSchema },
  { name: InterviewFeedback.name, schema: InterviewFeedbackSchema },
  { name: Notification.name, schema: NotificationSchema },
  { name: Conversation.name, schema: ConversationSchema },
  { name: Message.name, schema: MessageSchema },
  { name: AnalyticsEvent.name, schema: AnalyticsEventSchema },
  { name: AIUsage.name, schema: AIUsageSchema },
  { name: AuditLog.name, schema: AuditLogSchema },
  { name: Subscription.name, schema: SubscriptionSchema },
  { name: KnowledgeDocument.name, schema: KnowledgeDocumentSchema },
  { name: KnowledgeChunk.name, schema: KnowledgeChunkSchema },
];

@Injectable()
export class CatalogInitializerService implements OnModuleInit {
  private readonly logger = new Logger(CatalogInitializerService.name);

  constructor(
    @InjectModel(Skill.name) private readonly skillModel: Model<SkillDocument>,
    @InjectModel(Assessment.name) private readonly assessmentModel: Model<AssessmentDocument>,
    @InjectModel(Project.name) private readonly projectModel: Model<ProjectDocument>,
    @InjectModel(Course.name) private readonly courseModel: Model<CourseDocument>,
    @InjectModel(Job.name) private readonly jobModel: Model<JobDocument>,
    @InjectModel(Company.name) private readonly companyModel: Model<CompanyDocument>,
  ) {}

  async onModuleInit() {
    try {
      const skillsCount = await this.skillModel.countDocuments();
      if (skillsCount === 0) {
        this.logger.log('Initializing reference catalog taxonomy in MongoDB...');
        for (const s of SEED_SKILLS) {
          const slug = (s as any).slug || s.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
          await this.skillModel.updateOne({ name: s.name }, { $set: { ...s, slug } }, { upsert: true });
        }
        for (const a of SEED_ASSESSMENTS) {
          await this.assessmentModel.updateOne({ id: a.id }, { $set: a }, { upsert: true });
        }
        for (const p of SEED_PROJECTS) {
          await this.projectModel.updateOne({ id: p.id }, { $set: p }, { upsert: true });
        }
        for (const c of SEED_COURSES) {
          await this.courseModel.updateOne({ id: c.id }, { $set: c }, { upsert: true });
        }
        for (const j of SEED_JOBS) {
          await this.jobModel.updateOne({ id: j.id }, { $set: j }, { upsert: true });
        }
        for (const cp of SEED_COMPANIES) {
          await this.companyModel.updateOne({ id: cp.id }, { $set: cp }, { upsert: true });
        }
        this.logger.log('Reference catalog taxonomy (skills, assessments, projects, courses) initialized in MongoDB.');
      }
    } catch (err: any) {
      this.logger.warn(`Catalog taxonomy check failed: ${err.message}`);
    }
  }
}

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const uri = config.get<string>('MONGODB_URI') || 'mongodb://127.0.0.1:27017/skillora';
        return {
          uri,
          serverSelectionTimeoutMS: 5000,
        };
      },
    }),
    MongooseModule.forFeature(FEATURE_SCHEMAS),
  ],
  providers: [CatalogInitializerService],
  exports: [MongooseModule],
})
export class DatabaseModule {}
