import { Controller, Get, UseGuards } from '@nestjs/common';
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
}
