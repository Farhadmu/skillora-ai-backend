import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MarketplaceService } from './marketplace.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '../../common/enums/roles.enum';

@ApiTags('Global Talent Marketplace & Employer Pipeline')
@Controller('api/marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get('jobs')
  @ApiOperation({ summary: 'Browse jobs with AI match scoring and filters' })
  getJobs(
    @Query('userId') userId?: string,
    @Query('mode') mode?: string,
    @Query('experienceLevel') experienceLevel?: string,
    @Query('query') query?: string,
  ) {
    return this.marketplaceService.getJobsForLearner(userId, { mode, experienceLevel, query });
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get single job listing details' })
  getJobById(@Param('id') id: string) {
    return this.marketplaceService.getJobById(id);
  }

  @Post('jobs/:id/apply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Apply for a job with verified readiness credentials' })
  apply(@CurrentUser() user: any, @Param('id') jobId: string) {
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
  getEmployerCandidates(@Query('companyId') companyId?: string) {
    return this.marketplaceService.getEmployerCandidates(companyId);
  }

  @Patch('applications/:id/stage')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update candidate pipeline stage (applied, interviewing, offered)' })
  updateStage(@Param('id') id: string, @Body('stage') stage: any) {
    return this.marketplaceService.updateApplicationStage(id, stage);
  }

  @Post('jobs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Post new verified job opening to the talent marketplace' })
  createJob(@Body() jobData: any) {
    return this.marketplaceService.createJob(jobData);
  }

  @Post('jobs/ai-extract')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'AI extractor for job description to standardized skills and tier' })
  aiExtractJobSkills(@Body('description') description: string) {
    return this.marketplaceService.aiExtractJobSkills(description);
  }

  @Post('candidates/:id/interview-questions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate custom candidate-specific interview questions based on skill gaps' })
  generateInterviewQuestions(@Param('id') applicationId: string) {
    return this.marketplaceService.generateInterviewQuestionsForCandidate(applicationId);
  }
}
