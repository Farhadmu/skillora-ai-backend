import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Response } from 'express';
import { AppService } from './app.service';

@Controller('api')
export class AppController {
  constructor(
    private readonly appService: AppService,
    @InjectConnection() private readonly connection: Connection,
    private readonly config: ConfigService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  async getHealth(@Res({ passthrough: true }) res: Response) {
    const isMongo = this.connection.readyState === 1;
    const geminiKey = this.config.get<string>('GEMINI_API_KEY');
    const groqKey = this.config.get<string>('GROQ_API_KEY');
    const hasAi = !!(geminiKey || groqKey);

    const qdrantUrl = this.config.get<string>('QDRANT_URL') || 'http://localhost:6333';
    let qdrantStatus = 'unreachable';
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600);
      const qdrantRes = await fetch(`${qdrantUrl}/healthz`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (qdrantRes.ok) qdrantStatus = 'healthy';
      else qdrantStatus = 'degraded';
    } catch {
      qdrantStatus = 'offline';
    }

    const emailProvider =
      this.config.get<string>('RESEND_API_KEY') || this.config.get<string>('SMTP_HOST')
        ? 'healthy'
        : 'development_fallback';

    const overallStatus = isMongo ? 'healthy' : 'unhealthy';
    if (!isMongo) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }

    return {
      status: overallStatus,
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
