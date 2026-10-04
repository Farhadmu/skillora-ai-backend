# Skillora AI Comprehensive End-to-End API Test Suite
$ErrorActionPreference = "Stop"

Write-Host "=================================================="
Write-Host "       SKILLORA AI E2E INTEGRATION TEST SUITE      "
Write-Host "=================================================="

# 1. Login as Learner
Write-Host "`n[1] Testing POST /api/auth/login (Learner)..."
$loginBody = @{ email = "learner@skillora.ai"; password = "Password123!" } | ConvertTo-Json
$loginRes = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $loginRes.tokens.accessToken
$headers = @{ Authorization = "Bearer $token" }
Write-Host "  -> Logged in successfully: $($loginRes.user.name) (Role: $($loginRes.user.role))"

# 2. Get Profile
Write-Host "`n[2] Testing GET /api/profile/me..."
$profile = Invoke-RestMethod -Uri "http://localhost:3001/api/profile/me" -Method Get -Headers $headers
Write-Host "  -> Profile Loaded: $($profile.name), Target Role: $($profile.targetRole), Readiness: $($profile.readinessScore)/100"

# 3. AI Socratic Tutor Chat
Write-Host "`n[3] Testing POST /api/ai-teacher/chat (Socratic Dialogue)..."
$tutorBody = @{
    message = "How does Inversion of Control prevent tight architectural coupling?";
    subject = "Full-Stack Architecture";
    mode = "teach";
    bloomsLevel = "Analyze";
    language = "en";
    useRag = $true
} | ConvertTo-Json
$tutorRes = Invoke-RestMethod -Uri "http://localhost:3001/api/ai-teacher/chat" -Method Post -Body $tutorBody -Headers $headers -ContentType "application/json"
Write-Host "  -> Tutor Reply: $($tutorRes.reply.text.Substring(0, [Math]::Min(120, $tutorRes.reply.text.Length)))..."
Write-Host "  -> Socratic Hint: $($tutorRes.reply.socraticHint)"
Write-Host "  -> Citations Returned: $($tutorRes.reply.citations.Count)"

# 4. Skill Gap Analysis
Write-Host "`n[4] Testing GET /api/skills/gaps..."
$gaps = Invoke-RestMethod -Uri "http://localhost:3001/api/skills/gaps?targetRole=Full-Stack%20AI%20Systems%20Engineer" -Method Get -Headers $headers
Write-Host "  -> Gap Index: $($gaps.readinessIndex)%, Matched: $($gaps.matched.Count), Missing: $($gaps.missing.Count)"

# 5. JD Intelligence Analysis
Write-Host "`n[5] Testing POST /api/career-navigator/analyze-jd..."
$jdBody = @{ jdText = "Seeking Senior Full-Stack Engineer skilled in TypeScript, NestJS, React, MongoDB, Docker, and RAG systems." } | ConvertTo-Json
$jdRes = Invoke-RestMethod -Uri "http://localhost:3001/api/career-navigator/analyze-jd" -Method Post -Body $jdBody -Headers $headers -ContentType "application/json"
Write-Host "  -> JD Role: $($jdRes.role), Calculated Match: $($jdRes.matchScore)%"
Write-Host "  -> Strong Matches: $($jdRes.strongMatches -join ', ')"

# 6. AI Code Review
Write-Host "`n[6] Testing POST /api/projects/review-code..."
$codeBody = @{
    code = "export class DataStore { async read(id: string) { console.log('Reading ' + id); return db.find({ id }); } }";
    language = "TypeScript";
    context = "Production Repository Gateway"
} | ConvertTo-Json
$codeRes = Invoke-RestMethod -Uri "http://localhost:3001/api/projects/review-code" -Method Post -Body $codeBody -Headers $headers -ContentType "application/json"
Write-Host "  -> Code Review Score: $($codeRes.score)/100, Correctness: $($codeRes.correctness.score)%"
Write-Host "  -> Security Issues Flagged: $($codeRes.security.issues.Count)"

