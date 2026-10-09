/**
 * Skillora AI — Post-Restart Persistence Survival Verification
 * Proves that all business entities created in previous runs persist across server restarts.
 */

const http = require('http');
const fs = require('fs');

const BASE_URL = 'http://localhost:3001';

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

async function verifyPersistenceAfterRestart() {
  console.log('================================================================');
  console.log('   SKILLORA AI POST-RESTART DATABASE PERSISTENCE VERIFICATION');
  console.log('================================================================\n');

  if (!fs.existsSync('integration-test-artifacts.json')) {
    throw new Error('integration-test-artifacts.json not found! Run full-integration.js first.');
  }

  const artifacts = JSON.parse(fs.readFileSync('integration-test-artifacts.json', 'utf8'));
  console.log('Verifying survival of pre-restart entities for:', artifacts.learnerEmail);

  // 1. LOGIN AS LEARNER AFTER SERVER RESTART
  console.log('\n[RESTART CHECK 1] Logging in as Learner on fresh backend process...');
  const loginRes = await request({
    method: 'POST',
    path: '/api/auth/login',
    body: { email: artifacts.learnerEmail, password: artifacts.password },
  });
  if (loginRes.status !== 200 || !loginRes.data.tokens?.accessToken) {
    throw new Error(`Post-restart login failed: ${JSON.stringify(loginRes)}`);
  }
  const learnerAccess = loginRes.data.tokens.accessToken;
  const learnerHeaders = { Authorization: `Bearer ${learnerAccess}` };
  console.log('   ✓ Post-restart authentication succeeded! Access token generated.');

  // 2. VERIFY PROFILE SURVIVAL
  console.log('\n[RESTART CHECK 2] Fetching Profile from persistent MongoDB...');
  const profRes = await request({
    method: 'GET',
    path: '/api/profile/me',
    headers: learnerHeaders,
  });
  if (profRes.status !== 200) {
    throw new Error(`Profile fetch failed: ${JSON.stringify(profRes)}`);
  }
  if (profRes.data.targetRole !== 'Staff Distributed Systems Engineer') {
    throw new Error(`Target role was lost after restart! Expected 'Staff Distributed Systems Engineer', got: ${profRes.data.targetRole}`);
  }
  if (!Array.isArray(profRes.data.skills) || profRes.data.skills.length < 3) {
    throw new Error(`Skills array lost after restart! Count: ${profRes.data.skills?.length}`);
  }
  console.log('   ✓ Profile persisted across restart! Target role:', profRes.data.targetRole, '| Skills count:', profRes.data.skills.length);

  // 3. VERIFY ROADMAP SURVIVAL
  console.log('\n[RESTART CHECK 3] Fetching Active Roadmap and milestone progress...');
  const roadRes = await request({
    method: 'GET',
    path: '/api/skillbridge/roadmap',
    headers: learnerHeaders,
  });
  if (roadRes.status !== 200 || !roadRes.data?.milestones) {
    throw new Error(`Roadmap was lost after restart: ${JSON.stringify(roadRes)}`);
  }
  if (roadRes.data.milestones[0]?.completed !== true) {
    throw new Error('Milestone 0 completion state lost after restart!');
  }
  if (roadRes.data.progressPercent !== 33) {
    throw new Error(`Roadmap progressPercent lost! Expected 33, got: ${roadRes.data.progressPercent}`);
  }
  console.log('   ✓ Roadmap persisted across restart! Duration:', roadRes.data.durationDays, 'days | Progress:', roadRes.data.progressPercent + '%');

  // 4. VERIFY JOB APPLICATION SURVIVAL
  console.log('\n[RESTART CHECK 4] Fetching Candidate Job Applications...');
  const appsRes = await request({
    method: 'GET',
    path: '/api/marketplace/applications/me',
    headers: learnerHeaders,
  });
  if (appsRes.status !== 200 || !Array.isArray(appsRes.data) || appsRes.data.length === 0) {
    throw new Error(`Job application lost after restart: ${JSON.stringify(appsRes)}`);
  }
  const app = appsRes.data.find((a) => a.id === artifacts.applicationId);
  if (!app) {
    throw new Error(`Application ${artifacts.applicationId} not found in applications list after restart!`);
  }
  if (app.status !== 'interview') {
    throw new Error(`Application status lost after restart! Expected 'interview', got: ${app.status}`);
  }
  console.log('   ✓ Application persisted across restart! Job:', app.jobTitle, '| Status:', app.status);

  // 5. VERIFY EMPLOYER ATS PERSISTENCE
  console.log('\n[RESTART CHECK 5] Employer Login & ATS Candidate Pipeline Persistence...');
  const empLogin = await request({
    method: 'POST',
    path: '/api/auth/login',
    body: { email: artifacts.employerEmail, password: artifacts.password },
  });
  if (empLogin.status !== 200 || !empLogin.data.tokens?.accessToken) {
    throw new Error(`Employer login failed: ${JSON.stringify(empLogin)}`);
  }
  const empHeaders = { Authorization: `Bearer ${empLogin.data.tokens.accessToken}` };

  const candRes = await request({
    method: 'GET',
    path: '/api/marketplace/employer/candidates',
    headers: empHeaders,
  });
  if (candRes.status !== 200 || !Array.isArray(candRes.data)) {
    throw new Error(`Employer candidates fetch failed: ${JSON.stringify(candRes)}`);
  }
  const foundInPipeline = candRes.data.some(
    (c) => c.email === artifacts.learnerEmail || c.id === artifacts.applicationId
  );
  if (!foundInPipeline) {
    throw new Error(`Candidate ${artifacts.learnerEmail} not found in employer pipeline after restart!`);
  }
  console.log('   ✓ Candidate pipeline verified across restart! Candidate present in employer ATS.');

  console.log('\n================================================================');
  console.log('>>> POST-RESTART SURVIVAL VERIFICATION PASSED (100% PERSISTENCE) <<<');
  console.log('================================================================\n');
}

verifyPersistenceAfterRestart()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n>>> POST-RESTART VERIFICATION ERROR:', err);
    process.exit(1);
  });
