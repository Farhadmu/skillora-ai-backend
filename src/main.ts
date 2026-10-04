import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('SkilloraBootstrap');
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend Next.js application
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
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
