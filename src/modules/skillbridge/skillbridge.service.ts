import { Injectable, NotFoundException } from '@nestjs/common';
import { DataStoreService, RoadmapEntity } from '../../database/data-store.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class SkillBridgeService {
  constructor(
    private readonly dataStore: DataStoreService,
    private readonly aiService: AiService,
  ) {}

  async getActiveRoadmap(userId: string): Promise<RoadmapEntity> {
    const roadmap = Array.from(this.dataStore.roadmaps.values()).find(
      (r) => r.userId === userId,
    );
    if (!roadmap) {
      // Auto-generate default 30-day roadmap if not exists
      return this.generateRoadmap(userId, 'Full-Stack AI Systems Engineer', 30);
    }
    return roadmap;
  }

  async generateRoadmap(userId: string, targetRole: string, durationDays: number): Promise<RoadmapEntity> {
    const profile = this.dataStore.profiles.get(userId);
    const userSkills = profile?.skills.map((s) => s.name) || ['JavaScript', 'HTML5', 'CSS3'];

    const aiPlan = await this.aiService.generateRoadmap(targetRole, userSkills, durationDays);

    const roadmapId = `rdm-${Date.now()}`;
    const newRoadmap: RoadmapEntity = {
      id: roadmapId,
      userId,
      targetRole,
      durationDays,
      progressPercent: 0,
      summary: aiPlan.summary,
      milestones: aiPlan.milestones.map((m) => ({
        dayRange: m.dayRange,
        title: m.title,
        focusSkill: m.focusSkill,
        completed: false,
        learningObjectives: m.learningObjectives,
        tasks: m.tasks,
        projectPrompt: m.projectPrompt,
        assessmentTopic: m.assessmentTopic,
      })),
      createdAt: new Date().toISOString(),
    };

    this.dataStore.roadmaps.set(roadmapId, newRoadmap);
    if (profile) {
      profile.activeRoadmapId = roadmapId;
      profile.targetRole = targetRole;
      this.dataStore.profiles.set(userId, profile);
    }

    return newRoadmap;
  }

  async toggleMilestone(userId: string, roadmapId: string, milestoneIndex: number) {
    const roadmap = this.dataStore.roadmaps.get(roadmapId);
    if (!roadmap || roadmap.userId !== userId) {
      throw new NotFoundException('Roadmap not found for user');
    }

    if (roadmap.milestones[milestoneIndex]) {
      roadmap.milestones[milestoneIndex].completed = !roadmap.milestones[milestoneIndex].completed;
      
      const completedCount = roadmap.milestones.filter((m) => m.completed).length;
      roadmap.progressPercent = Math.round((completedCount / roadmap.milestones.length) * 100);

      this.dataStore.roadmaps.set(roadmapId, roadmap);
    }

    return roadmap;
  }
}
