import { Injectable, NotFoundException } from '@nestjs/common';
import { DataStoreService, JobEntity, JobApplicationEntity } from '../../database/data-store.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class MarketplaceService {
  constructor(
    private readonly dataStore: DataStoreService,
    private readonly aiService: AiService,
  ) {}

  /**
   * Search and browse verified jobs with AI Match Score calculation
   */
  getJobsForLearner(
    userId?: string,
    filters?: {
      mode?: string;
      experienceLevel?: string;
      query?: string;
    },
  ) {
    let list = Array.from(this.dataStore.jobs.values());

    if (filters?.mode && filters.mode !== 'all') {
      list = list.filter((j) => j.mode.toLowerCase() === filters.mode.toLowerCase());
    }

    if (filters?.experienceLevel && filters.experienceLevel !== 'all') {
      list = list.filter((j) => j.experienceLevel.toLowerCase() === filters.experienceLevel.toLowerCase());
    }

    if (filters?.query) {
      const q = filters.query.toLowerCase();
      list = list.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.companyName.toLowerCase().includes(q) ||
          j.requiredSkills.some((s) => s.toLowerCase().includes(q)),
      );
    }

    const profile = userId ? this.dataStore.profiles.get(userId) : null;
    const userSkills = new Set(profile?.skills.map((s) => s.name.toLowerCase()) || []);

    return list.map((job) => {
      // Explainable AI Match Calculation
      const matchingSkills = job.requiredSkills.filter((s) => userSkills.has(s.toLowerCase()));
      const missingSkills = job.requiredSkills.filter((s) => !userSkills.has(s.toLowerCase()));
      
      const skillScore =
        job.requiredSkills.length > 0
          ? Math.round((matchingSkills.length / job.requiredSkills.length) * 80)
          : 0;
      const readinessBonus = profile ? Math.round((profile.readinessScore / 100) * 20) : 0;
      const matchScore = Math.min(skillScore + readinessBonus, 100);

      return {
        ...job,
        matchScore,
        matchingSkills,
        missingSkills,
        matchExplanation:
          matchingSkills.length > 0
            ? `Match of ${matchScore}% calculated based on ${matchingSkills.length} of ${job.requiredSkills.length} required skills verified (${matchingSkills.join(', ')}), combined with readiness index (${profile?.readinessScore || 0}%).`
            : `0 matching required skills currently verified (${job.requiredSkills.slice(0, 3).join(', ')} required). Acquire skills to increase your match score.`,
      };
    });
  }

  getJobById(id: string) {
    const job = this.dataStore.jobs.get(id);
    if (!job) {
      throw new NotFoundException(`Job ${id} not found`);
    }
    return job;
  }

  /**
   * Apply for a job
   */
  applyForJob(userId: string, jobId: string) {
    const job = this.getJobById(jobId);
    const profile = this.dataStore.profiles.get(userId);

    const existing = Array.from(this.dataStore.applications.values()).find(
      (a) => a.userId === userId && a.jobId === jobId,
    );
    if (existing) {
      return existing;
    }

    const userSkills = new Set(profile?.skills.map((s) => s.name.toLowerCase()) || []);
    const matchingCount = job.requiredSkills.filter((s) => userSkills.has(s.toLowerCase())).length;
    const skillPart =
      job.requiredSkills.length > 0 ? Math.round((matchingCount / job.requiredSkills.length) * 80) : 0;
    const readinessPart = profile ? Math.round((profile.readinessScore / 100) * 20) : 0;
    const matchScore = Math.min(skillPart + readinessPart, 100);

    const appId = `app-${Date.now()}`;
    const newApp: JobApplicationEntity = {
      id: appId,
      jobId,
      userId,
      candidateName: profile?.name || 'Skillora Candidate',
      jobTitle: job.title,
      companyName: job.companyName,
      matchScore,
      status: 'applied',
      appliedAt: new Date().toISOString().split('T')[0],
      notes: `Applied with verified readiness score of ${profile?.readinessScore || 0}/100.`,
    };

    this.dataStore.saveApplication(newApp);
    job.applicantsCount++;
    this.dataStore.saveJob(job);

    this.dataStore.recordNotification({
      userId,
      title: `Application Submitted: ${job.title}`,
      message: `Your application to ${job.companyName} for ${job.title} was submitted with a match score of ${matchScore}%.`,
      type: 'application',
      link: '/learner/jobs/applications',
    });

    this.dataStore.logAnalyticsEvent({
      eventName: 'job_applied',
      userId,
      metadata: { jobId, jobTitle: job.title, companyName: job.companyName, matchScore },
    });

    return newApp;
  }

  getLearnerApplications(userId: string) {
    return Array.from(this.dataStore.applications.values()).filter((a) => a.userId === userId);
  }

  /**
   * Employer Pipeline Management
   */
  getEmployerCandidates(companyId?: string) {
    return Array.from(this.dataStore.applications.values()).map((app) => {
      const user = this.dataStore.users.get(app.userId);
      const profile = this.dataStore.profiles.get(app.userId);
      return {
        ...app,
        candidateEmail: user?.email || profile?.email,
        email: user?.email || profile?.email,
        candidateName: profile?.name || user?.name || app.candidateName,
        targetRole: profile?.targetRole,
        readinessScore: profile?.readinessScore,
      };
    });
  }

  updateApplicationStage(applicationId: string, stage: JobApplicationEntity['status']) {
    const app = this.dataStore.applications.get(applicationId);
    if (!app) {
      throw new NotFoundException(`Application ${applicationId} not found`);
    }
    app.status = stage;
    this.dataStore.saveApplication(app);

    this.dataStore.recordNotification({
      userId: app.userId,
      title: `Application Status Updated: ${stage.toUpperCase()}`,
      message: `${app.companyName} moved your application for ${app.jobTitle} to "${stage}".`,
      type: 'application',
      link: '/learner/jobs/applications',
    });

    this.dataStore.logAnalyticsEvent({
      eventName: 'application_status_changed',
      userId: app.userId,
      metadata: { applicationId, stage, jobTitle: app.jobTitle, companyName: app.companyName },
    });

    return app;
  }

  /**
   * Post New Job Opening (Employer Studio)
   */
  createJob(jobData: Partial<JobEntity>) {
    const jobId = `job-${Date.now()}`;
    const newJob: JobEntity = {
      id: jobId,
      companyId: jobData.companyId || 'comp-1',
      companyName: jobData.companyName || 'Skillora Partner Technologies',
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
      postedAt: 'Just now',
      applicantsCount: 0,
    };

    this.dataStore.saveJob(newJob);

    this.dataStore.logAnalyticsEvent({
      eventName: 'job_created',
      metadata: { jobId, title: newJob.title, companyName: newJob.companyName },
    });

    return newJob;
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
    } catch (e) {}

    // Fallback extraction
    return {
      extractedTitle: 'Full-Stack AI Software Engineer',
      suggestedExperienceLevel: 'Mid',
      suggestedSalaryRange: '$110,000 - $140,000 USD',
      requiredSkills: ['TypeScript', 'React', 'NestJS', 'MongoDB', 'REST API'],
      preferredSkills: ['Docker', 'RAG Architecture', 'Vector Search', 'CI/CD'],
    };
  }

  /**
   * Generate Custom Interview Questions for a Candidate
   */
  async generateInterviewQuestionsForCandidate(applicationId: string) {
    const app = this.dataStore.applications.get(applicationId);
    if (!app) {
      throw new NotFoundException(`Application ${applicationId} not found`);
    }

    const job = this.dataStore.jobs.get(app.jobId);
    const profile = this.dataStore.profiles.get(app.userId);

    const prompt = `You are a Lead Hiring Architect interviewing candidate "${app.candidateName}" for the position "${app.jobTitle}" at "${app.companyName}".
Candidate's verified skills: ${profile?.skills.map((s) => `${s.name} (${s.proficiency}%)`).join(', ') || 'TypeScript, React, Node.js'}.
Job required skills: ${job?.requiredSkills.join(', ') || 'TypeScript, NestJS, Docker'}.

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
    } catch (e) {}

    return {
      candidateName: app.candidateName,
      jobTitle: app.jobTitle,
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
