# Skillora AI — Production Audit Report
**Date**: October 9, 2026  
**Status**: Comprehensive Baseline Audit & Remediation Roadmap  
**Scope**: Full Repository (Frontend Next.js 15, Backend NestJS 11, MongoDB Database Layer, RAG, AI Engine, RBAC)

---

## 1. Executive Summary

This audit evaluates the codebase of **Skillora AI: AI Workforce Intelligence Platform** against strict production-grade standards. While the codebase contains extensive architectural layout, rich user interfaces, and domain endpoints, extensive parts of the application previously operated on **in-memory datastores (`DataStoreService` / `Map`), JSON file persistence (`db-persistence.json`), hardcoded fallback scores, simulated email verification links, quick-fill demo persona logins, and mock client-side handlers**.

In accordance with the **Zero Fake Data Policy**, this report details every structural vulnerability, fake data source, mock service, and security gap, followed by the concrete, multi-phase production migration plan.

---

## 2. Current Architecture

| Architectural Layer | Current State | Production Target | Gap / Risk |
|---|---|---|---|
| **Database Layer** | Dual-mode `DataStoreService` using in-memory `Map<string, Entity>` and file debouncing to `data/db-persistence.json`. Local MongoDB running on port 27017, but `MongooseModule` is not registered in `DatabaseModule` or `AppModule`. | Real MongoDB / Mongoose with indexed, validated collections across 40+ domain entities. | High: Data loss risk on restarts if file sync fails; unscalable in-memory maps; fake records seeded on boot. |
| **Authentication** | JWT access token + refresh token, but hardcoded fallback secrets (`skillora_super_secret_access_key_2026`) in `.env`. Demo persona login buttons auto-fill `Password123!` for 4 roles. | Cryptographic secret generation, fail-fast on missing secrets, zero demo credentials, strict HttpOnly/Bearer authentication. | Critical: Hardcoded credentials and demo login allow unauthorized access; exposed dev secrets. |
| **Role-Based Access (RBAC)** | `RolesGuard` exists, but employer endpoints allow unverified `companyId` and `userId` querying (`?userId=`, `?companyId=`). Admin dashboard contains `switchWorkspaceRole()` client impersonation. | Strict JWT claims extraction (`req.user.id`, `req.user.role`), server-side employer company resolution, zero client impersonation. | Critical: Horizontal privilege escalation, user ID spoofing. |
| **AI Orchestration** | 8-Tier cascade exists, but Tier 8 falls back to deterministic hardcoded scores (`84%`, `88%`, `86%`, `82%`) and fabricated evaluation rubrics when providers are offline. | Real AI provider abstraction (`GeminiProvider`, `GroqProvider`, etc.) with structured `AI_PROVIDER_UNAVAILABLE` error states and real empty states. | High: Violates Zero Fake Data Policy by inventing diagnostic scores. |
| **RAG (Vector Search)** | `RagService` contains a hardcoded array of 5 text chunks in memory with substring matching. Qdrant is referenced in docs and `.env` (`http://localhost:6333`), but client is not integrated. | Dedicated `@qdrant/js-client-rest` client, chunking, real embeddings, vector similarity search, grounded citations. | Medium: Grounded RAG is simulated using lexical filtering. |
| **API Client** | Mixed usage: `client.ts` (`apiClient`) with automatic refresh queue, but several dashboard pages contain raw `fetch('http://localhost:3001/...')` calls. | Centralized API client across all pages with error/loading/empty/success handling. | High: Hardcoded `localhost:3001` breaks production cloud deployments (Render, Vercel). |
| **UI State Handling** | Multiple pages fall back to hardcoded sample arrays (`sampleNodes`, `DEFAULT_ASSESSMENTS`, `DEFAULT_NOTIFICATIONS`) when API queries return empty. | Real 4-state UI: Loading (skeleton), Success (real data), Empty (clear state + CTA), Error (alert + retry). | High: Masking empty databases with fake UI data violates production policy. |

---

## 3. Detailed Audit Findings by Category

### 3.1. Fake Data Sources & Hardcoded Values
1. **Frontend Demo Persona Login (`frontend/src/app/login/page.tsx:71-135`)**:
   - 1-Click quick-fill buttons for `learner@skillora.ai`, `educator@skillora.ai`, `employer@skillora.ai`, `admin@skillora.ai`.
   - Default state pre-fills `learner@skillora.ai` and `Password123!`.
2. **Fake Role Switching (`frontend/src/lib/api/auth.ts:80-94`)**:
   - `switchWorkspaceRole()` switches to `${targetRole.toLowerCase()}@skillora.ai` with password `Password123!`.
   - Admin dashboard table (`frontend/src/app/admin/dashboard/page.tsx:331`) exposes "Quick Persona Impersonation" buttons.
3. **Hardcoded Notifications (`frontend/src/components/common/NotificationsDrawer.tsx:34-73`)**:
   - `DEFAULT_NOTIFICATIONS` array with fake notifications displayed when backend has no notifications.
