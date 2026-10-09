import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppService } from './app.service';
import { DataStoreService } from './database/data-store.service';

@Controller('api')
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly dataStore: DataStoreService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  async getHealth() {
    const isMongo = this.dataStore.isMongoConnected;
    const geminiKey = this.config.get<string>('GEMINI_API_KEY');
    const groqKey = this.config.get<string>('GROQ_API_KEY');
    const hasAi = !!(geminiKey || groqKey);

    const qdrantUrl = this.config.get<string>('QDRANT_URL') || 'http://localhost:6333';
    let qdrantStatus = 'unreachable';
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600);
      const res = await fetch(`${qdrantUrl}/healthz`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) qdrantStatus = 'healthy';
    } catch {
      qdrantStatus = 'offline';
    }

    const emailProvider =
      this.config.get<string>('RESEND_API_KEY') || this.config.get<string>('SMTP_HOST')
        ? 'healthy'
        : 'development_fallback';

    return {
      status: isMongo ? 'healthy' : 'degraded',
      api: 'healthy',
      mongodb: isMongo ? 'healthy' : 'disconnected',
      ai: hasAi ? 'healthy' : 'configured_without_keys',
      qdrant: qdrantStatus,
      email: emailProvider,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
