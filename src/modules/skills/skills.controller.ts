import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SkillsService } from './skills.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Skill Intelligence & Graph')
@Controller('api/skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Get()
  @ApiOperation({ summary: 'List all standardized catalog skills with filter & query' })
  getAllSkills(@Query('category') category?: string, @Query('query') query?: string) {
    return this.skillsService.getAllSkills(category, query);
  }

  @Get('graph')
  @ApiOperation({ summary: 'Get full interactive skill graph structure with prerequisites and nodes' })
  getSkillGraph(@Query('userId') userId?: string) {
    return this.skillsService.getSkillGraph(userId);
  }

  @Get('gaps')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Analyze skill gaps between user profile and target role' })
  analyzeGaps(@CurrentUser() user: any, @Query('targetRole') targetRole?: string) {
    return this.skillsService.analyzeSkillGaps(user.id, targetRole || 'Full-Stack AI Systems Engineer');
  }
}
