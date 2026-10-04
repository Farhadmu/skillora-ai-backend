import { Injectable, NotFoundException } from '@nestjs/common';
import { DataStoreService, JobEntity, JobApplicationEntity } from '../../database/data-store.service';

@Injectable()
export class MarketplaceService {
  constructor(private readonly dataStore: DataStoreService) {}

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
      
      const skillScore = Math.round((matchingSkills.length / job.requiredSkills.length) * 100);
      const readinessBonus = profile ? Math.round(profile.readinessScore * 0.15) : 0;
      const matchScore = Math.min(Math.max(skillScore + readinessBonus, 45), 98);

      return {
        ...job,
        matchScore,
        matchingSkills,
        missingSkills,
        matchExplanation: `Match of ${matchScore}% calculated based on ${matchingSkills.length} of ${job.requiredSkills.length} required skills verified, combined with your readiness score (${profile?.readinessScore || 70}/100).`,
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
    const matchScore = Math.min(Math.round((matchingCount / job.requiredSkills.length) * 80 + 20), 98);

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
      notes: `Applied with verified readiness score of ${profile?.readinessScore || 75}/100.`,
    };

    this.dataStore.applications.set(appId, newApp);
    job.applicantsCount++;
    this.dataStore.jobs.set(jobId, job);

    return newApp;
  }

  getLearnerApplications(userId: string) {
    return Array.from(this.dataStore.applications.values()).filter((a) => a.userId === userId);
  }

  /**
   * Employer Pipeline Management
   */
  getEmployerCandidates(companyId?: string) {
    return Array.from(this.dataStore.applications.values());
  }

  updateApplicationStage(applicationId: string, stage: JobApplicationEntity['status']) {
    const app = this.dataStore.applications.get(applicationId);
    if (!app) {
      throw new NotFoundException(`Application ${applicationId} not found`);
    }
    app.status = stage;
    this.dataStore.applications.set(applicationId, app);
    return app;
  }
}
