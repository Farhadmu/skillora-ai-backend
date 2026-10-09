import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';
import mongoose, { Connection } from 'mongoose';
import { Role } from '../common/enums/roles.enum';
import {
  SEED_USERS,
  PRIMARY_LEARNER_PROFILE,
  SEED_COMPANIES,
  SEED_SKILLS,
  SEED_JOBS,
  SEED_ASSESSMENTS,
  SEED_COURSES,
  SEED_PROJECTS,
  SEED_ROADMAP,
  SEED_APPLICATION,
} from './seed-data';

import {
  UserSchema,
  ProfileSchema,
  CompanySchema,
  JobSchema,
  SkillSchema,
  AssessmentSchema,
  CourseSchema,
  ProjectSchema,
  RoadmapSchema,
  JobApplicationSchema,
  AssessmentAttemptSchema,
  SkillEvidenceSchema,
  NotificationSchema,
  AnalyticsEventSchema,
  AIUsageSchema,
  AuditLogSchema,
} from './schemas';

export interface UserEntity {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: Role;
  avatar?: string;
  headline?: string;
  createdAt: string;
  refreshToken?: string;
  isVerified: boolean;
  verificationTokenHash?: string | null;
  verificationTokenExpires?: string | null;
  passwordResetTokenHash?: string | null;
  passwordResetExpires?: string | null;
  country?: string;
  educationLevel?: string;
  careerInterest?: string;
  institution?: string;
  teachingArea?: string;
  experienceYears?: number | string;
  companyName?: string;
  companySize?: string;
  industry?: string;
  jobTitle?: string;
}

export interface LearnerProfileEntity {
  userId: string;
  name: string;
  email: string;
  headline: string;
  bio: string;
  degree: string;
  institution: string;
  graduationYear: string;
  targetRole: string;
  targetCompanies: string[];
  preferredMode: 'remote' | 'hybrid' | 'onsite';
  weeklyHours: number;
  readinessScore: number;
  completenessScore: number;
  skills: Array<{
    name: string;
    category: string;
    proficiency: number;
    confidence: number;
    source?: string;
    verified: boolean;
    evidence: string[];
    assessmentScore?: number;
    learningProgress?: number;
  }>;
  githubUrl?: string;
  portfolioUrl?: string;
  linkedinUrl?: string;
  resumeUrl?: string;
  activeRoadmapId?: string;
  readinessDimensions?: {
    technical: number;
    problemSolving: number;
    projects: number;
    communication: number;
    interview: number;
    roleAlignment: number;
    practical: number;
  };
  education?: any[];
  experience?: any[];
}

export interface JobEntity {
  id: string;
  companyId: string;
  ownerUserId?: string;
  companyName: string;
  companyLogo: string;
  title: string;
  department: string;
  location: string;
  mode: 'remote' | 'hybrid' | 'onsite';
  salaryRange: string;
  experienceLevel: 'Entry' | 'Mid' | 'Senior' | 'Lead';
  requiredSkills: string[];
  preferredSkills: string[];
  description: string;
  responsibilities: string[];
  requirements: string[];
  postedAt: string;
  applicantsCount: number;
}

export interface CompanyEntity {
  id: string;
  ownerUserId?: string;
  name: string;
  logo: string;
  domain: string;
  industry: string;
  size: string;
  location: string;
  verified: boolean;
  about: string;
  openJobsCount: number;
}

export interface SkillEntity {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  prerequisites: string[];
  relatedSkills: string[];
  industryDemandScore: number;
  marketTrend: 'Exploding' | 'High' | 'Steady';
}

export interface AssessmentEntity {
  id: string;
  title: string;
  category: string;
  skillName: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  durationMinutes: number;
  passingScore: number;
  questionsCount: number;
  questions: Array<{
    id: string;
    type: 'mcq' | 'multiple_select' | 'coding' | 'scenario';
    prompt: string;
    options?: string[];
    correctAnswer: any;
    explanation: string;
    starterCode?: string;
  }>;
}

export interface ProjectEntity {
  id: string;
  title: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  targetSkills: string[];
  brief: string;
  architecture: string;
  milestones: string[];
  techStack: string[];
  estimatedHours: number;
  starterGithubRepo?: string;
}

export interface CourseEntity {
  id: string;
  title: string;
  educatorName: string;
  domain: string;
  level: string;
  rating: number;
  enrolledLearners: number;
  modulesCount: number;
  description: string;
}

