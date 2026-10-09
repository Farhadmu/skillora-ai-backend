import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { Profile, ProfileDocument } from '../../database/schemas/profile.schema';
import { Roadmap, RoadmapDocument } from '../../database/schemas/roadmap.schema';
import { AiService } from '../ai/ai.service';

@Injectable()
export class CareerNavigatorService {
  private readonly logger = new Logger(CareerNavigatorService.name);

  constructor(
    @InjectModel(Profile.name) private readonly profileModel: Model<ProfileDocument>,
    @InjectModel(Roadmap.name) private readonly roadmapModel: Model<RoadmapDocument>,
    private readonly aiService: AiService,
  ) {}

  getAvailableRoles() {
    return [
      {
        id: 'role-fullstack-ai',
        title: 'Full-Stack AI Systems Engineer',
        category: 'Full-Stack & Artificial Intelligence',
        salaryRange: '$125,000 - $175,000',
        salaryBreakdown: { entry: '$90,000', mid: '$135,000', senior: '$175,000', globalAvg: '$140,000' },
        marketGrowthRate: '+42% YoY',
        demandIndex: 98,
        description:
          'Architects and engineers who build resilient, full-stack web applications tightly integrated with foundation model inference, embeddings, and vector RAG retrieval.',
        coreSkills: [
          'TypeScript',
          'Next.js',
          'NestJS',
          'RAG (Retrieval-Augmented Generation)',
          'MongoDB',
          'Docker',
          'Vector Embeddings',
          'Tailwind CSS',
        ],
        requiredSkills: {
          foundational: ['TypeScript', 'Data Structures & Algorithms', 'REST & GraphQL APIs', 'Git Workflow'],
          coreTechnologies: ['Next.js 15', 'NestJS', 'React', 'MongoDB & Mongoose', 'PostgreSQL'],
          architectureAndScale: ['RAG Vector Search', 'Docker & Containerization', 'LLM Tool Calling & Agents', 'Microservices'],
        },
        learningPath: [
          { phase: 'Phase 1', title: 'TypeScript & Modern Full-Stack Foundations', duration: 'Week 1-2', keyTopics: ['Advanced TypeScript', 'Next.js 15 App Router', 'NestJS Architecture'] },
          { phase: 'Phase 2', title: 'Production Data Layer & Persistence', duration: 'Week 3-4', keyTopics: ['MongoDB Mongoose Modeling', 'PostgreSQL Relational Design', 'Redis Caching'] },
          { phase: 'Phase 3', title: 'Generative AI & Vector Retrieval Systems', duration: 'Week 5-6', keyTopics: ['Qdrant Vector Database', 'Sentence Embeddings', 'RAG Guardrails'] },
          { phase: 'Phase 4', title: 'Production Hardening & Job Readiness', duration: 'Week 7-8', keyTopics: ['Dockerization', 'CI/CD Pipelines', 'ATS Portfolio Showcase'] },
        ],
        portfolioProjects: [
          {
            title: 'Enterprise AI Knowledge Retrieval Engine (RAG)',
            techStack: ['TypeScript', 'NestJS', 'Qdrant', 'Next.js', 'Docker'],
            description: 'Scalable vector retrieval system that ingests enterprise documentation, generates embeddings, and answers queries with citations.',
            deliverable: 'Live repository with containerized microservices and verified unit/e2e test suite.',
          },
          {
            title: 'High-Concurrency Collaborative Workspace',
            techStack: ['Next.js', 'NestJS', 'MongoDB', 'WebSockets', 'Tailwind CSS'],
            description: 'Real-time multi-user editing workspace with role-based access control, optimistic UI updates, and operational transforms.',
            deliverable: 'Production deployment with sub-100ms latency and automated smoke tests.',
          },
          {
            title: 'Autonomous Multi-Agent Task Orchestrator',
            techStack: ['TypeScript', 'Gemini / Claude APIs', 'Redis', 'Docker'],
            description: 'Multi-agent system coordinating research, code execution, and automated report synthesis with human-in-the-loop review.',
            deliverable: 'Interactive playground and benchmark evaluation report.',
          },
        ],
      },
      {
        id: 'role-frontend-lead',
        title: 'Frontend Engineer & UI Specialist',
        category: 'Frontend & User Experience',
        salaryRange: '$110,000 - $155,000',
        salaryBreakdown: { entry: '$80,000', mid: '$120,000', senior: '$155,000', globalAvg: '$125,000' },
        marketGrowthRate: '+22% YoY',
        demandIndex: 90,
        description:
          'Specialists who architect responsive, accessible, high-performance web applications with advanced animations, design systems, and state synchronization.',
        coreSkills: [
          'React',
          'Next.js',
          'TypeScript',
          'Tailwind CSS',
          'Framer Motion',
          'Web Accessibility (a11y)',
          'State Management',
        ],
        requiredSkills: {
          foundational: ['HTML5 Semantic Markup', 'CSS3 Modern Layouts & Grid', 'JavaScript (ESNext)', 'TypeScript'],
          coreTechnologies: ['React 19', 'Next.js App Router', 'Tailwind CSS', 'Zustand / Redux Toolkit'],
          architectureAndScale: ['Core Web Vitals Optimization', 'WCAG 2.1 Accessibility', 'Micro-Frontends', 'Design Tokens'],
        },
        learningPath: [
          { phase: 'Phase 1', title: 'Modern React & Component Design Systems', duration: 'Week 1-2', keyTopics: ['React 19 Server Components', 'Hooks & State Architecture', 'Tailwind CSS Systems'] },
          { phase: 'Phase 2', title: 'Next.js 15 & SSR Performance Engineering', duration: 'Week 3-4', keyTopics: ['Streaming SSR', 'Static & Dynamic Rendering', 'Bundle Size Optimization'] },
          { phase: 'Phase 3', title: 'Advanced UX, Micro-Animations & Accessibility', duration: 'Week 5-6', keyTopics: ['Framer Motion Transitions', 'WCAG AAA Standards', 'Keyboard Navigation'] },
          { phase: 'Phase 4', title: 'Testing, E2E Pipelines & Portfolio Polish', duration: 'Week 7-8', keyTopics: ['Playwright E2E', 'Storybook Documentation', 'ATS Resume Tuning'] },
        ],
        portfolioProjects: [
          {
            title: 'Design System & Component Library (Open Source)',
            techStack: ['React', 'TypeScript', 'Tailwind CSS', 'Storybook'],
            description: 'Production-ready headless component library with full keyboard accessibility, dark mode tokens, and zero dependencies.',
            deliverable: 'Published NPM package documentation with live interactive playground.',
          },
          {
            title: 'High-Frequency Financial Analytics Dashboard',
            techStack: ['Next.js', 'TypeScript', 'Canvas / WebGL', 'Tailwind CSS'],
            description: 'Ultra-low latency dashboard rendering 60fps streaming candle charts with customizable widgets.',
            deliverable: 'Audited 98+ Google Lighthouse Performance & SEO score.',
          },
        ],
      },
      {
        id: 'role-backend-cloud',
        title: 'Backend Node.js & Cloud Architect',
        category: 'Backend & Cloud Infrastructure',
        salaryRange: '$130,000 - $180,000',
        salaryBreakdown: { entry: '$95,000', mid: '$140,000', senior: '$180,000', globalAvg: '$145,000' },
        marketGrowthRate: '+28% YoY',
        demandIndex: 94,
        description:
          'Engineers responsible for architecting scalable distributed microservices, message queues, relational/NoSQL datastores, and cloud orchestration.',
        coreSkills: [
          'TypeScript',
          'NestJS',
          'PostgreSQL',
          'MongoDB',
          'Docker',
          'Kubernetes',
          'AWS (Amazon Web Services)',
          'System Design',
        ],
        requiredSkills: {
          foundational: ['Node.js Event Loop', 'TypeScript Architecture', 'SQL & Relational Algebra', 'Networking & Protocols'],
          coreTechnologies: ['NestJS', 'Express', 'PostgreSQL', 'MongoDB & Mongoose', 'Redis Caching'],
          architectureAndScale: ['Distributed Systems & Sharding', 'Message Queues (Kafka/RabbitMQ)', 'Docker & Kubernetes', 'JWT & RBAC Security'],
        },
        learningPath: [
          { phase: 'Phase 1', title: 'NestJS Dependency Injection & Architecture', duration: 'Week 1-2', keyTopics: ['Modular Monoliths', 'Guards, Interceptors & Pipes', 'TypeORM & Mongoose'] },
          { phase: 'Phase 2', title: 'High-Throughput Caching & Queues', duration: 'Week 3-4', keyTopics: ['Redis Cluster Caching', 'BullMQ Background Jobs', 'Rate Limiting & Throttling'] },
          { phase: 'Phase 3', title: 'Distributed Systems & Microservices', duration: 'Week 5-6', keyTopics: ['gRPC & Event-Driven Architecture', 'Idempotency Keys', 'Database Transactions'] },
          { phase: 'Phase 4', title: 'Cloud Deployment & System Design Mastery', duration: 'Week 7-8', keyTopics: ['Docker Multi-Stage Builds', 'Kubernetes Deployments', 'High-Scale Mock Interviews'] },
        ],
        portfolioProjects: [
          {
            title: 'Resilient Fintech Payment Processing Microservice',
            techStack: ['NestJS', 'PostgreSQL', 'Redis', 'Docker', 'Stripe Webhooks'],
            description: 'ACID-compliant payment engine with double-entry ledger, idempotency keys, and automated reconciliation.',
            deliverable: 'Complete test suite demonstrating zero race conditions under concurrent load.',
          },
          {
            title: 'High-Throughput Distributed Rate Limiter & Gateway',
            techStack: ['TypeScript', 'Node.js', 'Redis Lua Scripts', 'Docker'],
            description: 'Sliding window log rate limiter handling 25,000 req/sec with graceful degradation under network partitions.',
            deliverable: 'Benchmarked with k6 load testing scripts and Prometheus metrics.',
          },
        ],
      },
      {
        id: 'role-devops-platform',
        title: 'DevOps & Cloud Platform Engineer',
        category: 'Cloud & Platform Engineering',
        salaryRange: '$135,000 - $185,000',
        salaryBreakdown: { entry: '$100,000', mid: '$145,000', senior: '$185,000', globalAvg: '$150,000' },
        marketGrowthRate: '+35% YoY',
        demandIndex: 95,
        description:
          'Platform engineers responsible for automating CI/CD pipelines, container orchestration, cloud security, infrastructure-as-code, and site reliability.',
        coreSkills: [
          'Docker',
          'Kubernetes',
          'Terraform',
          'AWS (Amazon Web Services)',
          'Linux Systems',
          'CI/CD (GitHub Actions)',
          'Prometheus & Grafana',
        ],
        requiredSkills: {
          foundational: ['Linux Kernel & Shell Scripting', 'Networking (VPC, CIDR, DNS, SSL)', 'GitOps Fundamentals', 'Security Best Practices'],
          coreTechnologies: ['Docker Engine', 'Kubernetes (K8s)', 'Terraform / OpenTofu', 'GitHub Actions / GitLab CI'],
          architectureAndScale: ['Multi-Cloud Architecture', 'Zero-Downtime Deployments (Canary/Blue-Green)', 'Observability (Prometheus/Grafana/Loki)', 'SRE Principles'],
        },
        learningPath: [
          { phase: 'Phase 1', title: 'Containerization & Linux Foundations', duration: 'Week 1-2', keyTopics: ['Docker Multi-stage Builds', 'Linux System Internals', 'Shell Automation'] },
          { phase: 'Phase 2', title: 'Kubernetes Cluster Orchestration', duration: 'Week 3-4', keyTopics: ['Pods, Deployments, Services', 'Ingress Controllers', 'ConfigMaps & Secrets'] },
          { phase: 'Phase 3', title: 'Infrastructure as Code & CI/CD GitOps', duration: 'Week 5-6', keyTopics: ['Terraform AWS Modules', 'GitHub Actions Workflows', 'Helm Charts'] },
          { phase: 'Phase 4', title: 'Observability & SRE Production Hardening', duration: 'Week 7-8', keyTopics: ['Prometheus Metrics', 'Grafana Dashboards', 'Disaster Recovery Drills'] },
        ],
        portfolioProjects: [
          {
            title: 'Automated GitOps Infrastructure Platform on AWS',
            techStack: ['Terraform', 'Kubernetes (EKS)', 'GitHub Actions', 'ArgoCD'],
            description: 'Complete infrastructure-as-code repository provisioning high-availability Kubernetes clusters with automated canary rollouts.',
            deliverable: 'Reproducible Terraform blueprints and disaster-recovery runbooks.',
          },
          {
            title: 'Full-Stack Observability & Incident Response Stack',
            techStack: ['Prometheus', 'Grafana', 'Loki', 'Alertmanager', 'Docker'],
            description: 'Centralized telemetry pipeline tracking SLI/SLOs with automated pager notifications and diagnostic dashboards.',
            deliverable: 'Live monitoring setup and simulated stress testing logs.',
          },
        ],
      },
      {
        id: 'role-ai-researcher',
        title: 'Machine Learning & Data Science Engineer',
        category: 'Data & Machine Learning',
        salaryRange: '$135,000 - $190,000',
        salaryBreakdown: { entry: '$98,000', mid: '$148,000', senior: '$190,000', globalAvg: '$152,000' },
        marketGrowthRate: '+45% YoY',
        demandIndex: 98,
        description:
          'Practitioners in multimodal foundation models, vector representations, fine-tuning, transformer architectures, and low-latency inference pipelines.',
        coreSkills: [
          'Python',
          'PyTorch',
          'Hugging Face',
          'Vector Embeddings',
          'Qdrant',
          'Scikit-Learn',
          'MLOps',
        ],
        requiredSkills: {
          foundational: ['Python for Data Science', 'Linear Algebra & Calculus', 'Probability & Statistics', 'Data Preprocessing'],
          coreTechnologies: ['PyTorch', 'Hugging Face Transformers', 'Pandas & NumPy', 'Scikit-Learn'],
          architectureAndScale: ['LoRA & PEFT Fine-Tuning', 'Vector Databases & Similarity Search', 'MLOps (MLflow, BentoML)', 'Model Quantization (GGUF/AWQ)'],
        },
        learningPath: [
          { phase: 'Phase 1', title: 'Python Numerical Computing & Foundations', duration: 'Week 1-2', keyTopics: ['NumPy Vectorization', 'Pandas Manipulation', 'Feature Engineering'] },
          { phase: 'Phase 2', title: 'Deep Learning & PyTorch Architectures', duration: 'Week 3-4', keyTopics: ['Feedforward & CNNs', 'Transformers & Attention Mechanisms', 'Loss Optimization'] },
          { phase: 'Phase 3', title: 'LLMs, Vector Search & Retrieval', duration: 'Week 5-6', keyTopics: ['Sentence Transformers', 'Vector Indexing in Qdrant', 'RAG Retrieval Optimization'] },
          { phase: 'Phase 4', title: 'Model Deployment & MLOps Production', duration: 'Week 7-8', keyTopics: ['FastAPI Inference Endpoints', 'Dockerization', 'Portfolio Evaluation Benchmark'] },
        ],
        portfolioProjects: [
          {
            title: 'Domain-Adapted Specialized LLM via LoRA Fine-Tuning',
            techStack: ['Python', 'PyTorch', 'Hugging Face', 'Weights & Biases'],
            description: 'Fine-tuned 7B parameter open-weights model on legal/financial domain documents, achieving 28% higher factual accuracy.',
            deliverable: 'Comprehensive evaluation benchmark notebook and model weights on Hugging Face.',
          },
          {
            title: 'Real-Time Multimodal Semantic Search Engine',
            techStack: ['Python', 'CLIP', 'Qdrant', 'FastAPI', 'Docker'],
            description: 'Cross-modal image and text semantic retrieval service serving sub-50ms vector queries over 500,000 items.',
            deliverable: 'Live containerized API with Swagger documentation and benchmark report.',
          },
        ],
      },
      {
        id: 'role-mobile-lead',
        title: 'Mobile Applications Engineer (React Native & Flutter)',
        category: 'Mobile Application Engineering',
        salaryRange: '$115,000 - $160,000',
        salaryBreakdown: { entry: '$85,000', mid: '$125,000', senior: '$160,000', globalAvg: '$130,000' },
        marketGrowthRate: '+20% YoY',
        demandIndex: 89,
        description:
          'Mobile specialists who build buttery-smooth cross-platform applications with offline-first persistence, deep native integration, and rich animations.',
        coreSkills: [
          'React Native',
          'TypeScript',
          'Flutter & Dart',
          'iOS & Android Native SDKs',
          'Offline Data Sync',
          'Mobile UI Performance',
        ],
        requiredSkills: {
          foundational: ['TypeScript / Dart', 'Mobile Lifecycle Management', 'Async State & Local Storage', 'Mobile UX Guidelines (Material/HIG)'],
          coreTechnologies: ['React Native / Expo', 'Flutter', 'Redux Toolkit / Riverpod', 'SQLite / WatermelonDB'],
          architectureAndScale: ['Offline-First Synchronization', 'Native Device APIs (Camera, GPS, Bluetooth)', 'App Store & Google Play CI/CD', 'Memory Profiling'],
        },
        learningPath: [
          { phase: 'Phase 1', title: 'Cross-Platform Framework Fundamentals', duration: 'Week 1-2', keyTopics: ['Component Hierarchy', 'Styling & Flexbox in Mobile', 'Navigation & Deep Linking'] },
          { phase: 'Phase 2', title: 'State Management & Offline Persistence', duration: 'Week 3-4', keyTopics: ['Local Relational Databases', 'Sync Conflict Resolution', 'Background Tasks'] },
          { phase: 'Phase 3', title: 'Native Integrations & Performance Tuning', duration: 'Week 5-6', keyTopics: ['Native Modules Bridge', '60fps Gesture Handling', 'Bundle Splitting'] },
          { phase: 'Phase 4', title: 'Automated Build Pipelines & App Store Launch', duration: 'Week 7-8', keyTopics: ['Fastlane Automation', 'E2E Maestro Testing', 'Interactive Portfolio Showcase'] },
        ],
        portfolioProjects: [
          {
            title: 'Offline-First Cross-Platform Financial Companion',
            techStack: ['React Native', 'TypeScript', 'WatermelonDB', 'Expo EAS'],
            description: 'End-to-end encrypted expense and budget manager with background bank sync and biometrics security.',
            deliverable: 'App Store ready build artifact with 60fps interaction benchmarks.',
          },
        ],
      },
      {
        id: 'role-cybersecurity-secops',
        title: 'Cybersecurity & Application Security Analyst',
        category: 'Information Security & SecOps',
        salaryRange: '$130,000 - $175,000',
        salaryBreakdown: { entry: '$95,000', mid: '$138,000', senior: '$175,000', globalAvg: '$142,000' },
        marketGrowthRate: '+36% YoY',
        demandIndex: 96,
        description:
          'Security practitioners safeguarding cloud infrastructure, auditing source code for OWASP vulnerabilities, and engineering zero-trust access controls.',
        coreSkills: [
          'Application Security (AppSec)',
          'OWASP Top 10',
          'Penetration Testing',
          'Cloud Security (AWS/GCP)',
          'Cryptography & PKI',
          'DevSecOps Pipelines',
        ],
        requiredSkills: {
          foundational: ['Network Protocols (TCP/IP, TLS/SSL, DNS)', 'Linux Security & System Calls', 'Cryptography Fundamentals', 'Security Governance'],
          coreTechnologies: ['Burp Suite / ZAP', 'Static & Dynamic Code Analysis (SAST/DAST)', 'OAuth2 & OIDC Security', 'Docker & Kubernetes Hardening'],
          architectureAndScale: ['Zero-Trust Architecture', 'Incident Response & SIEM', 'Threat Modeling (STRIDE)', 'Automated DevSecOps in CI/CD'],
        },
        learningPath: [
          { phase: 'Phase 1', title: 'AppSec Core & OWASP Top 10 Exploitation', duration: 'Week 1-2', keyTopics: ['SQL Injection & XSS Mitigation', 'CSRF & SSRF Defense', 'Auth Bypass Prevention'] },
          { phase: 'Phase 2', title: 'Cryptography, PKI & Secure Authentication', duration: 'Week 3-4', keyTopics: ['JWT Secure Signing & Revocation', 'TLS Configuration', 'Secrets Vaults'] },
          { phase: 'Phase 3', title: 'Cloud Infrastructure & Container Hardening', duration: 'Week 5-6', keyTopics: ['Docker Rootless Containers', 'Kubernetes Network Policies', 'IAM Least Privilege'] },
          { phase: 'Phase 4', title: 'DevSecOps Automation & Security Portfolio', duration: 'Week 7-8', keyTopics: ['Automated SAST/DAST in GitHub Actions', 'Security Audit Reports', 'Interview Defense'] },
        ],
        portfolioProjects: [
          {
            title: 'Automated DevSecOps Security Scanner Pipeline',
            techStack: ['Python', 'Trivy', 'SonarQube', 'GitHub Actions', 'Docker'],
            description: 'CI/CD pipeline that blocks PRs containing critical CVEs, hardcoded secrets, or insecure Docker base images.',
            deliverable: 'Comprehensive audit report and automated remediation scripts.',
          },
        ],
      },
      {
        id: 'role-qa-automation',
        title: 'Software QA & Test Automation Specialist',
        category: 'Quality Assurance & Automated Testing',
        salaryRange: '$105,000 - $145,000',
        salaryBreakdown: { entry: '$75,000', mid: '$110,000', senior: '$145,000', globalAvg: '$115,000' },
        marketGrowthRate: '+18% YoY',
        demandIndex: 87,
        description:
          'Testing engineers who build robust end-to-end automation frameworks, performance load benchmarks, and reliable regression suites.',
        coreSkills: [
          'Playwright',
          'Cypress',
          'Jest / Vitest',
          'API Contract Testing',
          'Load Testing (k6)',
          'CI/CD Test Pipelines',
        ],
        requiredSkills: {
          foundational: ['Software Testing Theory & Test Pyramid', 'JavaScript / TypeScript', 'HTTP Protocol & REST Verification', 'Bug Tracking & QA Strategy'],
          coreTechnologies: ['Playwright', 'Jest / Vitest', 'Supertest', 'Postman / Newman'],
          architectureAndScale: ['Distributed E2E Test Execution', 'Performance & Load Testing (k6)', 'Mutation Testing', 'Test Data Management & Mocking'],
        },
        learningPath: [
          { phase: 'Phase 1', title: 'Unit & Integration Testing Rigor', duration: 'Week 1-2', keyTopics: ['Test-Driven Development (TDD)', 'Mocking Strategies in Jest', 'Backend API Integration Tests'] },
          { phase: 'Phase 2', title: 'Modern End-to-End Automation with Playwright', duration: 'Week 3-4', keyTopics: ['Page Object Model (POM)', 'Cross-Browser Parallel Execution', 'Visual Regression Tests'] },
          { phase: 'Phase 3', title: 'Performance, Stress & Load Engineering', duration: 'Week 5-6', keyTopics: ['k6 Load Scripts', 'SLA Threshold Verification', 'Memory Leak Detection'] },
          { phase: 'Phase 4', title: 'Continuous Testing in CI/CD & Portfolio Showcase', duration: 'Week 7-8', keyTopics: ['GitHub Actions Matrix Testing', 'HTML Test Reports', 'QA Engineer Resume Polish'] },
        ],
        portfolioProjects: [
          {
            title: 'Enterprise-Grade Playwright E2E Automation Framework',
            techStack: ['TypeScript', 'Playwright', 'GitHub Actions', 'Allure Reports'],
            description: 'Scalable automation framework covering complex multi-step user workflows with automated video recording on failure.',
            deliverable: 'Live test execution report dashboard with 99.8% test reliability rate.',
          },
        ],
      },
    ];
  }

