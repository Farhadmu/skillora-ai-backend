import { Controller, Get, Post, Patch, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SkillBridgeService } from './skillbridge.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('SkillBridge & Reskilling Roadmap')
@Controller('api/skillbridge')
export class SkillBridgeController {
  constructor(private readonly skillBridgeService: SkillBridgeService) {}

  @Get('roadmap')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user active reskilling roadmap' })
  getActiveRoadmap(@CurrentUser() user: any) {
    return this.skillBridgeService.getActiveRoadmap(user.id);
  }

  @Post('roadmap/generate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate a personalized 7, 30, 60, or 90-day learning roadmap' })
  generateRoadmap(
    @CurrentUser() user: any,
    @Body('targetRole') targetRole: string,
    @Body('durationDays') durationDays: number,
  ) {
    return this.skillBridgeService.generateRoadmap(user.id, targetRole || 'Full-Stack AI Systems Engineer', durationDays || 30);
  }

  @Patch('roadmap/toggle')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle completion status of a milestone' })
  toggleMilestone(
    @CurrentUser() user: any,
    @Body('roadmapId') roadmapId: string,
    @Body('milestoneIndex') milestoneIndex: number,
  ) {
    return this.skillBridgeService.toggleMilestone(user.id, roadmapId, milestoneIndex);
  }
}
