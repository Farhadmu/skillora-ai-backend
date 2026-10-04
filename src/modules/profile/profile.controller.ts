import { Controller, Get, Patch, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Profile & CV Intelligence')
@Controller('api/profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getMyProfile(@CurrentUser() user: any) {
    return this.profileService.getProfile(user.id);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update onboarding details and career targets' })
  async updateMyProfile(@CurrentUser() user: any, @Body() updates: any) {
    return this.profileService.updateProfile(user.id, updates);
  }

  @Post('parse-cv')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload or paste CV text for AI skill extraction and evidence mapping' })
  async parseCv(@CurrentUser() user: any, @Body('cvText') cvText: string) {
    return this.profileService.parseCvAndEnrichProfile(user.id, cvText);
  }

  @Get('public/:idOrEmail')
  @ApiOperation({ summary: 'Get public verified portfolio by user ID or handle' })
  async getPublicPortfolio(@Param('idOrEmail') idOrEmail: string) {
    return this.profileService.getPublicPortfolio(idOrEmail);
  }
}
