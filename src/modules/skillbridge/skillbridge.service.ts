import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { Roadmap, RoadmapDocument } from '../../database/schemas/roadmap.schema';
import { Profile, ProfileDocument } from '../../database/schemas/profile.schema';
import { AnalyticsEvent, AnalyticsEventDocument } from '../../database/schemas/analytics-audit.schema';
import { AiService } from '../ai/ai.service';

@Injectable()
export class SkillBridgeService {
  constructor(
    @InjectModel(Roadmap.name) private readonly roadmapModel: Model<RoadmapDocument>,
    @InjectModel(Profile.name) private readonly profileModel: Model<ProfileDocument>,
    @InjectModel(AnalyticsEvent.name) private readonly analyticsModel: Model<AnalyticsEventDocument>,
    private readonly aiService: AiService,
  ) {}

  async getActiveRoadmap(userId: string) {
    const query: any[] = [{ userId }];
    if (isValidObjectId(userId)) query.push({ _id: userId });

    const roadmap = await this.roadmapModel
      .findOne({ $or: query, status: 'active' })
      .sort({ createdAt: -1 })
      .lean();

    return roadmap || null;
  }

  async generateRoadmap(userId: string, targetRole: string, durationDays: number) {
    const profile = await this.profileModel.findOne({ userId });
    const userSkills = (profile?.skills || []).map((s: any) => s.name);

    let plan: any;
    try {
      plan = await this.aiService.generateRoadmap(targetRole, userSkills, durationDays);
    } catch {
      plan = this.generateBaselineCurriculum(targetRole, userSkills, durationDays);
    }

    const roadmapId = `rdm-${Date.now()}`;
    const newRoadmap = await this.roadmapModel.create({
      id: roadmapId,
      userId,
      targetRole,
      durationDays,
      progressPercent: 0,
      summary: plan.summary,
      status: 'active',
      milestones: plan.milestones.map((m: any) => ({
        dayRange: m.dayRange,
        title: m.title,
        focusSkill: m.focusSkill,
        completed: false,
        learningObjectives: m.learningObjectives,
        tasks: Array.isArray(m.tasks)
          ? m.tasks.map((t: any, idx: number) => ({
              id: typeof t === 'string' ? `task-${idx}` : t.id || `task-${idx}`,
              title: typeof t === 'string' ? t : t.title,
              type: typeof t === 'object' && t.type ? t.type : 'practice',
              completed: false,
              estimatedMinutes: typeof t === 'object' && t.estimatedMinutes ? t.estimatedMinutes : 30,
            }))
          : [],
        projectPrompt: m.projectPrompt,
        assessmentTopic: m.assessmentTopic,
      })),
    });

    if (profile) {
      profile.activeRoadmapId = roadmapId;
      profile.targetRole = targetRole;
      await profile.save();
    }

    await this.analyticsModel.create({
      eventName: 'roadmap_generated',
      userId,
      metadata: { targetRole, durationDays, milestoneCount: newRoadmap.milestones.length },
    }).catch(() => {});

    return newRoadmap.toObject ? newRoadmap.toObject() : newRoadmap;
  }

  async toggleMilestone(userId: string, roadmapId: string, milestoneIndex: number) {
    const query: any[] = [{ id: roadmapId }, { userId }];
    if (isValidObjectId(roadmapId)) query.push({ _id: roadmapId });

    let roadmap = await this.roadmapModel.findOne({ $or: query });
    if (!roadmap) {
      throw new NotFoundException('Roadmap not found for user');
    }

    if (roadmap.milestones && roadmap.milestones[milestoneIndex]) {
      const wasCompleted = roadmap.milestones[milestoneIndex].completed;
      roadmap.milestones[milestoneIndex].completed = !wasCompleted;

      const completedCount = roadmap.milestones.filter((m: any) => m.completed).length;
      roadmap.progressPercent = Math.round((completedCount / roadmap.milestones.length) * 100);

      await roadmap.save();

      if (!wasCompleted) {
        await this.analyticsModel.create({
          eventName: 'roadmap_milestone_completed',
          userId,
          metadata: {
            roadmapId: roadmap.id,
            milestoneIndex,
            milestoneTitle: roadmap.milestones[milestoneIndex].title,
            progressPercent: roadmap.progressPercent,
          },
        }).catch(() => {});
      }
    }

    return roadmap.toObject ? roadmap.toObject() : roadmap;
  }

  private generateBaselineCurriculum(targetRole: string, currentSkills: string[], durationDays: number) {
    const isShort = durationDays <= 30;
    return {
      role: targetRole,
      durationDays,
      summary: `Structured ${durationDays}-day accelerated workforce transition curriculum for ${targetRole} (Deterministic Verified Track).`,
      milestones: [
        {
          dayRange: isShort ? 'Days 1-10' : 'Weeks 1-4',
          title: 'Core Domain Mechanics & Architectural Patterns',
          focusSkill: currentSkills[0] || 'Core Architecture',
          learningObjectives: [
            'Master primary programming patterns and runtime execution flow',
            'Implement type-safe schema definitions and input validation guards',
          ],
          tasks: [
            'Review canonical reference documentation and language standards',
            'Build a clean service module with modular dependency injection',
          ],
          projectPrompt: 'Develop a validated REST microservice with rate-limiting and logging',
          assessmentTopic: 'Core Architecture',
        },
        {
          dayRange: isShort ? 'Days 11-20' : 'Weeks 5-8',
          title: 'Database Persistence, Query Indexing & Security Guards',
          focusSkill: 'Database Architecture & Security',
          learningObjectives: [
            'Optimize database schemas with compound ESR indexes',
            'Enforce tenant isolation, session revocation, and RBAC guards',
          ],
          tasks: [
            'Add compound and sparse indexing to data models',
            'Verify refresh token rotation and reuse revocation workflows',
          ],
          projectPrompt: 'Implement high-throughput persistent data access layer',
          assessmentTopic: 'Database & Security',
        },
        {
          dayRange: isShort ? 'Days 21-30' : 'Weeks 9-12',
          title: 'Vector Search, Verification Portfolios & Production Hardening',
          focusSkill: 'Distributed Systems & Vector Retrieval',
          learningObjectives: [
            'Connect dense vector search and grounded retrieval with source citations',
            'Attain commercial employability status across the 7-D readiness metric',
          ],
          tasks: [
            'Ingest technical documentation and test semantic vector retrieval',
            'Pass verification assessment exam with 80%+ verified score',
          ],
          projectPrompt: 'Deliver production capstone solution ready for employer recruitment',
          assessmentTopic: 'Production Systems',
        },
      ],
    };
  }
}
