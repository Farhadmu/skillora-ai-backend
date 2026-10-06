import * as dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as path from 'path';
import * as fs from 'fs';
import {
  SEED_USERS,
  PRIMARY_LEARNER_PROFILE,
  SEED_COMPANIES,
  SEED_SKILLS,
  SEED_JOBS,
  SEED_ASSESSMENTS,
  SEED_COURSES,
  SEED_PROJECTS,
  SEED_ROADMAP,
  SEED_APPLICATION,
} from './database/seed-data';
import {
  UserSchema,
  ProfileSchema,
  CompanySchema,
  JobSchema,
  SkillSchema,
  AssessmentSchema,
  CourseSchema,
  ProjectSchema,
  RoadmapSchema,
  JobApplicationSchema,
} from './database/schemas';

async function seed() {
  console.log('[Seed] Starting Skillora AI database seeding...');
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/skillora';
  let conn: mongoose.Connection | null = null;

  try {
    conn = await mongoose.createConnection(uri, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000,
    }).asPromise();
    console.log(`[Seed] Connected to MongoDB at ${uri}`);
  } catch (err: any) {
    console.log(`[Seed] MongoDB not reachable at ${uri}. Seeding to persistent file store.`);
  }

  const passwordHash = await bcrypt.hash('Password123!', 10);
  const now = new Date().toISOString();

  const usersMap = new Map();
  for (const u of SEED_USERS) {
    usersMap.set(u.id, {
      ...u,
      passwordHash,
      createdAt: now,
    });
  }

  const profilesMap = new Map();
  profilesMap.set(PRIMARY_LEARNER_PROFILE.userId, PRIMARY_LEARNER_PROFILE);

  const companiesMap = new Map();
  for (const c of SEED_COMPANIES) companiesMap.set(c.id, c);

  const skillsMap = new Map();
  for (const s of SEED_SKILLS) skillsMap.set(s.id, s);

  const jobsMap = new Map();
  for (const j of SEED_JOBS) jobsMap.set(j.id, j);

  const assessmentsMap = new Map();
  for (const a of SEED_ASSESSMENTS) assessmentsMap.set(a.id, a);

  const coursesMap = new Map();
  for (const c of SEED_COURSES) coursesMap.set(c.id, c);

  const projectsMap = new Map();
  for (const p of SEED_PROJECTS) projectsMap.set(p.id, p);

  const roadmapsMap = new Map();
  roadmapsMap.set(SEED_ROADMAP.id, SEED_ROADMAP);

  const applicationsMap = new Map();
  applicationsMap.set(SEED_APPLICATION.id, SEED_APPLICATION);

  // If connected to MongoDB, populate collections
  if (conn) {
    const UserModel = conn.model('User', UserSchema);
    const ProfileModel = conn.model('Profile', ProfileSchema);
    const CompanyModel = conn.model('Company', CompanySchema);
    const JobModel = conn.model('Job', JobSchema);
    const SkillModel = conn.model('Skill', SkillSchema);
    const AssessmentModel = conn.model('Assessment', AssessmentSchema);
    const CourseModel = conn.model('Course', CourseSchema);
    const ProjectModel = conn.model('Project', ProjectSchema);
    const RoadmapModel = conn.model('Roadmap', RoadmapSchema);
    const ApplicationModel = conn.model('JobApplication', JobApplicationSchema);

    for (const u of Array.from(usersMap.values())) {
      await UserModel.updateOne({ email: u.email }, { $set: u }, { upsert: true });
    }
    for (const p of Array.from(profilesMap.values())) {
      await ProfileModel.updateOne({ userId: p.userId }, { $set: p }, { upsert: true });
    }
    for (const c of Array.from(companiesMap.values())) {
      await CompanyModel.updateOne({ id: c.id }, { $set: c }, { upsert: true });
    }
    for (const j of Array.from(jobsMap.values())) {
      await JobModel.updateOne({ id: j.id }, { $set: j }, { upsert: true });
    }
    for (const s of Array.from(skillsMap.values())) {
      await SkillModel.updateOne({ name: s.name }, { $set: s }, { upsert: true });
    }
    for (const a of Array.from(assessmentsMap.values())) {
      await AssessmentModel.updateOne({ id: a.id }, { $set: a }, { upsert: true });
    }
    for (const cr of Array.from(coursesMap.values())) {
      await CourseModel.updateOne({ id: cr.id }, { $set: cr }, { upsert: true });
    }
    for (const pr of Array.from(projectsMap.values())) {
      await ProjectModel.updateOne({ id: pr.id }, { $set: pr }, { upsert: true });
    }
    for (const r of Array.from(roadmapsMap.values())) {
      await RoadmapModel.updateOne({ id: r.id }, { $set: r }, { upsert: true });
    }
    for (const ap of Array.from(applicationsMap.values())) {
      await ApplicationModel.updateOne({ id: ap.id }, { $set: ap }, { upsert: true });
    }
    console.log('[Seed] Successfully seeded all collections into MongoDB!');
    await conn.close();
  }

  // Persist to local JSON snapshot
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const persistenceFilePath = path.join(dataDir, 'db-persistence.json');
  const payload = {
    users: Array.from(usersMap.entries()),
    profiles: Array.from(profilesMap.entries()),
    jobs: Array.from(jobsMap.entries()),
    companies: Array.from(companiesMap.entries()),
    skills: Array.from(skillsMap.entries()),
    assessments: Array.from(assessmentsMap.entries()),
    projects: Array.from(projectsMap.entries()),
    courses: Array.from(coursesMap.entries()),
    roadmaps: Array.from(roadmapsMap.entries()),
    applications: Array.from(applicationsMap.entries()),
    assessmentAttempts: [],
    skillEvidences: [],
    notifications: [],
    analyticsEvents: [],
    aiUsages: [],
    auditLogs: [],
    savedAt: new Date().toISOString(),
  };
  fs.writeFileSync(persistenceFilePath, JSON.stringify(payload, null, 2), 'utf-8');
  console.log(`[Seed] Successfully seeded ${usersMap.size} users, ${jobsMap.size} jobs, ${skillsMap.size} skills to ${persistenceFilePath}!`);
}

seed().catch((e) => {
  console.error('[Seed] Error during seeding:', e);
  process.exit(1);
});
