import { Injectable } from '@nestjs/common';
import { DataStoreService } from '../../database/data-store.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly dataStore: DataStoreService) {}

  getLearnerAnalytics(userId: string) {
    const profile = this.dataStore.profiles.get(userId);

    return {
      readinessTrajectory: [
        { month: 'May', score: 45 },
        { month: 'Jun', score: 58 },
        { month: 'Jul', score: 66 },
        { month: 'Aug', score: 74 },
        { month: 'Sep', score: 79 },
        { month: 'Oct', score: profile?.readinessScore || 84 },
      ],
      weeklyStudyHours: [
        { day: 'Mon', hours: 3.5 },
        { day: 'Tue', hours: 4.0 },
        { day: 'Wed', hours: 2.5 },
        { day: 'Thu', hours: 5.0 },
        { day: 'Fri', hours: 4.5 },
        { day: 'Sat', hours: 6.0 },
        { day: 'Sun', hours: 3.0 },
      ],
      skillProficiencyDistribution: profile?.skills.map((s) => ({
        skill: s.name,
        proficiency: s.proficiency,
        confidence: s.confidence,
        verified: s.verified,
      })) || [],
      assessmentScoreTrend: [
        { test: 'JS Fundamentals', score: 85 },
        { test: 'React Internals', score: 88 },
        { test: 'TypeScript Enterprise', score: 92 },
        { test: 'NestJS Dependency Injection', score: 86 },
        { test: 'RAG & Vector Retrieval', score: 84 },
      ],
    };
  }

  getEmployerFunnel(companyId?: string) {
    return {
      funnel: [
        { stage: 'Matched Candidates', count: 142 },
        { stage: 'Profile Screened', count: 86 },
        { stage: 'Technical Assessment', count: 42 },
        { stage: 'AI Mock Interview Passed', count: 28 },
        { stage: 'Final Engineering Interview', count: 14 },
        { stage: 'Offers Extended', count: 8 },
        { stage: 'Hired', count: 6 },
      ],
      averageTimeToHireDays: 14,
      retentionProbability: '94%',
      topVerifiedSkillsInDemand: ['TypeScript', 'NestJS', 'Next.js', 'RAG & Vector Search', 'Docker'],
    };
  }
}
