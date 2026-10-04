import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/roles.enum';

@ApiTags('Admin Operations & AI Governance')
@Controller('api/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get global platform telemetry, AI token metrics, and audit logs' })
  getPlatformStats() {
    return this.adminService.getPlatformStats();
  }

  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all registered accounts with RBAC roles' })
  getUsers() {
    return this.adminService.getUsersList();
  }

  @Get('ai-providers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get active multi-provider cascade status (Free Tier, Groq, OpenRouter, Cohere, Ollama, Native)' })
  getAiProviders() {
    return this.adminService.getAiProviders();
  }

  @Post('ai-providers/test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Trigger real-time benchmark test through multi-provider AI cascade' })
  testAiCascade(@Body('prompt') prompt?: string) {
    return this.adminService.testAiCascade(prompt);
  }

  @Patch('users/:id/role')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Elevate or modify user RBAC role (LEARNER, EDUCATOR, EMPLOYER, ADMIN)' })
  updateUserRole(@Param('id') id: string, @Body('role') role: Role) {
    return this.adminService.updateUserRole(id, role);
  }
}
