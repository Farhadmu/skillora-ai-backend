import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('SkilloraBootstrap');
  const app = await NestFactory.create(AppModule);

  // Fail-fast JWT check
  if (!process.env.JWT_SECRET) {
    logger.error('FATAL: JWT_SECRET environment variable is missing. Application cannot start securely.');
    process.exit(1);
  }

  // Explicit CORS origins
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:3000', 'http://127.0.0.1:3000', 'https://skillora.ai', 'https://app.skillora.ai'];

  app.enableCors({
    origin: corsOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Strict global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Configure Swagger/OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle('Skillora AI - API Specification')
    .setDescription(
      'Enterprise RESTful API for Skillora AI: AI Workforce Intelligence Platform (Learn. Build. Prove. Grow.)',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Authentication')
    .addTag('Profile & CV Intelligence')
    .addTag('Skill Intelligence & Graph')
    .addTag('AI Teacher & Socratic Tutor')
    .addTag('Assessments & Skill Verification')
    .addTag('Career Navigator & JD Intelligence')
    .addTag('SkillBridge & Reskilling Roadmap')
    .addTag('Projects & AI Code Review')
    .addTag('Workforce Ready & AI Mock Interview')
    .addTag('Global Talent Marketplace & Employer Pipeline')
    .addTag('Educator Intelligence & Cohorts')
    .addTag('Admin Operations & AI Governance')
    .addTag('Analytics & Workforce Telemetry')
    .addTag('Unified Global Search')
    .addTag('AI Command Center & Context Assistant')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  logger.log(`====================================================`);
  logger.log(`   SKILLORA AI BACKEND ENGINE RUNNING ON PORT ${port}`);
  logger.log(`   Swagger Docs: http://localhost:${port}/api/docs`);
  logger.log(`====================================================`);
}
bootstrap();
