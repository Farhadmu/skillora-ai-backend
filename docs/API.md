# Skillora AI — API Specification & Architecture Guide
> **Document Version**: 2.0.0 | **Protocol**: RESTful HTTP + JSON | **Interactive Docs**: `http://localhost:3001/api/docs`

This document details the RESTful API architecture, request/response contracts, authentication flow, error envelope specifications, and the frontend `@/lib/api` client integration.

---

## 1. API Architecture & Standards

- **Base URL**: `http://localhost:3001/api` (Production: `https://api.skillora.ai/api`)
- **Interactive Documentation**: Swagger / OpenAPI 3.0 interface hosted at `/api/docs`
- **Request Validation**: NestJS Global `ValidationPipe` with strict DTO whitelisting (`whitelist: true`, `forbidNonWhitelisted: true`)
- **Authentication**: `Authorization: Bearer <accessToken>` header on protected endpoints
- **Standard Response Envelope**:
```json
{
  "statusCode": 200,
  "message": "Resource retrieved successfully",
  "data": { ... },
  "timestamp": "2026-10-06T01:00:00.000Z"
}
```
- **Standard Error Envelope**:
```json
{
  "statusCode": 400,
  "message": "Validation failed: email must be a valid email",
  "error": "Bad Request",
  "timestamp": "2026-10-06T01:00:00.000Z",
  "path": "/api/auth/register"
}
```

---

## 2. Core API Endpoint Catalog

### 2.1 Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `POST` | `/api/auth/register` | Public | Register a new user (`LEARNER`, `EDUCATOR`, or `EMPLOYER`). *ADMIN registration is forbidden.* |
| `POST` | `/api/auth/login` | Public | Authenticate with email/password; returns JWT access + refresh tokens. |
| `POST` | `/api/auth/refresh` | Public | Exchange valid refresh token for a new access token and rotated refresh token. |
| `POST` | `/api/auth/logout` | Authenticated | Invalidate the active session. |
| `POST` | `/api/auth/verify-email` | Public | Verify account with SHA-256 hashed single-use verification token. |
| `POST` | `/api/auth/resend-verification` | Public | Resend email verification link via `EmailService`. |
| `POST` | `/api/auth/forgot-password` | Public | Request a single-use password reset token. |
| `POST` | `/api/auth/reset-password` | Public | Reset password using verified token. |

### 2.2 Learner Profile & Skills Intelligence (`/api/profile`, `/api/skills`)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/profile` | Authenticated | Retrieve current user's complete profile with skills and stats. |
| `PUT` | `/api/profile` | Authenticated | Update user bio, headline, target role, and career goals. |
| `POST` | `/api/profile/upload-cv` | Authenticated | Parse uploaded CV / resume text and trigger AI skill extraction. |
| `GET` | `/api/skills` | Public | List canonical skills taxonomy with categories and difficulty levels. |
| `GET` | `/api/skills/graph` | Public | Retrieve normalized skill relationship graph (nodes & directed edges). |
| `POST` | `/api/skills/gap` | Authenticated | Calculate deterministic skill gap between user profile and target role. |

### 2.3 Learning, Roadmaps & Socratic Tutor (`/api/skillbridge`, `/api/ai-tutor`)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/skillbridge/roadmap` | Authenticated | Get personalized SkillBridge learning roadmap. |
| `POST` | `/api/skillbridge/roadmap/generate` | Authenticated | Generate dynamic multi-week roadmap targeting user's career goal. |
| `POST` | `/api/skillbridge/milestones/:id/toggle` | Authenticated | Toggle milestone completion; triggers readiness recalculation. |
| `POST` | `/api/ai-tutor/chat` | Authenticated | Socratic AI tutor conversation with Bloom's Taxonomy progression and RAG citations. |
| `GET` | `/api/ai-tutor/history` | Authenticated | Fetch persistent tutoring conversation history. |

