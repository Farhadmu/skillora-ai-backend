import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MarketplaceService } from './marketplace.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '../../common/enums/roles.enum';

@ApiTags('Global Talent Marketplace & Employer Pipeline')
@Controller('api/marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get('jobs')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Browse jobs with AI match scoring and filters' })
  getJobs(
    @CurrentUser() user?: any,
    @Query('mode') mode?: string,
    @Query('experienceLevel') experienceLevel?: string,
    @Query('query') query?: string,
  ) {
    return this.marketplaceService.getJobsForLearner(user?.id, { mode, experienceLevel, query });
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get single job listing details' })
  getJobById(@Param('id') id: string): Promise<any> {
    return this.marketplaceService.getJobById(id);
  }

  @Post('jobs/:id/apply')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LEARNER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Apply for a job with verified readiness credentials' })
  apply(@CurrentUser() user: any, @Param('id') jobId: string): Promise<any> {
    return this.marketplaceService.applyForJob(user.id, jobId);
  }

  @Get('applications/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get candidate applied jobs and interview statuses' })
  getMyApplications(@CurrentUser() user: any) {
    return this.marketplaceService.getLearnerApplications(user.id);
  }

  @Get('employer/candidates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get candidate pipeline for employer ATS' })
  getEmployerCandidates(@CurrentUser() user: any) {
    return this.marketplaceService.getEmployerCandidates(user);
  }

  @Patch('applications/:id/stage')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update candidate pipeline stage (applied, interviewing, offered)' })
  updateStage(@Param('id') id: string, @Body('stage') stage: any, @CurrentUser() user: any) {
    return this.marketplaceService.updateApplicationStage(id, stage, user);
  }

  @Post('jobs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Post new verified job opening to the talent marketplace' })
  createJob(@Body() jobData: any, @CurrentUser() user: any) {
    return this.marketplaceService.createJob(jobData, user);
  }

  @Post('jobs/ai-extract')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'AI extractor for job description to standardized skills and tier' })
  aiExtractJobSkills(@Body('description') description: string) {
    return this.marketplaceService.aiExtractJobSkills(description);
  }

  @Get('talent/search')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search verified learners and talent pool based on skill evidence and readiness' })
  searchTalent(
    @CurrentUser() user: any,
    @Query('query') query?: string,
    @Query('skill') skill?: string,
    @Query('minReadiness') minReadiness?: number,
    @Query('targetRole') targetRole?: string,
  ) {
    return this.marketplaceService.searchTalent(user, { query, skill, minReadiness, targetRole });
  }

  @Post('interviews/schedule')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Schedule an interview invitation for an applicant' })
  scheduleInterview(@CurrentUser() user: any, @Body() dto: any) {
    return this.marketplaceService.scheduleInterview(user, dto);
  }

  @Get('interviews')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all scheduled interviews for employer openings' })
  getEmployerInterviews(@CurrentUser() user: any) {
    return this.marketplaceService.getEmployerInterviews(user);
  }

  @Get('interviews/my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all scheduled interviews for candidate' })
  getLearnerInterviews(@CurrentUser() user: any) {
    return this.marketplaceService.getLearnerInterviews(user);
  }

  @Post('candidates/:id/interview-questions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate custom candidate-specific interview questions based on skill gaps' })
  generateInterviewQuestions(@Param('id') applicationId: string, @CurrentUser() user: any) {
    return this.marketplaceService.generateInterviewQuestionsForCandidate(applicationId, user);
  }
}
