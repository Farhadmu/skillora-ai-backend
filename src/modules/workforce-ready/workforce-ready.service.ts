import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { Profile, ProfileDocument } from '../../database/schemas/profile.schema';
import { AssessmentAttempt, AssessmentAttemptDocument } from '../../database/schemas/assessment.schema';
import { SkillEvidence, SkillEvidenceDocument } from '../../database/schemas/skill.schema';
import { Notification, NotificationDocument } from '../../database/schemas/communication.schema';
import { AnalyticsEvent, AnalyticsEventDocument } from '../../database/schemas/analytics-audit.schema';
import { AiService } from '../ai/ai.service';

@Injectable()
export class WorkforceReadyService {
  constructor(
    @InjectModel(Profile.name) private readonly profileModel: Model<ProfileDocument>,
    @InjectModel(AssessmentAttempt.name) private readonly attemptModel: Model<AssessmentAttemptDocument>,
    @InjectModel(SkillEvidence.name) private readonly evidenceModel: Model<SkillEvidenceDocument>,
    @InjectModel(Notification.name) private readonly notificationModel: Model<NotificationDocument>,
    @InjectModel(AnalyticsEvent.name) private readonly analyticsModel: Model<AnalyticsEventDocument>,
    private readonly aiService: AiService,
  ) {}

  /**
   * Calculate 7-dimension readiness index for user based on real evidence
   */
  async getReadinessScore(userId: string) {
    const query: any[] = [{ userId }];
    if (isValidObjectId(userId)) query.push({ _id: userId });

    const profile = await this.profileModel.findOne({ $or: query });
    if (!profile) {
      throw new NotFoundException(`Profile for user ${userId} not found`);
    }

    const verifiedSkills = (profile.skills || []).filter((s: any) => s.verified);
    const verifiedSkillsCount = verifiedSkills.length;

    // Get actual user attempts from MongoDB
    const userAttempts = await this.attemptModel.find({ userId }).lean();

    // Get actual user skill evidences from MongoDB
    const userEvidences = await this.evidenceModel.find({ userId }).lean();

    // 1. Technical Rigor (based on profile skills proficiency)
    const skills = profile.skills || [];
    const technical =
      skills.length > 0
        ? Math.round(skills.reduce((acc: number, s: any) => acc + (s.proficiency || 0), 0) / skills.length)
        : 0;

    // 2. Problem Solving (based on completed assessments)
    const problemSolving =
      userAttempts.length > 0
        ? Math.round(userAttempts.reduce((acc: number, a: any) => acc + (a.score || 0), 0) / userAttempts.length)
        : 0;

    // 3. Applied Projects (based on project submissions and code reviews)
    const projectEvidences = userEvidences.filter(
      (e: any) => e.evidenceType === 'PROJECT' || e.evidenceType === 'CODE_REVIEW',
    );
    const projects =
      projectEvidences.length > 0
        ? Math.min(
            Math.round(projectEvidences.reduce((acc: number, e: any) => acc + (e.score || 80), 0) / projectEvidences.length),
            100,
          )
        : 0;

    // 4. Interview Mastery (based on mock interview sessions)
    const interviewEvidences = userEvidences.filter(
      (e: any) => e.evidenceType === 'INTERVIEW' || e.skillId === 'mock-interview',
    );
    const interview =
      interviewEvidences.length > 0
        ? Math.min(
            Math.round(interviewEvidences.reduce((acc: number, e: any) => acc + (e.score || 75), 0) / interviewEvidences.length),
            100,
          )
        : 0;

    // 5. Communication (derived from interview evaluations)
    const communication = interview > 0 ? Math.min(interview + 5, 100) : 0;

    // 6. Role Alignment (overlap with target role core requirements)
    const roleRequirementsMap: Record<string, string[]> = {
      'Full-Stack AI Systems Engineer': [
        'TypeScript',
        'NestJS',
        'React',
        'Next.js',
        'MongoDB',
        'RAG (Retrieval-Augmented Generation)',
      ],
      'Backend Node.js & Cloud Architect': ['TypeScript', 'Node.js', 'NestJS', 'PostgreSQL', 'Docker'],
      'Frontend & UI/UX Specialist': ['JavaScript', 'TypeScript', 'React', 'Next.js', 'Tailwind CSS'],
      'AI/ML Systems Researcher': ['Python', 'RAG (Retrieval-Augmented Generation)', 'Vector Embeddings', 'PyTorch'],
    };
    const reqs =
      roleRequirementsMap[profile.targetRole] || roleRequirementsMap['Full-Stack AI Systems Engineer'];
    const userSkillNames = new Set(skills.map((s: any) => s.name.toLowerCase()));
    const matchingReqs = reqs.filter((r) => userSkillNames.has(r.toLowerCase()));
    const roleAlignment = reqs.length > 0 ? Math.round((matchingReqs.length / reqs.length) * 100) : 0;

    // 7. Production Practical (hands-on project evidence + technical execution)
    const practical =
      projects > 0 || technical > 0 ? Math.round(projects * 0.6 + technical * 0.4) : 0;

    const dimensions = {
      technical,
      problemSolving,
      projects,
      communication,
      interview,
      roleAlignment,
      practical,
    };

    // Weighted composite overall readiness score
    const overallScore = Math.round(
      technical * 0.25 +
        problemSolving * 0.2 +
        projects * 0.2 +
        communication * 0.1 +
        interview * 0.1 +
        roleAlignment * 0.1 +
        practical * 0.05,
    );

    // Persist re-evaluated readiness score and dimensions back to profile in MongoDB
    profile.readinessScore = overallScore;
    profile.readinessDimensions = dimensions as any;
    await profile.save();

    const percentileRank = Math.min(Math.round((overallScore / 100) * 94) + 5, 99);

    const strengths: string[] = [];
    const recommendations: string[] = [];

    if (technical >= 75) strengths.push('Strong core technical foundations');
    else recommendations.push('Take verified technical assessments to validate foundational skills');

    if (projects >= 70) strengths.push('Demonstrated real-world project execution');
    else recommendations.push('Submit a full-stack project or repository for automated AI code review');

    if (interview >= 70) strengths.push('High performance in mock technical interviews');
    else recommendations.push('Practice with the AI Mock Interview simulator to build communication confidence');

    return {
      overallScore,
      percentileRank,
      verifiedSkillsCount,
      dimensions,
      targetRole: profile.targetRole,
      isWorkforceReady: overallScore >= 75,
      readinessBadge:
        overallScore >= 85
          ? 'Elite Enterprise Ready'
          : overallScore >= 70
          ? 'Workforce Ready'
          : 'In Training',
      strengths,
      recommendations,
    };
  }

