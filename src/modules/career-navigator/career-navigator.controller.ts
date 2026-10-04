import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CareerNavigatorService } from './career-navigator.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Career Navigator & JD Intelligence')
@Controller('api/career-navigator')
export class CareerNavigatorController {
  constructor(private readonly careerNavigatorService: CareerNavigatorService) {}

  @Get('roles')
  @ApiOperation({ summary: 'List high-demand tech careers with compensation benchmarks' })
  getRoles() {
    return this.careerNavigatorService.getAvailableRoles();
  }

  @Get('compare')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Compare two target roles against learner profile' })
  compare(
    @CurrentUser() user: any,
    @Query('roleA') roleA: string,
    @Query('roleB') roleB: string,
  ) {
    return this.careerNavigatorService.compareRoles(
      user.id,
      roleA || 'Full-Stack AI Systems Engineer',
      roleB || 'Backend Node.js & Cloud Architect',
    );
  }

  @Post('analyze-jd')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Extract requirements from pasted JD and evaluate match against user skills' })
  analyzeJd(@CurrentUser() user: any, @Body('jdText') jdText: string) {
    return this.careerNavigatorService.analyzeJobDescription(user.id, jdText);
  }
}
