# Skillora AI — Backend Engine
> **AI Workforce Intelligence Platform**  
> *Tagline: "Learn. Build. Prove. Grow."*

This repository houses the core NestJS backend engine powering **Skillora AI**:
- Socratic AI Teacher & Bloom's Taxonomy engine
- 100+ Standardized Skill Graph & Prerequisite Ontology
- Career Navigator & Job Description (JD) Intelligence Analyzer
- SkillBridge Adaptive Reskilling Roadmaps (7, 30, 60, 90 days)
- Applied Projects & Automated AI Code Reviewer
- Workforce Ready 7-Dimension Employability Engine & AI Mock Interview Simulator
- Global Talent Marketplace & Employer ATS Hiring Pipeline
- Educator Cohort Telemetry & Early Intervention Alerts
- Admin Operations & AI Token Metering / Cost Control
- RAG Document Knowledge Store with Grounded Citations

---

## Tech Stack
- **Framework**: NestJS 11+, TypeScript, Node.js
- **API Spec**: Swagger / OpenAPI at `/api/docs`
- **Security**: Passport.js, JWT, Refresh Token Rotation, RBAC Guards, class-validator
- **Database**: Mongoose / MongoDB with Zero-Config embedded persistence fallback
- **AI & RAG**: Google Gemini API (`gemini-1.5-flash`, `gemini-1.5-pro`) with resilient fallback provider
- **Vector Search**: Qdrant REST client compatibility + cosine semantic retriever

---

## 📚 Complete Engineering & Architecture Specifications

Detailed architecture and design specifications are maintained in the [`docs/`](./docs) directory:
- 🏛️ **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)**: High-level system architecture, C4 diagrams, and the 11-step end-to-end intelligence cascade.
- 🗄️ **[DATABASE.md](./docs/DATABASE.md)**: Dual-mode persistence layer, catalog of all 39 domain entities across 13 Mongoose schemas, text search and indexing strategies, and atomic disk durability.
- 🔌 **[API.md](./docs/API.md)**: RESTful API contracts, OpenAPI / Swagger specifications, response/error envelopes.
- 🧠 **[AI_ARCHITECTURE.md](./docs/AI_ARCHITECTURE.md)**: The 8-tier multi-provider AI fallback cascade, specialized domain engines (Socratic Tutor with Bloom's taxonomy & Web Speech Audio, JD Intelligence, Code Review, Mock Interviews).
- 🔍 **[RAG.md](./docs/RAG.md)**: Document ingestion, overlap-aware chunking, vector storage (Qdrant & in-memory cosine index), grounded citation badges, and anti-hallucination guardrails.
- 🛡️ **[SECURITY.md](./docs/SECURITY.md)**: Token rotation, SHA-256 token hashing, RBAC + anti-IDOR `ResourceOwnerGuard`, public admin registration block, and `EmailService` abstraction.
- 🚀 **[DEPLOYMENT.md](./docs/DEPLOYMENT.md)**: Multi-stage Dockerfiles, Docker Compose orchestrations, and cloud deployment guides.

---

## Installation & Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   *(Optional: The server includes a built-in zero-config fallback datastore and semantic AI engine, so it runs out-of-the-box even without external MongoDB or Gemini API keys).*

3. **Build the application**:
   ```bash
   npm run build
   ```

4. **Start the server**:
   ```bash
   npm run start:prod   # Production mode
   # or
   npm run start:dev    # Development watch mode
   ```

5. **Access API & Swagger Documentation**:
   - API Root: `http://localhost:3001`
   - Interactive Swagger Docs: `http://localhost:3001/api/docs`

---

## Running Automated End-to-End Tests
Execute the full 12-workflow integration suite:
```powershell
powershell.exe -ExecutionPolicy Bypass -File .\test-e2e.ps1
```
