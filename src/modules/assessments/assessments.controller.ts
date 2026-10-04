import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AssessmentsService } from './assessments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Assessments & Skill Verification')
@Controller('api/assessments')
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @Get()
  @ApiOperation({ summary: 'List all verified technical assessments' })
  getAll(@Query('category') category?: string) {
    return this.assessmentsService.getAllAssessments(category);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get assessment details with active questions' })
  getById(@Param('id') id: string) {
    return this.assessmentsService.getAssessmentById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register a new verified assessment in the catalog' })
  create(@Body() body: any) {
    return this.assessmentsService.createAssessment(body);
  }

  @Post(':id/submit')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit assessment responses, calculate score, and verify skill' })
  submit(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('answers') answers: Record<string, any>,
  ) {
    return this.assessmentsService.submitAssessment(user.id, id, answers);
  }
}
