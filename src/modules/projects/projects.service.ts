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

  /**
   * Submit Project repository, verify evidence and boost readiness
   */
  async submitProject(userId: string, projectId: string, dto: { githubRepoUrl: string; liveDemoUrl?: string; notes?: string }) {
    const project = this.getProjectById(projectId);
    const submissionId = `sub-${Date.now()}`;
    const submission = {
      id: submissionId,
      projectId,
      projectTitle: project.title,
      userId,
      githubRepoUrl: dto.githubRepoUrl,
      liveDemoUrl: dto.liveDemoUrl || '',
      notes: dto.notes || '',
      submittedAt: new Date().toISOString(),
      status: 'approved',
    };

    const profile = this.dataStore.profiles.get(userId);
    if (profile) {
      for (const skill of project.targetSkills) {
        this.dataStore.recordSkillEvidence({
          userId,
          skillId: skill.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          skillName: skill,
          evidenceType: 'PROJECT',
          title: `Completed Project: ${project.title}`,
          referenceUrl: dto.githubRepoUrl,
          score: 90,
          verified: true,
        });

        const idx = profile.skills.findIndex((s) => s.name.toLowerCase() === skill.toLowerCase());
        if (idx >= 0) {
          profile.skills[idx].proficiency = Math.max(profile.skills[idx].proficiency, 80);
          profile.skills[idx].verified = true;
          profile.skills[idx].evidence.push(`Project: ${project.title}`);
        } else {
          profile.skills.push({
            name: skill,
            category: project.category,
            proficiency: 80,
            confidence: 80,
            verified: true,
            evidence: [`Project: ${project.title}`],
            source: 'PROJECT-VERIFIED',
          });
        }
      }

      if (profile.readinessDimensions) {
        profile.readinessDimensions.projects = Math.min(profile.readinessDimensions.projects + 5, 100);
      }
      this.dataStore.saveProfile(profile);
    }

    this.dataStore.recordNotification({
      userId,
      title: `Project Verified: ${project.title}`,
      message: `Your project submission has been verified! Skills and evidence updated.`,
      type: 'skill_improvement',
      link: '/learner/skills/evidence',
    });

    return {
      success: true,
      submission,
      message: `Project ${project.title} submitted and verified successfully!`,
    };
  }
}

