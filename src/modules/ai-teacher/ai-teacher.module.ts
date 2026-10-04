import { Module } from '@nestjs/common';
import { AiTeacherService } from './ai-teacher.service';
import { AiTeacherController } from './ai-teacher.controller';

@Module({
  controllers: [AiTeacherController],
  providers: [AiTeacherService],
  exports: [AiTeacherService],
})
export class AiTeacherModule {}