### 2.4 Assessments & Certifications (`/api/assessments`)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/assessments` | Public | List available timed certification exams. |
| `POST` | `/api/assessments/start` | Authenticated | Initialize an assessment session with countdown timer. |
| `POST` | `/api/assessments/submit` | Authenticated | Submit answers for automated evaluation; updates skill proficiency, issues cryptographic certificate, and logs evidence. |
| `GET` | `/api/assessments/verify/:certId` | Public | Publicly verify cryptographic skill certificate (`SKL-VERIF-XXXX-2026`). |

### 2.5 Projects & Code Review (`/api/projects`)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/projects` | Authenticated | List recommended real-world capstone projects. |
| `POST` | `/api/projects/submit` | Authenticated | Submit project with GitHub repository URL and live demo URL. |
| `POST` | `/api/projects/code-review` | Authenticated | Run AI static code review analyzing bugs, security vulnerabilities, scalability, and code style. |

### 2.6 Mock Interview & 7-D Workforce Readiness (`/api/workforce-ready`)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/workforce-ready/readiness` | Authenticated | Retrieve 7-dimension readiness scores with diagnostic breakdown. |
| `POST` | `/api/workforce-ready/interview/start` | Authenticated | Initialize an AI mock technical or system design interview. |
| `POST` | `/api/workforce-ready/interview/respond` | Authenticated | Submit candidate answer; AI evaluates accuracy and asks adaptive follow-ups. |
| `POST` | `/api/workforce-ready/interview/finalize` | Authenticated | Generate full interview diagnostic report card and update interview readiness score. |

### 2.7 Jobs, ATS & Employer Portal (`/api/marketplace`, `/api/employer`)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/jobs` | Public | Search jobs with filters (title, skills, remote, salary). |
| `POST` | `/api/jobs/apply` | Authenticated | Submit application for a job listing with verified skill profile. |
| `POST` | `/api/employer/jobs` | Employer/Admin | Create and publish a new job listing with structured requirements. |
| `POST` | `/api/employer/extract-skills` | Employer/Admin | AI-extract required skills, experience tier, and salary from raw JD text. |
| `GET` | `/api/employer/pipeline` | Employer/Admin | Fetch candidate applications grouped by ATS Kanban stage. |
| `POST` | `/api/marketplace/pipeline/advance` | Employer/Admin | Advance candidate stage (`APPLIED` ➔ `AI_SCREENED` ➔ `INTERVIEW` ➔ `OFFER` ➔ `HIRED`). |

### 2.8 Educator Portal (`/api/educator`)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/educator/cohorts` | Educator/Admin | Retrieve active student cohorts with module completion telemetry. |
| `POST` | `/api/educator/generate-quiz` | Educator/Admin | AI generate custom scenario exam with code snippets and rubrics. |
| `POST` | `/api/educator/dispatch-drill` | Educator/Admin | Dispatch personalized Socratic diagnostic lab to at-risk students. |

### 2.9 Admin Governance & AI Cascade (`/api/admin`)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/admin/users` | Admin | List all registered platform accounts with search and role filters. |
| `PUT` | `/api/admin/roles` | Admin | Elevate or change user role (`LEARNER`, `EDUCATOR`, `EMPLOYER`, `ADMIN`). |
| `GET` | `/api/admin/ai-cascade` | Admin | Monitor health and latency of all 8 AI cascade tiers. |
| `POST` | `/api/admin/test-ai-cascade` | Admin | Run live benchmark test across the multi-provider fallback cascade. |
| `GET` | `/api/admin/audit-logs` | Admin | View immutable security audit logs with timestamps and IP records. |

---

## 3. Frontend API Client (`src/lib/api/`)

The frontend abstracts all backend communications into typed modules in `src/lib/api/`:

```typescript
import { authApi, profileApi, assessmentsApi, workforceReadyApi } from '@/lib/api';

// Example: Authenticate and fetch readiness
const loginResult = await authApi.login({ email: 'learner@skillora.ai', password: 'Password123!' });
const readiness = await workforceReadyApi.getReadiness();
```

### Automatic 401 Token Refresh Interceptor
The core Axios client (`src/lib/api/client.ts`) attaches an interceptor that automatically intercepts HTTP 401 responses, initiates a refresh token rotation call via `/api/auth/refresh`, updates the stored access token, and retries the original failed request seamlessly without interrupting user flow.
