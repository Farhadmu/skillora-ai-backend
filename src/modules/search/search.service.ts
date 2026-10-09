import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Skill, SkillDocument } from '../../database/schemas/skill.schema';
import { Job, JobDocument } from '../../database/schemas/job.schema';
import { Project, ProjectDocument } from '../../database/schemas/project.schema';
import { Assessment, AssessmentDocument } from '../../database/schemas/assessment.schema';
import { RagService } from '../ai/rag.service';

@Injectable()
export class SearchService {
  constructor(
    @InjectModel(Skill.name) private readonly skillModel: Model<SkillDocument>,
    @InjectModel(Job.name) private readonly jobModel: Model<JobDocument>,
    @InjectModel(Project.name) private readonly projectModel: Model<ProjectDocument>,
    @InjectModel(Assessment.name) private readonly assessmentModel: Model<AssessmentDocument>,
    private readonly ragService: RagService,
  ) {}

  async globalSearch(query: string) {
    if (!query || query.trim().length === 0) {
      return { skills: [], jobs: [], projects: [], assessments: [], knowledge: [] };
    }

    const regex = new RegExp(query.trim(), 'i');

    const [rawSkills, rawJobs, rawProjects, rawAssessments, knowledgeChunks] = await Promise.all([
      this.skillModel
        .find({ $or: [{ name: regex }, { category: regex }, { subcategory: regex }] })
        .limit(5)
        .lean(),
      this.jobModel
        .find({ $or: [{ title: regex }, { companyName: regex }, { requiredSkills: regex }] })
        .limit(5)
        .lean(),
      this.projectModel
        .find({ $or: [{ title: regex }, { targetSkills: regex }, { category: regex }] })
        .limit(5)
        .lean(),
      this.assessmentModel
        .find({ $or: [{ title: regex }, { skillName: regex }, { category: regex }] })
        .limit(5)
        .lean(),
      this.ragService.retrieve(query, 3),
    ]);

    const skills = rawSkills.map((s: any) => ({
      id: s.id || s._id.toString(),
      type: 'skill',
      title: s.name,
      subtitle: `${s.category} • ${s.difficulty || 'Intermediate'}`,
    }));

    const jobs = rawJobs.map((j: any) => ({
      id: j.id || j._id.toString(),
      type: 'job',
      title: j.title,
      subtitle: `${j.companyName} • ${j.location || 'Remote'}`,
    }));

    const projects = rawProjects.map((p: any) => ({
      id: p.id || p._id.toString(),
      type: 'project',
      title: p.title,
      subtitle: `${p.category} • ${p.difficulty || 'Intermediate'}`,
    }));

    const assessments = rawAssessments.map((a: any) => ({
      id: a.id || a._id.toString(),
      type: 'assessment',
      title: a.title,
      subtitle: `${a.skillName} • ${a.durationMinutes || 15} mins`,
    }));

    const knowledge = knowledgeChunks.map((k: any) => ({
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
