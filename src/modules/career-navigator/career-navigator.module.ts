import { Module } from '@nestjs/common';
import { CareerNavigatorService } from './career-navigator.service';
import { CareerNavigatorController } from './career-navigator.controller';

@Module({
  controllers: [CareerNavigatorController],
  providers: [CareerNavigatorService],
  exports: [CareerNavigatorService],
})
export class CareerNavigatorModule {}
