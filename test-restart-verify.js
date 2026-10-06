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

async function verifyAfterRestart() {
  console.log('--- EXECUTING POST-RESTART DATABASE PERSISTENCE VERIFICATION ---');
  const creds = JSON.parse(fs.readFileSync('last-test-user.json', 'utf8'));
  console.log(`Verifying persistent data for user: ${creds.email}`);

  // 1. LOGIN AFTER RESTART
  console.log('[1] Logging in after backend restart...');
  const loginRes = await request(
    {
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: creds.email, password: creds.password }
  );

  if (loginRes.status !== 200 || !loginRes.data.tokens) {
    throw new Error('Post-restart login failed: ' + JSON.stringify(loginRes));
  }
  console.log('Login succeeded! Access token retrieved.');

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${loginRes.data.tokens.accessToken}`,
  };

  // 2. VERIFY PROFILE
  console.log('[2] Verifying persistent profile and target career role...');
  const profRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/profile/me',
    method: 'GET',
    headers: authHeaders,
  });

  if (profRes.data.targetRole !== creds.targetRole) {
    throw new Error(`Target role mismatch! Expected ${creds.targetRole}, got ${profRes.data.targetRole}`);
  }
  if (!profRes.data.skills || profRes.data.skills.length < 3) {
    throw new Error(`Skills count mismatch! Expected at least 3, got ${profRes.data.skills?.length}`);
  }
  console.log('Profile verification passed! Target role:', profRes.data.targetRole, 'Skills count:', profRes.data.skills.length);

  // 3. VERIFY ROADMAP
  console.log('[3] Verifying persistent active roadmap and milestone state...');
  const roadRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/skillbridge/roadmap',
    method: 'GET',
    headers: authHeaders,
  });

  if (!roadRes.data || !roadRes.data.milestones) {
    throw new Error('Roadmap was not found after restart!');
  }
  if (roadRes.data.milestones[0].completed !== true) {
    throw new Error('Milestone 0 completion state was lost after restart!');
  }
  if (roadRes.data.progressPercent !== 33) {
    throw new Error(`Roadmap progress mismatch! Expected 33, got ${roadRes.data.progressPercent}`);
  }
  console.log('Roadmap verification passed! Duration:', roadRes.data.durationDays, 'Progress:', roadRes.data.progressPercent + '%');

  // 4. VERIFY JOB APPLICATION
  console.log('[4] Verifying persistent job applications...');
  const appsRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/marketplace/applications/me',
    method: 'GET',
    headers: authHeaders,
  });

  if (!Array.isArray(appsRes.data) || appsRes.data.length < 1) {
    throw new Error('Job applications were lost after restart!');
  }
  const app = appsRes.data[0];
  if (app.jobId !== 'job-1') {
    throw new Error(`Application jobId mismatch! Expected job-1, got ${app.jobId}`);
  }
  console.log('Application verification passed! Application count:', appsRes.data.length, 'Job:', app.jobTitle);

  // 5. VERIFY EMPLOYER STILL SEES CANDIDATE
  console.log('[5] Verifying candidate persistence from employer ATS view...');
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

  const empCandidates = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/marketplace/employer/candidates',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${empLogin.data.tokens.accessToken}`,
    },
  });

  const foundInAts = empCandidates.data.some((c) => c.email === creds.email);
  if (!foundInAts) {
    throw new Error(`Candidate ${creds.email} was not found in employer pipeline after restart!`);
  }
  console.log('Employer ATS pipeline verified! Candidate persists in employer pipeline.');

  console.log('\n================================================================');
  console.log('>>> 100% PERSISTENCE VERIFICATION PASSED ACROSS SERVER RESTARTS <<<');
  console.log('================================================================');
}

verifyAfterRestart()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('VERIFICATION ERROR:', err);
    process.exit(1);
  });
