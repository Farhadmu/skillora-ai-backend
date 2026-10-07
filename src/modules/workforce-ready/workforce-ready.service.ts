import { Injectable, NotFoundException } from '@nestjs/common';
import { DataStoreService } from '../../database/data-store.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class WorkforceReadyService {
  constructor(
    private readonly dataStore: DataStoreService,
    private readonly aiService: AiService,
  ) {}

  /**
   * Calculate 7-dimension readiness index for user
   */
  async getReadinessScore(userId: string) {
    const profile = this.dataStore.profiles.get(userId);
    if (!profile) {
      throw new NotFoundException(`Profile for user ${userId} not found`);
    }

    const verifiedSkills = profile.skills.filter((s) => s.verified);
    const verifiedSkillsCount = verifiedSkills.length;

    // Get actual user attempts
    const userAttempts = Array.from(this.dataStore.assessmentAttempts.values()).filter(
      (a) => a.userId === userId,
    );

    // Get actual user skill evidences
    const userEvidences = Array.from(this.dataStore.skillEvidences.values()).filter(
      (e) => e.userId === userId,
    );

    // 1. Technical Rigor (based on profile skills proficiency)
    const technical = profile.skills.length > 0
      ? Math.round(
          profile.skills.reduce((acc, s) => acc + s.proficiency, 0) / profile.skills.length,
        )
      : 0;

    // 2. Problem Solving (based on completed assessments)
    const passedAssessments = userAttempts.filter((a) => a.passed);
    const problemSolving = userAttempts.length > 0
      ? Math.round(
          userAttempts.reduce((acc, a) => acc + (a.score || 0), 0) / userAttempts.length,
        )
      : 0;

    // 3. Applied Projects (based on project submissions and code reviews)
    const projectEvidences = userEvidences.filter(
      (e) => e.evidenceType === 'PROJECT' || e.evidenceType === 'CODE_REVIEW',
    );
    const projects = projectEvidences.length > 0
      ? Math.min(
          Math.round(projectEvidences.reduce((acc, e) => acc + (e.score || 80), 0) / projectEvidences.length),
          100,
        )
      : 0;

    // 4. Interview Mastery (based on mock interview sessions)
    const interviewEvidences = userEvidences.filter(
      (e) => e.evidenceType === 'INTERVIEW' || e.skillId === 'mock-interview',
    );
    const interview = interviewEvidences.length > 0
      ? Math.min(
          Math.round(interviewEvidences.reduce((acc, e) => acc + (e.score || 75), 0) / interviewEvidences.length),
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
    const userSkillNames = new Set(profile.skills.map((s) => s.name.toLowerCase()));
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

    const overall = Math.round(
      dimensions.technical * 0.25 +
        dimensions.problemSolving * 0.2 +
        dimensions.projects * 0.15 +
        dimensions.communication * 0.1 +
        dimensions.interview * 0.15 +
        dimensions.roleAlignment * 0.1 +
        dimensions.practical * 0.05,
    );

    profile.readinessScore = overall;
    profile.readinessDimensions = dimensions;
    this.dataStore.saveProfile(profile);

    // Build real explainable strengths
    const strengths: string[] = [];
    if (technical >= 70) {
      strengths.push(
        `Verified competency across ${verifiedSkillsCount} skills including ${verifiedSkills.slice(0, 2).map((s) => s.name).join(', ')}`,
      );
    }
    if (problemSolving >= 70) {
      strengths.push(`Assessment consistency with ${passedAssessments.length} passed technical drill(s)`);
    }
    if (projects >= 70) {
      strengths.push(`Hands-on engineering via ${projectEvidences.length} verified project submission(s)`);
    }
    if (interview >= 70) {
      strengths.push('Demonstrated communication and architectural readiness in mock interviews');
    }

    // Build real actionable recommendations
    const recommendations: string[] = [];
    if (profile.skills.length === 0) {
      recommendations.push('Analyze your CV or add skills to initialize your competency profile.');
    }
    if (userAttempts.length === 0) {
      recommendations.push('Complete your first skill assessment to prove technical rigor.');
    }
    if (projectEvidences.length === 0) {
      recommendations.push('Submit a verified project or code review to build practical project evidence.');
    }
    if (interviewEvidences.length === 0) {
      recommendations.push('Conduct a simulated AI mock interview to establish communication and interview scores.');
    }
    if (recommendations.length === 0 && overall < 90) {
      recommendations.push('Solidify advanced system design patterns to reach top-tier employer match eligibility.');
    }

    return {
      overallScore: overall,
      targetRole: profile.targetRole,
      verifiedSkillsCount,
      dimensions,
      employabilityStatus:
        overall >= 80
          ? 'Job Ready (High Match Potential)'
          : overall >= 50
          ? 'Placement Developing'
          : overall > 0
          ? 'Foundational Progress'
          : 'Pending Evaluation',
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
    const profile = this.dataStore.profiles.get(params.userId);
    const targetRole = profile?.targetRole || 'Full-Stack AI Systems Engineer';

    const result = await this.aiService.conductMockInterview({
      mode: params.mode,
      targetRole,
      questionNumber: params.questionNumber,
      candidateAnswer: params.candidateAnswer,
    });

    // If interview completed with final evaluation, update profile interview dimension
    if (result.isComplete && result.finalEvaluation && profile) {
      if (profile.readinessDimensions) {
        profile.readinessDimensions.interview = Math.round(
          (profile.readinessDimensions.interview + result.finalEvaluation.overallScore) / 2,
        );
      }
      this.dataStore.saveProfile(profile);

      this.dataStore.recordSkillEvidence({
        userId: params.userId,
        skillId: 'mock-interview',
        skillName: `${params.mode.toUpperCase()} Mock Interview`,
        evidenceType: 'INTERVIEW',
        title: `AI Mock Interview (${result.finalEvaluation.overallScore}%)`,
        score: result.finalEvaluation.overallScore,
        verified: true,
      });

      this.dataStore.recordNotification({
        userId: params.userId,
        title: 'Mock Interview Completed',
        message: `Your ${params.mode} interview simulation scored ${result.finalEvaluation.overallScore}%. Interview readiness updated!`,
        type: 'interview',
        link: '/learner/readiness',
      });

      this.dataStore.logAnalyticsEvent({
        eventName: 'interview_completed',
        userId: params.userId,
        metadata: {
          mode: params.mode,
          score: result.finalEvaluation.overallScore,
        },
      });
    }

    return result;
  }
}
