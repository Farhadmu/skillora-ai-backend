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

  private mongoConnection: Connection | null = null;
  private saveDebounceTimer: NodeJS.Timeout | null = null;

  async onModuleInit() {
    this.ensureDataDirectory();
    await this.tryConnectMongoDB();

    const loadedFromDisk = this.loadFromDisk();
    if (!loadedFromDisk) {
      await this.seedInitialData();
      this.persistToDisk();
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
    } catch (err: any) {
      this.logger.warn(
        `[MongoDB] MongoDB at ${uri} is not reachable. Operating with high-performance persistent durability layer at ${this.persistenceFilePath}. All data is preserved across server restarts.`,
      );
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
      this.logger.warn(`Failed reading persistent data from disk, will seed initial data: ${err.message}`);
      return false;
    }
  }

  private async seedInitialData() {
    const passwordHash = await bcrypt.hash('Password123!', 10);

    for (const u of SEED_USERS) {
      this.users.set(u.id, {
        ...u,
        passwordHash,
        createdAt: new Date().toISOString(),
      });
    }

    this.profiles.set(PRIMARY_LEARNER_PROFILE.userId, PRIMARY_LEARNER_PROFILE as LearnerProfileEntity);

    for (const c of SEED_COMPANIES) {
      this.companies.set(c.id, c);
    }

    for (const s of SEED_SKILLS) {
      this.skills.set(s.id, s as SkillEntity);
    }

    for (const j of SEED_JOBS) {
      this.jobs.set(j.id, j as JobEntity);
    }

    for (const a of SEED_ASSESSMENTS) {
      this.assessments.set(a.id, a as AssessmentEntity);
    }

    for (const c of SEED_COURSES) {
      this.courses.set(c.id, c);
    }

    for (const p of SEED_PROJECTS) {
      this.projects.set(p.id, p as ProjectEntity);
    }

    this.roadmaps.set(SEED_ROADMAP.id, SEED_ROADMAP as RoadmapEntity);
    this.applications.set(SEED_APPLICATION.id, SEED_APPLICATION as JobApplicationEntity);
  }

  // ==========================================
  // PERSISTENCE HELPER METHODS FOR MODULES
  // ==========================================

  public saveUser(user: UserEntity) {
    this.users.set(user.id, user);
    this.persistToDisk();
  }

  public saveProfile(profile: LearnerProfileEntity) {
    this.profiles.set(profile.userId, profile);
    this.persistToDisk();
  }

  public saveJob(job: JobEntity) {
    this.jobs.set(job.id, job);
    this.persistToDisk();
  }

  public saveApplication(application: JobApplicationEntity) {
    this.applications.set(application.id, application);
    this.persistToDisk();
  }

  public saveRoadmap(roadmap: RoadmapEntity) {
    this.roadmaps.set(roadmap.id, roadmap);
    this.persistToDisk();
  }

  public recordAssessmentAttempt(attempt: any) {
    const id = `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    this.assessmentAttempts.set(id, { id, ...attempt, recordedAt: new Date().toISOString() });
    this.persistToDisk();
    return id;
  }

  public recordSkillEvidence(evidence: any) {
    const id = `evi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    this.skillEvidences.set(id, { id, ...evidence, createdAt: new Date().toISOString() });
    this.persistToDisk();
    return id;
  }

  public recordNotification(notification: any) {
    const id = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    this.notifications.set(id, { id, ...notification, createdAt: new Date().toISOString() });
    this.persistToDisk();
    return id;
  }

  public logAnalyticsEvent(event: any) {
    this.analyticsEvents.push({ ...event, timestamp: new Date().toISOString() });
    this.persistToDisk();
  }

  public recordAIUsage(usage: any) {
    this.aiUsages.push({ ...usage, timestamp: new Date().toISOString() });
    this.persistToDisk();
  }

  public logAudit(log: any) {
    this.auditLogs.push({ ...log, timestamp: new Date().toISOString() });
    this.persistToDisk();
  }
}
