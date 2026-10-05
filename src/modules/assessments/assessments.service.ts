import { Injectable, NotFoundException } from '@nestjs/common';
import { DataStoreService, AssessmentEntity } from '../../database/data-store.service';

@Injectable()
export class AssessmentsService {
  constructor(private readonly dataStore: DataStoreService) {}

  getAllAssessments(category?: string) {
    let list = Array.from(this.dataStore.assessments.values());
    if (category && category !== 'All') {
      list = list.filter((a) => a.category.toLowerCase() === category.toLowerCase());
    }
    return list.map((a) => ({
      id: a.id,
      title: a.title,
      category: a.category,
      skillName: a.skillName,
      difficulty: a.difficulty,
      durationMinutes: a.durationMinutes,
      passingScore: a.passingScore,
      questionsCount: a.questions.length,
    }));
  }

  getAssessmentById(id: string): AssessmentEntity {
    const assessment = this.dataStore.assessments.get(id);
    if (!assessment) {
      throw new NotFoundException(`Assessment ${id} not found`);
    }
    return assessment;
  }

  createAssessment(data: Partial<AssessmentEntity>) {
    const id = data.id || `asm-custom-${Date.now()}`;
    const newAssessment: AssessmentEntity = {
      id,
      title: data.title || 'Custom Verified Technical Assessment',
      category: data.category || 'Engineering',
      skillName: data.skillName || 'Software Architecture',
      difficulty: data.difficulty || 'Intermediate',
      durationMinutes: data.durationMinutes || 15,
      passingScore: data.passingScore || 75,
      questionsCount: data.questions?.length || 0,
      questions: data.questions || [],
    };
    this.dataStore.assessments.set(id, newAssessment);
    return newAssessment;
  }

  /**
   * Submit and evaluate assessment answers
   */
  async submitAssessment(userId: string, assessmentId: string, answers: Record<string, any>) {
    const assessment = this.getAssessmentById(assessmentId);
    let correctCount = 0;
    const questionFeedback: any[] = [];

    for (const q of assessment.questions) {
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

    const totalQuestions = assessment.questions.length;
    const scorePercentage = Math.round((correctCount / totalQuestions) * 100);
    const passed = scorePercentage >= assessment.passingScore;

    // Update user profile skill verification
    const profile = this.dataStore.profiles.get(userId);
    if (profile) {
      const skillIndex = profile.skills.findIndex(
        (s) => s.name.toLowerCase() === assessment.skillName.toLowerCase(),
      );

      if (skillIndex >= 0) {
        profile.skills[skillIndex].proficiency = Math.max(
          profile.skills[skillIndex].proficiency,
          scorePercentage,
        );
        if (passed) {
          profile.skills[skillIndex].verified = true;
          profile.skills[skillIndex].evidence.push(
            `Verified Assessment: ${assessment.title} (${scorePercentage}%)`,
          );
        }
      } else {
        profile.skills.push({
          name: assessment.skillName,
          category: assessment.category,
          proficiency: scorePercentage,
          confidence: scorePercentage,
          verified: passed,
          evidence: [`Verified Assessment: ${assessment.title} (${scorePercentage}%)`],
        });
      }

      // Recompute readiness score
      profile.readinessScore = Math.min(Math.round(profile.readinessScore * 0.85 + scorePercentage * 0.15), 100);
      if (profile.readinessDimensions) {
        profile.readinessDimensions.technical = Math.min(
          Math.round(profile.readinessDimensions.technical * 0.9 + scorePercentage * 0.1),
          100,
        );
      }
      this.dataStore.saveProfile(profile);

      // Record granular attempt in database
      this.dataStore.recordAssessmentAttempt({
        userId,
        assessmentId,
        assessmentTitle: assessment.title,
        skillName: assessment.skillName,
        score: scorePercentage,
        passed,
        totalQuestions,
        correctAnswers: correctCount,
        answers: questionFeedback,
      });

      // Record verified skill evidence if passed
      if (passed) {
        this.dataStore.recordSkillEvidence({
          userId,
          skillId: assessment.skillName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          skillName: assessment.skillName,
          evidenceType: 'ASSESSMENT',
          title: `Verified Assessment: ${assessment.title}`,
          score: scorePercentage,
          verified: true,
        });

        this.dataStore.recordNotification({
          userId,
          title: `Verified Skill Awarded: ${assessment.skillName}`,
          message: `Congratulations! You scored ${scorePercentage}% on the ${assessment.title} assessment. Your employability score increased!`,
          type: 'skill_improvement',
          link: '/learner/skills/evidence',
        });
      }

      // Check and advance matching active roadmap milestones
      const userRoadmap = Array.from(this.dataStore.roadmaps.values()).find(
        (r) => r.userId === userId,
      );
      if (userRoadmap) {
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
          const completedCount = userRoadmap.milestones.filter((m) => m.completed).length;
          userRoadmap.progressPercent = Math.round(
            (completedCount / userRoadmap.milestones.length) * 100,
          );
          this.dataStore.saveRoadmap(userRoadmap);
        }
      }

      // Log real analytics event
      this.dataStore.logAnalyticsEvent({
        eventName: 'assessment_completed',
        userId,
        metadata: {
          assessmentId,
          skillName: assessment.skillName,
          score: scorePercentage,
          passed,
        },
      });
    }

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
