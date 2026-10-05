# Skillora AI — System Architecture Specification
> **Document Version**: 2.0.0 | **Platform Release**: Production Ready | **Status**: Verified

Skillora AI is an enterprise-grade AI Workforce Intelligence Platform positioned around the core promise: **"From learning to verified employability"** (*Learn. Build. Prove. Grow.*). 

This document defines the high-level system architecture, component boundaries, domain interaction models, and the core end-to-end intelligence loop.

---

## 1. High-Level Architectural Blueprint

Skillora AI follows a decoupled, modular service-oriented architecture with a modern Next.js 16 frontend and a modular NestJS 11 backend, backed by a dual-mode persistence layer (MongoDB/Mongoose + Atomic JSON Snapshot Durability).

```mermaid
graph TD
    subgraph Client Layer [Frontend - Next.js 16 / React 19]
        UI[Tailwind CSS & Design System]
        API_CLIENT[Modular API Client @/lib/api]
        TQ[TanStack React Query Cache]
        ROLES[Role Workspaces: Learner, Educator, Employer, Admin]
    end

    subgraph Gateway & Security [NestJS 11 Core]
        CORS[CORS & Security Headers]
        JWT_AUTH[JWT Auth Guard & Token Rotation]
        RBAC[Roles Guard - 4 Public & System Roles]
        OWNER_GUARD[ResourceOwnerGuard - Anti-IDOR]
        VAL_PIPE[Global ValidationPipe - Whitelist & DTOs]
    end

    subgraph Core Domain Modules [NestJS Modules]
        AUTH_MOD[Auth Module & Email Service]
        PROFILE_MOD[Profile & CV Extraction]
        SKILLS_MOD[Skills & Semantic Graph]
        CAREER_MOD[Career Intelligence & Gap Engine]
        LEARN_MOD[SkillBridge Roadmap & Socratic Tutor]
        ASSESS_MOD[Assessments & Cryptographic Certs]
        PROJECT_MOD[Projects & AI Code Review]
        WORKFORCE_MOD[7-D Readiness & Mock Interview]
        MARKET_MOD[Jobs Marketplace & ATS Pipeline]
        ADMIN_MOD[Admin Governance & Audit Logs]
        ANALYTICS_MOD[Telemetry & Event Engine]
    end

    subgraph AI Intelligence Layer [8-Tier Multi-Provider Cascade]
        ORCHESTRATOR[AI Orchestrator Engine]
        P1[Tier 1: Google Gemini]
        P2[Tier 2: Groq Cloud LLaMA 3.3]
        P3[Tier 3: OpenRouter]
        P4[Tier 4: Cohere Command R]
        P5[Tier 5: Mistral AI]
        P6[Tier 6: Hugging Face]
        P7[Tier 7: Ollama Local]
        P8[Tier 8: Skillora Neural Heuristics]
    end

    subgraph Persistence Layer [Dual-Mode Data Store]
        MONGO[MongoDB / Mongoose 39 Schemas]
        SNAPSHOT[Atomic Disk Snapshot Engine data/db-persistence.json]
        VECTOR[RAG Vector Knowledge Store]
    end

    UI --> API_CLIENT
    API_CLIENT --> TQ
    API_CLIENT --> Gateway & Security
    Gateway & Security --> Core Domain Modules
    Core Domain Modules --> AI Intelligence Layer
    Core Domain Modules --> Persistence Layer
    ORCHESTRATOR --> P1 & P2 & P3 & P4 & P5 & P6 & P7 & P8
```

---

## 2. The Core Skillora Intelligence Loop

The foundational architectural differentiator of Skillora AI is that **it is not a collection of isolated dashboards**. Every action in one module immediately triggers real-time updates across the entire workforce intelligence loop:

```
[1. ONBOARDING & PROFILE]
          │
          ▼ (Extracts skills, experience, education)
[2. CV & GITHUB PARSING]
          │
          ▼ (Maps to normalized taxonomy)
[3. SKILL PROFILE & GRAPH]
          │
          ▼ (Compares target role requirements against profile)
[4. SKILL GAP ENGINE]
          │
          ▼ (Synthesizes personalized sequence of tasks & milestones)
[5. SKILLBRIDGE ROADMAP]
          │
          ▼ (Context-aware tutoring with Bloom's Taxonomy)
[6. SOCRATIC AI TEACHER]
          │
          ▼ (Hands-on scenario tests & coding questions)
[7. VERIFIED ASSESSMENTS] ──► Updates Skill Proficiencies (Beginner ➔ Expert)
          │               ──► Generates Verifiable Cryptographic Certificate
          ▼
[8. PROJECTS & CODE REVIEW] ──► Generates Verified SkillEvidence
          │
          ▼ (Aggregates 7 dimensions: Tech, Problem, Projects, Comm, Interview, Alignment, Practical)
[9. 7-D WORKFORCE READINESS DIAL]
          │
          ▼ (Deterministic skill-distance + portfolio evidence matching)
[10. JOB MATCHING & ATS]
          │
          ▼ (Blind candidate review, 1-click stage advancement)
[11. EMPLOYER INTERVIEW & HIRING]
```

### Event & Data Flow Cascade
When a learner completes an assessment or submits a project code review:
1. `assessments.service.ts` or `projects.service.ts` records the verified submission.
2. The user's `UserSkill` record is updated with the new proficiency score and assessment timestamp.
3. A `SkillEvidence` record is appended linking the artifact/code to the verified skill.
4. `WorkforceReadyService` recalculates the 7-D readiness score.
5. `SkillbridgeService` marks linked roadmap milestones as complete.
6. `MarketplaceService` recalculates the candidate's match percentages for all open job listings.
7. An `AnalyticsEvent` (`ASSESSMENT_COMPLETED` or `PROJECT_COMPLETED`) is written to the audit log.
8. A `Notification` is queued for the learner.

