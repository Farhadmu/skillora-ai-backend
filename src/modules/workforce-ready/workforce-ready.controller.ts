import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WorkforceReadyService } from './workforce-ready.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Workforce Ready & AI Mock Interview')
@Controller('api/workforce-ready')
export class WorkforceReadyController {
  constructor(private readonly workforceReadyService: WorkforceReadyService) {}

  @Get('score')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Calculate and retrieve 7-dimension job readiness score' })
  getScore(@CurrentUser() user: any) {
    return this.workforceReadyService.getReadinessScore(user.id);
  }

  @Post('mock-interview')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Simulate progressive AI mock interview and receive rubrics & feedback' })
  conductMockInterview(
    @CurrentUser() user: any,
    @Body()
    body: {
      mode: 'technical' | 'behavioral' | 'system_design' | 'coding' | 'hr';
      questionNumber: number;
      candidateAnswer?: string;
    },
  ) {
    return this.workforceReadyService.conductMockInterview({
      userId: user.id,
      mode: body.mode || 'technical',
      questionNumber: body.questionNumber || 1,
      candidateAnswer: body.candidateAnswer,
    });
  }
}