  /**
   * Conduct simulated AI Mock Interview
   */
  async conductMockInterview(params: {
    userId: string;
    mode: 'technical' | 'behavioral' | 'system_design' | 'coding' | 'hr';
    questionNumber: number;
    candidateAnswer?: string;
  }) {
    const profile = await this.profileModel.findOne({ userId: params.userId });
    const targetRole = profile?.targetRole || 'Full-Stack AI Systems Engineer';

    const result = await this.aiService.conductMockInterview({
      mode: params.mode,
      targetRole,
      questionNumber: params.questionNumber,
      candidateAnswer: params.candidateAnswer,
    });

    if (result.isComplete && result.finalEvaluation && profile) {
      if (profile.readinessDimensions) {
        profile.readinessDimensions.interview = Math.round(
          ((profile.readinessDimensions.interview || 0) + result.finalEvaluation.overallScore) / 2,
        );
      }
      await profile.save();

      await this.evidenceModel.create({
        id: `evi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        userId: params.userId,
        skillId: 'mock-interview',
        skillName: `${params.mode.toUpperCase()} Mock Interview`,
        evidenceType: 'INTERVIEW',
        title: `AI Mock Interview (${result.finalEvaluation.overallScore}%)`,
        score: result.finalEvaluation.overallScore,
        verified: true,
      });

      await this.notificationModel.create({
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        userId: params.userId,
        title: 'Mock Interview Completed',
        message: `Your ${params.mode} interview simulation scored ${result.finalEvaluation.overallScore}%. Interview readiness updated!`,
        type: 'interview',
        link: '/learner/readiness',
      });

      await this.analyticsModel.create({
        eventName: 'interview_completed',
        userId: params.userId,
        metadata: {
          mode: params.mode,
          score: result.finalEvaluation.overallScore,
        },
      }).catch(() => {});
    }

    return result;
  }
}