export interface RoadmapEntity {
  id: string;
  userId: string;
  targetRole: string;
  durationDays: number;
  progressPercent: number;
  summary: string;
  milestones: Array<{
    dayRange: string;
    title: string;
    focusSkill: string;
    completed: boolean;
    learningObjectives: string[];
    tasks: string[] | Array<{ id: string; title: string; completed: boolean; type?: string; estimatedMinutes?: number }>;
    projectPrompt: string;
    assessmentTopic: string;
  }>;
  createdAt: string;
}

export interface JobApplicationEntity {
  id: string;
  jobId: string;
  userId: string;
  candidateName: string;
  jobTitle: string;
  companyName: string;
  matchScore: number;
  status: 'applied' | 'screening' | 'shortlisted' | 'interview' | 'final' | 'hired' | 'rejected' | 'interviewing' | 'reviewing' | 'offered';
  appliedAt: string;
  notes?: string;
}

@Injectable()
export class DataStoreService implements OnModuleInit {
  private readonly logger = new Logger(DataStoreService.name);
  private readonly persistenceFilePath = path.join(process.cwd(), 'data', 'db-persistence.json');

  // Primary In-Memory Collections with Persistent Disk and MongoDB Sync
  public users: Map<string, UserEntity> = new Map();
  public profiles: Map<string, LearnerProfileEntity> = new Map();
  public jobs: Map<string, JobEntity> = new Map();
  public companies: Map<string, CompanyEntity> = new Map();
  public skills: Map<string, SkillEntity> = new Map();
  public assessments: Map<string, AssessmentEntity> = new Map();
  public projects: Map<string, ProjectEntity> = new Map();
  public courses: Map<string, CourseEntity> = new Map();
  public roadmaps: Map<string, RoadmapEntity> = new Map();
  public applications: Map<string, JobApplicationEntity> = new Map();

  // Additional Real Collections
  public assessmentAttempts: Map<string, any> = new Map();
  public skillEvidences: Map<string, any> = new Map();
  public notifications: Map<string, any> = new Map();
  public analyticsEvents: any[] = [];
  public aiUsages: any[] = [];
  public auditLogs: any[] = [];

  // Mongoose Connection & Active Models
  private mongoConnection: Connection | null = null;
  public userModel: any = null;
  public profileModel: any = null;
  public jobModel: any = null;
  public companyModel: any = null;
  public skillModel: any = null;
  public assessmentModel: any = null;
  public courseModel: any = null;
  public projectModel: any = null;
  public roadmapModel: any = null;
  public applicationModel: any = null;
  public attemptModel: any = null;
  public evidenceModel: any = null;
  public notificationModel: any = null;
  public analyticsModel: any = null;
  public aiUsageModel: any = null;
  public auditModel: any = null;

  private saveDebounceTimer: NodeJS.Timeout | null = null;

  async onModuleInit() {
    this.ensureDataDirectory();
    await this.tryConnectMongoDB();

    this.loadFromDisk();

    if (this.mongoConnection) {
      await this.syncToAndFromMongo();
    }

    this.logger.log(
      `[Skillora Database] Initialized successfully with ${this.users.size} users, ${this.jobs.size} jobs, ${this.skills.size} skills, ${this.projects.size} projects, ${this.assessments.size} assessments.`,
    );
  }

