import React, { useState } from 'react';
import { TEAM_MEMBERS, ROADMAP_MILESTONES } from '../data/team';
import { Cpu, GitBranch, FileCode, Copy, Check, CheckCircle2, Database, Layers } from 'lucide-react';

const BACKEND_FILES: { [key: string]: { path: string; language: string; content: string; author: string } } = {
  'pom.xml': {
    path: 'backend/pom.xml',
    language: 'xml',
    author: 'Team 6',
    content: `<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.3.5</version>
</parent>
<properties>
    <java.version>21</java.version>
    <graalvm.version>24.1.1</graalvm.version>
</properties>
<!-- Dependencies: spring-boot-starter-webflux, spring-boot-starter-data-r2dbc,
     r2dbc-postgresql, graalvm polyglot + js-community + python-community,
     springdoc-openapi-starter-webflux-ui, actuator, reactor-test -->`
  },
  'GraalPolyglotExecutionService.java': {
    path: 'backend/src/main/java/com/infotact/polyglotmesh/execution/GraalPolyglotExecutionService.java',
    language: 'java',
    author: 'Hariom Verma (feature/hariom-graalvm-core)',
    content: `@Service
public class GraalPolyglotExecutionService {
    private final Engine sharedEngine = Engine.newBuilder()
        .option("engine.WarnInterpreterOnly", "false")
        .build();
    private final Semaphore concurrencyLimiter;

    public ExecutionResponse execute(ExecutionRequest request) {
        // Fresh Context per request via SandboxPolicyFactory
        // HostAccess.NONE, IOAccess.NONE, EnvironmentAccess.NONE, ResourceLimits
        // Watchdog ScheduledExecutor invokes context.close(true) on timeout
    }
}`
  },
  'CrossLanguageInteropService.java': {
    path: 'backend/src/main/java/com/infotact/polyglotmesh/execution/CrossLanguageInteropService.java',
    language: 'java',
    author: 'Hariom & Naveen',
    content: `// Module E: Direct Java-to-Guest Interop without JSON round-trips
Map<String, Object> javaPricingMap = new LinkedHashMap<>();
javaPricingMap.put("basePrice", request.getBasePrice());
javaPricingMap.put("quantity", request.getQuantity());
javaPricingMap.put("taxRate", request.getTaxRate());
javaPricingMap.put("discountTier", request.getDiscountTier());
javaPricingMap.put("currency", request.getCurrency());

try (Context context = sandboxPolicyFactory.buildRestrictedInteropContext(graalLang, interopEngine)) {
    context.getBindings(graalLang).putMember("pricingData", ProxyObject.fromMap(javaPricingMap));
    Value resultValue = context.eval(graalLang, guestScript);
    // Extract transformed map directly from GraalVM Value members
}`
  },
  'ExecutionController.java': {
    path: 'backend/src/main/java/com/infotact/polyglotmesh/controller/ExecutionController.java',
    language: 'java',
    author: 'Naveen (feature/naveen-backend-api)',
    content: `@PostMapping("/execute")
public Mono<ResponseEntity<ExecutionResponse>> executeCode(@Valid @RequestBody ExecutionRequest request) {
    return Mono.fromCallable(() -> executionService.execute(request))
            .subscribeOn(Schedulers.boundedElastic())
            .flatMap(response -> historyService.recordExecution(request.getCode(), response)
                    .onErrorResume(err -> Mono.empty())
                    .thenReturn(ResponseEntity.ok(response)));
}`
  },
  'schema.sql': {
    path: 'backend/src/main/resources/schema.sql',
    language: 'sql',
    author: 'Trishul (feature/trishul-database)',
    content: `CREATE TABLE IF NOT EXISTS saved_scripts (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    language VARCHAR(32) NOT NULL CHECK (language IN ('javascript', 'python', 'ruby')),
    code TEXT NOT NULL,
    description VARCHAR(300),
    author VARCHAR(80),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS execution_history (
    id VARCHAR(64) PRIMARY KEY,
    language VARCHAR(32) NOT NULL,
    code_snippet VARCHAR(512) NOT NULL,
    output TEXT,
    error TEXT,
    execution_time_ms BIGINT NOT NULL,
    success BOOLEAN NOT NULL,
    engine VARCHAR(100),
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`
  }
};

