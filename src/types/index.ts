export type SolverLanguage = 'python' | 'javascript' | 'typescript' | 'java' | 'c' | 'cpp';
export type SupportedLanguage = SolverLanguage | 'ruby';

export interface ExecutionRequest {
  language: SupportedLanguage;
  code: string;
  timeoutMs?: number;
}

export interface SandboxAudit {
  hostAccessDenied: boolean;
  ioDenied: boolean;
  networkDenied: boolean;
  processDenied: boolean;
  environmentAccessDenied?: boolean;
  deadlineMs: number;
  statementLimit?: number;
}

export interface ExecutionResponse {
  success: boolean;
  executionId?: string;
  language?: string;
  output: string;
  error: string | null;
  executionTimeMs: number;
  engine?: string;
  sandboxAudit?: SandboxAudit;
}

export interface SavedScript {
  id: string;
  name: string;
  language: SupportedLanguage;
  code: string;
  createdAt?: string;
  updatedAt: string;
  author: string;
  description: string;
}

export interface ExecutionHistoryRecord {
  id: string;
  language: string;
  codeSnippet: string;
  output: string;
  error: string | null;
  executionTimeMs: number;
  success: boolean;
  timestamp: string;
  engine: string;
}

export interface PerformanceMetrics {
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  avgExecutionTimeMs: number;
  languageCounts: {
    python: number;
    javascript: number;
    typescript?: number;
    java?: number;
    c?: number;
    cpp?: number;
    ruby: number;
  };
  recentHistory: ExecutionHistoryRecord[];
}

export interface HealthStatus {
  status: string;
  platform: string;
  supportedLanguages: string[];
  runtimes: {
    javascript: boolean;
    typescript?: boolean;
    python: boolean;
    java?: boolean;
    c?: boolean;
    cpp?: boolean;
    ruby: boolean;
  };
  uptimeSeconds?: number;
  memoryUsageMb?: number;
}

export interface InteropPricingResponse {
  success: boolean;
  guestLanguage: string;
  inputPricingMap: {
    basePrice: number;
    quantity: number;
    taxRate: number;
    discountTier: string;
    currency: string;
  };
  transformedResult: Record<string, any> | null;
  error: string | null;
  executionTimeMs: number;
  interopMechanism: string;
}

export interface CodeTemplate {
  id: string;
  title: string;
  language: SupportedLanguage;
  category: 'Demo' | 'Security Sandbox' | 'Timeout Guard' | 'Algorithms';
  description: string;
  code: string;
}

export interface AutomatedTestCase {
  id: string;
  name: string;
  language: SupportedLanguage | 'haskell';
  description: string;
  code: string;
  expectedStatus: 'success' | 'error' | 'timeout' | 'rejected' | 'runtime_unavailable';
  expectedMatch: string;
}

export interface TeamMember {
  name: string;
  role: string;
  branch: string;
  ownership: string;
  status: 'In Review' | 'Completed' | 'Ready for Merge' | 'Tested';
  prNumber: string;
}

export interface DebugStackFrame {
  functionName: string;
  line: number;
  locals: Record<string, any>;
}

export interface DebugErrorInfo {
  type: string;
  message: string;
  line: number;
  column?: number;
}

export interface DebugStep {
  step: number;
  line: number;
  event: 'line' | 'call' | 'return' | 'exception' | 'complete';
  functionName: string;
  locals: Record<string, any>;
  stack: DebugStackFrame[];
  returnValue?: any;
  stdout: string;
  error?: DebugErrorInfo | null;
  caption: string;
}

export interface DebugResponse {
  success: boolean;
  language: SolverLanguage;
  steps: DebugStep[];
  syntaxError?: {
    line: number;
    column: number;
    message: string;
  } | null;
  runtimeError?: {
    type: string;
    message: string;
    line: number;
    stackTrace?: string;
  } | null;
  finalOutput: string;
  executionTimeMs: number;
  truncated?: boolean;
}