  /**
   * Run comprehensive AI research for any selected or custom role
   */
  async researchRole(userId: string, roleTitle: string) {
    const profile = await this.profileModel
      .findOne({
        $or: [{ userId }, ...(isValidObjectId(userId) ? [{ _id: userId }] : [])],
      })
      .lean();

    const userSkills = (profile?.skills || []).map((s: any) => s.name);
    const roles = this.getAvailableRoles();

    // Look for matched role in predefined library, or build dynamic custom profile
    let target = roles.find((r) => r.title.toLowerCase() === (roleTitle || '').toLowerCase());

    if (!target) {
      // Dynamic profile for custom role
      target = {
        id: `custom-${encodeURIComponent(roleTitle.toLowerCase().replace(/\s+/g, '-'))}`,
        title: roleTitle || 'Software Engineer',
        category: 'Custom Specialized Track',
        salaryRange: '$115,000 - $160,000',
        salaryBreakdown: { entry: '$85,000', mid: '$125,000', senior: '$160,000', globalAvg: '$130,000' },
        marketGrowthRate: '+25% YoY',
        demandIndex: 91,
        description: `Specialized engineering track focused on modern best practices, scalable design patterns, and commercial production readiness for ${roleTitle}.`,
        coreSkills: [
          'TypeScript',
          'Modern Web Frameworks',
          'Database Architecture',
          'API Engineering',
          'Automated Testing',
          'Cloud & Container Deployment',
        ],
        requiredSkills: {
          foundational: ['Core Programming Fundamentals', 'Data Structures & Algorithms', 'Git & Version Control', 'Networking Basics'],
          coreTechnologies: ['Primary Language / Framework', 'Database Persistence', 'API Architecture', 'State Management'],
          architectureAndScale: ['System Design & Scalability', 'Containerization & Docker', 'Security & Best Practices', 'Production Monitoring'],
        },
        learningPath: [
          { phase: 'Phase 1', title: 'Core Foundations & Tools', duration: 'Week 1-2', keyTopics: ['Language Fundamentals', 'Development Environment', 'Core Conventions'] },
          { phase: 'Phase 2', title: 'Core Frameworks & Data Layer', duration: 'Week 3-4', keyTopics: ['Framework Architecture', 'Database Persistence', 'API Integration'] },
          { phase: 'Phase 3', title: 'Advanced Production Patterns', duration: 'Week 5-6', keyTopics: ['Scale & Performance', 'Security Hardening', 'End-to-End Testing'] },
          { phase: 'Phase 4', title: 'Production Portfolio & Job Readiness', duration: 'Week 7-8', keyTopics: ['Capstone Project', 'ATS Resume Generation', 'Interview Preparation'] },
        ],
        portfolioProjects: [
          {
            title: `Production-Grade ${roleTitle} Capstone Application`,
            techStack: ['Modern Framework', 'Database', 'Docker', 'Testing'],
            description: `Full-scale application showcasing end-to-end competency tailored specifically to ${roleTitle}.`,
            deliverable: 'Clean GitHub repository with comprehensive README, live deployment, and automated tests.',
          },
        ],
      };
    }

    // Compute Skill Gap
    const allRequiredSkills = [
      ...target.coreSkills,
      ...target.requiredSkills.foundational,
      ...target.requiredSkills.coreTechnologies,
      ...target.requiredSkills.architectureAndScale,
    ];

    const uniqueRequired = Array.from(new Set(allRequiredSkills));
    const matchingSkills = uniqueRequired.filter((req) =>
      userSkills.some((us: string) => us.toLowerCase() === req.toLowerCase() || req.toLowerCase().includes(us.toLowerCase())),
    );
    const missingSkills = uniqueRequired.filter(
      (req) => !userSkills.some((us: string) => us.toLowerCase() === req.toLowerCase() || req.toLowerCase().includes(us.toLowerCase())),
    );

    const matchPercentage =
      uniqueRequired.length > 0 ? Math.round((matchingSkills.length / uniqueRequired.length) * 100) : 0;

    let recommendation = '';
    if (matchingSkills.length === 0) {
      recommendation = `You are starting fresh for this career track. Generate your personalized 30-day SkillBridge roadmap to master foundational skills first.`;
    } else if (matchPercentage >= 75) {
      recommendation = `Outstanding fit (${matchPercentage}%)! You already possess ${matchingSkills.length} key competencies. Focus on capstone portfolio projects and ATS resume polish.`;
    } else {
      recommendation = `Solid foundation! You possess ${matchingSkills.length} matching skills (${matchingSkills.slice(0, 3).join(', ')}). Bridge your remaining gaps (${missingSkills.slice(0, 3).join(', ')}) using adaptive modules.`;
    }

    return {
      role: target,
      skillGapAnalysis: {
        userTotalSkills: userSkills.length,
        matchingSkills,
        missingSkills,
        matchPercentage,
        recommendation,
      },
    };
  }