export const ArchitectureView: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<string>('CrossLanguageInteropService.java');
  const [copied, setCopied] = useState(false);

  const currentFile = BACKEND_FILES[selectedFile];

  const handleCopy = () => {
    if (currentFile) {
      navigator.clipboard.writeText(currentFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* 4-Layer Architecture Diagram */}
      <div>
        <div className="mb-4">
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-sky-400" />
            <span>PolyglotMesh System Architecture & Data Flow</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Java 21 + Spring Boot 3.3 WebFlux + GraalVM Polyglot 24.1 + R2DBC PostgreSQL + Docker isolation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 bg-slate-900/80 rounded-xl border border-slate-800 text-xs">
          <div className="p-4 bg-slate-950/70 rounded-lg border border-slate-800 space-y-1.5">
            <div className="text-indigo-400 font-bold">01. React 19 + Monaco IDE</div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Multi-language editor (JavaScript, Python, Ruby), live syntax diagnostic markers, script sidebar, performance metrics & interop UI.
            </p>
          </div>

          <div className="p-4 bg-slate-950/70 rounded-lg border border-slate-800 space-y-1.5">
            <div className="text-sky-400 font-bold">02. Spring WebFlux Gateway</div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Reactive REST endpoints (<code className="font-mono text-slate-300">/execute</code>, <code className="font-mono text-slate-300">/scripts</code>, <code className="font-mono text-slate-300">/interop</code>, <code className="font-mono text-slate-300">/history</code>), Jakarta Bean validation, OpenAPI 3 docs.
            </p>
          </div>

          <div className="p-4 bg-slate-950/70 rounded-lg border border-slate-800 space-y-1.5">
            <div className="text-emerald-400 font-bold">03. GraalVM Polyglot Sandbox</div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Per-request isolated <code className="font-mono text-slate-300">Context</code> with <code className="font-mono text-slate-300">HostAccess.NONE</code>, <code className="font-mono text-slate-300">IOAccess.NONE</code>, statement limits, Semaphore concurrency guard & watchdog timer.
            </p>
          </div>

          <div className="p-4 bg-slate-950/70 rounded-lg border border-slate-800 space-y-1.5">
            <div className="text-purple-400 font-bold">04. R2DBC PostgreSQL Store</div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Non-blocking persistence for <code className="font-mono text-slate-300">saved_scripts</code> and paginated <code className="font-mono text-slate-300">execution_history</code> inside Docker Compose.
            </p>
          </div>
        </div>
      </div>

      {/* Backend Source Code Inspector */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <FileCode className="w-5 h-5 text-indigo-400" />
              <span>Java 21 & PostgreSQL Source Inspector</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">Inspect key backend files located in <code className="font-mono text-slate-300">/backend</code>.</p>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copy Snippet</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 bg-slate-900/80 rounded-xl border border-slate-800 overflow-hidden">
          <div className="p-3 bg-slate-950/90 border-r border-slate-800 space-y-1">
            {Object.keys(BACKEND_FILES).map(fileName => (
              <button
                key={fileName}
                onClick={() => setSelectedFile(fileName)}
                className={`w-full text-left px-2.5 py-2 rounded-md text-xs font-mono transition-colors flex items-center justify-between ${
                  selectedFile === fileName
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <span className="truncate">{fileName}</span>
                <span className="text-[10px] text-slate-500 font-sans ml-2">{BACKEND_FILES[fileName].language}</span>
              </button>
            ))}
          </div>

          <div className="lg:col-span-3 flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs">
              <span className="font-mono text-slate-300">{currentFile?.path}</span>
              <span className="text-slate-500">{currentFile?.author}</span>
            </div>
            <pre className="p-4 bg-[#080c16] text-slate-200 font-mono text-xs overflow-auto max-h-[420px] leading-relaxed">
              {currentFile?.content}
            </pre>
          </div>
        </div>
      </div>

      {/* Native Image Compatibility & 4-Week Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="p-5 bg-slate-900/80 rounded-xl border border-slate-800 space-y-3 text-xs">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>Week 3: GraalVM Native Image Compatibility Notes</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            A <code className="text-slate-300 font-mono">native</code> Maven profile (<code className="font-mono text-slate-300">mvn package -Pnative</code>) is configured in <code className="font-mono text-slate-300">backend/pom.xml</code>. However, compiling GraalPy + Spring Data R2DBC + Netty together into a single AOT binary requires GraalVM 24+ JDK native toolchain and reachability metadata for R2DBC PostgreSQL proxies. Therefore, the JVM container (<code className="font-mono text-slate-300">ghcr.io/graalvm/jdk-community:21</code>) is designated as the primary production runtime so execution correctness is never sacrificed.
          </p>
        </div>

        <div className="p-5 bg-slate-900/80 rounded-xl border border-slate-800 space-y-3 text-xs">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Database className="w-4 h-4 text-sky-400" />
            <span>PostgreSQL + Docker Local Setup</span>
          </div>
          <pre className="p-3 bg-slate-950 rounded border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto">
{`# Start PostgreSQL 16 + Hardened Java 21 Backend
docker compose up --build -d

# Run Backend Tests Locally (H2 R2DBC PostgreSQL Mode)
cd backend
mvn test -Dspring.profiles.active=test`}
          </pre>
        </div>
      </div>

      {/* Team 6 Branch Structure */}
      <div>
        <div className="mb-4">
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-emerald-400" />
            <span>Team 6 Branch Plan</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Feature branch isolation for <code className="font-mono text-slate-300">github.com/madhavgorla/polyglotmesh</code>.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TEAM_MEMBERS.map(member => (
            <div key={member.name} className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white font-semibold text-sm">{member.name}</h4>
                  <span className="text-xs text-indigo-400">{member.role}</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">{member.prNumber}</span>
              </div>

              <div className="p-2 bg-slate-950 rounded border border-slate-800 font-mono text-[11px] text-slate-300 flex items-center gap-2">
                <GitBranch className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate">{member.branch}</span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">{member.ownership}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 4-Week Milestones */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-white">4-Week Implementation Milestones</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ROADMAP_MILESTONES.map(m => (
            <div key={m.week} className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-indigo-400 font-bold">{m.week}: {m.title}</span>
                <span className="text-emerald-400 font-mono">{m.status}</span>
              </div>
              <ul className="space-y-1 text-slate-300">
                {m.deliverables.map((d, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
