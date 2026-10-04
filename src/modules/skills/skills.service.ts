import { Injectable } from '@nestjs/common';
import { DataStoreService } from '../../database/data-store.service';

@Injectable()
export class SkillsService {
  constructor(private readonly dataStore: DataStoreService) {}

  getAllSkills(category?: string, query?: string) {
    let list = Array.from(this.dataStore.skills.values());

    if (category && category !== 'All') {
      list = list.filter((s) => s.category.toLowerCase() === category.toLowerCase());
    }

    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          s.subcategory.toLowerCase().includes(q),
      );
    }

    return list;
  }

  /**
   * Generates graph representation of skills, prerequisites, and user mastery
   */
  getSkillGraph(userId?: string) {
    const allSkills = Array.from(this.dataStore.skills.values());
    const userProfile = userId ? this.dataStore.profiles.get(userId) : null;
    const userSkillMap = new Map(
      userProfile?.skills.map((s) => [s.name.toLowerCase(), s.proficiency]) || [],
    );

    const nodes = allSkills.map((s) => {
      const proficiency = userSkillMap.get(s.name.toLowerCase()) || 0;
      return {
        id: s.id,
        name: s.name,
        category: s.category,
        difficulty: s.difficulty,
        demandScore: s.industryDemandScore,
        proficiency,
        status: proficiency > 75 ? 'Mastered' : proficiency > 40 ? 'Learning' : 'Unacquired',
        val: Math.max(10, Math.round(s.industryDemandScore / 5)),
      };
    });

    const links: Array<{ source: string; target: string; type: string }> = [];

    // Connect prerequisites and category clusters
    const skillNameMap = new Map(allSkills.map((s) => [s.name.toLowerCase(), s.id]));

    for (const s of allSkills) {
      if (s.prerequisites && s.prerequisites.length > 0) {
        for (const prereq of s.prerequisites) {
          const targetId = skillNameMap.get(prereq.toLowerCase());
          if (targetId && targetId !== s.id) {
            links.push({
              source: targetId,
              target: s.id,
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
  analyzeSkillGaps(userId: string, targetRole: string) {
    const profile = this.dataStore.profiles.get(userId);
    const userSkillMap = new Map(
      profile?.skills.map((s) => [s.name.toLowerCase(), s.proficiency]) || [],
    );

    // Role expectations benchmarks
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
