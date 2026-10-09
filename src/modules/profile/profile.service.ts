import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { Profile, ProfileDocument } from '../../database/schemas/profile.schema';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { AnalyticsEvent, AnalyticsEventDocument } from '../../database/schemas/analytics-audit.schema';
import { AiService } from '../ai/ai.service';

@Injectable()
export class ProfileService {
  constructor(
    @InjectModel(Profile.name) private readonly profileModel: Model<ProfileDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(AnalyticsEvent.name) private readonly analyticsModel: Model<AnalyticsEventDocument>,
    private readonly aiService: AiService,
  ) {}

  async getProfile(userId: string) {
    const query: any[] = [{ userId }];
    if (isValidObjectId(userId)) query.push({ _id: userId });

    const profile = await this.profileModel.findOne({ $or: query }).lean();
    if (!profile) {
      throw new NotFoundException(`Profile for user ${userId} not found`);
    }
    return profile;
  }

  async updateProfile(userId: string, updates: any) {
    const query: any[] = [{ userId }];
    if (isValidObjectId(userId)) query.push({ _id: userId });

    let profile = await this.profileModel.findOne({ $or: query });
    if (!profile) {
      const user = await this.userModel.findOne({
        $or: [{ id: userId }, { _id: isValidObjectId(userId) ? userId : undefined }],
      }).lean();

      profile = new this.profileModel({
        userId,
        name: user?.name || 'Skillora Learner',
        email: user?.email || '',
        headline: updates.headline || '',
        bio: updates.bio || '',
        degree: updates.degree || '',
        institution: updates.institution || '',
        graduationYear: updates.graduationYear || '2025',
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
      });
    }

    if (updates.headline !== undefined) profile.headline = updates.headline;
    if (updates.bio !== undefined) profile.bio = updates.bio;
    if (updates.degree !== undefined) profile.degree = updates.degree;
    if (updates.institution !== undefined) profile.institution = updates.institution;
    if (updates.graduationYear !== undefined) profile.graduationYear = updates.graduationYear;
    if (updates.targetRole !== undefined) profile.targetRole = updates.targetRole;
    if (updates.targetCompanies !== undefined) profile.targetCompanies = updates.targetCompanies;
    if (updates.preferredMode !== undefined) profile.preferredMode = updates.preferredMode;
    if (updates.weeklyHours !== undefined) profile.weeklyHours = updates.weeklyHours;
    if (updates.githubUrl !== undefined) profile.githubUrl = updates.githubUrl;
    if (updates.portfolioUrl !== undefined) profile.portfolioUrl = updates.portfolioUrl;
    if (updates.linkedinUrl !== undefined) profile.linkedinUrl = updates.linkedinUrl;
    if (updates.resumeUrl !== undefined) profile.resumeUrl = updates.resumeUrl;
    if (updates.skills !== undefined) profile.skills = updates.skills;

    // Calculate dynamic completeness score
    let score = 20; // base account
    if (profile.headline) score += 10;
    if (profile.bio) score += 10;
    if (profile.degree && profile.institution) score += 15;
    if (profile.targetRole) score += 15;
    if (profile.skills && profile.skills.length >= 3) score += 20;
    if (profile.githubUrl || profile.portfolioUrl) score += 10;
    profile.completenessScore = Math.min(score, 100);

    await profile.save();

    await this.analyticsModel.create({
      eventName: 'profile_updated',
      userId,
      metadata: { completenessScore: profile.completenessScore },
    }).catch(() => {});

    return profile.toObject ? profile.toObject() : profile;
  }

  /**
   * AI CV Extraction & Skill Evidence Mapping (Honest unverified labeling for keyword detections)
   */
  async parseCvAndEnrichProfile(userId: string, cvText: string) {
    const extracted = await this.aiService.parseCvAndExtractSkills(cvText);
    const profile = await this.profileModel.findOne({ userId });
    if (!profile) {
      throw new NotFoundException(`Profile for user ${userId} not found`);
    }

    // Merge skills with duplicate resolution and truthful unverified evidence tagging
    const existingMap = new Map((profile.skills || []).map((s: any) => [s.name.toLowerCase(), s]));

    for (const newSkill of extracted.extractedSkills) {
      const key = newSkill.name.toLowerCase();
      if (existingMap.has(key)) {
        const existing: any = existingMap.get(key)!;
        existing.evidence = Array.from(new Set([...(existing.evidence || []), ...(newSkill.evidence || [])]));
      } else {
        existingMap.set(key, {
          name: newSkill.name,
          category: newSkill.category,
          proficiency: 0, // Honest: 0 proficiency until verified by assessment or project
          confidence: newSkill.confidence || 0,
          source: 'KEYWORD_DETECTION_UNVERIFIED',
          verified: false,
          evidence: newSkill.evidence || [`Keyword detected in uploaded resume: "${newSkill.name}" (Unverified)`],
          learningProgress: 0,
        });
      }
    }

    profile.skills = Array.from(existingMap.values()) as any;
    if (extracted.headline && !profile.headline) profile.headline = extracted.headline;
    if (extracted.education?.length && !profile.degree) {
      profile.degree = extracted.education[0].degree;
      profile.institution = extracted.education[0].institution;
      profile.graduationYear = extracted.education[0].year;
    }

    profile.completenessScore = Math.min(profile.completenessScore + 20, 95);
    await profile.save();

    await this.analyticsModel.create({
      eventName: 'cv_uploaded',
      userId,
      metadata: {
        extractedSkillsCount: extracted.extractedSkills.length,
        completenessScore: profile.completenessScore,
      },
    }).catch(() => {});

    return {
      profile: profile.toObject ? profile.toObject() : profile,
      extracted,
    };
  }

  /**
   * Public Shareable Portfolio
   */
  async getPublicPortfolio(userIdOrEmail: string) {
    const profile = await this.profileModel.findOne({
      $or: [{ userId: userIdOrEmail }, { email: userIdOrEmail.toLowerCase() }],
    }).lean();

    if (!profile) {
      throw new NotFoundException('Public portfolio not found');
    }

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
      verifiedBadges: (profile.skills || [])
        .filter((s: any) => s.verified)
        .map((s: any) => `${s.name} Verified`),
    };
  }
}
