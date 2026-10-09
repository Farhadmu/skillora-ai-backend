import * as dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import {
  SEED_COMPANIES,
  SEED_SKILLS,
  SEED_JOBS,
  SEED_ASSESSMENTS,
  SEED_COURSES,
  SEED_PROJECTS,
} from './database/seed-data';
import {
  CompanySchema,
  JobSchema,
  SkillSchema,
  AssessmentSchema,
  CourseSchema,
  ProjectSchema,
} from './database/schemas';

async function seed() {
  console.log('[Seed] Starting Skillora AI catalog seeding to MongoDB...');
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/skillora';
  let conn: mongoose.Connection | null = null;

  try {
    conn = await mongoose.createConnection(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    }).asPromise();
    console.log(`[Seed] Connected to MongoDB at ${uri}`);
  } catch (err: any) {
    console.error(`[Seed] FATAL: MongoDB not reachable at ${uri}: ${err.message}`);
    process.exit(1);
  }

  try {
    const CompanyModel = conn.model('Company', CompanySchema);
    const JobModel = conn.model('Job', JobSchema);
    const SkillModel = conn.model('Skill', SkillSchema);
    const AssessmentModel = conn.model('Assessment', AssessmentSchema);
    const CourseModel = conn.model('Course', CourseSchema);
    const ProjectModel = conn.model('Project', ProjectSchema);

    for (const c of SEED_COMPANIES) {
      await CompanyModel.updateOne({ id: c.id }, { $set: c }, { upsert: true });
    }
    for (const j of SEED_JOBS) {
      await JobModel.updateOne({ id: j.id }, { $set: j }, { upsert: true });
    }
    for (const s of SEED_SKILLS) {
      const slug = (s as any).slug || s.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      await SkillModel.updateOne({ name: s.name }, { $set: { ...s, slug } }, { upsert: true });
    }
    for (const a of SEED_ASSESSMENTS) {
      await AssessmentModel.updateOne({ id: a.id }, { $set: a }, { upsert: true });
    }
    for (const cr of SEED_COURSES) {
      await CourseModel.updateOne({ id: cr.id }, { $set: cr }, { upsert: true });
    }
    for (const pr of SEED_PROJECTS) {
      await ProjectModel.updateOne({ id: pr.id }, { $set: pr }, { upsert: true });
    }

    console.log('[Seed] Successfully seeded standard catalog data (skills, assessments, projects, courses, jobs) to MongoDB!');
  } finally {
    await conn.close();
  }
}

seed().catch((e) => {
  console.error('[Seed] Error during seeding:', e);
  process.exit(1);
});