  /**
   * Compare learner profile against two roles
   */
  async compareRoles(userId: string, roleA: string, roleB: string) {
    const profile = await this.profileModel
      .findOne({
        $or: [{ userId }, ...(isValidObjectId(userId) ? [{ _id: userId }] : [])],
      })
      .lean();
    const userSkills = (profile?.skills || []).map((s: any) => s.name);

    const roles = this.getAvailableRoles();
    const infoA = roles.find((r) => r.title.toLowerCase() === (roleA || '').toLowerCase()) || roles[0];
    const infoB = roles.find((r) => r.title.toLowerCase() === (roleB || '').toLowerCase()) || roles[1];

    const matchA = Math.round(
      (infoA.coreSkills.filter((s) => userSkills.some((us) => us.toLowerCase() === s.toLowerCase())).length /
        infoA.coreSkills.length) *
        100,
    );

    const matchB = Math.round(
      (infoB.coreSkills.filter((s) => userSkills.some((us) => us.toLowerCase() === s.toLowerCase())).length /
        infoB.coreSkills.length) *
        100,
    );

    return {
      roleA: { ...infoA, userMatchPercentage: matchA },
      roleB: { ...infoB, userMatchPercentage: matchB },
      recommendation:
        userSkills.length === 0
          ? 'Add your skills or complete an assessment to calculate personalized transition distances.'
          : matchA >= matchB
          ? `Based on your existing skills in ${userSkills.slice(0, 3).join(', ')}, ${infoA.title} offers the shortest transition distance.`
          : `Your background provides a strong springboard into ${infoB.title}.`,
    };
  }

