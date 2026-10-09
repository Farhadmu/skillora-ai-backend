import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('SkilloraBootstrap');
  const app = await NestFactory.create(AppModule);

  // Fail-fast JWT check before accepting any traffic
  const jwtSecret = process.env.JWT_SECRET;
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
  if (!jwtSecret || jwtSecret.length < 32 || jwtSecret.includes('skillora_super_secret') || jwtSecret.includes('your_crypto')) {
    logger.error('FATAL: JWT_SECRET is missing, shorter than 32 characters, or using a placeholder value.');
    process.exit(1);
  }
  if (!jwtRefreshSecret || jwtRefreshSecret.length < 32 || jwtRefreshSecret.includes('skillora_super_secret') || jwtRefreshSecret.includes('your_crypto')) {
    logger.error('FATAL: JWT_REFRESH_SECRET is missing, shorter than 32 characters, or using a placeholder value.');
    process.exit(1);
  }

  // Explicit production CORS origins supporting Vercel, Render, and custom domains
  const defaultAllowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'https://skillora.ai',
    'https://app.skillora.ai',
    'https://skillora-ai-frontend.vercel.app',
  ];

  const envOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
    : [];

  const allowedOriginsSet = new Set([...defaultAllowedOrigins, ...envOrigins]);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow non-browser requests (mobile apps, curl, server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      // Allow if explicit match or matches Vercel / Render / localhost domains
      if (
        allowedOriginsSet.has(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.onrender.com') ||
        origin.includes('localhost')
      ) {
        return callback(null, true);
      }

      logger.warn(`CORS blocked for origin: ${origin}`);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization,X-Requested-With,Accept,Origin',
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
