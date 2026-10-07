import { Injectable } from '@nestjs/common';
import { DataStoreService } from '../../database/data-store.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class CareerNavigatorService {
  constructor(
    private readonly dataStore: DataStoreService,
    private readonly aiService: AiService,
  ) {}

  getAvailableRoles() {
    return [
      {
        id: 'role-fullstack-ai',
        title: 'Full-Stack AI Systems Engineer',
        salaryRange: '$120,000 - $165,000',
        marketGrowthRate: '+38% YoY',
        demandIndex: 96,
        description: 'Engineers who build full-stack web applications tightly integrated with foundation model inference, embeddings, and vector RAG retrieval.',
        coreSkills: ['TypeScript', 'Next.js', 'NestJS', 'RAG (Retrieval-Augmented Generation)', 'MongoDB', 'Docker'],
      },
      {
        id: 'role-backend-cloud',
        title: 'Backend Node.js & Cloud Architect',
        salaryRange: '$135,000 - $175,000',
        marketGrowthRate: '+24% YoY',
        demandIndex: 92,
        description: 'Architects responsible for distributed microservices, message queues, relational/NoSQL datastores, and cloud orchestration.',
        coreSkills: ['TypeScript', 'NestJS', 'PostgreSQL', 'Docker', 'Kubernetes', 'AWS (Amazon Web Services)', 'System Design'],
      },
      {
        id: 'role-frontend-lead',
        title: 'Frontend & UI/UX Specialist',
        salaryRange: '$115,000 - $150,000',
        marketGrowthRate: '+19% YoY',
        demandIndex: 88,
        description: 'Specialists who architect responsive, accessible, high-performance web applications with advanced animations and design systems.',
        coreSkills: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS', 'Framer Motion', 'Web Accessibility (a11y)'],
      },
      {
        id: 'role-ai-researcher',
        title: 'AI/ML Systems Researcher',
        salaryRange: '$140,000 - $190,000',
        marketGrowthRate: '+45% YoY',
        demandIndex: 98,
        description: 'Pioneers in multimodal agents, vector representations, fine-tuning, and low-latency transformer inference.',
        coreSkills: ['Python', 'RAG (Retrieval-Augmented Generation)', 'Vector Embeddings', 'PyTorch', 'Qdrant', 'Agentic Workflows'],
      },
    ];
  }

  /**
   * Compare learner profile against two roles
   */
  async compareRoles(userId: string, roleA: string, roleB: string) {
    const profile = this.dataStore.profiles.get(userId);
    const userSkills = profile?.skills.map((s) => s.name) || [];

    const roles = this.getAvailableRoles();
    const infoA = roles.find((r) => r.title.toLowerCase() === roleA.toLowerCase()) || roles[0];
    const infoB = roles.find((r) => r.title.toLowerCase() === roleB.toLowerCase()) || roles[1];

    const matchA = Math.round(
      (infoA.coreSkills.filter((s) => userSkills.some((us) => us.toLowerCase() === s.toLowerCase())).length /
        infoA.coreSkills.length) *
        100,
    );

    const matchB = Math.round(
      (infoB.coreSkills.filter((s) => userSkills.some((us) => us.toLowerCase() === s.toLowerCase())).length /
        infoB.coreSkills.length) *
        100,
    );

    return {
      roleA: { ...infoA, userMatchPercentage: matchA },
      roleB: { ...infoB, userMatchPercentage: matchB },
      recommendation:
        userSkills.length === 0
          ? 'Add your skills or complete an assessment to calculate personalized transition distances.'
          : matchA >= matchB
          ? `Based on your existing skills in ${userSkills.slice(0, 3).join(', ')}, ${infoA.title} offers the shortest transition distance.`
          : `Your background provides a strong springboard into ${infoB.title}.`,
    };
  }

  /**
   * Job Description Intelligence Analysis
   */
  async analyzeJobDescription(userId: string, jdText: string) {
    const profile = this.dataStore.profiles.get(userId);
    const userSkills = profile?.skills.map((s) => s.name) || [];

    return this.aiService.analyzeJobDescription(jdText, userSkills);
  }
}
