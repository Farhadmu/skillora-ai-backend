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
      profile.readinessScore = Math.min(Math.round(profile.readinessScore * 0.9 + scorePercentage * 0.1), 100);
      this.dataStore.profiles.set(userId, profile);
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
