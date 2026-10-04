import { Module } from '@nestjs/common';
import { EducatorService } from './educator.service';
import { EducatorController } from './educator.controller';

@Module({
  controllers: [EducatorController],
  providers: [EducatorService],
  exports: [EducatorService],
})
export class EducatorModule {}
