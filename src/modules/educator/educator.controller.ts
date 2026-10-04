import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EducatorService } from './educator.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/roles.enum';

@ApiTags('Educator Intelligence & Cohorts')
@Controller('api/educator')
export class EducatorController {
  constructor(private readonly educatorService: EducatorService) {}

  @Get('cohort')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EDUCATOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get cohort telemetry, student performance trends, and intervention alerts' })
  getCohortOverview() {
    return this.educatorService.getCohortOverview();
  }

  @Post('generate-quiz')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EDUCATOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'AI-assisted quiz generation for syllabus & technical verification' })
  generateQuiz(
    @Body()
    body: {
      topic: string;
      category?: string;
      difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
      questionCount?: number;
      publishDirectly?: boolean;
    },
  ) {
    return this.educatorService.generateQuiz(body);
  }

  @Post('interventions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EDUCATOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Dispatch targeted Socratic AI intervention drill to a student' })
  dispatchIntervention(
    @Body()
    body: {
      learnerId: string;
      interventionNote: string;
      actionType?: string;
    },
  ) {
    return this.educatorService.dispatchIntervention(body.learnerId, body.interventionNote, body.actionType);
  }

  @Post('cohort')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EDUCATOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new learning cohort with target milestones' })
  createCohort(
    @Body()
    body: {
      name: string;
      targetRole: string;
      description: string;
      durationWeeks?: number;
    },
  ) {
    return this.educatorService.createCohort(body);
  }
}
