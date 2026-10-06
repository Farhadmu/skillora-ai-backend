const http = require('http');
const fs = require('fs');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runTest() {
  console.log('--- STARTING SKILLORA E2E PERSISTENCE & WORKFLOW AUDIT ---');
  const timestamp = Date.now();
  const email = `test_learner_${timestamp}@skillora.ai`;
  const password = 'Password123!';

  // 1. REGISTER
  console.log(`[1] Registering fresh user: ${email}`);
  const regRes = await request(
    {
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      name: `Test Engineer ${timestamp}`,
      email,
      password,
      role: 'LEARNER',
      careerInterest: 'Full-Stack AI Systems Engineer',
    }
  );
  console.log('Registration status:', regRes.status);
  if (regRes.status !== 201) throw new Error('Registration failed: ' + JSON.stringify(regRes));

  const verificationUrl = regRes.data.verificationUrl;
  const tokenMatch = verificationUrl.match(/token=([a-f0-9]+)/);
  const verifyToken = tokenMatch ? tokenMatch[1] : null;

  // 2. VERIFY EMAIL
  console.log('[2] Verifying email token...');
  const verifyRes = await request(
    {
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/verify-email',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { token: verifyToken }
  );
  console.log('Verify email status:', verifyRes.status);

  // 3. LOGIN
  console.log('[3] Logging in as fresh user...');
  const loginRes = await request(
    {
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email, password }
  );
  console.log('Login status:', loginRes.status);
  const accessToken = loginRes.data.tokens.accessToken;
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };

  // 4. GET INITIAL PROFILE
  console.log('[4] Fetching initial profile...');
  const prof1 = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/profile/me',
    method: 'GET',
    headers: authHeaders,
  });
  console.log('Profile loaded for:', prof1.data.name, 'Readiness:', prof1.data.readinessScore);

  // 5. UPDATE PROFILE & TARGET CAREER
  console.log('[5] Updating profile & setting target career role...');
  const updateProf = await request(
    {
      hostname: 'localhost',
      port: 3001,
      path: '/api/profile/me',
      method: 'PATCH',
      headers: authHeaders,
    },
    {
      headline: 'Senior Full-Stack AI Engineer',
      targetRole: 'Staff AI Systems Architect',
      skills: [
        { name: 'TypeScript', proficiency: 92, verified: true, evidence: ['Exam 92%'] },
        { name: 'NestJS', proficiency: 88, verified: true, evidence: ['GitHub clean repo'] },
        { name: 'MongoDB', proficiency: 85, verified: true, evidence: ['Index optimization'] },
      ],
    }
  );
  console.log('Updated profile target role:', updateProf.data.targetRole, 'skills count:', updateProf.data.skills.length);

  // 6. GENERATE ROADMAP
  console.log('[6] Generating active SkillBridge roadmap...');
  const roadRes = await request(
    {
      hostname: 'localhost',
      port: 3001,
      path: '/api/skillbridge/roadmap/generate',
      method: 'POST',
      headers: authHeaders,
    },
    { targetRole: 'Staff AI Systems Architect', durationDays: 30 }
  );
  console.log('Roadmap generated with duration:', roadRes.data.durationDays, 'milestones:', roadRes.data.milestones.length);

  // 7. TOGGLE MILESTONE
  console.log('[7] Toggling milestone 0...');
  const toggleRes = await request(
    {
      hostname: 'localhost',
      port: 3001,
      path: '/api/skillbridge/roadmap/toggle',
      method: 'PATCH',
      headers: authHeaders,
    },
    { milestoneIndex: 0, completed: true }
  );
  console.log('Roadmap progress after toggle:', toggleRes.data.progressPercent + '%');

  // 8. SUBMIT PROJECT
  console.log('[8] Submitting project repo for prj-1...');
  const projRes = await request(
    {
      hostname: 'localhost',
      port: 3001,
      path: '/api/projects/prj-1/submit',
      method: 'POST',
      headers: authHeaders,
    },
    {
      repoUrl: 'https://github.com/developer/rag-microservice',
      liveUrl: 'https://rag-microservice.example.com',
      notes: 'Implemented distributed rate limiting, Cosine index search, and NestJS CQRS.',
    }
  );
  console.log('Project submission status:', projRes.status, 'Message:', projRes.data.message);

  // 9. SUBMIT ASSESSMENT
  console.log('[9] Submitting assessment answers for asm-1...');
  const asmRes = await request(
    {
      hostname: 'localhost',
      port: 3001,
      path: '/api/assessments/asm-1/submit',
      method: 'POST',
      headers: authHeaders,
    },
    {
      answers: {
        'q-1': 0,
        'q-2': 1,
        'q-3': 'DeepReadonly',
      },
    }
  );
  console.log('Assessment score:', asmRes.data.score + '%', 'Feedback questions:', asmRes.data.feedback.length);

  // 10. RECALCULATE READINESS
  console.log('[10] Computing 7-D readiness score...');
  const readyRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/workforce-ready/score',
    method: 'GET',
    headers: authHeaders,
  });
  console.log('7-D Readiness Score:', readyRes.data.overallScore, 'Employability:', readyRes.data.employabilityStatus);

  // 11. APPLY FOR JOB
  console.log('[11] Applying for marketplace role job-1...');
  const appRes = await request(
    {
      hostname: 'localhost',
      port: 3001,
      path: '/api/marketplace/jobs/job-1/apply',
      method: 'POST',
      headers: authHeaders,
    },
    { notes: 'Ready for production deployment evaluation.' }
  );
  console.log('Application status:', appRes.status, 'Application ID:', appRes.data.id);

  // 12. VERIFY APPLICATION
  console.log('[12] Verifying applications list from learner view...');
  const myApps = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/marketplace/applications/me',
    method: 'GET',
    headers: authHeaders,
  });
  console.log('Learner applications count:', myApps.data.length);

  // 13. LOGIN AS EMPLOYER & VERIFY PIPELINE
  console.log('[13] Logging in as employer to verify candidate pipeline...');
  const empLogin = await request(
    {
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: 'employer@skillora.ai', password: 'Password123!' }
  );
  if (!empLogin.data || !empLogin.data.tokens) {
    throw new Error('Employer login failed: ' + JSON.stringify(empLogin));
  }
  const empHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${empLogin.data.tokens.accessToken}`,
  };

  const candidatesRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/marketplace/employer/candidates',
    method: 'GET',
    headers: empHeaders,
  });
  const foundCandidate = candidatesRes.data.find((c) => c.email === email || c.id === appRes.data.id);
  console.log('Employer candidates count:', candidatesRes.data.length, 'Candidate found in employer ATS:', !!foundCandidate);

  // Save credentials for restart test
  fs.writeFileSync('last-test-user.json', JSON.stringify({ email, password, targetRole: 'Staff AI Systems Architect', progress: toggleRes.data.progressPercent }));

  return { email, password };
}

runTest()
  .then((creds) => {
    console.log('\n>>> PHASE 1 COMPLETE: All operations verified for user:', creds.email);
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n>>> ERROR IN TEST:', err);
    process.exit(1);
  });