# 7. AI Mock Interview Simulation
Write-Host "`n[7] Testing POST /api/workforce-ready/mock-interview..."
$interviewBody = @{
    mode = "technical";
    questionNumber = 1;
    candidateAnswer = "In the Node.js event loop, microtasks like process.nextTick and resolved Promise callbacks execute before macrotasks like setTimeout or setImmediate. Heavy synchronous CPU loops block the single thread, starving I/O polling."
} | ConvertTo-Json
$interviewRes = Invoke-RestMethod -Uri "http://localhost:3001/api/workforce-ready/mock-interview" -Method Post -Body $interviewBody -Headers $headers -ContentType "application/json"
Write-Host "  -> Next Question Generated: $($interviewRes.question.Substring(0, [Math]::Min(100, $interviewRes.question.Length)))..."
Write-Host "  -> Previous Answer Score: Technical $($interviewRes.feedbackOnPrevious.technicalScore)%, Communication $($interviewRes.feedbackOnPrevious.communicationScore)%"

# 8. 7-D Readiness Score
Write-Host "`n[8] Testing GET /api/workforce-ready/score..."
$readyRes = Invoke-RestMethod -Uri "http://localhost:3001/api/workforce-ready/score" -Method Get -Headers $headers
Write-Host "  -> Overall Score: $($readyRes.overallScore)/100 ($($readyRes.employabilityStatus))"
Write-Host "  -> Dimensions: Tech: $($readyRes.dimensions.technical)%, ProblemSolving: $($readyRes.dimensions.problemSolving)%, Projects: $($readyRes.dimensions.projects)%"

# 9. Job Marketplace & AI Matching
Write-Host "`n[9] Testing GET /api/marketplace/jobs..."
$jobs = Invoke-RestMethod -Uri "http://localhost:3001/api/marketplace/jobs" -Method Get -Headers $headers
Write-Host "  -> Retrieved $($jobs.Count) Jobs. Top Job: $($jobs[0].title) ($($jobs[0].companyName)) - Match: $($jobs[0].matchScore)%"

# 10. AI Context Copilot / Command Center
Write-Host "`n[10] Testing POST /api/ai/command-center..."
$copilotBody = @{ query = "How do I optimize my skill graph for AI engineer roles?"; pageContext = "Skills" } | ConvertTo-Json
$copilotRes = Invoke-RestMethod -Uri "http://localhost:3001/api/ai/command-center" -Method Post -Body $copilotBody -Headers $headers -ContentType "application/json"
Write-Host "  -> Copilot Answer: $($copilotRes.answer.Substring(0, [Math]::Min(120, $copilotRes.answer.Length)))..."

# 11. Employer ATS Pipeline Check
Write-Host "`n[11] Testing GET /api/marketplace/employer/candidates (Employer Role)..."
$empLoginBody = @{ email = "employer@skillora.ai"; password = "Password123!" } | ConvertTo-Json
$empLoginRes = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" -Method Post -Body $empLoginBody -ContentType "application/json"
$empHeaders = @{ Authorization = "Bearer $($empLoginRes.tokens.accessToken)" }
$candidates = Invoke-RestMethod -Uri "http://localhost:3001/api/marketplace/employer/candidates" -Method Get -Headers $empHeaders
Write-Host "  -> Employer ATS Candidates in Pipeline: $($candidates.Count)"

# 12. Admin Stats
Write-Host "`n[12] Testing GET /api/admin/stats (Admin Role)..."
$adminLoginBody = @{ email = "admin@skillora.ai"; password = "Password123!" } | ConvertTo-Json
$adminLoginRes = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" -Method Post -Body $adminLoginBody -ContentType "application/json"
$adminHeaders = @{ Authorization = "Bearer $($adminLoginRes.tokens.accessToken)" }
$adminStats = Invoke-RestMethod -Uri "http://localhost:3001/api/admin/stats" -Method Get -Headers $adminHeaders
Write-Host "  -> System Health: $($adminStats.systemHealth.apiStatus), Total Inferences: $($adminStats.aiGovernance.totalInferenceRequests), Uptime: $($adminStats.systemHealth.uptimeSeconds)s"

Write-Host "`n=================================================="
Write-Host "  ALL 12 E2E WORKFLOW TESTS PASSED PERFECTLY!     "
Write-Host "=================================================="
