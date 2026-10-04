import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Role } from '../common/enums/roles.enum';

export interface UserEntity {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: Role;
  avatar?: string;
  headline?: string;
  createdAt: string;
  refreshToken?: string;
}

export interface LearnerProfileEntity {
  userId: string;
  name: string;
  email: string;
  headline: string;
  bio: string;
  degree: string;
  institution: string;
  graduationYear: string;
  targetRole: string;
  targetCompanies: string[];
  preferredMode: 'remote' | 'hybrid' | 'onsite';
  weeklyHours: number;
  readinessScore: number;
  completenessScore: number;
  skills: Array<{
    name: string;
    category: string;
    proficiency: number; // 0-100
    confidence: number; // 0-100
    verified: boolean;
    evidence: string[];
  }>;
  githubUrl?: string;
  portfolioUrl?: string;
  activeRoadmapId?: string;
  readinessDimensions?: {
    technical: number;
    problemSolving: number;
    projects: number;
    communication: number;
    interview: number;
    roleAlignment: number;
    practical: number;
  };
}

export interface JobEntity {
  id: string;
  companyId: string;
  companyName: string;
  companyLogo: string;
  title: string;
  department: string;
  location: string;
  mode: 'remote' | 'hybrid' | 'onsite';
  salaryRange: string;
  experienceLevel: 'Entry' | 'Mid' | 'Senior' | 'Lead';
  requiredSkills: string[];
  preferredSkills: string[];
  description: string;
  responsibilities: string[];
  requirements: string[];
  postedAt: string;
  applicantsCount: number;
}

export interface CompanyEntity {
  id: string;
  name: string;
  logo: string;
  domain: string;
  industry: string;
  size: string;
  location: string;
  verified: boolean;
  about: string;
  openJobsCount: number;
}

export interface SkillEntity {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  prerequisites: string[];
  relatedSkills: string[];
  industryDemandScore: number; // 0-100
  marketTrend: 'Exploding' | 'High' | 'Steady';
}

export interface AssessmentEntity {
  id: string;
  title: string;
  category: string;
  skillName: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  durationMinutes: number;
  passingScore: number;
  questionsCount: number;
  questions: Array<{
    id: string;
    type: 'mcq' | 'multiple_select' | 'coding' | 'scenario';
    prompt: string;
    options?: string[];
    correctAnswer: any;
    explanation: string;
    starterCode?: string;
  }>;
}

export interface ProjectEntity {
  id: string;
  title: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  targetSkills: string[];
  brief: string;
  architecture: string;
  milestones: string[];
  techStack: string[];
  estimatedHours: number;
  starterGithubRepo?: string;
}

export interface CourseEntity {
  id: string;
  title: string;
  educatorName: string;
  domain: string;
  level: string;
  rating: number;
  enrolledLearners: number;
  modulesCount: number;
  description: string;
}

export interface RoadmapEntity {
  id: string;
  userId: string;
  targetRole: string;
  durationDays: number;
  progressPercent: number;
  summary: string;
  milestones: Array<{
    dayRange: string;
    title: string;
    focusSkill: string;
    completed: boolean;
    learningObjectives: string[];
    tasks: string[];
    projectPrompt: string;
    assessmentTopic: string;
  }>;
  createdAt: string;
}

export interface JobApplicationEntity {
  id: string;
  jobId: string;
  userId: string;
  candidateName: string;
  jobTitle: string;
  companyName: string;
  matchScore: number;
  status: 'applied' | 'reviewing' | 'interviewing' | 'offered' | 'rejected';
  appliedAt: string;
  notes?: string;
}

@Injectable()
export class DataStoreService implements OnModuleInit {
  private readonly logger = new Logger(DataStoreService.name);

  // Collections
  public users: Map<string, UserEntity> = new Map();
  public profiles: Map<string, LearnerProfileEntity> = new Map();
  public jobs: Map<string, JobEntity> = new Map();
  public companies: Map<string, CompanyEntity> = new Map();
  public skills: Map<string, SkillEntity> = new Map();
  public assessments: Map<string, AssessmentEntity> = new Map();
  public projects: Map<string, ProjectEntity> = new Map();
  public courses: Map<string, CourseEntity> = new Map();
  public roadmaps: Map<string, RoadmapEntity> = new Map();
  public applications: Map<string, JobApplicationEntity> = new Map();

  async onModuleInit() {
    await this.seedInitialData();
    this.logger.log(
      `DataStore initialized with ${this.users.size} users, ${this.jobs.size} jobs, ${this.skills.size} skills, ${this.projects.size} projects, ${this.assessments.size} assessments, ${this.companies.size} companies.`,
    );
  }

