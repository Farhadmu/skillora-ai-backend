import { Module } from '@nestjs/common';
import { WorkforceReadyService } from './workforce-ready.service';
import { WorkforceReadyController } from './workforce-ready.controller';

@Module({
  controllers: [WorkforceReadyController],
  providers: [WorkforceReadyService],
  exports: [WorkforceReadyService],
})
export class WorkforceReadyModule {}
