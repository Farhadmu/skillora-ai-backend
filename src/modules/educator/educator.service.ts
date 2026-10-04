import { Injectable } from '@nestjs/common';
import { DataStoreService } from '../../database/data-store.service';

@Injectable()
export class EducatorService {
  constructor(private readonly dataStore: DataStoreService) {}

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

    return {
      cohortName: 'Fall 2026 AI Systems & Distributed Engineering Cohort',
      totalLearners: learners.length,
      averageReadiness: Math.round(
        learners.reduce((acc, l) => acc + l.readinessScore, 0) / (learners.length || 1),
      ),
      activeInterventionsCount: alerts.length,
      alerts,
      curriculumModules: [
        { id: 'mod-1', title: 'Module 1: Strict TypeScript & Clean Backend Architecture', completionRate: 94 },
        { id: 'mod-2', title: 'Module 2: RAG, Embeddings & Gemini Foundation Models', completionRate: 82 },
        { id: 'mod-3', title: 'Module 3: Containerization & Cloud Deployment Verification', completionRate: 65 },
        { id: 'mod-4', title: 'Module 4: Enterprise Mock Interviews & Placement Readiness', completionRate: 48 },
      ],
    };
  }
}
