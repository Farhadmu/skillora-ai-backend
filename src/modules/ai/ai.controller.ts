import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { Profile, ProfileDocument } from '../../database/schemas/profile.schema';
import { Roadmap, RoadmapDocument } from '../../database/schemas/roadmap.schema';
import { Job, JobDocument } from '../../database/schemas/job.schema';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('AI Command Center & Context Assistant')
@Controller('api/ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    @InjectModel(Profile.name) private readonly profileModel: Model<ProfileDocument>,
    @InjectModel(Roadmap.name) private readonly roadmapModel: Model<RoadmapDocument>,
    @InjectModel(Job.name) private readonly jobModel: Model<JobDocument>,
  ) {}

  @Post('command-center')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Context-aware global AI assistant answering with learner profile telemetry' })
  async askCommandCenter(
    @CurrentUser() user: any,
    @Body('query') query: string,
    @Body('pageContext') pageContext?: string,
  ) {
    const profileQuery: any[] = [{ userId: user.id }];
    if (isValidObjectId(user.id)) profileQuery.push({ _id: user.id });

    const profile = await this.profileModel.findOne({ $or: profileQuery }).lean();
    const activeRoadmap = await this.roadmapModel
      .findOne({ userId: user.id, status: 'active' })
      .sort({ createdAt: -1 })
      .lean();

    let extraContext = '';
    if (pageContext?.includes('roadmap') && activeRoadmap) {
      extraContext = ` Active Roadmap: ${activeRoadmap.durationDays} days (${activeRoadmap.progressPercent}% completed). Current milestones: ${activeRoadmap.milestones?.map((m: any) => `${m.title} [${m.completed ? 'Done' : 'Pending'}]`).join(', ')}.`;
    } else if (pageContext?.includes('gap') || pageContext?.includes('career')) {
      extraContext = ` Target Role: ${profile?.targetRole || 'Full-Stack AI Systems Engineer'}. Verified user skills: ${profile?.skills?.map((s: any) => `${s.name} (${s.proficiency}%)`).join(', ')}.`;
    } else if (pageContext?.includes('job')) {
      const allJobs = await this.jobModel.find().limit(3).lean();
      extraContext = ` Top marketplace roles: ${allJobs.map((j: any) => `${j.title} at ${j.companyName} requiring ${(j.requiredSkills || []).slice(0, 3).join(', ')}`).join('; ')}.`;
    }

    const contextSummary = profile
      ? `User: ${profile.name}, Target Role: ${profile.targetRole}, Readiness Score: ${profile.readinessScore}/100, Verified Skills: ${(profile.skills || []).filter((s: any) => s.verified).map((s: any) => s.name).join(', ')}, Current Page: ${pageContext || 'Dashboard'}.${extraContext}`
      : `User: ${user.name}, Role: ${user.role}, Page: ${pageContext || 'Dashboard'}.${extraContext}`;

    const prompt = `You are Skillora AI, an intelligent career copilot.
Context: ${contextSummary}

Learner Question: "${query}"

Provide a concise, direct, personalized, and actionable answer tailored to their exact career stage, skills, and current page.`;
    const answer = await this.aiService.generateText(prompt);

    return {
      query,
      answer,
      contextUsed: {
        targetRole: profile?.targetRole,
        readinessScore: profile?.readinessScore,
        pageContext: pageContext || 'Dashboard',
      },
    };
  }
}
