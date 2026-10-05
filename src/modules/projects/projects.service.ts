import { Injectable, NotFoundException } from '@nestjs/common';
import { DataStoreService, ProjectEntity } from '../../database/data-store.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly dataStore: DataStoreService,
    private readonly aiService: AiService,
  ) {}

  getAllProjects(category?: string, difficulty?: string) {
    let list = Array.from(this.dataStore.projects.values());
    if (category && category !== 'All') {
      list = list.filter((p) => p.category.toLowerCase().includes(category.toLowerCase()));
    }
    if (difficulty && difficulty !== 'All') {
      list = list.filter((p) => p.difficulty.toLowerCase() === difficulty.toLowerCase());
    }
    return list;
  }

  getProjectById(id: string): ProjectEntity {
    const project = this.dataStore.projects.get(id);
    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }
    return project;
  }

  /**
   * Recommend projects based on missing learner skills
   */
  recommendProjects(userId: string) {
    const profile = this.dataStore.profiles.get(userId);
    const userSkillNames = new Set(profile?.skills.map((s) => s.name.toLowerCase()) || []);

    const allProjects = Array.from(this.dataStore.projects.values());
    const scored = allProjects.map((proj) => {
      // Score higher if project teaches skills the user DOES NOT have yet
      const missingTargets = proj.targetSkills.filter((s) => !userSkillNames.has(s.toLowerCase()));
      const relevanceScore = missingTargets.length * 20 + (proj.difficulty === 'Intermediate' ? 10 : 5);
      return {
        ...proj,
        relevanceScore,
        skillsYouWillLearn: missingTargets,
      };
    });

    scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
    return scored.slice(0, 6);
  }

  /**
   * AI Code Reviewer with Skill Evidence Awarding
   */
  async reviewCode(code: string, language: string, context?: string, userId?: string) {
    const review = await this.aiService.reviewCode(code, language || 'TypeScript', context);
    if (userId) {
      this.dataStore.logAnalyticsEvent({
        eventName: 'code_reviewed',
        userId,
        metadata: { language, score: review.score },
      });

      if (review.score >= 75) {
        const profile = this.dataStore.profiles.get(userId);
        if (profile) {
          if (profile.readinessDimensions) {
            profile.readinessDimensions.projects = Math.min(
              Math.round(profile.readinessDimensions.projects * 0.9 + review.score * 0.1),
              100,
            );
          }
          this.dataStore.saveProfile(profile);

          this.dataStore.recordSkillEvidence({
            userId,
            skillId: language.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            skillName: language,
            evidenceType: 'CODE_REVIEW',
            title: `AI Verified Code Review (${review.score}%)`,
            score: review.score,
            verified: true,
          });

          this.dataStore.recordNotification({
            userId,
            title: `Code Review Passed: ${language}`,
            message: `Your code submission passed with a score of ${review.score}%. Project readiness increased!`,
            type: 'skill_improvement',
            link: '/learner/skills/evidence',
          });
        }
      }
    }
    return review;
  }
}
