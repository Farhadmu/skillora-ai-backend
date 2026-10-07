import { Injectable, NotFoundException } from '@nestjs/common';
import { DataStoreService, LearnerProfileEntity } from '../../database/data-store.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class ProfileService {
  constructor(
    private readonly dataStore: DataStoreService,
    private readonly aiService: AiService,
  ) {}

  async getProfile(userId: string): Promise<LearnerProfileEntity> {
    const profile = this.dataStore.profiles.get(userId);
    if (!profile) {
      throw new NotFoundException(`Profile for user ${userId} not found`);
    }
    return profile;
  }

  async updateProfile(userId: string, updates: Partial<LearnerProfileEntity>): Promise<LearnerProfileEntity> {
    let profile = this.dataStore.profiles.get(userId);
    if (!profile) {
      const user = this.dataStore.users.get(userId);
      profile = {
        userId,
        name: user?.name || 'Skillora Learner',
        email: user?.email || '',
        headline: updates.headline || '',
        bio: updates.bio || '',
        degree: updates.degree || '',
        institution: updates.institution || '',
        graduationYear: updates.graduationYear || '',
        targetRole: updates.targetRole || 'Full-Stack Software Engineer',
        targetCompanies: updates.targetCompanies || [],
        preferredMode: updates.preferredMode || 'remote',
        weeklyHours: updates.weeklyHours || 15,
        readinessScore: 0,
        completenessScore: 30,
        skills: [],
        readinessDimensions: {
          technical: 0,
          problemSolving: 0,
          projects: 0,
          communication: 0,
          interview: 0,
          roleAlignment: 0,
          practical: 0,
        },
      };
    }

    const updated: LearnerProfileEntity = {
      ...profile,
      ...updates,
      skills: updates.skills || profile.skills,
    };

    // Calculate dynamic completeness score
    let score = 20; // base account
    if (updated.headline) score += 10;
    if (updated.bio) score += 10;
    if (updated.degree && updated.institution) score += 15;
    if (updated.targetRole) score += 15;
    if (updated.skills && updated.skills.length >= 3) score += 20;
    if (updated.githubUrl || updated.portfolioUrl) score += 10;
    updated.completenessScore = Math.min(score, 100);

    this.dataStore.saveProfile(updated);
    this.dataStore.logAnalyticsEvent({
      eventName: 'profile_updated',
      userId,
      metadata: { completenessScore: updated.completenessScore },
    });
    return updated;
  }

  /**
   * AI CV Extraction & Skill Evidence Mapping
   */
  async parseCvAndEnrichProfile(userId: string, cvText: string) {
    const extracted = await this.aiService.parseCvAndExtractSkills(cvText);
    const profile = await this.getProfile(userId);

    // Merge skills with duplicate resolution and evidence mapping
    const existingMap = new Map(profile.skills.map((s) => [s.name.toLowerCase(), s]));

    for (const newSkill of extracted.extractedSkills) {
      const key = newSkill.name.toLowerCase();
      if (existingMap.has(key)) {
        const existing = existingMap.get(key)!;
        existing.confidence = Math.max(existing.confidence, newSkill.confidence);
        existing.evidence = Array.from(new Set([...existing.evidence, ...newSkill.evidence]));
      } else {
        existingMap.set(key, {
          name: newSkill.name,
          category: newSkill.category,
          proficiency: Math.round(newSkill.confidence * 0.95),
          confidence: newSkill.confidence,
          verified: false,
          evidence: newSkill.evidence,
        });
      }
    }

    profile.skills = Array.from(existingMap.values());
    if (extracted.headline && !profile.headline) profile.headline = extracted.headline;
    if (extracted.education?.length && !profile.degree) {
      profile.degree = extracted.education[0].degree;
      profile.institution = extracted.education[0].institution;
      profile.graduationYear = extracted.education[0].year;
    }

    // Recalculate completeness
    profile.completenessScore = Math.min(profile.completenessScore + 25, 95);

    this.dataStore.saveProfile(profile);

    this.dataStore.logAnalyticsEvent({
      eventName: 'cv_uploaded',
      userId,
      metadata: {
        extractedSkillsCount: extracted.extractedSkills.length,
        completenessScore: profile.completenessScore,
      },
    });

    return {
      profile,
      extracted,
    };
  }

  /**
   * Public Shareable Portfolio
   */
  async getPublicPortfolio(userIdOrEmail: string) {
    const profile = Array.from(this.dataStore.profiles.values()).find(
      (p) => p.userId === userIdOrEmail || p.email.toLowerCase() === userIdOrEmail.toLowerCase(),
    );
    if (!profile) {
      throw new NotFoundException('Public portfolio not found');
    }

    const user = this.dataStore.users.get(profile.userId);
    return {
      name: profile.name,
      headline: profile.headline,
      bio: profile.bio,
      degree: profile.degree,
      institution: profile.institution,
      targetRole: profile.targetRole,
      readinessScore: profile.readinessScore,
      skills: profile.skills,
      readinessDimensions: profile.readinessDimensions,
      githubUrl: profile.githubUrl,
      portfolioUrl: profile.portfolioUrl,
      verifiedBadges: [
        'Verified Full-Stack Architect',
        'TypeScript Production Certified',
        'AI Socratic Tutor Evaluated',
      ],
    };
  }
}
