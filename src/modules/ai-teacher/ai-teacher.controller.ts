import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiTeacherService } from './ai-teacher.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('AI Teacher & Socratic Tutor')
@Controller('api/ai-teacher')
export class AiTeacherController {
  constructor(private readonly aiTeacherService: AiTeacherService) {}

  @Post('chat')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Interact with the adaptive Socratic AI Tutor' })
  async chat(
    @CurrentUser() user: any,
    @Body()
    body: {
      message: string;
      subject: string;
      mode: 'teach' | 'practice' | 'explain' | 'challenge' | 'revision' | 'interview';
      bloomsLevel?: string;
      language?: 'en' | 'bn';
      useRag?: boolean;
    },
  ) {
    return this.aiTeacherService.chat({
      userId: user.id,
      message: body.message,
      subject: body.subject,
      mode: body.mode,
      bloomsLevel: body.bloomsLevel,
      language: body.language,
      useRag: body.useRag,
    });
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retrieve conversation history for a subject' })
  async getHistory(@CurrentUser() user: any, @Query('subject') subject: string) {
    return this.aiTeacherService.getSessionHistory(user.id, subject);
  }

  @Get('flashcards')
  @ApiOperation({ summary: 'Generate rapid-recall flashcards for a specific subject' })
  async getFlashcards(@Query('subject') subject: string) {
    return this.aiTeacherService.generateFlashcards(subject || 'Full-Stack Architecture');
  }
}