4. **Hardcoded Assessments in UI (`frontend/src/app/learner/skills/assessment/page.tsx:51-334`)**:
   - `DEFAULT_ASSESSMENTS` array used as fallback when backend returns empty.
5. **Hardcoded AI Providers in Admin (`frontend/src/app/admin/dashboard/page.tsx:38-53`)**:
   - `DEFAULT_PROVIDERS` array with hardcoded provider statuses.
6. **Hardcoded Skills Graph Nodes (`frontend/src/app/learner/skills/graph/page.tsx:30-38`)**:
   - `sampleNodes` array with fixed scores (92, 88, 82, 80, 65, 45, 85) rendered when user has no skills.
7. **Hardcoded Skill Evidence Records (`frontend/src/app/learner/skills/evidence/page.tsx:10-51`)**:
   - Static `evidenceRecords` array with fake commit hashes and test coverage metrics.
8. **Hardcoded Career Pathways (`frontend/src/app/learner/career/paths/page.tsx:8-33`)**:
   - `paths` array with fixed alignments (94%, 82%, 78%) and salaries.
9. **Hardcoded Career Recommendations (`frontend/src/app/learner/career/recommendations/page.tsx:8-39`)**:
   - `recommendations` array with static advice and gain percentages.
10. **Hardcoded Job Matches & Recommended Roles (`frontend/src/app/learner/jobs/matches/page.tsx:8-42`, `recommended/page.tsx:8-29`)**:
    - Static `matches` and `recommendedJobs` arrays with hardcoded companies (`TechScale AI`, `NeuralFlow Data`).
11. **Hardcoded Community Posts (`frontend/src/app/learner/community/page.tsx:25-59`)**:
    - Static `discussions` array with fixed fake author names and likes.
12. **Simulated Client-Side Timers (`setTimeout`)**:
    - `frontend/src/app/learner/build/coding/page.tsx:127`: `handleRunTests` waits 600ms and marks all tests as passed without running user code.
    - `frontend/src/app/learner/build/github/page.tsx:29`: `handleSyncAll` simulates repository synchronization with a 1200ms timer.
    - `frontend/src/app/admin/knowledge-base/page.tsx:38`: `handleSync` simulates knowledge indexing with a 1200ms timer.

### 3.2. Mock Services & AI Fallback Problems
1. **Deterministic Fabricated Scores in AI Service (`backend/src/modules/ai/ai.service.ts:1147-1258`)**:
   - `fallbackCodeReview`: Always returns score `84`, correctness `88`, security `82`, performance `86`, maintainability `85`.
   - `fallbackMockInterview`: Always returns overall score `84`, technical `86`, communication `83`, problem solving `85`.
   - `fallbackQuizGenerator`: Generates canned quiz questions.
   - `fallbackCvParser`: Returns fixed synthetic CV details.
   - `fallbackJdAnalysis`: Returns synthetic job skill matches.
2. **In-Memory RAG Knowledge Base (`backend/src/modules/ai/rag.service.ts:22-80`)**:
   - Stores 5 static chunks in a local array `knowledgeBase`.
   - Search uses basic string includes/counting instead of vector embeddings or Qdrant similarity.

### 3.3. Database & Persistence Problems
1. **No Mongoose Connection in NestJS**:
   - `backend/src/database/database.module.ts` only exports `DataStoreService`.
   - Models exist in `backend/src/database/schemas/`, but `MongooseModule.forRoot` and `MongooseModule.forFeature` are never imported into NestJS modules.
   - Every service (`AuthService`, `ProfileService`, `SkillsService`, `MarketplaceService`, `AssessmentsService`, `ProjectsService`, `AdminService`, `WorkforceReadyService`) injects `DataStoreService` instead of Mongoose models (`@InjectModel`).
2. **Persistence File Dependency (`backend/data/db-persistence.json`)**:
   - Database operations write to a 200KB+ JSON file on disk using a 400ms debounce timer.
   - If the node process crashes abruptly before disk flush, recent transactions are corrupted or lost.
   - Local MongoDB is running on port 27017, but the backend is completely detached from it.

### 3.4. Authentication, Authorization & Security Problems
1. **Exposed Development JWT Secrets (`backend/.env:3-4`)**:
   - `JWT_SECRET=skillora_super_secret_access_key_2026`
   - `JWT_REFRESH_SECRET=skillora_super_secret_refresh_key_2026`
   - No fail-fast guard if `JWT_SECRET` is unset.
2. **Email Verification Token Exposure (`backend/src/modules/auth/auth.service.ts:155`)**:
   - Registration response returns `verificationUrl` with raw token directly to the frontend.
   - Frontend displays "Simulated Email Inbox Link (Development & Hackathon Demo)" button that allows 1-click verification bypass.
