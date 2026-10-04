import { Module, Global } from '@nestjs/common';
import { AiService } from './ai.service';
import { RagService } from './rag.service';
import { AiController } from './ai.controller';

@Global()
@Module({
  controllers: [AiController],
  providers: [AiService, RagService],
  exports: [AiService, RagService],
})
export class AiModule {}
