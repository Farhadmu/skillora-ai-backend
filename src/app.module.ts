import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AiModule } from './modules/ai/ai.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProfileModule } from './modules/profile/profile.module';
import { SkillsModule } from './modules/skills/skills.module';
import { AiTeacherModule } from './modules/ai-teacher/ai-teacher.module';
import { AssessmentsModule } from './modules/assessments/assessments.module';
import { CareerNavigatorModule } from './modules/career-navigator/career-navigator.module';
import { SkillBridgeModule } from './modules/skillbridge/skillbridge.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { WorkforceReadyModule } from './modules/workforce-ready/workforce-ready.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { EducatorModule } from './modules/educator/educator.module';
import { AdminModule } from './modules/admin/admin.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { SearchModule } from './modules/search/search.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AiModule,
    AuthModule,
    ProfileModule,
    SkillsModule,
    AiTeacherModule,
    AssessmentsModule,
    CareerNavigatorModule,
    SkillBridgeModule,
    ProjectsModule,
    WorkforceReadyModule,
    MarketplaceModule,
    EducatorModule,
    AdminModule,
    AnalyticsModule,
    SearchModule,
  ],
})
export class AppModule {}
