import { TeamMember } from '../types';

export const TEAM_MEMBERS: TeamMember[] = [
  {
    name: 'Hariom Verma',
    role: 'GraalVM Core & Sandbox Lead',
    branch: 'feature/hariom-graalvm-core',
    ownership: 'GraalVM Polyglot Context isolation, HostAccess.NONE, IOAccess.NONE, resource limits, watchdog cancellation.',
    status: 'Ready for Merge',
    prNumber: 'PR #1'
  },
  {
    name: 'Naveen',
    role: 'Backend API Architect',
    branch: 'feature/naveen-backend-api',
    ownership: 'Spring WebFlux REST APIs, Jakarta Bean validation, InteropController, GlobalExceptionHandler, OpenAPI docs.',
    status: 'Ready for Merge',
    prNumber: 'PR #2'
  },
  {
    name: 'Trishul',
    role: 'Database & Persistence Specialist',
    branch: 'feature/trishul-database',
    ownership: 'PostgreSQL R2DBC schema, ScriptManagementService CRUD, paginated execution history & metrics repository.',
    status: 'Ready for Merge',
    prNumber: 'PR #3'
  },
  {
    name: 'Madhav Gorla',
    role: 'Frontend & IDE Architect',
    branch: 'feature/madhav-frontend',
    ownership: 'React 19 Monaco Editor IDE, real-time diagnostic markers, Performance Dashboard, Interop UI, testing & docs.',
    status: 'Ready for Merge',
    prNumber: 'PR #4'
  }
];

export const ROADMAP_MILESTONES = [
  {
    week: 'Week 1',
    title: 'Runtime Foundation & IDE',
    deliverables: [
      'Java 21, Spring Boot 3.3.5 WebFlux, Maven, and React 19 + Vite initialized',
      'GraalVM Polyglot Context proof-of-concept with JavaScript and Python',
      'Monaco Editor integrated with language selection and initial Run workflow'
    ],
    status: 'Completed'
  },
  {
    week: 'Week 2',
    title: 'Sandboxing, Execution UI & Interop',
    deliverables: [
      'Restricted execution context (HostAccess.NONE, IOAccess.NONE, process/thread/env denied)',
      'Input size caps (64KB), statement limits, concurrency semaphore, and watchdog timeout',
      'Cross-language Java-to-Guest data exchange using ProxyObject.fromMap()',
      'Console output/error display and real-time Monaco diagnostic markers'
    ],
    status: 'Completed'
  },
  {
    week: 'Week 3',
    title: 'Native Image & Performance Monitoring',
    deliverables: [
      'GraalVM Native Image Maven profile configured and compatibility risks documented',
      'Performance Dashboard with real computed execution stats and history',
      'Reproducible live benchmark comparing Guest Time vs HTTP Latency vs Warm Execution'
    ],
    status: 'Completed'
  },
  {
    week: 'Week 4',
    title: 'PostgreSQL Persistence & Final Deliverables',
    deliverables: [
      'PostgreSQL schema.sql, R2DBC entities, and full CRUD endpoints (/api/scripts)',
      'Docker Compose with hardened non-root runtime container',
      'Automated test suite, architecture diagrams, README, and GitHub publishing setup'
    ],
    status: 'Completed'
  }
];
