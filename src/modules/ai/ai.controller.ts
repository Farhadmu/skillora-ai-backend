import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { DataStoreService } from '../../database/data-store.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('AI Command Center & Context Assistant')
@Controller('api/ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly dataStore: DataStoreService,
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
    const profile = this.dataStore.profiles.get(user.id);
    const activeRoadmap = Array.from(this.dataStore.roadmaps.values()).find(
      (r) => r.userId === user.id || r.id === user.id,
    );

    let extraContext = '';
    if (pageContext?.includes('roadmap') && activeRoadmap) {
      extraContext = ` Active Roadmap: ${activeRoadmap.durationDays} days (${activeRoadmap.progressPercent}% completed). Current milestones: ${activeRoadmap.milestones?.map((m: any) => `${m.title} [${m.completed ? 'Done' : 'Pending'}]`).join(', ')}.`;
    } else if (pageContext?.includes('gap') || pageContext?.includes('career')) {
      extraContext = ` Target Role: ${profile?.targetRole || 'Full-Stack AI Systems Engineer'}. Verified user skills: ${profile?.skills?.map((s) => `${s.name} (${s.proficiency}%)`).join(', ')}.`;
    } else if (pageContext?.includes('job')) {
      const allJobs = Array.from(this.dataStore.jobs.values()).slice(0, 3);
      extraContext = ` Top marketplace roles: ${allJobs.map((j) => `${j.title} at ${j.companyName} requiring ${j.requiredSkills.slice(0, 3).join(', ')}`).join('; ')}.`;
    }

    const contextSummary = profile
      ? `User: ${profile.name}, Target Role: ${profile.targetRole}, Readiness Score: ${profile.readinessScore}/100, Verified Skills: ${profile.skills.filter((s) => s.verified).map((s) => s.name).join(', ')}, Current Page: ${pageContext || 'Dashboard'}.${extraContext}`
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
