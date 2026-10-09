import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Skill, SkillDocument } from '../../database/schemas/skill.schema';
import { Profile, ProfileDocument } from '../../database/schemas/profile.schema';

@Injectable()
export class SkillsService {
  constructor(
    @InjectModel(Skill.name) private readonly skillModel: Model<SkillDocument>,
    @InjectModel(Profile.name) private readonly profileModel: Model<ProfileDocument>,
  ) {}

  async getAllSkills(category?: string, query?: string) {
    const filter: any = {};
    if (category && category !== 'All') {
      filter.category = new RegExp(`^${category}$`, 'i');
    }
    if (query) {
      filter.$or = [
        { name: new RegExp(query, 'i') },
        { category: new RegExp(query, 'i') },
        { subcategory: new RegExp(query, 'i') },
      ];
    }

    return this.skillModel.find(filter).lean();
  }

  /**
   * Generates graph representation of skills, prerequisites, and user mastery
   */
  async getSkillGraph(userId?: string) {
    const allSkills = await this.skillModel.find().lean();
    const userProfile = userId ? await this.profileModel.findOne({ userId }).lean() : null;

    const userSkillMap = new Map(
      (userProfile?.skills || []).map((s: any) => [s.name.toLowerCase(), s.proficiency || 0]),
    );

    const nodes = allSkills.map((s: any) => {
      const proficiency = userSkillMap.get(s.name.toLowerCase()) || 0;
      return {
        id: s.id || s._id.toString(),
        name: s.name,
        category: s.category,
        difficulty: s.difficulty,
        demandScore: s.industryDemandScore,
        proficiency,
        status: proficiency > 75 ? 'Mastered' : proficiency > 40 ? 'Learning' : 'Unacquired',
        val: Math.max(10, Math.round((s.industryDemandScore || 80) / 5)),
      };
    });

    const links: Array<{ source: string; target: string; type: string }> = [];
    const skillNameMap = new Map(allSkills.map((s: any) => [s.name.toLowerCase(), s.id || s._id.toString()]));

    for (const s of allSkills) {
      if (s.prerequisites && s.prerequisites.length > 0) {
        for (const prereq of s.prerequisites) {
          const targetId = skillNameMap.get(prereq.toLowerCase());
          const sourceId = s.id || s._id.toString();
          if (targetId && targetId !== sourceId) {
            links.push({
              source: targetId,
              target: sourceId,
              type: 'prerequisite',
            });
          }
        }
      }
    }

    return {
      nodes,
      links,
      summary: {
        totalSkills: allSkills.length,
        masteredCount: nodes.filter((n) => n.status === 'Mastered').length,
        learningCount: nodes.filter((n) => n.status === 'Learning').length,
      },
    };
  }

  /**
   * Skill Gap Analysis between Learner Profile and Target Role
   */
  async analyzeSkillGaps(userId: string, targetRole: string) {
    const profile = await this.profileModel.findOne({ userId }).lean();
    const userSkillMap = new Map(
      (profile?.skills || []).map((s: any) => [s.name.toLowerCase(), s.proficiency || 0]),
    );

    const roleRequirementsMap: Record<string, string[]> = {
      'Full-Stack AI Systems Engineer': [
        'TypeScript',
        'NestJS',
        'React',
        'Next.js',
        'MongoDB',
        'RAG (Retrieval-Augmented Generation)',
        'Docker',
        'System Design',
      ],
      'Backend Node.js & Cloud Architect': [
        'TypeScript',
        'Node.js',
        'NestJS',
        'PostgreSQL',
        'Docker',
        'Kubernetes',
        'AWS (Amazon Web Services)',
        'System Design',
      ],
      'Frontend & UI/UX Specialist': [
        'JavaScript',
        'TypeScript',
        'React',
        'Next.js',
        'Tailwind CSS',
        'Framer Motion',
        'Web Accessibility (a11y)',
      ],
      'AI/ML Systems Researcher': [
        'Python',
        'RAG (Retrieval-Augmented Generation)',
        'Vector Embeddings',
        'PyTorch',
        'Hugging Face Transformers',
        'Qdrant',
      ],
    };

    const targetList =
      roleRequirementsMap[targetRole] || roleRequirementsMap['Full-Stack AI Systems Engineer'];

    const matched: Array<{ name: string; proficiency: number }> = [];
    const missing: string[] = [];
    const weak: Array<{ name: string; proficiency: number }> = [];

    for (const req of targetList) {
      const prof = userSkillMap.get(req.toLowerCase());
      if (prof === undefined) {
        missing.push(req);
      } else if (prof < 70) {
        weak.push({ name: req, proficiency: prof });
      } else {
        matched.push({ name: req, proficiency: prof });
      }
    }

    const readinessIndex = Math.round(
      ((matched.length + weak.length * 0.5) / targetList.length) * 100,
    );

    return {
      targetRole,
      readinessIndex,
      requiredCount: targetList.length,
      matched,
      weak,
      missing,
      recommendedNextSkill: missing[0] || (weak[0]?.name ?? 'System Design'),
    };
  }
}
