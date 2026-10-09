import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { Job, JobDocument, JobApplication, JobApplicationDocument, InterviewInvitation, InterviewInvitationDocument } from '../../database/schemas/job.schema';
import { Profile, ProfileDocument } from '../../database/schemas/profile.schema';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { Notification, NotificationDocument } from '../../database/schemas/communication.schema';
import { AnalyticsEvent, AnalyticsEventDocument } from '../../database/schemas/analytics-audit.schema';
import { AiService } from '../ai/ai.service';

@Injectable()
export class MarketplaceService {
  constructor(
    @InjectModel(Job.name) private readonly jobModel: Model<JobDocument>,
    @InjectModel(JobApplication.name) private readonly applicationModel: Model<JobApplicationDocument>,
    @InjectModel(InterviewInvitation.name) private readonly invitationModel: Model<InterviewInvitationDocument>,
    @InjectModel(Profile.name) private readonly profileModel: Model<ProfileDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Notification.name) private readonly notificationModel: Model<NotificationDocument>,
    @InjectModel(AnalyticsEvent.name) private readonly analyticsModel: Model<AnalyticsEventDocument>,
    private readonly aiService: AiService,
  ) {}


  /**
   * Search and browse verified jobs with AI Match Score calculation
   */
  async getJobsForLearner(
    userId?: string,
    filters?: {
      mode?: string;
      experienceLevel?: string;
      query?: string;
    },
  ) {
    const filter: any = {};
    if (filters?.mode && filters.mode !== 'all') {
      filter.mode = new RegExp(`^${filters.mode}$`, 'i');
    }
    if (filters?.experienceLevel && filters.experienceLevel !== 'all') {
      filter.experienceLevel = new RegExp(`^${filters.experienceLevel}$`, 'i');
    }
    if (filters?.query) {
      filter.$or = [
        { title: new RegExp(filters.query, 'i') },
        { companyName: new RegExp(filters.query, 'i') },
        { requiredSkills: new RegExp(filters.query, 'i') },
      ];
    }

    const list = await this.jobModel.find(filter).lean();
    const profile = userId ? await this.profileModel.findOne({ userId }).lean() : null;
    const userSkills = new Set((profile?.skills || []).map((s: any) => s.name.toLowerCase()));

    return list.map((job: any) => {
      const requiredSkills = job.requiredSkills || [];
      const matchingSkills = requiredSkills.filter((s: string) => userSkills.has(s.toLowerCase()));
      const missingSkills = requiredSkills.filter((s: string) => !userSkills.has(s.toLowerCase()));

      const skillScore =
        requiredSkills.length > 0
          ? Math.round((matchingSkills.length / requiredSkills.length) * 80)
          : 0;
      const readinessBonus = profile ? Math.round(((profile.readinessScore || 0) / 100) * 20) : 0;
      const matchScore = Math.min(skillScore + readinessBonus, 100);

      return {
        ...job,
        id: job.id || job._id.toString(),
        matchScore,
        matchingSkills,
        missingSkills,
        matchExplanation:
          matchingSkills.length > 0
            ? `Match of ${matchScore}% calculated based on ${matchingSkills.length} of ${requiredSkills.length} required skills verified (${matchingSkills.join(', ')}), combined with readiness index (${profile?.readinessScore || 0}%).`
            : `0 matching required skills currently verified (${requiredSkills.slice(0, 3).join(', ')} required). Acquire skills to increase your match score.`,
      };
    });
  }

  async getJobById(id: string): Promise<any> {
    const query: any[] = [{ id }];
    if (isValidObjectId(id)) query.push({ _id: id });

    const job = await this.jobModel.findOne({ $or: query }).lean();
    if (!job) {
      throw new NotFoundException(`Job ${id} not found`);
    }
    return {
      ...job,
      id: job.id || (job as any)._id?.toString(),
    };
  }

  /**
   * Apply for a job
   */
  async applyForJob(userId: string, jobId: string): Promise<any> {
    const job: any = await this.getJobById(jobId);
    const profile = await this.profileModel.findOne({ userId }).lean();

    const existing = await this.applicationModel.findOne({ userId, jobId }).lean();
    if (existing) {
      return {
        ...existing,
        id: existing.id || (existing as any)._id?.toString(),
      };
    }

    const requiredSkills = job.requiredSkills || [];
    const userSkills = new Set((profile?.skills || []).map((s: any) => s.name.toLowerCase()));
    const matchingCount = requiredSkills.filter((s: string) => userSkills.has(s.toLowerCase())).length;
    const skillPart =
      requiredSkills.length > 0 ? Math.round((matchingCount / requiredSkills.length) * 80) : 0;
    const readinessPart = profile ? Math.round(((profile.readinessScore || 0) / 100) * 20) : 0;
    const matchScore = Math.min(skillPart + readinessPart, 100);

    const appId = `app-${Date.now()}`;
    const newApp = await this.applicationModel.create({
      id: appId,
      jobId,
      userId,
      candidateName: profile?.name || 'Skillora Candidate',
      jobTitle: job.title,
      companyName: job.companyName,
      companyId: job.companyId || '',
      matchScore,
      status: 'applied',
      notes: `Applied with verified readiness score of ${profile?.readinessScore || 0}/100.`,
    });

    await this.jobModel.updateOne({ $or: [{ id: jobId }, { _id: isValidObjectId(jobId) ? jobId : undefined }] }, { $inc: { applicantsCount: 1 } });

    await this.notificationModel.create({
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId,
      title: `Application Submitted: ${job.title}`,
      message: `Your application to ${job.companyName} for ${job.title} was submitted with a match score of ${matchScore}%.`,
      type: 'application',
      link: '/learner/jobs/applications',
    });

    await this.analyticsModel.create({
      eventName: 'job_applied',
      userId,
      metadata: { jobId, jobTitle: job.title, companyName: job.companyName, matchScore },
    }).catch(() => {});

    return newApp.toObject ? newApp.toObject() : newApp;
  }

  async getLearnerApplications(userId: string) {
    const list = await this.applicationModel.find({ userId }).lean();
    return list.map((a: any) => ({
      ...a,
      id: a.id || a._id.toString(),
    }));
  }

  /**
   * Employer Pipeline Management with Strict Multi-Tenant Isolation
   */
  async getEmployerCandidates(user: any) {
    const isAdmin = user?.role?.toUpperCase() === 'ADMIN';
    const allJobs = await this.jobModel.find().lean();
    const employerJobs = allJobs.filter((j: any) => {
      if (isAdmin) return true;
      return (
        j.ownerUserId === user.id ||
        j.companyId === user.id ||
        (user.companyName && j.companyName?.toLowerCase() === user.companyName.toLowerCase())
      );
    });

    const allowedJobIds = new Set(employerJobs.map((j: any) => j.id || j._id.toString()));

    const allApps = await this.applicationModel.find().lean();
    const filteredApps = allApps.filter((app: any) => isAdmin || allowedJobIds.has(app.jobId));

    const enriched = await Promise.all(
      filteredApps.map(async (app: any) => {
        const candidateUser = await this.userModel.findOne({
          $or: [{ id: app.userId }, { _id: isValidObjectId(app.userId) ? app.userId : undefined }],
        }).lean();
        const profile = await this.profileModel.findOne({ userId: app.userId }).lean();

        return {
          ...app,
          id: app.id || app._id.toString(),
          candidateEmail: candidateUser?.email || profile?.email,
          email: candidateUser?.email || profile?.email,
          candidateName: profile?.name || candidateUser?.name || app.candidateName,
          targetRole: profile?.targetRole,
          readinessScore: profile?.readinessScore,
        };
      }),
    );

    return enriched;
  }

  /**
   * Real MongoDB Talent Discovery & Candidate Matching
   */
  async searchTalent(
    user: any,
    filters?: {
      query?: string;
      skill?: string;
      minReadiness?: number;
      targetRole?: string;
    },
  ) {
    const learnerUsers = await this.userModel.find({ role: { $in: ['LEARNER', 'learner'] } }).lean();
    const learnerIds = learnerUsers.map((u: any) => u.id || u._id.toString());

    const profileFilter: any = {};
    if (learnerIds.length > 0) {
      profileFilter.userId = { $in: learnerIds };
    }
    if (filters?.minReadiness) {
      profileFilter.readinessScore = { $gte: Number(filters.minReadiness) };
    }
    if (filters?.targetRole && filters.targetRole !== 'all') {
      profileFilter.targetRole = new RegExp(filters.targetRole, 'i');
    }

    const profiles = await this.profileModel.find(profileFilter).lean();

    const results = profiles.map((p: any) => {
      const u = learnerUsers.find((lu: any) => (lu.id || lu._id.toString()) === p.userId);
      const skills = p.skills || [];
      const verifiedCount = skills.filter((s: any) => s.verified).length;
      
      let matchScore = p.readinessScore || 0;
      if (filters?.skill) {
        const hasSkill = skills.some((s: any) => 
          s.name?.toLowerCase().includes(filters.skill!.toLowerCase())
        );
        if (hasSkill) matchScore = Math.min(matchScore + 15, 100);
      }

      return {
        id: p.userId || p._id.toString(),
        name: p.name || u?.name || 'Verified Learner',
        email: p.email || u?.email || '',
        title: p.title || p.targetRole || 'Software Engineer',
        targetRole: p.targetRole || 'Full-Stack Developer',
        bio: p.bio || 'Skillora-trained engineer with verified technical evidence.',
        readinessScore: p.readinessScore || 0,
        matchScore,
        skills: skills.map((s: any) => ({
          name: s.name,
          proficiency: s.proficiency || 80,
          verified: !!s.verified,
        })),
        verifiedSkillsCount: verifiedCount,
        githubUrl: p.githubUrl || '',
        portfolioUrl: p.portfolioUrl || '',
        location: p.location || 'Remote',
        education: p.education || [],
        experience: p.experience || [],
        matchExplanation: `Verified readiness score of ${p.readinessScore || 0}% with ${verifiedCount} tamper-proof skills assessed through real curriculum submissions.`,
      };
    });

    if (filters?.query) {
      const q = filters.query.toLowerCase();
      return results.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          r.targetRole.toLowerCase().includes(q) ||
          r.skills.some((s: any) => s.name.toLowerCase().includes(q)),
      );
    }

    return results;
  }

  /**
   * Schedule Interview with Candidate & Push Notification
   */
  async scheduleInterview(
    user: any,
    dto: {
      applicationId: string;
      scheduledAt: string | Date;
      interviewType?: string;
      durationMinutes?: number;
      meetingLink?: string;
      instructions?: string;
    },
  ) {
    const query: any[] = [{ id: dto.applicationId }];
    if (isValidObjectId(dto.applicationId)) query.push({ _id: dto.applicationId });

    const app = await this.applicationModel.findOne({ $or: query });
    if (!app) {
      throw new NotFoundException(`Application ${dto.applicationId} not found`);
    }

    const jobQuery: any[] = [{ id: app.jobId }];
    if (isValidObjectId(app.jobId)) jobQuery.push({ _id: app.jobId });
    const job = await this.jobModel.findOne({ $or: jobQuery }).lean();

    const isAdmin = user?.role?.toUpperCase() === 'ADMIN';
    if (!isAdmin && job) {
      const isOwner =
        (job as any).ownerUserId === user.id ||
        (job as any).creatorUserId === user.id ||
        job.companyId === user.id ||
        (user.companyName && job.companyName?.toLowerCase() === user.companyName.toLowerCase());
      if (!isOwner) {
        throw new ForbiddenException('You do not have authorization to schedule interviews for this job application.');
      }
    }

    const candidateUser = await this.userModel.findOne({
      $or: [{ id: app.userId }, { _id: isValidObjectId(app.userId) ? app.userId : undefined }],
    }).lean();

    const invitationId = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const invitation = await this.invitationModel.create({
      id: invitationId,
      applicationId: app.id || app._id.toString(),
      jobId: job?.id || app.jobId,
      jobTitle: job?.title || app.jobTitle,
      companyId: job?.companyId || user.id,
      companyName: job?.companyName || app.companyName,
      candidateId: app.userId,
      candidateName: app.candidateName,
      candidateEmail: candidateUser?.email || '',
      interviewType: dto.interviewType || 'Technical',
      scheduledAt: new Date(dto.scheduledAt),
      durationMinutes: dto.durationMinutes || 45,
      instructions: dto.instructions || 'Technical deep dive and architectural review.',
      meetingLink: dto.meetingLink || `https://meet.skillora.ai/room-${Date.now().toString(36)}`,
      status: 'SCHEDULED',
    });

    app.status = 'interview';
    await app.save();

    await this.notificationModel.create({
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: app.userId,
      title: `Interview Scheduled: ${job?.title || app.jobTitle}`,
      message: `${app.companyName} scheduled a ${dto.interviewType || 'Technical'} interview with you on ${new Date(dto.scheduledAt).toLocaleDateString()}. Meeting link is ready.`,
      type: 'interview',
      link: '/learner/jobs/applications',
    });

    await this.analyticsModel.create({
      eventName: 'interview_scheduled',
      userId: user.id,
      metadata: {
        applicationId: app.id,
        candidateId: app.userId,
        jobTitle: app.jobTitle,
        scheduledAt: dto.scheduledAt,
      },
    }).catch(() => {});

    return invitation.toObject ? invitation.toObject() : invitation;
  }

  async getEmployerInterviews(user: any) {
    const isAdmin = user?.role?.toUpperCase() === 'ADMIN';
    if (isAdmin) {
      return this.invitationModel.find().sort({ scheduledAt: 1 }).lean();
    }
    const allJobs = await this.jobModel.find().lean();
    const employerJobs = allJobs.filter((j: any) =>
      j.ownerUserId === user.id ||
      j.companyId === user.id ||
      (user.companyName && j.companyName?.toLowerCase() === user.companyName.toLowerCase())
    );
    const jobIds = employerJobs.map((j: any) => j.id || j._id.toString());
    return this.invitationModel
      .find({ $or: [{ companyId: user.id }, { jobId: { $in: jobIds } }] })
      .sort({ scheduledAt: 1 })
      .lean();
  }

  async getLearnerInterviews(user: any) {
    return this.invitationModel
      .find({ candidateId: user.id })
      .sort({ scheduledAt: 1 })
      .lean();
  }

  async updateApplicationStage(applicationId: string, stage: any, user: any) {
    const query: any[] = [{ id: applicationId }];
    if (isValidObjectId(applicationId)) query.push({ _id: applicationId });

    const app = await this.applicationModel.findOne({ $or: query });
    if (!app) {
      throw new NotFoundException(`Application ${applicationId} not found`);
    }

    const jobQuery: any[] = [{ id: app.jobId }];
    if (isValidObjectId(app.jobId)) jobQuery.push({ _id: app.jobId });
    const job = await this.jobModel.findOne({ $or: jobQuery }).lean();

    const isAdmin = user?.role?.toUpperCase() === 'ADMIN';
    if (!isAdmin && job) {
      const isOwner =
        (job as any).ownerUserId === user.id ||
        (job as any).creatorUserId === user.id ||
        job.companyId === user.id ||
        (user.companyName && job.companyName?.toLowerCase() === user.companyName.toLowerCase());
      if (!isOwner) {
        throw new ForbiddenException('You do not have authorization to manage candidate pipelines for this job.');
      }
    }

    app.status = stage;
    await app.save();

    await this.notificationModel.create({
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: app.userId,
      title: `Application Status Updated: ${String(stage).toUpperCase()}`,
      message: `${app.companyName} moved your application for ${app.jobTitle} to "${stage}".`,
      type: 'application',
      link: '/learner/jobs/applications',
    });

    await this.analyticsModel.create({
      eventName: 'application_status_changed',
      userId: app.userId,
      metadata: { applicationId, stage, jobTitle: app.jobTitle, companyName: app.companyName },
    }).catch(() => {});

    return app.toObject ? app.toObject() : app;
  }

  /**
   * Post New Job Opening (Employer Studio) with Server-Derived Ownership
   */
  async createJob(jobData: any, user: any) {
    const jobId = `job-${Date.now()}`;
    const companyName = user?.companyName || jobData.companyName || `${user?.name || 'Enterprise'} Inc.`;
    const newJob = await this.jobModel.create({
      id: jobId,
      companyId: user?.id || 'comp-1',
      ownerUserId: user?.id,
      companyName,
      companyLogo: jobData.companyLogo || 'https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=128&q=80',
      title: jobData.title || 'Senior AI Systems Engineer',
      department: jobData.department || 'Engineering',
      location: jobData.location || 'Remote (Global)',
      mode: jobData.mode || 'remote',
      salaryRange: jobData.salaryRange || '$130,000 - $160,000 USD',
      experienceLevel: jobData.experienceLevel || 'Mid',
      requiredSkills: jobData.requiredSkills || ['TypeScript', 'NestJS', 'React', 'Docker'],
      preferredSkills: jobData.preferredSkills || ['Qdrant', 'RAG Architecture', 'Kubernetes'],
      description: jobData.description || 'Join our high-throughput AI engineering team.',
      responsibilities: jobData.responsibilities || [
        'Design and deploy resilient, low-latency microservices',
        'Implement vector search retrieval architectures',
        'Write strict unit and integration tests with 90%+ branch coverage',
      ],
      requirements: jobData.requirements || [
        'Demonstrated mastery in TypeScript and modern web frameworks',
        'Proven experience with distributed systems and asynchronous message queues',
        'Skillora Readiness Score of 80+ preferred',
      ],
      postedAt: new Date(),
      applicantsCount: 0,
      status: 'published',
    });

    await this.analyticsModel.create({
      eventName: 'job_created',
      userId: user?.id,
      metadata: { jobId, title: newJob.title, companyName: newJob.companyName },
    }).catch(() => {});

    return newJob.toObject ? newJob.toObject() : newJob;
  }

  /**
   * AI-Assisted Job Skill Extractor & Benchmarker
   */
  async aiExtractJobSkills(jobDescription: string) {
    const prompt = `Analyze this job posting description and extract the key requirements:
Job Description:
"${jobDescription}"

Return ONLY a JSON object matching this schema:
{
  "extractedTitle": "e.g. Senior Backend Engineer",
  "suggestedExperienceLevel": "Entry" | "Mid" | "Senior" | "Lead",
  "suggestedSalaryRange": "e.g. $120,000 - $150,000 USD",
  "requiredSkills": ["TypeScript", "NestJS", "PostgreSQL"],
  "preferredSkills": ["Docker", "Kubernetes", "GraphQL"]
}`;

    try {
      const generated = await this.aiService.generateText(prompt);
      const jsonMatch = generated.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {}

    // Fallback extraction
    return {
      extractedTitle: 'Full-Stack AI Software Engineer',
      suggestedExperienceLevel: 'Mid',
      suggestedSalaryRange: '$110,000 - $140,000 USD',
      requiredSkills: ['TypeScript', 'React', 'NestJS', 'MongoDB', 'REST API'],
      preferredSkills: ['Docker', 'RAG Architecture', 'Vector Search', 'CI/CD'],
      unverifiedFallback: true,
    };
  }

  /**
   * Generate Custom Interview Questions for a Candidate
   */
  async generateInterviewQuestionsForCandidate(applicationId: string, user: any) {
    const query: any[] = [{ id: applicationId }];
    if (isValidObjectId(applicationId)) query.push({ _id: applicationId });

    const app = await this.applicationModel.findOne({ $or: query }).lean();
    if (!app) {
      throw new NotFoundException(`Application ${applicationId} not found`);
    }

    const jobQuery: any[] = [{ id: app.jobId }];
    if (isValidObjectId(app.jobId)) jobQuery.push({ _id: app.jobId });
    const job = await this.jobModel.findOne({ $or: jobQuery }).lean();

    const isAdmin = user?.role?.toUpperCase() === 'ADMIN';
    if (!isAdmin && job) {
      const isOwner =
        (job as any).ownerUserId === user.id ||
        (job as any).creatorUserId === user.id ||
        job.companyId === user.id ||
        (user.companyName && job.companyName?.toLowerCase() === user.companyName.toLowerCase());
      if (!isOwner) {
        throw new ForbiddenException('You do not have authorization to view candidate telemetry for this job opening.');
      }
    }

    const profile = await this.profileModel.findOne({ userId: app.userId }).lean();

    const prompt = `You are a Lead Hiring Architect interviewing candidate "${app.candidateName}" for the position "${app.jobTitle}" at "${app.companyName}".
Candidate's verified skills: ${profile?.skills?.map((s: any) => `${s.name} (${s.proficiency}%)`).join(', ') || 'TypeScript, React, Node.js'}.
Job required skills: ${job?.requiredSkills?.join(', ') || 'TypeScript, NestJS, Docker'}.

Generate 4 deep, technical, and behavioral interview questions specifically testing where the candidate has skill gaps or high potential.
Return ONLY a JSON object:
{
  "questions": [
    {
      "id": "q1",
      "category": "Architecture & System Design",
      "question": "Question text...",
      "evaluationCriteria": "What the interviewer should listen for..."
    }
  ]
}`;

    try {
      const text = await this.aiService.generateText(prompt);
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
    } catch {}

    return {
      candidateName: app.candidateName,
      jobTitle: app.jobTitle,
      source: 'CURATED_STANDARD_QUESTION_BANK',
      questions: [
        {
          id: 'q1',
          category: 'System Design & Distributed Data',
          question: `In high-scale systems for ${job?.title || 'this role'}, how do you handle cache invalidation across distributed instances without causing thundering herd problems?`,
          evaluationCriteria: 'Look for mutual exclusion locks, probabilistic early expiration (XFetch), or CDC event streams.',
        },
        {
          id: 'q2',
          category: 'Code Quality & Error Boundaries',
          question: 'Walk us through your approach to designing resilient error recovery and fallback degradation when a third-party AI provider or downstream microservice fails.',
          evaluationCriteria: 'Candidate should mention circuit breakers, exponential backoff with jitter, and graceful fallback modes.',
        },
        {
          id: 'q3',
          category: 'Verification & Testing Rigor',
          question: 'How do you structure end-to-end automated integration tests to ensure deterministic results without flakiness?',
          evaluationCriteria: 'Look for isolated test fixtures, transactional rollbacks, and contract-based testing.',
        },
        {
          id: 'q4',
          category: 'Culture & Architectural Trade-offs',
          question: 'Describe a technical decision where you chose a simpler, proven solution over a trendy new framework or database. What was the business impact?',
          evaluationCriteria: 'Evaluates pragmatic engineering judgment versus premature over-engineering.',
        },
      ],
    };
  }
}