3. **CORS Security Hole (`backend/src/main.ts:11-15`)**:
   - `origin: '*'` with `credentials: true` violates standard browser CORS policies and allows arbitrary cross-origin script execution.
4. **DTO Validation Laxity (`backend/src/main.ts:22`)**:
   - `forbidNonWhitelisted: false` allows clients to send undocumented fields in payloads.
5. **Horizontal Privilege Escalation & User ID Spoofing**:
   - `backend/src/modules/marketplace/marketplace.controller.ts:18`: Accepts `?userId=` query parameter to look up private user profile matching.
   - `backend/src/modules/marketplace/marketplace.controller.ts:53`: Accepts `?companyId=` without verifying that authenticated user owns the company.
   - `backend/src/modules/marketplace/marketplace.controller.ts:62`: `updateStage` allows any authenticated user to update any candidate application without checking company ownership.
   - `backend/src/modules/projects/projects.controller.ts:32`: `POST /api/projects/review-code` has NO authentication guard and NO rate limiting.
   - `backend/src/modules/assessments/assessments.controller.ts:24`: `POST /api/assessments` allows any authenticated user (including learners) to register assessments in the catalog.
6. **Frontend Route Protection Bypass (`frontend/src/middleware.ts:39-62`)**:
   - Only checks `if (roleCookie)`. If an unauthenticated user with no cookies accesses `/admin/dashboard` or `/employer/dashboard` directly, the middleware allows the request through rather than redirecting to `/login`.

### 3.5. API & Network Problems
1. **Hardcoded `localhost:3001` in Frontend Components**:
   - `frontend/src/app/learner/skills/assessment/page.tsx:316, 437`
   - `frontend/src/app/educator/dashboard/page.tsx:77, 139, 167`
   - `frontend/src/app/employer/dashboard/page.tsx:87, 110, 146`
   - `frontend/src/app/admin/dashboard/page.tsx:79, 96, 117, 148`
   - Breaks whenever deployed to production or accessed over a network IP.
2. **Missing Canonical Role Routes**:
   - Duplicate entry points: `/learner/ai-teacher` vs `/learner/learning/ai-teacher`, `/learner/roadmap` vs `/learner/learning/roadmap`.

### 3.6. Health Check Limitations
- `backend/src/app.controller.ts:14`: `/api/health` returns hardcoded `{ status: 'ok', uptime: ... }` without probing MongoDB, AI provider, Qdrant, or Email relay.

---

## 4. Phase-by-Phase Remediation Roadmap

```
PHASE 1: Comprehensive Baseline Audit (Completed)
   │
   ▼
PHASE 2: MongoDB Migration & Mongoose Models
   ├── Connect MongooseModule to local/Atlas MongoDB
   ├── Register all 40+ Mongoose schemas
   ├── Refactor all backend services from DataStoreService to Mongoose @InjectModel
   └── Remove data/db-persistence.json dependency
   │
   ▼
PHASE 3: Authentication & Security Hardening
   ├── Enforce JWT_SECRET fail-fast check
   ├── Remove all demo logins, quick-fill buttons, and switchWorkspaceRole
   ├── Remove simulated email verification bypass
   ├── Fix CORS (explicit origins) & strict ValidationPipe
   └── Enforce strict Next.js route protection (unauthenticated -> /login)
   │
   ▼
PHASE 4: RBAC & Resource Ownership
   ├── Derive user identity strictly from JWT req.user.id
   ├── Enforce company ownership on employer jobs & candidate ATS
   ├── Secure code review endpoint (Auth + Rate Limiting + Input limits)
   └── Restrict assessment creation to EDUCATOR & ADMIN
   │
   ▼
PHASE 5: Real AI Provider & Error Handling
   ├── Remove fake fallback scores (84, 88, 86, etc.)
   ├── Return structured AI_PROVIDER_UNAVAILABLE error states
   └── Implement real empty states on frontend
   │
   ▼
PHASE 6: Real Qdrant RAG Pipeline
   ├── Connect to Qdrant vector database client
   ├── Document chunking & embedding ingestion
   └── Grounded retrieval with verifiable citations
   │
   ▼
PHASE 7: Frontend Centralized API & Clean Routes
   ├── Replace all hardcoded fetch('http://localhost:3001') with apiClient
   ├── Enforce 4 states (Loading, Success, Empty, Error) across all views
   └── Consolidate canonical routes
   │
   ▼
PHASE 8: Real Analytics, Notifications & Search
   ├── Real MongoDB AnalyticsEvent tracking
   └── Real MongoDB Notification collection (remove DEFAULT_NOTIFICATIONS)
   │
   ▼
PHASE 9: UI Glass System & Polish
   └── Premium glassmorphism, responsive mobile drawers, accessibility
   │
   ▼
PHASE 10: End-to-End Validation & Final Production Report
```

---

*End of Production Audit Report. Proceeding directly to Phase 2: MongoDB Migration.*