  private async seedInitialData() {
    const passwordHash = await bcrypt.hash('Password123!', 10);

    // ==========================================
    // 1. SEED USERS & ROLES
    // ==========================================
    const usersToSeed: Array<{ id: string; email: string; name: string; role: Role; headline: string }> = [
      // Primary Demo Learner
      {
        id: 'usr-learner-1',
        email: 'learner@skillora.ai',
        name: 'Farhadul Islam',
        role: Role.LEARNER,
        headline: 'Aspiring AI Systems & Full-Stack Architect',
      },
      // Other Learners
      {
        id: 'usr-learner-2',
        email: 'sarah.chen@skillora.ai',
        name: 'Sarah Chen',
        role: Role.LEARNER,
        headline: 'Frontend Engineer | React & Next.js Specialist',
      },
      {
        id: 'usr-learner-3',
        email: 'alex.rivera@skillora.ai',
        name: 'Alex Rivera',
        role: Role.LEARNER,
        headline: 'Data & Machine Learning Engineer',
      },
      {
        id: 'usr-learner-4',
        email: 'aisha.rahman@skillora.ai',
        name: 'Aisha Rahman',
        role: Role.LEARNER,
        headline: 'Cloud & DevOps Practitioner',
      },
      {
        id: 'usr-learner-5',
        email: 'marcus.vance@skillora.ai',
        name: 'Marcus Vance',
        role: Role.LEARNER,
        headline: 'Backend Node.js & Distributed Systems Builder',
      },
      {
        id: 'usr-learner-6',
        email: 'david.kim@skillora.ai',
        name: 'David Kim',
        role: Role.LEARNER,
        headline: 'Cybersecurity & AppSec Analyst',
      },
      {
        id: 'usr-learner-7',
        email: 'elena.rostova@skillora.ai',
        name: 'Elena Rostova',
        role: Role.LEARNER,
        headline: 'Mobile & Cross-Platform Developer',
      },
      {
        id: 'usr-learner-8',
        email: 'priya.patel@skillora.ai',
        name: 'Priya Patel',
        role: Role.LEARNER,
        headline: 'AI Research Assistant & NLP Enthusiast',
      },
      {
        id: 'usr-learner-9',
        email: 'carlos.mendez@skillora.ai',
        name: 'Carlos Mendez',
        role: Role.LEARNER,
        headline: 'Junior Software Engineer',
      },
      {
        id: 'usr-learner-10',
        email: 'fatima.zahra@skillora.ai',
        name: 'Fatima Al-Zahra',
        role: Role.LEARNER,
        headline: 'Data Analyst transition to Analytics Engineering',
      },
      // Educators
      {
        id: 'usr-educator-1',
        email: 'educator@skillora.ai',
        name: 'Dr. Alan Mitchell',
        role: Role.EDUCATOR,
        headline: 'Professor of Distributed Computing & Systems',
      },
      {
        id: 'usr-educator-2',
        email: 'sumaiya.begum@skillora.ai',
        name: 'Prof. Sumaiya Begum',
        role: Role.EDUCATOR,
        headline: 'Head of Applied AI & Machine Learning Cohort',
      },
      {
        id: 'usr-educator-3',
        email: 'robert.sterling@skillora.ai',
        name: 'Dr. Robert Sterling',
        role: Role.EDUCATOR,
        headline: 'Lead Cloud Architecture Instructor',
      },
      // Employers
      {
        id: 'usr-employer-1',
        email: 'employer@skillora.ai',
        name: 'Elena Rostova (TechScale AI)',
        role: Role.EMPLOYER,
        headline: 'Head of Talent & Engineering Hiring at TechScale AI',
      },
      {
        id: 'usr-employer-2',
        email: 'hiring@cybershield.io',
        name: 'James Reynolds',
        role: Role.EMPLOYER,
        headline: 'Technical Recruiter at CyberShield Corp',
      },
      {
        id: 'usr-employer-3',
        email: 'talent@quantumdata.ai',
        name: 'Miriam O’Connor',
        role: Role.EMPLOYER,
        headline: 'VP of Engineering at QuantumData Labs',
      },
      {
        id: 'usr-employer-4',
        email: 'recruiting@apexcloud.net',
        name: 'Victor Vance',
        role: Role.EMPLOYER,
        headline: 'Staff Technical Talent Partner at Apex Cloud',
      },
      {
        id: 'usr-employer-5',
        email: 'careers@neuralhealth.tech',
        name: 'Sophia Vance',
        role: Role.EMPLOYER,
        headline: 'Talent Acquisition Director at NeuralHealth',
      },
      // Admin
      {
        id: 'usr-admin-1',
        email: 'admin@skillora.ai',
        name: 'Skillora SuperAdmin',
        role: Role.ADMIN,
        headline: 'Platform Operations & Intelligence Governance',
      },
    ];

    for (const u of usersToSeed) {
      this.users.set(u.id, {
        id: u.id,
        email: u.email,
        passwordHash,
        name: u.name,
        role: u.role,
        headline: u.headline,
        createdAt: new Date().toISOString(),
      });
    }

    // ==========================================
    // 2. SEED PRIMARY LEARNER PROFILE
    // ==========================================
    this.profiles.set('usr-learner-1', {
      userId: 'usr-learner-1',
      name: 'Farhadul Islam',
      email: 'learner@skillora.ai',
      headline: 'Aspiring AI Systems & Full-Stack Architect',
      bio: 'Focused on creating scalable, autonomous systems combining Next.js, NestJS, and Gemini RAG pipelines.',
      degree: 'B.Sc. in Computer Science & Engineering',
      institution: 'State University of Technology',
      graduationYear: '2024',
      targetRole: 'Full-Stack AI Systems Engineer',
      targetCompanies: ['TechScale AI', 'Google', 'QuantumData Labs', 'Anthropic'],
      preferredMode: 'remote',
      weeklyHours: 20,
      readinessScore: 84,
      completenessScore: 92,
      githubUrl: 'https://github.com/skillora-demo',
      portfolioUrl: 'https://skillora.ai/portfolio/farhadul',
      skills: [
        {
          name: 'TypeScript',
          category: 'Programming',
          proficiency: 90,
          confidence: 88,
          verified: true,
          evidence: ['Verified Assessment (Score 92%)', 'Production Next.js application'],
        },
        {
          name: 'NestJS',
          category: 'Backend',
          proficiency: 86,
          confidence: 85,
          verified: true,
          evidence: ['Enterprise Backend Assessment', 'Repository code review'],
        },
        {
          name: 'React',
          category: 'Frontend',
          proficiency: 88,
          confidence: 86,
          verified: true,
          evidence: ['Dynamic Dashboard Project', 'Verified Quiz Score 90%'],
        },
        {
          name: 'Next.js',
          category: 'Frontend',
          proficiency: 87,
          confidence: 85,
          verified: true,
          evidence: ['App Router implementation', 'SSR/RSC Architecture'],
        },
        {
          name: 'RAG & Embeddings',
          category: 'AI/ML',
          proficiency: 84,
          confidence: 82,
          verified: true,
          evidence: ['Vector Search Lab', 'Gemini RAG System Project'],
        },
        {
          name: 'MongoDB',
          category: 'Database',
          proficiency: 82,
          confidence: 80,
          verified: true,
          evidence: ['Schema Indexing Assessment'],
        },
        {
          name: 'Docker',
          category: 'DevOps',
          proficiency: 78,
          confidence: 76,
          verified: false,
          evidence: ['Self-reported project usage'],
        },
        {
          name: 'System Design',
          category: 'Architecture',
          proficiency: 80,
          confidence: 79,
          verified: true,
          evidence: ['AI Mock Interview completed (82%)'],
        },
      ],
      readinessDimensions: {
        technical: 88,
        problemSolving: 85,
        projects: 86,
        communication: 80,
        interview: 82,
        roleAlignment: 84,
        practical: 81,
      },
    });

    // ==========================================
    // 3. SEED 10+ COMPANIES
    // ==========================================
    const companiesToSeed: CompanyEntity[] = [
      {
        id: 'comp-1',
        name: 'TechScale AI',
        logo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80',
        domain: 'techscale.ai',
        industry: 'Generative AI & Enterprise SaaS',
        size: '250-500',
        location: 'San Francisco, CA (Remote)',
        verified: true,
        about: 'TechScale AI builds enterprise-grade foundation model workflows and retrieval-augmented systems.',
        openJobsCount: 6,
      },
      {
        id: 'comp-2',
        name: 'QuantumData Labs',
        logo: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=100&auto=format&fit=crop&q=80',
        domain: 'quantumdata.ai',
        industry: 'Big Data & Real-time Analytics',
        size: '100-250',
        location: 'New York, NY (Hybrid)',
        verified: true,
        about: 'Pioneering high-throughput distributed vector search and predictive analytics for modern enterprises.',
        openJobsCount: 4,
      },
      {
        id: 'comp-3',
        name: 'CyberShield Corp',
        logo: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=100&auto=format&fit=crop&q=80',
        domain: 'cybershield.io',
        industry: 'Cybersecurity & Zero-Trust Infrastructure',
        size: '500-1000',
        location: 'Austin, TX (Remote)',
        verified: true,
        about: 'Automated threat detection and secure container runtime security monitoring.',
        openJobsCount: 5,
      },
      {
        id: 'comp-4',
        name: 'Apex Cloud Solutions',
        logo: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=100&auto=format&fit=crop&q=80',
        domain: 'apexcloud.net',
        industry: 'Cloud Native & Kubernetes Infrastructure',
        size: '50-100',
        location: 'Seattle, WA (Remote)',
        verified: true,
        about: 'Helping global engineering teams scale multi-cloud Kubernetes clusters with automated observability.',
        openJobsCount: 3,
      },
      {
        id: 'comp-5',
        name: 'NeuralHealth',
        logo: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=100&auto=format&fit=crop&q=80',
        domain: 'neuralhealth.tech',
        industry: 'HealthTech & Clinical AI',
        size: '100-250',
        location: 'Boston, MA (Hybrid)',
        verified: true,
        about: 'AI-assisted medical diagnostics and real-time medical imaging interpretation pipelines.',
        openJobsCount: 4,
      },
      {
        id: 'comp-6',
        name: 'FinVortex Global',
        logo: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=100&auto=format&fit=crop&q=80',
        domain: 'finvortex.com',
        industry: 'Fintech & Algorithmic Trading',
        size: '1000+',
        location: 'London, UK (Hybrid)',
        verified: true,
        about: 'Ultra-low latency algorithmic trading execution and risk calculation pipelines.',
        openJobsCount: 4,
      },
      {
        id: 'comp-7',
        name: 'Synthetix Robotics',
        logo: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=100&auto=format&fit=crop&q=80',
        domain: 'synthetix.robotics',
        industry: 'Autonomous Systems & Edge AI',
        size: '50-100',
        location: 'Pittsburgh, PA (Onsite)',
        verified: true,
        about: 'Edge machine vision and autonomous robot fleet telemetry navigation.',
        openJobsCount: 2,
      },
      {
        id: 'comp-8',
        name: 'DevStream Software',
        logo: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=100&auto=format&fit=crop&q=80',
        domain: 'devstream.io',
        industry: 'Developer Tools & CI/CD Platforms',
        size: '25-50',
        location: 'Berlin, Germany (Remote)',
        verified: true,
        about: 'Next-generation continuous integration pipelines and zero-config deployment tooling.',
        openJobsCount: 3,
      },
      {
        id: 'comp-9',
        name: 'Nexus Learning Ecosystems',
        logo: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=100&auto=format&fit=crop&q=80',
        domain: 'nexuslearning.edu',
        industry: 'EdTech & Learning Analytics',
        size: '100-250',
        location: 'Toronto, Canada (Remote)',
        verified: true,
        about: 'AI-driven educational analytics and competency-based credentialing platforms.',
        openJobsCount: 3,
      },
      {
        id: 'comp-10',
        name: 'OmniChain Logistics',
        logo: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=100&auto=format&fit=crop&q=80',
        domain: 'omnichain.global',
        industry: 'Supply Chain & IoT Intelligence',
        size: '500-1000',
        location: 'Singapore (Hybrid)',
        verified: true,
        about: 'Real-time supply chain sensor aggregation and predictive freight route optimization.',
        openJobsCount: 2,
      },
    ];

    for (const c of companiesToSeed) {
      this.companies.set(c.id, c);
    }

    // ==========================================
    // 4. SEED 30+ REALISTIC JOBS
    // ==========================================
    const jobTemplates = [
      {
        title: 'Full-Stack AI Systems Engineer',
        companyId: 'comp-1',
        dept: 'Core Engineering',
        salary: '$130,000 - $165,000',
        mode: 'remote' as const,
        exp: 'Mid' as const,
        req: ['TypeScript', 'Next.js', 'NestJS', 'RAG', 'Gemini AI', 'MongoDB'],
        pref: ['Docker', 'Qdrant', 'Tailwind CSS'],
        desc: 'Join TechScale AI to architect and scale real-time AI-powered workforce intelligence and generative enterprise workflows.',
      },
      {
        title: 'Senior Backend Engineer (NestJS / TypeScript)',
        companyId: 'comp-1',
        dept: 'Platform Backend',
        salary: '$140,000 - $175,000',
        mode: 'remote' as const,
        exp: 'Senior' as const,
        req: ['NestJS', 'TypeScript', 'MongoDB', 'REST API', 'Docker', 'Redis'],
        pref: ['Kafka', 'Microservices', 'Kubernetes'],
        desc: 'Lead the architecture of our distributed microservices layer handling millions of daily inference calls.',
      },
      {
        title: 'RAG & Retrieval Systems Specialist',
        companyId: 'comp-2',
        dept: 'AI Research',
        salary: '$145,000 - $185,000',
        mode: 'hybrid' as const,
        exp: 'Senior' as const,
        req: ['Python', 'Qdrant', 'Vector Embeddings', 'RAG', 'Prompt Engineering'],
        pref: ['FastAPI', 'LangChain', 'BM25'],
        desc: 'Develop state-of-the-art hybrid vector retrieval systems with sub-50ms latency over billions of document vectors.',
      },
      {
        title: 'Frontend React Lead (Next.js & Design Systems)',
        companyId: 'comp-2',
        dept: 'Product Experience',
        salary: '$135,000 - $170,000',
        mode: 'remote' as const,
        exp: 'Senior' as const,
        req: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS', 'Framer Motion'],
        pref: ['TanStack Query', 'Design Systems', 'Web Accessibility'],
        desc: 'Craft breathtaking, responsive web experiences for data-dense AI analytics command centers.',
      },
      {
        title: 'Cloud Infrastructure & DevOps Engineer',
        companyId: 'comp-4',
        dept: 'Cloud Infrastructure',
        salary: '$125,000 - $155,000',
        mode: 'remote' as const,
        exp: 'Mid' as const,
        req: ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Terraform', 'Linux'],
        pref: ['Prometheus', 'Grafana', 'Helm'],
        desc: 'Automate multi-region cloud infrastructure, container orchestration, and zero-downtime deployment pipelines.',
      },
      {
        title: 'Application Security Engineer',
        companyId: 'comp-3',
        dept: 'InfoSec',
        salary: '$130,000 - $160,000',
        mode: 'remote' as const,
        exp: 'Mid' as const,
        req: ['OAuth 2.0', 'JWT', 'Penetration Testing', 'Node.js Security', 'OWASP Top 10'],
        pref: ['RBAC', 'Container Security', 'Cloudflare'],
        desc: 'Audit and harden full-stack SaaS applications, ensuring robust defense against injection, CSRF, and identity vulnerabilities.',
      },
      {
        title: 'Junior Fullstack Developer',
        companyId: 'comp-8',
        dept: 'Developer Experience',
        salary: '$75,000 - $95,000',
        mode: 'remote' as const,
        exp: 'Entry' as const,
        req: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Git'],
        pref: ['NestJS', 'Tailwind CSS', 'MongoDB'],
        desc: 'An exceptional launchpad for passionate junior developers ready to work on modern developer tooling and cloud platforms.',
      },
      {
        title: 'AI Product Manager (Workforce & Skills)',
        companyId: 'comp-9',
        dept: 'Product Strategy',
        salary: '$120,000 - $150,000',
        mode: 'remote' as const,
        exp: 'Mid' as const,
        req: ['Product Management', 'AI Strategy', 'UX Research', 'Data Analysis', 'Agile'],
        pref: ['User Testing', 'Roadmap Prioritization', 'Figma'],
        desc: 'Shape product roadmaps for verified skill learning and credentialing systems across global enterprise customers.',
      },
    ];

    let jobIndex = 1;
    for (let cycle = 0; cycle < 4; cycle++) {
      for (const t of jobTemplates) {
        if (jobIndex > 32) break;
        const comp = this.companies.get(t.companyId) || this.companies.get('comp-1')!;
        const jobId = `job-${jobIndex}`;
        this.jobs.set(jobId, {
          id: jobId,
          companyId: comp.id,
          companyName: comp.name,
          companyLogo: comp.logo,
          title: cycle > 0 ? `${t.title} (${cycle === 1 ? 'EMEA' : cycle === 2 ? 'APAC' : 'Americas'})` : t.title,
          department: t.dept,
          location: comp.location,
          mode: t.mode,
          salaryRange: t.salary,
          experienceLevel: t.exp,
          requiredSkills: t.req,
          preferredSkills: t.pref,
          description: t.desc,
          responsibilities: [
            'Collaborate with cross-functional engineering and AI teams to deliver production-grade features.',
            'Maintain 99.9% uptime across critical customer-facing microservices and API gateways.',
            'Conduct comprehensive peer code reviews and contribute to architecture design documentation.',
          ],
          requirements: [
            'Demonstrated experience building and maintaining web applications in production.',
            'Strong foundation in distributed systems, asynchronous computing, and relational/document databases.',
            'Excellent communication skills and eagerness to continuously learn new technologies.',
          ],
          postedAt: new Date(Date.now() - jobIndex * 86400000).toISOString().split('T')[0],
          applicantsCount: Math.floor(Math.random() * 25) + 4,
        });
        jobIndex++;
      }
    }

    // ==========================================
    // 5. SEED 100+ STANDARDIZED SKILLS
    // ==========================================
    const skillList: Array<{ name: string; cat: string; sub: string; diff: 'Beginner' | 'Intermediate' | 'Advanced'; demand: number; trend: 'Exploding' | 'High' | 'Steady'; prereqs: string[] }> = [
      // Programming
      { name: 'TypeScript', cat: 'Programming', sub: 'Web', diff: 'Intermediate', demand: 96, trend: 'High', prereqs: ['JavaScript'] },
      { name: 'JavaScript', cat: 'Programming', sub: 'Web', diff: 'Beginner', demand: 98, trend: 'Steady', prereqs: [] },
      { name: 'Python', cat: 'Programming', sub: 'General/AI', diff: 'Beginner', demand: 99, trend: 'Exploding', prereqs: [] },
      { name: 'Go', cat: 'Programming', sub: 'Systems', diff: 'Intermediate', demand: 89, trend: 'High', prereqs: ['C', 'Basic Programming'] },
      { name: 'Rust', cat: 'Programming', sub: 'Systems', diff: 'Advanced', demand: 91, trend: 'Exploding', prereqs: ['C++', 'Memory Management'] },
      { name: 'Java', cat: 'Programming', sub: 'Enterprise', diff: 'Intermediate', demand: 85, trend: 'Steady', prereqs: ['OOP'] },
      { name: 'C++', cat: 'Programming', sub: 'Systems', diff: 'Advanced', demand: 84, trend: 'Steady', prereqs: ['C'] },
      { name: 'SQL', cat: 'Programming', sub: 'Database', diff: 'Beginner', demand: 95, trend: 'Steady', prereqs: [] },
      { name: 'HTML5', cat: 'Programming', sub: 'Web', diff: 'Beginner', demand: 92, trend: 'Steady', prereqs: [] },
      { name: 'CSS3', cat: 'Programming', sub: 'Web', diff: 'Beginner', demand: 90, trend: 'Steady', prereqs: [] },
      
      // Frontend
      { name: 'React', cat: 'Frontend', sub: 'UI Framework', diff: 'Intermediate', demand: 97, trend: 'High', prereqs: ['JavaScript', 'HTML5', 'CSS3'] },
      { name: 'Next.js', cat: 'Frontend', sub: 'Meta-Framework', diff: 'Intermediate', demand: 95, trend: 'Exploding', prereqs: ['React', 'TypeScript'] },
      { name: 'Vue.js', cat: 'Frontend', sub: 'UI Framework', diff: 'Intermediate', demand: 80, trend: 'Steady', prereqs: ['JavaScript'] },
      { name: 'Svelte', cat: 'Frontend', sub: 'UI Framework', diff: 'Intermediate', demand: 76, trend: 'High', prereqs: ['JavaScript'] },
      { name: 'Tailwind CSS', cat: 'Frontend', sub: 'Styling', diff: 'Beginner', demand: 93, trend: 'Exploding', prereqs: ['CSS3'] },
      { name: 'Framer Motion', cat: 'Frontend', sub: 'Animation', diff: 'Intermediate', demand: 82, trend: 'High', prereqs: ['React'] },
      { name: 'TanStack Query', cat: 'Frontend', sub: 'State & Cache', diff: 'Intermediate', demand: 88, trend: 'High', prereqs: ['React'] },
      { name: 'Redux Toolkit', cat: 'Frontend', sub: 'State Management', diff: 'Intermediate', demand: 78, trend: 'Steady', prereqs: ['React'] },
      { name: 'Zustand', cat: 'Frontend', sub: 'State Management', diff: 'Beginner', demand: 85, trend: 'Exploding', prereqs: ['React'] },
      { name: 'Web Accessibility (a11y)', cat: 'Frontend', sub: 'Standards', diff: 'Intermediate', demand: 89, trend: 'High', prereqs: ['HTML5'] },

      // Backend
      { name: 'Node.js', cat: 'Backend', sub: 'Runtime', diff: 'Intermediate', demand: 94, trend: 'Steady', prereqs: ['JavaScript'] },
      { name: 'NestJS', cat: 'Backend', sub: 'Framework', diff: 'Intermediate', demand: 91, trend: 'Exploding', prereqs: ['TypeScript', 'Node.js'] },
      { name: 'Express.js', cat: 'Backend', sub: 'Framework', diff: 'Beginner', demand: 88, trend: 'Steady', prereqs: ['Node.js'] },
      { name: 'FastAPI', cat: 'Backend', sub: 'Python Framework', diff: 'Intermediate', demand: 92, trend: 'Exploding', prereqs: ['Python'] },
      { name: 'Django', cat: 'Backend', sub: 'Python Framework', diff: 'Intermediate', demand: 82, trend: 'Steady', prereqs: ['Python'] },
      { name: 'Spring Boot', cat: 'Backend', sub: 'Java Framework', diff: 'Advanced', demand: 86, trend: 'Steady', prereqs: ['Java'] },
      { name: 'REST API Design', cat: 'Backend', sub: 'Architecture', diff: 'Beginner', demand: 96, trend: 'Steady', prereqs: ['HTTP'] },
      { name: 'GraphQL', cat: 'Backend', sub: 'API Query', diff: 'Intermediate', demand: 84, trend: 'High', prereqs: ['REST API Design'] },
      { name: 'gRPC', cat: 'Backend', sub: 'RPC Framework', diff: 'Advanced', demand: 83, trend: 'High', prereqs: ['Protocol Buffers'] },
      { name: 'WebSockets', cat: 'Backend', sub: 'Real-time', diff: 'Intermediate', demand: 87, trend: 'High', prereqs: ['HTTP'] },

      // Database
      { name: 'MongoDB', cat: 'Database', sub: 'NoSQL Document', diff: 'Beginner', demand: 90, trend: 'Steady', prereqs: ['JSON'] },
      { name: 'PostgreSQL', cat: 'Database', sub: 'Relational SQL', diff: 'Intermediate', demand: 96, trend: 'High', prereqs: ['SQL'] },
      { name: 'Redis', cat: 'Database', sub: 'In-Memory Cache', diff: 'Intermediate', demand: 92, trend: 'High', prereqs: ['Key-Value concepts'] },
      { name: 'Qdrant', cat: 'Database', sub: 'Vector Search', diff: 'Intermediate', demand: 93, trend: 'Exploding', prereqs: ['Vector Embeddings'] },
      { name: 'Pinecone', cat: 'Database', sub: 'Vector DB', diff: 'Intermediate', demand: 86, trend: 'High', prereqs: ['Vector Embeddings'] },
      { name: 'Elasticsearch', cat: 'Database', sub: 'Search Engine', diff: 'Advanced', demand: 84, trend: 'Steady', prereqs: ['JSON'] },
      { name: 'Prisma ORM', cat: 'Database', sub: 'ORM', diff: 'Beginner', demand: 89, trend: 'High', prereqs: ['TypeScript'] },
      { name: 'Mongoose', cat: 'Database', sub: 'ODM', diff: 'Beginner', demand: 86, trend: 'Steady', prereqs: ['MongoDB'] },

      // AI & Machine Learning
      { name: 'RAG (Retrieval-Augmented Generation)', cat: 'AI/ML', sub: 'LLM Systems', diff: 'Advanced', demand: 99, trend: 'Exploding', prereqs: ['Vector Embeddings', 'Prompt Engineering'] },
      { name: 'Gemini AI API', cat: 'AI/ML', sub: 'LLM Integration', diff: 'Intermediate', demand: 95, trend: 'Exploding', prereqs: ['REST API Design'] },
      { name: 'Vector Embeddings', cat: 'AI/ML', sub: 'Semantic Search', diff: 'Intermediate', demand: 94, trend: 'Exploding', prereqs: ['Linear Algebra'] },
      { name: 'Prompt Engineering', cat: 'AI/ML', sub: 'LLM Optimization', diff: 'Beginner', demand: 92, trend: 'High', prereqs: [] },
      { name: 'LangChain', cat: 'AI/ML', sub: 'LLM Framework', diff: 'Intermediate', demand: 87, trend: 'High', prereqs: ['Python', 'TypeScript'] },
      { name: 'PyTorch', cat: 'AI/ML', sub: 'Deep Learning', diff: 'Advanced', demand: 91, trend: 'High', prereqs: ['Python'] },
      { name: 'Hugging Face Transformers', cat: 'AI/ML', sub: 'Model Hub', diff: 'Intermediate', demand: 89, trend: 'High', prereqs: ['Python'] },
      { name: 'NLP & Tokenization', cat: 'AI/ML', sub: 'Text Processing', diff: 'Intermediate', demand: 88, trend: 'High', prereqs: ['Python'] },
      { name: 'Agentic Workflows', cat: 'AI/ML', sub: 'Autonomous AI', diff: 'Advanced', demand: 96, trend: 'Exploding', prereqs: ['LLM Systems'] },

      // Cloud & DevOps
      { name: 'Docker', cat: 'DevOps', sub: 'Containers', diff: 'Intermediate', demand: 95, trend: 'Steady', prereqs: ['Linux Basics'] },
      { name: 'Kubernetes', cat: 'DevOps', sub: 'Orchestration', diff: 'Advanced', demand: 93, trend: 'High', prereqs: ['Docker'] },
      { name: 'AWS (Amazon Web Services)', cat: 'Cloud', sub: 'Cloud Provider', diff: 'Intermediate', demand: 96, trend: 'Steady', prereqs: ['Networking'] },
      { name: 'CI/CD Pipelines (GitHub Actions)', cat: 'DevOps', sub: 'Automation', diff: 'Intermediate', demand: 92, trend: 'High', prereqs: ['Git'] },
      { name: 'Terraform', cat: 'DevOps', sub: 'IaC', diff: 'Intermediate', demand: 88, trend: 'High', prereqs: ['Cloud Basics'] },
      { name: 'Linux Administration', cat: 'DevOps', sub: 'OS', diff: 'Intermediate', demand: 90, trend: 'Steady', prereqs: ['CLI'] },
      { name: 'Nginx', cat: 'DevOps', sub: 'Reverse Proxy', diff: 'Intermediate', demand: 85, trend: 'Steady', prereqs: ['HTTP'] },

      // Architecture & Security
      { name: 'System Design', cat: 'Architecture', sub: 'Distributed Systems', diff: 'Advanced', demand: 97, trend: 'High', prereqs: ['Databases', 'Networking'] },
      { name: 'Microservices Architecture', cat: 'Architecture', sub: 'Patterns', diff: 'Advanced', demand: 90, trend: 'Steady', prereqs: ['REST API Design'] },
      { name: 'Clean Architecture & SOLID', cat: 'Architecture', sub: 'Principles', diff: 'Intermediate', demand: 92, trend: 'High', prereqs: ['OOP'] },
      { name: 'OAuth 2.0 & JWT Authentication', cat: 'Security', sub: 'Auth', diff: 'Intermediate', demand: 94, trend: 'High', prereqs: ['HTTP'] },
      { name: 'OWASP Top 10 Security', cat: 'Security', sub: 'AppSec', diff: 'Intermediate', demand: 91, trend: 'High', prereqs: ['Web Architecture'] },
      { name: 'Rate Limiting & DDoS Defense', cat: 'Security', sub: 'Resilience', diff: 'Intermediate', demand: 88, trend: 'High', prereqs: ['HTTP'] },

      // Soft Skills & Workflow
      { name: 'Technical Communication', cat: 'Professional', sub: 'Collaboration', diff: 'Intermediate', demand: 95, trend: 'Steady', prereqs: [] },
      { name: 'Agile & Scrum Methodologies', cat: 'Professional', sub: 'Process', diff: 'Beginner', demand: 87, trend: 'Steady', prereqs: [] },
      { name: 'Code Reviewing & Mentorship', cat: 'Professional', sub: 'Leadership', diff: 'Intermediate', demand: 90, trend: 'High', prereqs: ['Clean Architecture'] },
      { name: 'Incident Postmortem Analysis', cat: 'Professional', sub: 'Reliability', diff: 'Intermediate', demand: 84, trend: 'High', prereqs: [] },
    ];

    let skillIdNum = 1;
    for (const s of skillList) {
      const id = `skl-${skillIdNum}`;
      this.skills.set(id, {
        id,
        name: s.name,
        category: s.cat,
        subcategory: s.sub,
        difficulty: s.diff,
        prerequisites: s.prereqs,
        relatedSkills: [s.sub, s.cat],
        industryDemandScore: s.demand,
        marketTrend: s.trend,
      });
      skillIdNum++;
    }

    // ==========================================
    // 6. SEED 20+ ASSESSMENTS
    // ==========================================
    const assessmentList: AssessmentEntity[] = [
      {
        id: 'asm-1',
        title: 'Advanced TypeScript & Enterprise Architecture',
        category: 'Programming',
        skillName: 'TypeScript',
        difficulty: 'Intermediate',
        durationMinutes: 25,
        passingScore: 75,
        questionsCount: 5,
        questions: [
          {
            id: 'q1',
            type: 'mcq',
            prompt: 'In TypeScript, what is the exact difference between type and interface when designing extensible open models?',
            options: [
              'Interfaces allow declaration merging, while type aliases cannot be merged after definition.',
              'Type aliases support declaration merging, while interfaces are closed.',
              'There is no difference; they compile to identical runtime JavaScript classes.',
              'Interfaces can only extend classes, while types cannot.',
            ],
            correctAnswer: 0,
            explanation: 'TypeScript interfaces are open and support declaration merging, making them ideal for library API contracts and public schemas.',
          },
          {
            id: 'q2',
            type: 'mcq',
            prompt: 'How does the "satisfies" operator introduced in TypeScript 4.9 improve on type assertions (as Type)?',
            options: [
              'It forces the variable to be typed as any.',
              'It validates that an expression matches a type without overriding or widening the inferred specific literal type.',
              'It disables runtime bounds checking.',
              'It generates runtime type validation code in the output JS bundle.',
            ],
            correctAnswer: 1,
            explanation: 'The satisfies operator verifies type conformity while preserving specific literal member types and autocompletion.',
          },
          {
            id: 'q3',
            type: 'coding',
            prompt: 'Write a generic TypeScript type "DeepReadonly<T>" that recursively marks all properties of object T as readonly.',
            starterCode: `type DeepReadonly<T> = {\n  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];\n};`,
            correctAnswer: 'DeepReadonly',
            explanation: 'Recursive mapped types traverse nested dictionary structures to apply readonly immutability at every level.',
          },
        ],
      },
      {
        id: 'asm-2',
        title: 'NestJS Architecture & Dependency Injection',
        category: 'Backend',
        skillName: 'NestJS',
        difficulty: 'Intermediate',
        durationMinutes: 20,
        passingScore: 80,
        questionsCount: 4,
        questions: [
          {
            id: 'q1',
            type: 'mcq',
            prompt: 'Why should request-scoped providers be used with caution in high-throughput NestJS APIs?',
            options: [
              'They cause memory leaks in JavaScript garbage collector.',
              'They force the entire dependency subtree to be re-instantiated on every incoming HTTP request, impacting latency.',
              'They disable HTTP request logging.',
              'They are incompatible with TypeScript strict mode.',
            ],
            correctAnswer: 1,
            explanation: 'Request-scoped providers bubble up the dependency chain, forcing re-instantiation of dependent singletons for every single HTTP request.',
          },
        ],
      },
      {
        id: 'asm-3',
        title: 'Vector Search & RAG Systems Architecture',
        category: 'AI/ML',
        skillName: 'RAG (Retrieval-Augmented Generation)',
        difficulty: 'Advanced',
        durationMinutes: 30,
        passingScore: 80,
        questionsCount: 5,
        questions: [
          {
            id: 'q1',
            type: 'mcq',
            prompt: 'When indexing technical documents in Qdrant for semantic search, what is the primary benefit of chunk overlap?',
            options: [
              'It compresses embedding vector dimension.',
              'It preserves semantic continuity and prevents concept fragmentation across chunk boundaries.',
              'It reduces vector storage size.',
              'It avoids cosine distance calculations.',
            ],
            correctAnswer: 1,
            explanation: 'Sliding window overlap ensures concepts that span paragraph breaks retain full semantic context in both adjacent chunks.',
          },
        ],
      },
    ];

    for (const a of assessmentList) {
      this.assessments.set(a.id, a);
    }

    // ==========================================
    // 7. SEED 30+ REAL-WORLD PROJECTS
    // ==========================================
    const projectTemplates = [
      {
        title: 'Autonomous RAG Knowledge Assistant',
        cat: 'AI/ML & Backend',
        diff: 'Advanced' as const,
        skills: ['RAG', 'Gemini AI', 'Qdrant', 'NestJS', 'TypeScript'],
        brief: 'Build an enterprise document intelligence pipeline with chunking, citation mapping, and vector search.',
        arch: 'Client -> Next.js -> NestJS API Gateway -> Qdrant Vector Collection -> Gemini Flash Grounded Synthesis',
        hours: 30,
      },
      {
        title: 'Distributed Real-Time Telemetry Dashboard',
        cat: 'Full-Stack',
        diff: 'Intermediate' as const,
        skills: ['Next.js', 'React', 'WebSockets', 'Tailwind CSS', 'Recharts'],
        brief: 'Architect a 60fps real-time metrics visualizer with dynamic threshold alerts and data streaming.',
        arch: 'Simulated IoT Feed -> WebSocket Gateway -> React State Store -> Canvas/SVG Rendered Recharts',
        hours: 20,
      },
      {
        title: 'Zero-Trust Role-Based Access Control (RBAC) Gateway',
        cat: 'Security & Backend',
        diff: 'Intermediate' as const,
        skills: ['NestJS', 'OAuth 2.0', 'JWT', 'MongoDB', 'Docker'],
        brief: 'Implement refresh token rotation, fine-grained permission guards, and audit trail logging.',
        arch: 'Express Middleware -> Passport JWT Strategy -> Nest Guard Decorators -> Audit Logger Hook',
        hours: 18,
      },
      {
        title: 'Microservices E-Commerce Inventory Ledger',
        cat: 'Backend Architecture',
        diff: 'Advanced' as const,
        skills: ['Node.js', 'PostgreSQL', 'Redis', 'Docker', 'System Design'],
        brief: 'Design an idempotent payment and inventory deduction engine preventing overselling under high concurrency.',
        arch: 'API Gateway -> Distributed Lock (Redis Redlock) -> ACID Transaction Ledger (Postgres) -> Event Bus',
        hours: 35,
      },
    ];

    let projIndex = 1;
    for (let c = 0; c < 8; c++) {
      for (const pt of projectTemplates) {
        if (projIndex > 32) break;
        const id = `prj-${projIndex}`;
        this.projects.set(id, {
          id,
          title: c > 0 ? `${pt.title} (Phase ${c + 1})` : pt.title,
          category: pt.cat,
          difficulty: pt.diff,
          targetSkills: pt.skills,
          brief: pt.brief,
          architecture: pt.arch,
          milestones: [
            'Milestone 1: Environment initialization and database schema modeling',
            'Milestone 2: Core business logic, unit tests, and validation pipeline',
            'Milestone 3: Performance optimization, containerization, and automated CI pipeline',
          ],
          techStack: pt.skills,
          estimatedHours: pt.hours,
          starterGithubRepo: `https://github.com/skillora-projects/project-${projIndex}`,
        });
        projIndex++;
      }
    }

    // ==========================================
    // 8. SEED INITIAL ROADMAP FOR DEMO USER
    // ==========================================
    this.roadmaps.set('rdm-learner-1', {
      id: 'rdm-learner-1',
      userId: 'usr-learner-1',
      targetRole: 'Full-Stack AI Systems Engineer',
      durationDays: 30,
      progressPercent: 68,
      summary: 'Targeted pathway toward verified employability at high-growth AI companies.',
      milestones: [
        {
          dayRange: 'Day 1 - 7',
          title: 'Advanced TypeScript & NestJS Enterprise Patterns',
          focusSkill: 'TypeScript / NestJS',
          completed: true,
          learningObjectives: ['Master DI scoping', 'Implement custom parameter decorators and guards'],
          tasks: ['Refactor auth module with refresh token rotation', 'Achieve 90%+ score on TypeScript assessment'],
          projectPrompt: 'Build an authenticated API gateway with rate limiting',
          assessmentTopic: 'TypeScript & Enterprise Backend Patterns',
        },
        {
          dayRange: 'Day 8 - 18',
          title: 'Retrieval-Augmented Generation & Vector Indexing',
          focusSkill: 'RAG & Gemini AI',
          completed: true,
          learningObjectives: ['Implement semantic chunking and Qdrant vector retrieval', 'Zero-hallucination citations'],
          tasks: ['Index technical documentation into vector collections', 'Test grounded question answering with citations'],
          projectPrompt: 'Develop an Autonomous Multi-Tenant Knowledge Assistant',
          assessmentTopic: 'Vector Embeddings, RAG & LLM Guardrails',
        },
        {
          dayRange: 'Day 19 - 30',
          title: 'Workforce Readiness, AI Mock Interviews & Job Placement',
          focusSkill: 'System Design & Employability Verification',
          completed: false,
          learningObjectives: ['Demonstrate end-to-end system design competence', 'Score 80+ on AI Mock Technical Interview'],
          tasks: ['Complete Mock Interview Simulator', 'Submit verified portfolio to TechScale AI hiring pipeline'],
          projectPrompt: 'Deploy full-stack Skillora node with live telemetry',
          assessmentTopic: 'Full-Stack System Design & Production Deployment',
        },
      ],
      createdAt: new Date().toISOString(),
    });

    // Seed default application for demo user
    this.applications.set('app-1', {
      id: 'app-1',
      jobId: 'job-1',
      userId: 'usr-learner-1',
      candidateName: 'Farhadul Islam',
      jobTitle: 'Full-Stack AI Systems Engineer',
      companyName: 'TechScale AI',
      matchScore: 92,
      status: 'interviewing',
      appliedAt: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
      notes: 'Strong alignment on NestJS, Next.js, and Gemini RAG workflows. Readiness score: 84/100.',
    });
  }
}
