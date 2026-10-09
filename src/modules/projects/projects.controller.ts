import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Projects & AI Code Review')
@Controller('api/projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'List all hands-on engineering projects' })
  getAll(@Query('category') category?: string, @Query('difficulty') difficulty?: string) {
    return this.projectsService.getAllProjects(category, difficulty);
  }

  @Get('recommendations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get projects recommended specifically for missing skills' })
  getRecommendations(@CurrentUser() user: any) {
    return this.projectsService.recommendProjects(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get full project details, architecture, and milestones' })
  getById(@Param('id') id: string) {
    return this.projectsService.getProjectById(id);
  }

  @Post('review-code')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit code snippet for automated AI code review and refactoring' })
  reviewCode(
    @Body('code') code: string,
    @Body('language') language: string,
    @CurrentUser() user: any,
    @Body('context') context?: string,
  ) {
    if (!code || typeof code !== 'string') {
      throw new Error('Code is required');
    }
    if (code.length > 20000) {
      throw new Error('Code payload exceeds maximum size limit of 20,000 characters');
    }
    return this.projectsService.reviewCode(code, language, context, user.id);
  }

  @Post(':id/submit')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit completed project repo and demo to verify skills' })
  submitProject(
    @CurrentUser() user: any,
    @Param('id') projectId: string,
    @Body() dto: { githubRepoUrl: string; liveDemoUrl?: string; notes?: string },
  ) {
    return this.projectsService.submitProject(user.id, projectId, dto);
  }
}
