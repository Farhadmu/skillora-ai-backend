import { Injectable, NotFoundException } from '@nestjs/common';
import { DataStoreService } from '../../database/data-store.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class EducatorService {
  constructor(
    private readonly dataStore: DataStoreService,
    private readonly aiService: AiService,
  ) {}

  getCohortOverview() {
    const learners = Array.from(this.dataStore.profiles.values());
    
    // Compute intervention alerts
    const alerts = learners
      .filter((l) => l.readinessScore < 70 || l.weeklyHours < 10)
      .map((l) => ({
        learnerId: l.userId,
        name: l.name,
        targetRole: l.targetRole,
        readinessScore: l.readinessScore,
        weeklyHours: l.weeklyHours,
        alertType: l.readinessScore < 70 ? 'Struggling with Core Verification' : 'Low Weekly Engagement',
        recommendedIntervention:
          l.readinessScore < 70
            ? 'Assign Socratic Practice Lab on TypeScript & Backend Patterns'
            : 'Schedule 15-minute 1-on-1 career alignment checkpoint',
      }));

    const courses = Array.from(this.dataStore.courses.values());
    const curriculumModules = courses.map((c) => ({
      id: c.id,
      title: c.title,
      completionRate: 0,
    }));

    return {
      cohortName: 'Enterprise AI Systems & Engineering Cohort',
      totalLearners: learners.length,
      averageReadiness:
        learners.length > 0
          ? Math.round(learners.reduce((acc, l) => acc + l.readinessScore, 0) / learners.length)
          : 0,
      activeInterventionsCount: alerts.length,
      alerts,
      curriculumModules,
    };
  }

  /**
   * AI-Assisted Assessment Generator
   */
  async generateQuiz(params: {
    topic: string;
    category?: string;
    difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
    questionCount?: number;
    publishDirectly?: boolean;
  }) {
    const assessment = await this.aiService.generateAssessmentQuiz(params);

    if (params.publishDirectly) {
      this.dataStore.assessments.set(assessment.id, assessment as any);
      this.dataStore.persistToDisk();
    }

    return {
      success: true,
      assessment,
      isPublished: !!params.publishDirectly,
      message: params.publishDirectly
        ? `Assessment "${assessment.title}" published directly to student catalog!`
        : `Assessment generated for educator review.`,
    };
  }

  /**
   * Dispatch Socratic Intervention
   */
  dispatchIntervention(learnerId: string, interventionNote: string, actionType: string = 'Socratic Practice Lab') {
    const profile = this.dataStore.profiles.get(learnerId);
    if (!profile) {
      throw new NotFoundException(`Learner ${learnerId} not found`);
    }

    // Append to learner evidence / tasks
    profile.skills.forEach((s) => {
      if (s.proficiency < 70) {
        s.evidence.push(`Educator Intervention Assigned: ${actionType} - "${interventionNote}"`);
      }
    });
    this.dataStore.saveProfile(profile);

    this.dataStore.recordNotification({
      userId: learnerId,
      title: `Educator Assigned Intervention: ${actionType}`,
      message: interventionNote,
      type: 'educator',
      link: '/learner/learning/ai-teacher',
    });

    return {
      success: true,
      learnerId,
      learnerName: profile.name,
      actionType,
      interventionNote,
      dispatchedAt: new Date().toISOString(),
    };
  }

  /**
   * Create New Cohort
   */
  createCohort(data: { name: string; targetRole: string; description: string; durationWeeks?: number }) {
    const cohortId = `coh-${Date.now()}`;
    return {
      success: true,
      cohortId,
      name: data.name,
      targetRole: data.targetRole,
      description: data.description,
      durationWeeks: data.durationWeeks || 8,
      enrolledCount: 0,
      createdAt: new Date().toISOString(),
    };
  }
}
