import { Module } from '@nestjs/common';
import { SkillBridgeService } from './skillbridge.service';
import { SkillBridgeController } from './skillbridge.controller';

@Module({
  controllers: [SkillBridgeController],
  providers: [SkillBridgeService],
  exports: [SkillBridgeService],
})
export class SkillBridgeModule {}
