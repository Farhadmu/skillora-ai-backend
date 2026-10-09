import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { Profile, ProfileDocument } from '../../database/schemas/profile.schema';
import { Course, CourseDocument } from '../../database/schemas/learning.schema';
import { Assessment, AssessmentDocument } from '../../database/schemas/assessment.schema';
import { Notification, NotificationDocument } from '../../database/schemas/communication.schema';
import { AiService } from '../ai/ai.service';

@Injectable()
export class EducatorService {
  constructor(
    @InjectModel(Profile.name) private readonly profileModel: Model<ProfileDocument>,
    @InjectModel(Course.name) private readonly courseModel: Model<CourseDocument>,
    @InjectModel(Assessment.name) private readonly assessmentModel: Model<AssessmentDocument>,
    @InjectModel(Notification.name) private readonly notificationModel: Model<NotificationDocument>,
    private readonly aiService: AiService,
  ) {}

  async getCohortOverview() {
    const learners = await this.profileModel.find().lean();

    // Compute intervention alerts
    const alerts = learners
      .filter((l: any) => (l.readinessScore || 0) < 70 || (l.weeklyHours || 0) < 10)
      .map((l: any) => ({
        learnerId: l.userId,
        name: l.name,
        targetRole: l.targetRole,
        readinessScore: l.readinessScore || 0,
        weeklyHours: l.weeklyHours || 0,
        alertType: (l.readinessScore || 0) < 70 ? 'Struggling with Core Verification' : 'Low Weekly Engagement',
        recommendedIntervention:
          (l.readinessScore || 0) < 70
            ? 'Assign Socratic Practice Lab on TypeScript & Backend Patterns'
            : 'Schedule 15-minute 1-on-1 career alignment checkpoint',
      }));

    const courses = await this.courseModel.find().lean();
    const curriculumModules = courses.map((c: any) => ({
      id: c.id || c._id.toString(),
      title: c.title,
      completionRate: 0,
    }));

    return {
      cohortName: 'Enterprise AI Systems & Engineering Cohort',
      totalLearners: learners.length,
      averageReadiness:
        learners.length > 0
          ? Math.round(learners.reduce((acc: number, l: any) => acc + (l.readinessScore || 0), 0) / learners.length)
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
    const generated = await this.aiService.generateQuizForEducator(
      params.topic,
      params.questionCount || 4,
    );

    const assessmentId = `asm-${Date.now()}`;
    const assessment = {
      id: assessmentId,
      title: generated.title,
      category: params.category || 'Engineering',
      skillName: params.topic,
      difficulty: params.difficulty || 'Intermediate',
      durationMinutes: 15,
      passingScore: 75,
      questionsCount: generated.questions?.length || 0,
      questions: (generated.questions || []).map((q: any) => ({
        id: q.id,
        type: 'mcq',
        prompt: q.prompt,
        options: q.options || [],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || '',
      })),
    };

    if (params.publishDirectly) {
      await this.assessmentModel.create(assessment);
    }

    return {
      success: true,
      assessment,
      isPublished: !!params.publishDirectly,
      message: params.publishDirectly
        ? `Assessment "${assessment.title}" published directly to student catalog in MongoDB!`
        : `Assessment generated for educator review.`,
    };
  }

  /**
   * Dispatch Socratic Intervention
   */
  async dispatchIntervention(learnerId: string, interventionNote: string, actionType: string = 'Socratic Practice Lab') {
    const query: any[] = [{ userId: learnerId }];
    if (isValidObjectId(learnerId)) query.push({ _id: learnerId });

    const profile = await this.profileModel.findOne({ $or: query });
    if (!profile) {
      throw new NotFoundException(`Learner ${learnerId} not found`);
    }

    // Append to learner evidence / tasks
    const skills = profile.skills || [];
    skills.forEach((s: any) => {
      if ((s.proficiency || 0) < 70) {
        s.evidence = Array.from(new Set([...(s.evidence || []), `Educator Intervention Assigned: ${actionType} - "${interventionNote}"`]));
      }
    });
    profile.skills = skills;
    await profile.save();

    await this.notificationModel.create({
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
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
