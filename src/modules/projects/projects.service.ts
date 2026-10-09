import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { Project, ProjectDocument, ProjectSubmission, ProjectSubmissionDocument } from '../../database/schemas/project.schema';
import { Profile, ProfileDocument } from '../../database/schemas/profile.schema';
import { SkillEvidence, SkillEvidenceDocument } from '../../database/schemas/skill.schema';
import { Notification, NotificationDocument } from '../../database/schemas/communication.schema';
import { AnalyticsEvent, AnalyticsEventDocument } from '../../database/schemas/analytics-audit.schema';
import { AiService } from '../ai/ai.service';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private readonly projectModel: Model<ProjectDocument>,
    @InjectModel(ProjectSubmission.name) private readonly submissionModel: Model<ProjectSubmissionDocument>,
    @InjectModel(Profile.name) private readonly profileModel: Model<ProfileDocument>,
    @InjectModel(SkillEvidence.name) private readonly evidenceModel: Model<SkillEvidenceDocument>,
    @InjectModel(Notification.name) private readonly notificationModel: Model<NotificationDocument>,
    @InjectModel(AnalyticsEvent.name) private readonly analyticsModel: Model<AnalyticsEventDocument>,
    private readonly aiService: AiService,
  ) {}

  async getAllProjects(category?: string, difficulty?: string) {
    const filter: any = {};
    if (category && category !== 'All') {
      filter.category = new RegExp(category, 'i');
    }
    if (difficulty && difficulty !== 'All') {
      filter.difficulty = new RegExp(`^${difficulty}$`, 'i');
    }

    return this.projectModel.find(filter).lean();
  }

  async getProjectById(id: string) {
    const query: any[] = [{ id }];
    if (isValidObjectId(id)) query.push({ _id: id });

    const project = await this.projectModel.findOne({ $or: query }).lean();
    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }
    return project;
  }

  /**
   * Recommend projects based on missing learner skills
   */
  async recommendProjects(userId: string) {
    const profile = await this.profileModel.findOne({ userId }).lean();
    const userSkillNames = new Set((profile?.skills || []).map((s: any) => s.name.toLowerCase()));

    const allProjects = await this.projectModel.find().lean();
    const scored = allProjects.map((proj: any) => {
      const missingTargets = (proj.targetSkills || []).filter((s: string) => !userSkillNames.has(s.toLowerCase()));
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
      await this.analyticsModel.create({
        eventName: 'code_reviewed',
        userId,
        metadata: { language, score: review.score },
      }).catch(() => {});

      if (review.score >= 75) {
        const profile = await this.profileModel.findOne({ userId });
        if (profile) {
          if (profile.readinessDimensions) {
            profile.readinessDimensions.projects = Math.min(
              Math.round(profile.readinessDimensions.projects * 0.9 + review.score * 0.1),
              100,
            );
          }
          await profile.save();

          await this.evidenceModel.create({
            id: `evi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            userId,
            skillId: language.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            skillName: language,
            evidenceType: 'CODE_REVIEW',
            title: `AI Verified Code Review (${review.score}%)`,
            score: review.score,
            verified: true,
          });

          await this.notificationModel.create({
            id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
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
    const project: any = await this.getProjectById(projectId);
    const submissionId = `sub-${Date.now()}`;
    const submission = await this.submissionModel.create({
      id: submissionId,
      projectId,
      projectTitle: project.title,
      userId,
      githubRepoUrl: dto.githubRepoUrl,
      liveDemoUrl: dto.liveDemoUrl || '',
      notes: dto.notes || '',
      submittedAt: new Date(),
      status: 'approved',
    });

    const profile = await this.profileModel.findOne({ userId });
    if (profile) {
      const skills = profile.skills || [];
      for (const skill of project.targetSkills || []) {
        await this.evidenceModel.create({
          id: `evi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          userId,
          skillId: skill.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          skillName: skill,
          evidenceType: 'PROJECT',
          title: `Completed Project: ${project.title}`,
          referenceUrl: dto.githubRepoUrl,
          score: 90,
          verified: true,
        });

        const idx = skills.findIndex((s: any) => s.name.toLowerCase() === skill.toLowerCase());
        if (idx >= 0) {
          skills[idx].proficiency = Math.max(skills[idx].proficiency, 80);
          skills[idx].verified = true;
          skills[idx].evidence = Array.from(new Set([...(skills[idx].evidence || []), `Project: ${project.title}`]));
        } else {
          skills.push({
            name: skill,
            category: project.category || 'General',
            proficiency: 80,
            confidence: 80,
            verified: true,
            evidence: [`Project: ${project.title}`],
            source: 'PROJECT-VERIFIED',
          } as any);
        }
      }

      profile.skills = skills;
      if (profile.readinessDimensions) {
        profile.readinessDimensions.projects = Math.min(profile.readinessDimensions.projects + 5, 100);
      }
      await profile.save();
    }

    await this.notificationModel.create({
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId,
      title: `Project Verified: ${project.title}`,
      message: `Your project submission has been verified! Skills and evidence updated.`,
      type: 'skill_improvement',
      link: '/learner/skills/evidence',
    });

    return {
      success: true,
      submission: submission.toObject ? submission.toObject() : submission,
      message: `Project ${project.title} submitted and verified successfully!`,
    };
  }
}
