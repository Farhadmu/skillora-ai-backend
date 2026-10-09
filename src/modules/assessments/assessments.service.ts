import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { Assessment, AssessmentDocument, AssessmentAttempt, AssessmentAttemptDocument } from '../../database/schemas/assessment.schema';
import { Profile, ProfileDocument } from '../../database/schemas/profile.schema';
import { Roadmap, RoadmapDocument } from '../../database/schemas/roadmap.schema';
import { SkillEvidence, SkillEvidenceDocument } from '../../database/schemas/skill.schema';
import { Notification, NotificationDocument } from '../../database/schemas/communication.schema';
import { AnalyticsEvent, AnalyticsEventDocument } from '../../database/schemas/analytics-audit.schema';

@Injectable()
export class AssessmentsService {
  constructor(
    @InjectModel(Assessment.name) private readonly assessmentModel: Model<AssessmentDocument>,
    @InjectModel(AssessmentAttempt.name) private readonly attemptModel: Model<AssessmentAttemptDocument>,
    @InjectModel(Profile.name) private readonly profileModel: Model<ProfileDocument>,
    @InjectModel(Roadmap.name) private readonly roadmapModel: Model<RoadmapDocument>,
    @InjectModel(SkillEvidence.name) private readonly evidenceModel: Model<SkillEvidenceDocument>,
    @InjectModel(Notification.name) private readonly notificationModel: Model<NotificationDocument>,
    @InjectModel(AnalyticsEvent.name) private readonly analyticsModel: Model<AnalyticsEventDocument>,
  ) {}

  async getAllAssessments(category?: string) {
    const filter: any = {};
    if (category && category !== 'All') {
      filter.category = new RegExp(`^${category}$`, 'i');
    }

    const list = await this.assessmentModel.find(filter).lean();
    return list.map((a: any) => ({
      id: a.id || a._id.toString(),
      title: a.title,
      category: a.category,
      skillName: a.skillName,
      difficulty: a.difficulty,
      durationMinutes: a.durationMinutes,
      passingScore: a.passingScore,
      questionsCount: a.questions?.length || a.questionsCount || 0,
    }));
  }

  async getAssessmentById(id: string) {
    const query: any[] = [{ id }];
    if (isValidObjectId(id)) query.push({ _id: id });

    const assessment = await this.assessmentModel.findOne({ $or: query }).lean();
    if (!assessment) {
      throw new NotFoundException(`Assessment ${id} not found`);
    }
    return assessment;
  }

  async createAssessment(data: any) {
    const id = data.id || `asm-custom-${Date.now()}`;
    const newAssessment = await this.assessmentModel.create({
      id,
      title: data.title || 'Custom Verified Technical Assessment',
      category: data.category || 'Engineering',
      skillName: data.skillName || 'Software Architecture',
      difficulty: data.difficulty || 'Intermediate',
      durationMinutes: data.durationMinutes || 15,
      passingScore: data.passingScore || 75,
      questionsCount: data.questions?.length || 0,
      questions: data.questions || [],
    });

    return newAssessment.toObject ? newAssessment.toObject() : newAssessment;
  }