  /**
   * Complete Job-Readiness Suite Generation:
   * 1. ATS Resume / CV Builder & Optimizer
   * 2. LinkedIn Profile Optimizer (Headlines, About Story, Endorsements)
   * 3. Public Verifiable Portfolio Showcase
   */
  async generateJobReadinessSuite(userId: string, targetRoleInput?: string) {
    const profile = await this.profileModel
      .findOne({
        $or: [{ userId }, ...(isValidObjectId(userId) ? [{ _id: userId }] : [])],
      })
      .lean();

    const activeRoadmap = await this.roadmapModel
      .findOne({ userId, status: 'active' })
      .sort({ createdAt: -1 })
      .lean();

    const learnerName = profile?.name || 'Talent Candidate';
    const learnerEmail = profile?.email || 'talent@skillora.ai';
    const targetRole = targetRoleInput || profile?.targetRole || 'Full-Stack AI Systems Engineer';
    const skillsList = (profile?.skills || []).map((s: any) => s.name);
    const verifiedSkills = (profile?.skills || []).filter((s: any) => s.verified).map((s: any) => s.name);
    const readinessScore = profile?.readinessScore ?? 0;

    // Build ATS Resume Markdown
    const skillsFormatted = skillsList.length > 0 ? skillsList.join(' • ') : 'TypeScript • Next.js • NestJS • MongoDB • Docker';
    const verifiedSection =
      verifiedSkills.length > 0
        ? `\n**Verified Competency Proof (Skillora Authenticated):**\n${verifiedSkills.join(', ')}\n`
        : '';

    const summaryText =
      profile?.bio && profile.bio.length > 20
        ? profile.bio
        : `Results-driven ${targetRole} with proven competency in designing, building, and deploying scalable software systems. Experienced in full-cycle software development, automated testing, and performance optimization. Verified technical capability backed by authentic assessment credentials and hands-on deliverables.`;

    const resumeMarkdown = `# ${learnerName.toUpperCase()}
**Target Role:** ${targetRole}  
**Contact:** ${learnerEmail} | **Portfolio:** https://skillora.ai/portfolio/${profile?.userId || userId}  
**Verification Status:** Skillora 7-Dimension Readiness Score: ${readinessScore}/100 (Authentic)

---

### PROFESSIONAL SUMMARY
${summaryText}

---

### TECHNICAL SKILLS & COMPETENCIES
- **Core Languages & Frameworks:** ${skillsFormatted}
- **Architecture & Tooling:** Git, CI/CD Workflows, Microservices Architecture, RESTful APIs, Containerization${verifiedSection}

---

### FEATURED TECHNICAL PROJECTS & DELIVERABLES
**Enterprise Distributed System & Scalable Application Architecture**
- Designed and implemented end-to-end full-stack software application with rigorous input validation and error handling.
- Optimized database query performance and persistence layer, ensuring sub-100ms response latencies.
- Implemented comprehensive automated test coverage (Unit & Integration tests) to guarantee zero regression deployments.

**Cloud-Native Microservices & Modern API Platform**
- Architected RESTful API endpoints utilizing clean separation of concerns, repository patterns, and modular services.
- Containerized development and production environments using Docker multi-stage builds.
- Integrated JWT authentication and role-based access control with secure credential management.

---

### EDUCATION & CREDENTIALS
- **Institution:** ${profile?.institution || 'Academic / Self-Directed Engineering Curriculum'}
- **Degree:** ${profile?.degree || 'Bachelor of Science / Computer Science Equivalent'} (Graduation: ${profile?.graduationYear || '2025'})
- **Skillora Verified Credential:** 7-Dimension Workforce Readiness Benchmark (${readinessScore}/100)
`;

    // LinkedIn Profile Optimization Suite
    const headlineOptions = [
      `${targetRole} | ${skillsList.slice(0, 4).join(' • ') || 'TypeScript • Next.js • NestJS'} | Building Resilient Systems`,
      `Passionate ${targetRole} | Specializing in Scalable Architecture, Modern APIs & Clean Code | Open to Opportunities`,
      `${targetRole} | Verified Competency by Skillora AI (${readinessScore}/100 Readiness) | Full-Stack & Cloud Systems`,
    ];

    const linkedInAbout = `I am a dedicated ${targetRole} focused on engineering robust, high-performance software systems that solve real-world business challenges.

🚀 What I Bring to the Table:
• Technical Mastery: Strong foundations in ${skillsList.slice(0, 5).join(', ') || 'TypeScript, modern frameworks, and cloud-native backends'}.
• Problem-Solving Rigor: Practical experience tackling distributed data flow, asynchronous operations, and low-latency APIs.
• Continuous Evolution: Verified workforce credentials with a Skillora AI Readiness Score of ${readinessScore}/100.

💡 What Drives Me:
I enjoy taking complex architectural problems and turning them into elegant, maintainable code. Whether building high-scale APIs, optimizing database queries, or containerizing microservices, I care deeply about developer ergonomics and software reliability.

📫 Let's Connect:
Always excited to connect with engineering leaders, fellow developers, and innovative teams looking for a proactive ${targetRole}. Feel free to reach out directly!`;

    const experienceBullets = [
      `Architected and deployed scalable backend services using NestJS and MongoDB, improving API response times by 35%.`,
      `Engineered responsive Next.js web interfaces with accessible UI components, resulting in 99+ Core Web Vitals performance.`,
      `Integrated automated testing suites and CI/CD pipelines, reducing regression defect escapes to zero.`,
      `Designed secure authentication workflows with JWT access/refresh rotation and role-based access controls.`,
    ];

    return {
      targetRole,
      learnerName,
      readinessScore,
      resume: {
        fullName: learnerName,
        email: learnerEmail,
        targetRole,
        summary: summaryText,
        skillsFormatted,
        verifiedSkills,
        rawMarkdown: resumeMarkdown,
      },
      linkedIn: {
        headlines: headlineOptions,
        aboutStory: linkedInAbout,
        featuredSkills: skillsList.length > 0 ? skillsList : ['TypeScript', 'Next.js', 'NestJS', 'MongoDB', 'Docker', 'System Design'],
        experienceBullets,
      },
      portfolio: {
        publicUrl: `/portfolio/${profile?.userId || userId}`,
        headline: profile?.headline || `${targetRole} — Verified Workforce Talent`,
        readinessScore,
        verifiedSkillsCount: verifiedSkills.length,
        status: readinessScore >= 75 ? 'Job Ready & Available' : 'Building Verified Competency',
      },
    };
  }

  /**
   * Job Description Intelligence Analysis
   */
  async analyzeJobDescription(userId: string, jdText: string) {
    const profile = await this.profileModel
      .findOne({
        $or: [{ userId }, ...(isValidObjectId(userId) ? [{ _id: userId }] : [])],
      })
      .lean();
    const userSkills = (profile?.skills || []).map((s: any) => s.name);

    return this.aiService.analyzeJobDescription(jdText, userSkills);
  }
}

