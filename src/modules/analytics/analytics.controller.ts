import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/roles.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Analytics & Workforce Telemetry')
@Controller('api/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('learner')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get learner study hours, growth curves, and skill proficiency distribution' })
  getLearnerAnalytics(@CurrentUser() user: any) {
    return this.analyticsService.getLearnerAnalytics(user.id);
  }

  @Get('employer/funnel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get hiring funnel metrics and placement velocity analytics' })
  getEmployerFunnel(@CurrentUser() user: any) {
    return this.analyticsService.getEmployerFunnel(user);
  }
}