  /**
   * Submit and evaluate assessment answers with real persistence
   */
  async submitAssessment(userId: string, assessmentId: string, answers: Record<string, any>) {
    const assessment: any = await this.getAssessmentById(assessmentId);
    let correctCount = 0;
    const questionFeedback: any[] = [];

    const questions = assessment.questions || [];
    for (const q of questions) {
      const userAnswer = answers[q.id];
      const isCorrect = String(userAnswer) === String(q.correctAnswer);
      if (isCorrect) correctCount++;

      questionFeedback.push({
        questionId: q.id,
        prompt: q.prompt,
        userAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect,
        explanation: q.explanation,
      });
    }

    const totalQuestions = questions.length || 1;
    const scorePercentage = Math.round((correctCount / totalQuestions) * 100);
    const passed = scorePercentage >= (assessment.passingScore || 70);

    // Update user profile skill verification
    const profile = await this.profileModel.findOne({ userId });
    if (profile) {
      const skills = profile.skills || [];
      const skillIndex = skills.findIndex(
        (s: any) => s.name.toLowerCase() === assessment.skillName.toLowerCase(),
      );

      if (skillIndex >= 0) {
        skills[skillIndex].proficiency = Math.max(skills[skillIndex].proficiency, scorePercentage);
        if (passed) {
          skills[skillIndex].verified = true;
          skills[skillIndex].evidence = Array.from(
            new Set([
              ...(skills[skillIndex].evidence || []),
              `Verified Assessment: ${assessment.title} (${scorePercentage}%)`,
            ]),
          );
        }
      } else {
        skills.push({
          name: assessment.skillName,
          category: assessment.category,
          proficiency: scorePercentage,
          confidence: scorePercentage,
          source: 'ASSESSMENT-VERIFIED',
          verified: passed,
          evidence: [`Verified Assessment: ${assessment.title} (${scorePercentage}%)`],
          learningProgress: scorePercentage,
        } as any);
      }

      profile.skills = skills;
      profile.readinessScore = Math.min(Math.round(profile.readinessScore * 0.85 + scorePercentage * 0.15), 100);
      if (profile.readinessDimensions) {
        profile.readinessDimensions.technical = Math.min(
          Math.round(profile.readinessDimensions.technical * 0.9 + scorePercentage * 0.1),
          100,
        );
      }
      await profile.save();
    }

    // Record granular attempt in MongoDB
    await this.attemptModel.create({
      id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId,
      assessmentId,
      assessmentTitle: assessment.title,
      skillName: assessment.skillName,
      score: scorePercentage,
      passed,
      totalQuestions,
      correctAnswers: correctCount,
      answers: questionFeedback,
      completedAt: new Date(),
    });

    // Record verified skill evidence if passed
    if (passed) {
      await this.evidenceModel.create({
        id: `evi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        userId,
        skillId: assessment.skillName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        skillName: assessment.skillName,
        evidenceType: 'ASSESSMENT',
        title: `Verified Assessment: ${assessment.title}`,
        score: scorePercentage,
        verified: true,
      });

      await this.notificationModel.create({
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        userId,
        title: `Verified Skill Awarded: ${assessment.skillName}`,
        message: `Congratulations! You scored ${scorePercentage}% on the ${assessment.title} assessment. Your employability score increased!`,
        type: 'skill_improvement',
        link: '/learner/skills/evidence',
      });
    }

    // Check and advance matching active roadmap milestones
    const userRoadmap = await this.roadmapModel.findOne({ userId, status: 'active' });
    if (userRoadmap && userRoadmap.milestones) {
      let roadmapUpdated = false;
      for (const milestone of userRoadmap.milestones) {
        if (
          milestone.focusSkill.toLowerCase().includes(assessment.skillName.toLowerCase()) ||
          milestone.assessmentTopic.toLowerCase().includes(assessment.skillName.toLowerCase())
        ) {
          if (passed && !milestone.completed) {
            milestone.completed = true;
            roadmapUpdated = true;
          }
        }
      }
      if (roadmapUpdated) {
        const completedCount = userRoadmap.milestones.filter((m: any) => m.completed).length;
        userRoadmap.progressPercent = Math.round((completedCount / userRoadmap.milestones.length) * 100);
        await userRoadmap.save();
      }
    }

    // Log analytics event
    await this.analyticsModel.create({
      eventName: 'assessment_completed',
      userId,
      metadata: {
        assessmentId,
        skillName: assessment.skillName,
        score: scorePercentage,
        passed,
      },
    }).catch(() => {});

    return {
      assessmentId,
      title: assessment.title,
      scorePercentage,
      passed,
      correctCount,
      totalQuestions,
      feedback: questionFeedback,
      verifiedSkillAwarded: passed ? assessment.skillName : null,
    };
  }
}
