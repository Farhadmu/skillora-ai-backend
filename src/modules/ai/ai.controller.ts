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
    const contextSummary = profile
      ? `User: ${profile.name}, Target Role: ${profile.targetRole}, Readiness Score: ${profile.readinessScore}/100, Verified Skills: ${profile.skills.filter((s) => s.verified).map((s) => s.name).join(', ')}, Current Page: ${pageContext || 'Dashboard'}`
      : `User: ${user.name}, Role: ${user.role}, Page: ${pageContext || 'Dashboard'}`;

    const prompt = `Context: ${contextSummary}\n\nLearner Query: "${query}"\n\nProvide a concise, direct, and actionable answer tailored to their exact career stage and skills.`;
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
