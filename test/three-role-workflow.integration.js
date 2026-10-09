/**
 * Skillora AI — Complete Three-Role End-to-End Workflow & Multi-Tenant Security Test Suite
 *
 * Verifies:
 * - Workflow 1: Educator Course/Assignment Creation -> Learner Enrollment & Submission ->
 *               Educator Rubric Review & Grading -> Skill Evidence Verification & Readiness Recalculation
 * - Workflow 2: Employer Job Publication -> Real Talent Discovery & Match Scoring ->
 *               Learner Application -> Employer Interview Scheduling -> Stage Progression & Notification
 * - Workflow 3: Employer Job Skill Requirements Aggregation -> Educator Market Demand Telemetry & Alignment
 * - Multi-Tenant Security & RBAC: Negative permission assertions across Learner, Educator, and Employer
 */

const http = require('http');
const mongoose = require('mongoose');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/skillora';

function request({ method, path, headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqHeaders = { ...headers };
    let payload = null;

    if (body) {
      payload = typeof body === 'string' ? body : JSON.stringify(body);
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => (responseBody += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(responseBody);
          } catch {
            parsed = responseBody;
          }
          resolve({ status: res.statusCode, data: parsed });
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runThreeRoleWorkflowTest() {
  console.log('========================================================================');
  console.log('   SKILLORA AI: THREE-ROLE WORKFLOW & MULTI-TENANT VERIFICATION SUITE');
  console.log('========================================================================\n');

  // Direct MongoDB connection for ground-truth database assertions
  console.log('[SETUP] Connecting directly to MongoDB for verifiable state assertions...');
  const mongo = await mongoose.connect(MONGO_URI);
  console.log('   ✓ Connected to MongoDB:', MONGO_URI);

  const db = mongoose.connection.db;
  const ts = Date.now();
  const password = 'SecurePassword!2026';

  const educatorEmail = `educator_${ts}@skillora-platform.test`;
  const learnerEmail = `learner_${ts}@skillora-platform.test`;
  const employerEmail = `employer_${ts}@skillora-platform.test`;
  const attackerEmail = `attacker_employer_${ts}@skillora-platform.test`;

  // --------------------------------------------------------------------------
  // STEP 1: REGISTER AND AUTHENTICATE ALL THREE ROLES
  // --------------------------------------------------------------------------
  console.log('\n[STEP 1] Provisioning Authenticated Participants for All Three Roles...');

  // 1A. Educator
  await request({
    method: 'POST',
    path: '/api/auth/register',
    body: { name: 'Prof. Ada Lovelace', email: educatorEmail, password, role: 'EDUCATOR' },
  });
  await db.collection('users').updateOne({ email: educatorEmail.toLowerCase() }, { $set: { isVerified: true } });
  const eduLogin = await request({
    method: 'POST',
    path: '/api/auth/login',
    body: { email: educatorEmail, password },
  });
  const educatorToken = eduLogin.data.tokens?.accessToken || eduLogin.data.accessToken;
  const educatorUser = eduLogin.data.user;
  console.log('   ✓ Educator Provisioned & Authenticated:', educatorEmail, '| Token issued:', !!educatorToken);

  // 1B. Learner
  await request({
    method: 'POST',
    path: '/api/auth/register',
    body: { name: 'Alan Turing', email: learnerEmail, password, role: 'LEARNER' },
  });
  await db.collection('users').updateOne({ email: learnerEmail.toLowerCase() }, { $set: { isVerified: true } });
  const lrnLogin = await request({
    method: 'POST',
    path: '/api/auth/login',
    body: { email: learnerEmail, password },
  });
  const learnerToken = lrnLogin.data.tokens?.accessToken || lrnLogin.data.accessToken;
  const learnerUser = lrnLogin.data.user;
  console.log('   ✓ Learner Provisioned & Authenticated:', learnerEmail, '| Token issued:', !!learnerToken);

  // 1C. Primary Employer
  await request({
    method: 'POST',
    path: '/api/auth/register',
    body: { name: 'Grace Hopper', email: employerEmail, password, role: 'EMPLOYER', companyName: 'DeepMind Robotics Inc.' },
  });
  await db.collection('users').updateOne({ email: employerEmail.toLowerCase() }, { $set: { isVerified: true } });
  const empLogin = await request({
    method: 'POST',
    path: '/api/auth/login',
    body: { email: employerEmail, password },
  });
  const employerToken = empLogin.data.tokens?.accessToken || empLogin.data.accessToken;
  const employerUser = empLogin.data.user;
  console.log('   ✓ Employer Provisioned & Authenticated:', employerEmail, '| Token issued:', !!employerToken);

  // 1D. Competing Employer (For multi-tenant isolation attack test)
  await request({
    method: 'POST',
    path: '/api/auth/register',
    body: { name: 'Rival Recruiter', email: attackerEmail, password, role: 'EMPLOYER', companyName: 'Rival Corp' },
  });
  await db.collection('users').updateOne({ email: attackerEmail.toLowerCase() }, { $set: { isVerified: true } });
  const rivalLogin = await request({
    method: 'POST',
    path: '/api/auth/login',
    body: { email: attackerEmail, password },
  });
  const rivalToken = rivalLogin.data.tokens?.accessToken || rivalLogin.data.accessToken;

  // --------------------------------------------------------------------------
  // STEP 2: WORKFLOW 1 — EDUCATOR HELPS LEARNER DEVELOP A SKILL
  // --------------------------------------------------------------------------
  console.log('\n[STEP 2] Executing Workflow 1: Educator Curriculum & Verifiable Assessment...');

  // 2A. Educator creates and publishes a Course
  const courseRes = await request({
    method: 'POST',
    path: '/api/educator/courses',
    headers: { Authorization: `Bearer ${educatorToken}` },
    body: {
      title: 'Distributed NestJS & Vector Architectures',
      description: 'Production microservices with high-performance vector retrieval.',
      targetSkill: 'NestJS Microservices',
      level: 'Advanced',
      status: 'published',
      modules: [
        {
          title: 'Module 1: Resilient Interceptors & Streaming',
          lessons: [{ title: 'Lesson 1.1: Event Driven Architecture', type: 'article' }],
        },
      ],
    },
  });
  if (courseRes.status !== 201) throw new Error(`Course creation failed: ${JSON.stringify(courseRes)}`);
  const course = courseRes.data;
  console.log('   ✓ Course published by Educator:', course.title, `(ID: ${course.id})`);

  // 2B. Educator creates a Cohort
  const cohortRes = await request({
    method: 'POST',
    path: '/api/educator/cohort',
    headers: { Authorization: `Bearer ${educatorToken}` },
    body: {
      name: `Fall 2026 Distributed Systems - ${ts}`,
      targetRole: 'Full-Stack AI Systems Engineer',
      description: 'Hands-on production track with verified rubric assessments.',
      courseIds: [course.id],
    },
  });
  if (cohortRes.status !== 201) throw new Error(`Cohort creation failed: ${JSON.stringify(cohortRes)}`);
  const cohort = cohortRes.data;
  console.log('   ✓ Cohort launched by Educator:', cohort.name, `(ID: ${cohort.id})`);

  // 2C. Educator creates an Assignment with Rubric Criteria & Target Skill
  const assignmentRes = await request({
    method: 'POST',
    path: '/api/educator/assignments',
    headers: { Authorization: `Bearer ${educatorToken}` },
    body: {
      cohortId: cohort.id,
      courseId: course.id,
      title: 'Build a Distributed Resilient Message Bus in NestJS',
      instructions: 'Implement idempotent event consumers, retry queues, and dead-letter topics with full unit coverage.',
      targetSkill: 'NestJS Microservices',
      maxScore: 100,
      rubricCriteria: [
        { criterion: 'Idempotency and deduplication', weight: 40 },
        { criterion: 'Error handling & dead-letter queueing', weight: 30 },
        { criterion: 'Test coverage and documentation', weight: 30 },
      ],
    },
  });
  if (assignmentRes.status !== 201) throw new Error(`Assignment creation failed: ${JSON.stringify(assignmentRes)}`);
  const assignment = assignmentRes.data;
  console.log('   ✓ Assignment created with Rubrics:', assignment.title, `(ID: ${assignment.id})`);

  // 2D. Learner enrolls in the Course
  const enrollRes = await request({
    method: 'POST',
    path: `/api/educator/courses/${course.id}/enroll`,
    headers: { Authorization: `Bearer ${learnerToken}` },
  });
  if (enrollRes.status !== 201) throw new Error(`Learner enrollment failed: ${JSON.stringify(enrollRes)}`);
  console.log('   ✓ Learner enrolled in Course:', course.title);

  // 2E. Learner completes and submits the Assignment
  const submissionRes = await request({
    method: 'POST',
    path: `/api/educator/assignments/${assignment.id}/submit`,
    headers: { Authorization: `Bearer ${learnerToken}` },
    body: {
      githubUrl: 'https://github.com/alan-turing/distributed-nestjs-bus',
      notes: 'Implemented idempotency keys stored in Redis cache with exponential backoff on retry queues.',
    },
  });
  if (submissionRes.status !== 201) throw new Error(`Assignment submission failed: ${JSON.stringify(submissionRes)}`);
  const submission = submissionRes.data;
  console.log('   ✓ Learner submitted Assignment deliverables (Submission ID:', submission.id, ')');

  // 2F. Educator reviews and grades submission with Rubric Feedback
  const reviewRes = await request({
    method: 'POST',
    path: `/api/educator/submissions/${submission.id}/review`,
    headers: { Authorization: `Bearer ${educatorToken}` },
    body: {
      score: 95,
      feedback: 'Outstanding architecture! Clean boundary separation and robust idempotency safeguards.',
      rubricScores: [
        { criterion: 'Idempotency and deduplication', score: 38, maxScore: 40 },
        { criterion: 'Error handling & dead-letter queueing', score: 29, maxScore: 30 },
        { criterion: 'Test coverage and documentation', score: 28, maxScore: 30 },
      ],
    },
  });
  if (reviewRes.status !== 201) throw new Error(`Educator review failed: ${JSON.stringify(reviewRes)}`);
  console.log('   ✓ Educator graded submission (Score: 95/100, Status: GRADED)');

  // 2G. Direct MongoDB Ground-Truth Verification for Skill Evidence & Readiness
  const dbEvidence = await db.collection('skill_evidence').findOne({
    userId: learnerUser.id,
    skillName: 'NestJS Microservices',
  });
  if (!dbEvidence || dbEvidence.status !== 'VERIFIED') {
    throw new Error(`Expected VERIFIED SkillEvidence in MongoDB, found: ${JSON.stringify(dbEvidence)}`);
  }
  console.log('   ✓ [MongoDB Ground Truth] Verified SkillEvidence found in database:');
  console.log('      - Skill:', dbEvidence.skillName, '| Status:', dbEvidence.status, '| Score:', dbEvidence.score);

  const dbProfile = await db.collection('profiles').findOne({ userId: learnerUser.id });
  const hasVerifiedSkillInProfile = dbProfile.skills?.some(
    (s) => s.name.toLowerCase() === 'nestjs microservices' && s.verified === true
  );
  if (!hasVerifiedSkillInProfile) {
    throw new Error('Learner profile does not reflect verified skill from educator review.');
  }
  console.log('   ✓ [MongoDB Ground Truth] Learner Profile updated with verified skill & readiness score:', dbProfile.readinessScore);

  // --------------------------------------------------------------------------
  // STEP 3: WORKFLOW 2 — LEARNER MOVES FROM LEARNING TO EMPLOYMENT
  // --------------------------------------------------------------------------
  console.log('\n[STEP 3] Executing Workflow 2: Employer Job Matching, Application & Interviewing...');

  // 3A. Employer publishes a Job Opening with Required Skills
  const jobRes = await request({
    method: 'POST',
    path: '/api/marketplace/jobs',
    headers: { Authorization: `Bearer ${employerToken}` },
    body: {
      title: 'Principal Distributed Backend Engineer',
      companyName: 'DeepMind Robotics Inc.',
      requiredSkills: ['NestJS Microservices', 'TypeScript', 'Docker'],
      preferredSkills: ['Qdrant', 'RAG'],
      experienceLevel: 'Senior',
      mode: 'remote',
      salaryRange: '$140,000 - $180,000 USD',
      description: 'Lead high-throughput event processing and microservice architecture.',
    },
  });
  if (jobRes.status !== 201) throw new Error(`Employer job creation failed: ${JSON.stringify(jobRes)}`);
  const job = jobRes.data;
  console.log('   ✓ Employer posted Job Requisition:', job.title, `(ID: ${job.id})`);

  // 3B. Talent Discovery & Matching (Zero Fake Candidates)
  const talentRes = await request({
    method: 'GET',
    path: '/api/marketplace/talent/search?skill=NestJS',
    headers: { Authorization: `Bearer ${employerToken}` },
  });
  if (talentRes.status !== 200 || !Array.isArray(talentRes.data)) {
    throw new Error(`Talent search failed: ${JSON.stringify(talentRes)}`);
  }
  const matchedCandidate = talentRes.data.find((c) => c.id === learnerUser.id);
  if (!matchedCandidate) {
    throw new Error(`Learner ${learnerUser.id} not found in talent search results`);
  }
  if (!matchedCandidate.skills.some((s) => s.name.toLowerCase().includes('nestjs') && s.verified)) {
    throw new Error('Candidate in talent search does not have verified NestJS evidence.');
  }
  console.log('   ✓ Employer searched talent pool. Found candidate:', matchedCandidate.name);
  console.log('      - Match Explanation:', matchedCandidate.matchExplanation);

  // 3C. Learner applies for the Job
  const applyRes = await request({
    method: 'POST',
    path: `/api/marketplace/jobs/${job.id}/apply`,
    headers: { Authorization: `Bearer ${learnerToken}` },
  });
  if (applyRes.status !== 201 && applyRes.status !== 200) {
    throw new Error(`Job application failed: ${JSON.stringify(applyRes)}`);
  }
  const application = applyRes.data;
  console.log('   ✓ Learner applied for Job (Application ID:', application.id, '| Match Score:', application.matchScore, '%)');

  // 3D. Employer views candidate pipeline
  const candidatesRes = await request({
    method: 'GET',
    path: '/api/marketplace/employer/candidates',
    headers: { Authorization: `Bearer ${employerToken}` },
  });
  if (candidatesRes.status !== 200 || !Array.isArray(candidatesRes.data)) {
    throw new Error(`Employer candidate list failed: ${JSON.stringify(candidatesRes)}`);
  }
  const foundApp = candidatesRes.data.find((a) => a.id === application.id || a.userId === learnerUser.id);
  if (!foundApp) {
    throw new Error(`Application not found in Employer ATS pipeline`);
  }
  console.log('   ✓ Employer ATS pipeline retrieved application from candidate:', foundApp.candidateName);

  // 3E. Employer Schedules Interview Invitation
  const scheduleRes = await request({
    method: 'POST',
    path: '/api/marketplace/interviews/schedule',
    headers: { Authorization: `Bearer ${employerToken}` },
    body: {
      applicationId: application.id,
      interviewType: 'System Design',
      scheduledAt: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days from now
      durationMinutes: 60,
      instructions: 'Technical deep dive into distributed idempotency and concurrency patterns.',
      meetingLink: 'https://meet.skillora.ai/room-production-test',
    },
  });
  if (scheduleRes.status !== 201) throw new Error(`Interview scheduling failed: ${JSON.stringify(scheduleRes)}`);
  const invitation = scheduleRes.data;
  console.log('   ✓ Employer scheduled interview invitation (ID:', invitation.id, '| Type:', invitation.interviewType, ')');

  // 3F. Direct MongoDB Ground-Truth Verification for Interview & Notification
  const dbInvitation = await db.collection('interview_invitations').findOne({ id: invitation.id });
  if (!dbInvitation || dbInvitation.status !== 'SCHEDULED') {
    throw new Error(`InterviewInvitation document not persisted in MongoDB: ${JSON.stringify(dbInvitation)}`);
  }
  console.log('   ✓ [MongoDB Ground Truth] InterviewInvitation record persisted with SCHEDULED status.');

  const dbNotif = await db.collection('notifications').findOne({
    userId: learnerUser.id,
    type: 'interview',
  });
  if (!dbNotif) {
    throw new Error('Candidate did not receive interview notification in MongoDB.');
  }
  console.log('   ✓ [MongoDB Ground Truth] Candidate notification generated:', dbNotif.title);

  // --------------------------------------------------------------------------
  // STEP 4: WORKFLOW 3 — EMPLOYER DEMAND INFORMS EDUCATOR CURRICULUM
  // --------------------------------------------------------------------------
  console.log('\n[STEP 4] Executing Workflow 3: Aggregated Market Demand Telemetry for Educators...');

  const demandRes = await request({
    method: 'GET',
    path: '/api/educator/market-demand',
    headers: { Authorization: `Bearer ${educatorToken}` },
  });
  if (demandRes.status !== 200) throw new Error(`Market demand telemetry failed: ${JSON.stringify(demandRes)}`);
  const demand = demandRes.data;
  if (!demand.topSkillsDemand || demand.topSkillsDemand.length === 0) {
    throw new Error('Market demand insights returned empty skills list.');
  }
  const hasNestJsDemand = demand.topSkillsDemand.some((s) => s.skill.toLowerCase().includes('nestjs'));
  if (!hasNestJsDemand) {
    throw new Error('Market demand does not aggregate published job skill requirements.');
  }
  console.log('   ✓ Educator Market Demand telemetry aggregated successfully:');
  console.log('      - Total Jobs Analyzed:', demand.totalJobsAnalyzed);
  console.log('      - Top In-Demand Skills:', demand.topSkillsDemand.slice(0, 3).map((s) => `${s.skill} (${s.count})`).join(', '));
  console.log('      - Curriculum Recommendations:', demand.curriculumRecommendations?.[0] || 'Align syllabus with distributed architectures.');

  // --------------------------------------------------------------------------
  // STEP 5: APPLICATION SECURITY & MULTI-TENANT ISOLATION ASSERTIONS
  // --------------------------------------------------------------------------
  console.log('\n[STEP 5] Testing RBAC Security & Multi-Tenant Isolation Boundaries...');

  // 5A. Learner attempting to review submissions (Must be 403 Forbidden)
  const illicitReview = await request({
    method: 'POST',
    path: `/api/educator/submissions/${submission.id}/review`,
    headers: { Authorization: `Bearer ${learnerToken}` },
    body: { score: 100, feedback: 'Unauthorized self-review' },
  });
  if (illicitReview.status !== 403) {
    throw new Error(`Security breach: Learner was able to call submission review endpoint (Status: ${illicitReview.status})`);
  }
  console.log('   ✓ [RBAC] Learner blocked from reviewing submissions (HTTP 403 Forbidden)');

  // 5B. Learner attempting to schedule interview (Must be 403 Forbidden)
  const illicitSchedule = await request({
    method: 'POST',
    path: '/api/marketplace/interviews/schedule',
    headers: { Authorization: `Bearer ${learnerToken}` },
    body: { applicationId: application.id, scheduledAt: new Date().toISOString() },
  });
  if (illicitSchedule.status !== 403) {
    throw new Error(`Security breach: Learner was able to schedule interviews (Status: ${illicitSchedule.status})`);
  }
  console.log('   ✓ [RBAC] Learner blocked from scheduling interviews (HTTP 403 Forbidden)');

  // 5C. Rival Employer attempting to schedule interview for another company\'s job (Must be 403 Forbidden)
  const crossTenantSchedule = await request({
    method: 'POST',
    path: '/api/marketplace/interviews/schedule',
    headers: { Authorization: `Bearer ${rivalToken}` },
    body: { applicationId: application.id, scheduledAt: new Date().toISOString() },
  });
  if (crossTenantSchedule.status !== 403) {
    throw new Error(`Tenant leak: Rival employer managed another company\'s candidate pipeline (Status: ${crossTenantSchedule.status})`);
  }
  console.log('   ✓ [Tenant Isolation] Rival employer blocked from managing other company candidates (HTTP 403 Forbidden)');

  console.log('\n========================================================================');
  console.log('   ALL THREE-ROLE WORKFLOWS & TENANT SECURITY TESTS PASSED (100%)');
  console.log('========================================================================\n');

  await mongoose.disconnect();
}

runThreeRoleWorkflowTest().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