---

## 3. Backend Architecture (NestJS 11)

### 3.1 Directory Structure
```
backend/
├── src/
│   ├── common/                  # Cross-cutting filters, guards, interceptors, services
│   │   ├── filters/             # Global HttpExceptionFilter
│   │   ├── guards/              # RolesGuard, ResourceOwnerGuard
│   │   ├── interceptors/        # LoggingInterceptor, TransformInterceptor
│   │   └── services/            # EmailService (Resend, SMTP, Dev adapter)
│   ├── database/                # Persistence & Data Layer
│   │   ├── schemas/             # 13 Mongoose schema modules (39 domain entities)
│   │   ├── data-store.service.ts# Dual-mode persistence with atomic disk snapshots
│   │   └── seed-data.ts         # Canonical domain seeds (skills, jobs, users)
│   ├── modules/                 # Modular domain features
│   │   ├── admin/               # Platform administration, AI cascade tests, audit logs
│   │   ├── ai-tutor/            # Socratic teacher, audio speech, Bloom's progression
│   │   ├── analytics/           # Event tracking & aggregation metrics
│   │   ├── assessments/         # Timed exams, automated grading, cryptographic certs
│   │   ├── auth/                # JWT, token rotation, password hashing, email verification
│   │   ├── career/              # Career navigator, path transitions, transferable skills
│   │   ├── educator/            # Course creation, AI quiz studio, telemetry, intervention
│   │   ├── marketplace/         # Job postings, ATS pipeline, blind hiring, candidate matching
│   │   ├── profile/             # Learner profile, CV ingestion, skill extraction
│   │   ├── projects/            # Real-world projects, GitHub integration, AI code review
│   │   ├── rag/                 # Vector retrieval, semantic chunking, grounded citations
│   │   ├── skillbridge/         # Dynamic roadmaps, milestone scheduling, gap analysis
│   │   ├── skills/              # Normalized skill taxonomy, relationship graph
│   │   └── workforce-ready/     # 7-D readiness dial, AI mock technical interviews
│   ├── app.module.ts            # Root module wiring
│   └── main.ts                  # Bootstrap: CORS, ValidationPipe, Swagger (/api/docs)
```

### 3.2 Design Patterns
- **Dependency Injection**: Loose coupling across all controllers and services.
- **Data Transfer Objects (DTOs)**: Explicit schema validation using `class-validator` and `class-transformer` with `whitelist: true` and `forbidNonWhitelisted: true`.
- **Dual-Mode Persistence**: Primary binding to Mongoose models. If no active MongoDB cluster is configured, the system seamlessly uses disk-backed atomic JSON snapshots with fsync guarantees.
- **Fail-Safe Provider Cascade**: AI calls delegate to an 8-tier fallback chain, preventing hard crashes from third-party quota limits or network partitions.

---

## 4. Frontend Architecture (Next.js 16)

### 4.1 Modular API Architecture (`src/lib/api/`)
All network interactions are centralized in typed domain clients, completely eliminating unstructured `fetch` calls across components:

```
frontend/src/lib/api/
├── client.ts         # Axios instance, Bearer token injection, auto-401 refresh rotation
├── auth.ts           # Login, register, logout, verify email, reset password, refresh
├── profile.ts        # Profile fetch/update, CV upload, skill extraction
├── skills.ts         # Skills taxonomy, skill graph, skill gap analysis
├── career.ts         # Career paths, target role matching, recommendations
├── learning.ts       # SkillBridge roadmap, milestone toggling, courses, resources
├── assessment.ts     # Assessments catalog, exam sessions, grading, certificates
├── projects.ts       # Project workspaces, task progress, AI code review
├── interview.ts      # AI mock interview sessions, dynamic questions, diagnostic feedback
├── jobs.ts           # Job marketplace search, filters, applications, saved jobs
├── employer.ts       # Company profiles, job creation, ATS pipeline, blind hiring
├── educator.ts       # Cohort management, AI quiz generator studio, early intervention
├── admin.ts          # User management, role elevation, AI cascade tests, audit logs
├── analytics.ts      # Event tracking, learner progress, employer hiring funnel
└── index.ts          # Unified export surface with backward-compatible aliases
```

### 4.2 Workspace Layouts & Routing
- `/learner/*`: Personalized learner portal (Dashboard, Career, Skills, Learning, Projects, Interviews, Jobs).
- `/educator/*`: Educator portal (Cohort Telemetry, AI Quiz Studio, Intervention Dispatcher).
- `/employer/*`: Recruiter ATS portal (Job Studio, Candidate Search, Blind Review, Kanban Pipeline).
- `/admin/*`: Governance portal (Users, AI Provider Cascade Monitor, Security Audit Logs).

---

## 5. Security & Boundary Isolation
- **Authentication**: JWT access tokens (15m expiry) paired with rotatable refresh tokens (7d expiry).
- **Public Signups**: Restricted strictly to `LEARNER`, `EDUCATOR`, and `EMPLOYER`. `ADMIN` account creation via public registration is permanently blocked at the service level.
- **Resource Ownership**: Anti-IDOR `ResourceOwnerGuard` ensures users can only read or mutate documents they own (e.g. applications, roadmaps, private portfolios).
- **Zero-Trust Input Sanitization**: All inputs validated via DTOs with strict type checking.

---

## 6. Observability & Telemetry
- **API Documentation**: Live Swagger OpenAPI 3.0 specification served at `/api/docs`.
- **System Health**: Health check probe at `/api/health`.
- **Structured Audit Trails**: Every critical event (role changes, ATS transitions, exam completions) generates an immutable `AuditLog` entry with timestamp, actor ID, and IP address.
