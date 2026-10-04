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
   * AI Code Reviewer
   */
  async reviewCode(code: string, language: string, context?: string) {
    return this.aiService.reviewCode(code, language || 'TypeScript', context);
  }
}
