import { Injectable } from '@nestjs/common';
import { DataStoreService } from '../../database/data-store.service';
import { RagService } from '../ai/rag.service';

@Injectable()
export class SearchService {
  constructor(
    private readonly dataStore: DataStoreService,
    private readonly ragService: RagService,
  ) {}

  async globalSearch(query: string) {
    if (!query || query.trim().length === 0) {
      return { skills: [], jobs: [], projects: [], assessments: [], knowledge: [] };
    }

    const q = query.toLowerCase();

    // 1. Search Skills
    const skills = Array.from(this.dataStore.skills.values())
      .filter((s) => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q))
      .slice(0, 5)
      .map((s) => ({ id: s.id, type: 'skill', title: s.name, subtitle: `${s.category} • ${s.difficulty}` }));

    // 2. Search Jobs
    const jobs = Array.from(this.dataStore.jobs.values())
      .filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.companyName.toLowerCase().includes(q) ||
          j.requiredSkills.some((s) => s.toLowerCase().includes(q)),
      )
      .slice(0, 5)
      .map((j) => ({ id: j.id, type: 'job', title: j.title, subtitle: `${j.companyName} • ${j.location}` }));

    // 3. Search Projects
    const projects = Array.from(this.dataStore.projects.values())
      .filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.targetSkills.some((s) => s.toLowerCase().includes(q)),
      )
      .slice(0, 5)
      .map((p) => ({ id: p.id, type: 'project', title: p.title, subtitle: `${p.category} • ${p.difficulty}` }));

    // 4. Search Assessments
    const assessments = Array.from(this.dataStore.assessments.values())
      .filter((a) => a.title.toLowerCase().includes(q) || a.skillName.toLowerCase().includes(q))
      .slice(0, 5)
      .map((a) => ({ id: a.id, type: 'assessment', title: a.title, subtitle: `${a.skillName} • ${a.durationMinutes} mins` }));

    // 5. Search Knowledge Chunks
    const knowledgeChunks = await this.ragService.retrieve(query, 3);
    const knowledge = knowledgeChunks.map((k) => ({
      id: k.chunk.id,
      type: 'knowledge',
      title: k.chunk.topic,
      subtitle: `${k.chunk.source} • Trust: ${k.chunk.trustLevel}`,
    }));

    return {
      query,
      totalResults: skills.length + jobs.length + projects.length + assessments.length + knowledge.length,
      results: {
        skills,
        jobs,
        projects,
        assessments,
        knowledge,
      },
    };
  }
}