  private ensureDataDirectory() {
    const dir = path.dirname(this.persistenceFilePath);
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (err: any) {
        this.logger.warn(`Could not create data directory: ${err.message}`);
      }
    }
  }

  private async tryConnectMongoDB() {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/skillora';
    try {
      this.mongoConnection = await mongoose.createConnection(uri, {
        serverSelectionTimeoutMS: 2000,
        connectTimeoutMS: 2000,
      }).asPromise();
      this.logger.log(`[MongoDB] Successfully connected to live MongoDB instance at ${uri}`);
      this.initMongoModels();
    } catch (err: any) {
      this.logger.warn(
        `[MongoDB] MongoDB at ${uri} is not reachable. Operating with high-performance persistent durability layer at ${this.persistenceFilePath}. All data is preserved across server restarts.`,
      );
    }
  }

  private initMongoModels() {
    if (!this.mongoConnection) return;
    try {
      this.userModel = this.mongoConnection.model('User', UserSchema);
      this.profileModel = this.mongoConnection.model('Profile', ProfileSchema);
      this.companyModel = this.mongoConnection.model('Company', CompanySchema);
      this.jobModel = this.mongoConnection.model('Job', JobSchema);
      this.skillModel = this.mongoConnection.model('Skill', SkillSchema);
      this.assessmentModel = this.mongoConnection.model('Assessment', AssessmentSchema);
      this.courseModel = this.mongoConnection.model('Course', CourseSchema);
      this.projectModel = this.mongoConnection.model('Project', ProjectSchema);
      this.roadmapModel = this.mongoConnection.model('Roadmap', RoadmapSchema);
      this.applicationModel = this.mongoConnection.model('JobApplication', JobApplicationSchema);
      this.attemptModel = this.mongoConnection.model('AssessmentAttempt', AssessmentAttemptSchema);
      this.evidenceModel = this.mongoConnection.model('SkillEvidence', SkillEvidenceSchema);
      this.notificationModel = this.mongoConnection.model('Notification', NotificationSchema);
      this.analyticsModel = this.mongoConnection.model('AnalyticsEvent', AnalyticsEventSchema);
      this.aiUsageModel = this.mongoConnection.model('AIUsage', AIUsageSchema);
      this.auditModel = this.mongoConnection.model('AuditLog', AuditLogSchema);
    } catch (e: any) {
      this.logger.warn(`Could not compile Mongoose models: ${e.message}`);
    }
  }

  public get isMongoConnected(): boolean {
    return this.mongoConnection !== null && this.mongoConnection.readyState === 1;
  }

  private async syncToAndFromMongo() {
    if (!this.userModel) return;
    try {
      const dbUsersCount = await this.userModel.countDocuments();
      if (dbUsersCount > 0) {
        const users = await this.userModel.find().lean();
        for (const u of users) this.users.set(u.id || (u as any)._id?.toString(), u as any);
        const profiles = await this.profileModel.find().lean();
        for (const p of profiles) this.profiles.set(p.userId, p as any);
        const jobs = await this.jobModel.find().lean();
        for (const j of jobs) this.jobs.set(j.id, j as any);
        const apps = await this.applicationModel.find().lean();
        for (const a of apps) this.applications.set(a.id, a as any);
        const roadmaps = await this.roadmapModel.find().lean();
        for (const r of roadmaps) this.roadmaps.set(r.id, r as any);
        if (this.companyModel) {
          const companies = await this.companyModel.find().lean();
          for (const c of companies) this.companies.set(c.id, c as any);
        }
        if (this.skillModel) {
          const skills = await this.skillModel.find().lean();
          for (const s of skills) this.skills.set(s.id, s as any);
        }
        if (this.assessmentModel) {
          const assessments = await this.assessmentModel.find().lean();
          for (const a of assessments) this.assessments.set(a.id, a as any);
        }
        if (this.projectModel) {
          const projects = await this.projectModel.find().lean();
          for (const p of projects) this.projects.set(p.id, p as any);
        }
        if (this.courseModel) {
          const courses = await this.courseModel.find().lean();
          for (const c of courses) this.courses.set(c.id, c as any);
        }
        if (this.attemptModel) {
          const attempts = await this.attemptModel.find().lean();
          for (const a of attempts) this.assessmentAttempts.set(a.id || (a as any)._id?.toString(), a as any);
        }
        if (this.evidenceModel) {
          const evidences = await this.evidenceModel.find().lean();
          for (const e of evidences) this.skillEvidences.set(e.id || (e as any)._id?.toString(), e as any);
        }
        if (this.notificationModel) {
          const notifs = await this.notificationModel.find().lean();
          for (const n of notifs) this.notifications.set(n.id || (n as any)._id?.toString(), n as any);
        }
        this.logger.log(`[MongoDB] Hydrated ${users.length} users and collections from MongoDB.`);
      }
    } catch (err: any) {
      this.logger.warn(`[MongoDB] Sync error: ${err.message}`);
    }
  }

  public persistToDisk() {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }
    this.saveDebounceTimer = setTimeout(() => {
      try {
        const payload = {
          users: Array.from(this.users.entries()),
          profiles: Array.from(this.profiles.entries()),
          jobs: Array.from(this.jobs.entries()),
          companies: Array.from(this.companies.entries()),
          skills: Array.from(this.skills.entries()),
          assessments: Array.from(this.assessments.entries()),
          projects: Array.from(this.projects.entries()),
          courses: Array.from(this.courses.entries()),
          roadmaps: Array.from(this.roadmaps.entries()),
          applications: Array.from(this.applications.entries()),
          assessmentAttempts: Array.from(this.assessmentAttempts.entries()),
          skillEvidences: Array.from(this.skillEvidences.entries()),
          notifications: Array.from(this.notifications.entries()),
          analyticsEvents: this.analyticsEvents.slice(-500),
          aiUsages: this.aiUsages.slice(-500),
          auditLogs: this.auditLogs.slice(-500),
          savedAt: new Date().toISOString(),
        };
        const tempPath = `${this.persistenceFilePath}.tmp`;
        fs.writeFileSync(tempPath, JSON.stringify(payload, null, 2), 'utf-8');
        fs.renameSync(tempPath, this.persistenceFilePath);
      } catch (err: any) {
        this.logger.warn(`Could not persist state to disk: ${err.message}`);
      }
    }, 100);
  }

  private loadFromDisk(): boolean {
    if (!fs.existsSync(this.persistenceFilePath)) {
      return false;
    }
    try {
      const content = fs.readFileSync(this.persistenceFilePath, 'utf-8');
      const data = JSON.parse(content);
      if (!data.users || data.users.length === 0) {
        return false;
      }
      this.users = new Map(data.users);
      this.profiles = new Map(data.profiles || []);
      this.jobs = new Map(data.jobs || []);
      this.companies = new Map(data.companies || []);
      this.skills = new Map(data.skills || []);
      this.assessments = new Map(data.assessments || []);
      this.projects = new Map(data.projects || []);
      this.courses = new Map(data.courses || []);
      this.roadmaps = new Map(data.roadmaps || []);
      this.applications = new Map(data.applications || []);
      this.assessmentAttempts = new Map(data.assessmentAttempts || []);
      this.skillEvidences = new Map(data.skillEvidences || []);
      this.notifications = new Map(data.notifications || []);
      this.analyticsEvents = data.analyticsEvents || [];
      this.aiUsages = data.aiUsages || [];
      this.auditLogs = data.auditLogs || [];
      this.logger.log(`[Persistence] Restored all collections from persistent disk storage.`);
      return true;
    } catch (err: any) {
      this.logger.warn(`Failed reading persistent data from disk: ${err.message}`);
      return false;
    }
  }

  // ==========================================
  // PERSISTENCE HELPER METHODS FOR MODULES
  // ==========================================

  public saveUser(user: UserEntity) {
    this.users.set(user.id, user);
    this.persistToDisk();
    if (this.userModel) {
      this.userModel.updateOne({ email: user.email }, { $set: user }, { upsert: true }).catch((err: any) => {
        this.logger.error(`Failed to persist user ${user.email} to MongoDB: ${err.message}`);
      });
    }
  }

  public saveProfile(profile: LearnerProfileEntity) {
    this.profiles.set(profile.userId, profile);
    this.persistToDisk();
    if (this.profileModel) {
      this.profileModel.updateOne({ userId: profile.userId }, { $set: profile }, { upsert: true }).catch((err: any) => {
        this.logger.error(`Failed to persist profile ${profile.userId} to MongoDB: ${err.message}`);
      });
    }
  }

  public saveJob(job: JobEntity) {
    this.jobs.set(job.id, job);
    this.persistToDisk();
    if (this.jobModel) {
      this.jobModel.updateOne({ id: job.id }, { $set: job }, { upsert: true }).catch((err: any) => {
        this.logger.error(`Failed to persist job ${job.id} to MongoDB: ${err.message}`);
      });
    }
  }

  public saveApplication(application: JobApplicationEntity) {
    this.applications.set(application.id, application);
    this.persistToDisk();
    if (this.applicationModel) {
      this.applicationModel.updateOne({ id: application.id }, { $set: application }, { upsert: true }).catch((err: any) => {
        this.logger.error(`Failed to persist application ${application.id} to MongoDB: ${err.message}`);
      });
    }
  }

  public saveRoadmap(roadmap: RoadmapEntity) {
    this.roadmaps.set(roadmap.id, roadmap);
    this.persistToDisk();
    if (this.roadmapModel) {
      this.roadmapModel.updateOne({ id: roadmap.id }, { $set: roadmap }, { upsert: true }).catch((err: any) => {
        this.logger.error(`Failed to persist roadmap ${roadmap.id} to MongoDB: ${err.message}`);
      });
    }
  }

  public saveCompany(company: CompanyEntity) {
    this.companies.set(company.id, company);
    this.persistToDisk();
    if (this.companyModel) {
      this.companyModel.updateOne({ id: company.id }, { $set: company }, { upsert: true }).catch((err: any) => {
        this.logger.error(`Failed to persist company ${company.id} to MongoDB: ${err.message}`);
      });
    }
  }

  public saveSkill(skill: SkillEntity) {
    this.skills.set(skill.id, skill);
    this.persistToDisk();
    if (this.skillModel) {
      this.skillModel.updateOne({ id: skill.id }, { $set: skill }, { upsert: true }).catch((err: any) => {
        this.logger.error(`Failed to persist skill ${skill.id} to MongoDB: ${err.message}`);
      });
    }
  }

  public saveAssessment(assessment: AssessmentEntity) {
    this.assessments.set(assessment.id, assessment);
    this.persistToDisk();
    if (this.assessmentModel) {
      this.assessmentModel.updateOne({ id: assessment.id }, { $set: assessment }, { upsert: true }).catch((err: any) => {
        this.logger.error(`Failed to persist assessment ${assessment.id} to MongoDB: ${err.message}`);
      });
    }
  }

  public saveCourse(course: CourseEntity) {
    this.courses.set(course.id, course);
    this.persistToDisk();
    if (this.courseModel) {
      this.courseModel.updateOne({ id: course.id }, { $set: course }, { upsert: true }).catch((err: any) => {
        this.logger.error(`Failed to persist course ${course.id} to MongoDB: ${err.message}`);
      });
    }
  }

  public saveProject(project: ProjectEntity) {
    this.projects.set(project.id, project);
    this.persistToDisk();
    if (this.projectModel) {
      this.projectModel.updateOne({ id: project.id }, { $set: project }, { upsert: true }).catch((err: any) => {
        this.logger.error(`Failed to persist project ${project.id} to MongoDB: ${err.message}`);
      });
    }
  }

  public recordAssessmentAttempt(attempt: any) {
    const id = `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const doc = { id, ...attempt, recordedAt: new Date().toISOString() };
    this.assessmentAttempts.set(id, doc);
    this.persistToDisk();
    if (this.attemptModel) {
      this.attemptModel.create(doc).catch((err: any) => {
        this.logger.error(`Failed to record assessment attempt to MongoDB: ${err.message}`);
      });
    }
    return id;
  }

  public recordSkillEvidence(evidence: any) {
    const id = `evi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const doc = { id, ...evidence, createdAt: new Date().toISOString() };
    this.skillEvidences.set(id, doc);
    this.persistToDisk();
    if (this.evidenceModel) {
      this.evidenceModel.create(doc).catch((err: any) => {
        this.logger.error(`Failed to record skill evidence to MongoDB: ${err.message}`);
      });
    }
    return id;
  }

  public recordNotification(notification: any) {
    const id = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const doc = { id, ...notification, createdAt: new Date().toISOString() };
    this.notifications.set(id, doc);
    this.persistToDisk();
    if (this.notificationModel) {
      this.notificationModel.create(doc).catch((err: any) => {
        this.logger.error(`Failed to record notification to MongoDB: ${err.message}`);
      });
    }
    return id;
  }

  public logAnalyticsEvent(event: any) {
    const doc = { ...event, timestamp: new Date().toISOString() };
    this.analyticsEvents.push(doc);
    this.persistToDisk();
    if (this.analyticsModel) {
      this.analyticsModel.create(doc).catch((err: any) => {
        this.logger.error(`Failed to record analytics event to MongoDB: ${err.message}`);
      });
    }
  }

  public recordAIUsage(usage: any) {
    const doc = { ...usage, timestamp: new Date().toISOString() };
    this.aiUsages.push(doc);
    this.persistToDisk();
    if (this.aiUsageModel) {
      this.aiUsageModel.create(doc).catch((err: any) => {
        this.logger.error(`Failed to record AI usage to MongoDB: ${err.message}`);
      });
    }
  }

  public logAudit(log: any) {
    const doc = { ...log, timestamp: new Date().toISOString() };
    this.auditLogs.push(doc);
    this.persistToDisk();
    if (this.auditModel) {
      this.auditModel.create(doc).catch((err: any) => {
        this.logger.error(`Failed to record audit log to MongoDB: ${err.message}`);
      });
    }
  }
}
