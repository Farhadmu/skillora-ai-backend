import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EducatorService } from './educator.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/roles.enum';

@ApiTags('Educator Intelligence, Cohorts & Assignments')
@Controller('api/educator')
export class EducatorController {
  constructor(private readonly educatorService: EducatorService) {}

  /* =========================================================================
     COHORT TELEMETRY & OVERVIEW
     ========================================================================= */

  @Get('cohort')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EDUCATOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get cohort telemetry, student performance trends, and intervention alerts' })
  getCohortOverview(@CurrentUser() user: any) {
    return this.educatorService.getCohortOverview(user);
  }

  @Get('cohorts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EDUCATOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all cohorts created by authenticated educator' })
  getEducatorCohorts(@CurrentUser() user: any) {
    return this.educatorService.getEducatorCohorts(user);
  }

  @Post('cohort')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EDUCATOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new learning cohort in MongoDB with target milestones' })
  createCohort(
    @CurrentUser() user: any,
    @Body()
    body: {
      name: string;
      targetRole?: string;
      description?: string;
      courseId?: string;
      courseTitle?: string;
      capacity?: number;
      durationWeeks?: number;
    },
  ): Promise<any> {
    return this.educatorService.createCohort(user, body);
  }

  @Get('cohorts/:id/learners')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EDUCATOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get roster of enrolled students in a cohort' })
  getCohortLearners(@CurrentUser() user: any, @Param('id') cohortId: string) {
    return this.educatorService.getCohortLearners(user, cohortId);
  }

  /* =========================================================================
     COURSES MANAGEMENT
     ========================================================================= */

  @Get('courses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EDUCATOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List courses authored by authenticated educator' })
  getEducatorCourses(@CurrentUser() user: any) {
    return this.educatorService.getEducatorCourses(user);
  }

  @Post('courses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EDUCATOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new course in MongoDB' })
  createCourse(@CurrentUser() user: any, @Body() body: any) {
    return this.educatorService.createCourse(user, body);
  }

  @Patch('courses/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EDUCATOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update course details or syllabus' })
  updateCourse(@CurrentUser() user: any, @Param('id') courseId: string, @Body() body: any) {
    return this.educatorService.updateCourse(user, courseId, body);
  }

  @Get('courses/catalog')
  @ApiOperation({ summary: 'Browse published courses (public / learner catalog)' })
  getCourseCatalog() {
    return this.educatorService.getCourseCatalog();
  }

  @Post('courses/:id/enroll')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Learner enrolls in a published course' })
  enrollInCourse(
    @CurrentUser() user: any,
    @Param('id') courseId: string,
    @Body('cohortId') cohortId?: string,
  ) {
    return this.educatorService.enrollLearner(user, courseId, cohortId);
  }

  @Get('my-enrollments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get active enrolled courses for authenticated learner' })
  getLearnerEnrollments(@CurrentUser() user: any) {
    return this.educatorService.getLearnerEnrollments(user);
  }

  /* =========================================================================
     ASSIGNMENTS & SUBMISSIONS (WORKFLOW 1)
     ========================================================================= */

  @Get('assignments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EDUCATOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List assignments published by authenticated educator' })
  getEducatorAssignments(@CurrentUser() user: any) {
    return this.educatorService.getEducatorAssignments(user);
  }

  @Post('assignments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EDUCATOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create assignment linked to course outcomes, rubrics, and target skill' })
  createAssignment(
    @CurrentUser() user: any,
    @Body()
    body: {
      courseId: string;
      cohortId?: string;
      title: string;
      description: string;
      targetSkill: string;
      rubric?: Array<{ criteria: string; maxPoints: number; description?: string }>;
      totalPoints?: number;
      dueDate?: string;
    },
  ) {
    return this.educatorService.createAssignment(user, body);
  }

  @Get('assignments/:id/submissions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EDUCATOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get student submissions for an assignment' })
  getAssignmentSubmissions(@CurrentUser() user: any, @Param('id') assignmentId: string) {
    return this.educatorService.getAssignmentSubmissions(user, assignmentId);
  }

  @Post('submissions/:id/review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EDUCATOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Educator reviews submission with score & rubric feedback (updates verified evidence)' })
  reviewSubmission(
    @CurrentUser() user: any,
    @Param('id') submissionId: string,
    @Body()
    body: {
      score: number;
      feedback: string;
      rubricScores?: Array<{ criteria: string; pointsAwarded: number; feedback?: string }>;
      revisionRequested?: boolean;
    },
  ) {
    return this.educatorService.reviewSubmission(user, submissionId, body);
  }

  @Get('my-assignments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get assignments for enrolled courses with learner submission status' })
  getLearnerAssignments(@CurrentUser() user: any) {
    return this.educatorService.getLearnerAssignments(user);
  }

  @Post('assignments/:id/submit')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Learner submits code or repo deliverable for an assignment' })
  submitAssignment(
    @CurrentUser() user: any,
    @Param('id') assignmentId: string,
    @Body() body: { content: string; repositoryUrl?: string },
  ) {
    return this.educatorService.submitAssignment(user, assignmentId, body);
  }

  @Get('submissions/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get authenticated learner submissions and educator review feedback' })
  getLearnerSubmissions(@CurrentUser() user: any) {
    return this.educatorService.getLearnerSubmissions(user);
  }

  /* =========================================================================
     WORKFLOW 3: AGGREGATED EMPLOYER SKILL DEMAND INSIGHTS
     ========================================================================= */

  @Get('market-demand')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EDUCATOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get aggregated employer skill demand insights to align curriculum' })
  getMarketDemandInsights() {
    return this.educatorService.getMarketDemandInsights();
  }

  /* =========================================================================
     AI QUIZ & INTERVENTIONS
     ========================================================================= */

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
}
