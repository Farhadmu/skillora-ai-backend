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
