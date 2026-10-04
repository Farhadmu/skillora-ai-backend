import { Injectable, NotFoundException } from '@nestjs/common';
import { DataStoreService } from '../../database/data-store.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class WorkforceReadyService {
  constructor(
    private readonly dataStore: DataStoreService,
    private readonly aiService: AiService,
  ) {}

  /**
   * Calculate 7-dimension readiness index for user
   */
  async getReadinessScore(userId: string) {
    const profile = this.dataStore.profiles.get(userId);
    if (!profile) {
      throw new NotFoundException(`Profile for user ${userId} not found`);
    }

    const verifiedSkillsCount = profile.skills.filter((s) => s.verified).length;
    const avgProficiency =
      profile.skills.length > 0
        ? Math.round(profile.skills.reduce((acc, s) => acc + s.proficiency, 0) / profile.skills.length)
        : 65;

    const dimensions = profile.readinessDimensions || {
      technical: Math.min(avgProficiency + 5, 95),
      problemSolving: 82,
      projects: 84,
      communication: 78,
      interview: 80,
      roleAlignment: 85,
      practical: 79,
    };

    const overall = Math.round(
      dimensions.technical * 0.25 +
        dimensions.problemSolving * 0.2 +
        dimensions.projects * 0.15 +
        dimensions.communication * 0.1 +
        dimensions.interview * 0.15 +
        dimensions.roleAlignment * 0.1 +
        dimensions.practical * 0.05,
    );

    profile.readinessScore = overall;
    this.dataStore.profiles.set(userId, profile);

    return {
      overallScore: overall,
      targetRole: profile.targetRole,
      verifiedSkillsCount,
      dimensions,
      employabilityStatus:
        overall >= 80 ? 'Job Ready (High Match Potential)' : overall >= 65 ? 'Placement Developing' : 'Foundational',
      strengths: [
        'Strong verified proficiency in core language and backend patterns',
        'Hands-on project experience with modern microservice and RAG architecture',
        'Consistently high scores on algorithmic and scenario assessments',
      ],
      recommendations: [
        'Complete at least one multi-tenant system design mock interview to boost interview dimension.',
        'Add automated GitHub CI workflows to personal project repositories.',
        'Participate in peer code reviews on educator cohort boards.',
      ],
    };
  }

  /**
   * Conduct simulated AI Mock Interview
   */
  async conductMockInterview(params: {
    userId: string;
    mode: 'technical' | 'behavioral' | 'system_design' | 'coding' | 'hr';
    questionNumber: number;
    candidateAnswer?: string;
  }) {
    const profile = this.dataStore.profiles.get(params.userId);
    const targetRole = profile?.targetRole || 'Full-Stack AI Systems Engineer';

    const result = await this.aiService.conductMockInterview({
      mode: params.mode,
      targetRole,
      questionNumber: params.questionNumber,
      candidateAnswer: params.candidateAnswer,
    });

    // If interview completed with final evaluation, update profile interview dimension
    if (result.isComplete && result.finalEvaluation && profile) {
      if (profile.readinessDimensions) {
        profile.readinessDimensions.interview = Math.round(
          (profile.readinessDimensions.interview + result.finalEvaluation.overallScore) / 2,
        );
      }
      this.dataStore.profiles.set(params.userId, profile);
    }

    return result;
  }
}
