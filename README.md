# PolyglotMesh — GraalVM Multi-Language Runtime Sandbox

**Organization:** Infotact Solutions (Java Development Internship — Team 6)  
**Repository:** `https://github.com/madhavgorla/polyglotmesh`

PolyglotMesh is a full-stack, browser-based IDE and sandboxed code execution platform built with **Java 21, Spring Boot 3.3 (WebFlux), GraalVM Polyglot, PostgreSQL (R2DBC), React 19, Vite, and Monaco Editor**.

---

## 1. System Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  React 19 + Vite + Monaco Editor IDE (Frontend)                             │
│  - Left Sidebar: Saved Scripts CRUD + Language Selector (JS / Python / Ruby)│
│  - Monaco Editor: Real-time syntax diagnostic markers                       │
│  - Console Panel: stdout, stderr, executionId, duration, sandbox audit      │
│  - Views: IDE Workspace | Data Interop | Performance | Security & Tests     │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │ HTTP/JSON (POST /api/execute, /api/scripts,
                                    │ /api/interop/pricing, /api/history, /api/metrics)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Spring Boot 3.3 WebFlux Reactive API (Java 21)                             │
│  - ExecutionController / ScriptController / InteropController               │
│  - Jakarta Bean Validation + GlobalExceptionHandler + OpenAPI (/swagger-ui) │
│  - Schedulers.boundedElastic() + Semaphore Concurrency Limiter              │
└─────────────────────────┬───────────────────────────────┬───────────────────┘
                          │                               │
                          ▼                               ▼
┌─────────────────────────────────────┐   ┌───────────────────────────────────┐
│  GraalVM Polyglot Sandbox Engine    │   │  PostgreSQL 16 (R2DBC Reactive)   │
│  - Per-request Context              │   │  - saved_scripts                  │
│  - HostAccess.NONE, IOAccess.NONE   │   │  - execution_history              │
│  - EnvironmentAccess.NONE           │   └───────────────────────────────────┘
│  - ResourceLimits (statementLimit)  │
│  - Watchdog context.close(true)     │
│  - Runtimes: GraalJS, GraalPy,      │
│    optional TruffleRuby             │
└─────────────────────────────────────┘
```

---

## 2. Project Structure

```
polyglotmesh/
├── backend/
│   ├── Dockerfile
│   ├── pom.xml
│   └── src/
│       ├── main/java/com/infotact/polyglotmesh/
│       │   ├── config/         # OpenApiConfig, PolyglotProperties, WebFluxCorsConfig
│       │   ├── controller/     # ExecutionController, ScriptController, InteropController
│       │   ├── dto/            # ExecutionRequest, ExecutionResponse, ScriptRequest, InteropPricingRequest
│       │   ├── entity/         # SavedScriptEntity, ExecutionHistoryEntity
│       │   ├── exception/      # GlobalExceptionHandler, ResourceNotFoundException
│       │   ├── execution/      # GraalPolyglotExecutionService, CrossLanguageInteropService
│       │   ├── repository/     # SavedScriptRepository, ExecutionHistoryRepository
│       │   ├── security/       # SandboxPolicyFactory, CodeSecurityValidator
│       │   └── service/        # ScriptManagementService, ExecutionHistoryService
│       ├── main/resources/
│       │   ├── application.yml
│       │   └── schema.sql
│       └── test/
│           ├── java/com/infotact/polyglotmesh/ExecutionControllerTest.java
│           └── resources/application-test.yml
├── docs/
│   ├── PROJECT_REPORT.md
│   └── PRESENTATION_OUTLINE.md
├── src/                        # React 19 + TypeScript + Monaco IDE
│   ├── components/
│   ├── data/
│   ├── types/
│   ├── App.tsx
│   └── main.tsx
├── server.ts                   # Preview API + Vite dev server on port 3000
├── docker-compose.yml          # PostgreSQL 16 + Hardened Java 21 Backend
├── .env.example
└── package.json
```

---

## 3. Prerequisites & Setup (Windows PowerShell)

### Requirements
- **Java 21** (GraalVM Community JDK 21 recommended: `ghcr.io/graalvm/jdk-community:21`)
- **Maven 3.9+**
- **Node.js 20+** and `npm`
- **Docker Desktop** (for PostgreSQL 16 and hardened container execution)

### Option A: Run Preview Full-Stack IDE Locally (Port 3000)
```powershell
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

### Option B: Run PostgreSQL + Java 21 Spring WebFlux Backend via Docker Compose
```powershell
Copy-Item .env.example .env
# Edit .env to set your local PostgreSQL password
docker compose up --build -d
```
- Backend API: `http://localhost:8080`
- Swagger OpenAPI UI: `http://localhost:8080/swagger-ui.html`

### Option C: Run Java 21 Backend Directly with Maven
```powershell
cd backend
mvn test -Dspring.profiles.active=test
mvn spring-boot:run
```
> **Ruby Runtime Note:** By default, `backend/pom.xml` includes `js-community` and `python-community`. To include TruffleRuby when supported by your GraalVM distribution, run `mvn spring-boot:run -Pruby-runtime`. When Ruby is not installed, `POST /api/execute` with `"language": "ruby"` returns a clear runtime-unavailable message rather than simulating output.

---

## 4. API Documentation

### `POST /api/execute`
Request:
```json
{
  "language": "python",
  "code": "print('Hello from PolyglotMesh')",
  "timeoutMs": 3000
}
```
Response:
```json
{
  "success": true,
  "executionId": "exec-9f32a1b4",
  "language": "python",
  "output": "Hello from PolyglotMesh\n",
  "error": null,
  "executionTimeMs": 18,
  "engine": "GraalVM Polyglot (python)"
}
```

### `POST /api/interop/pricing` (Module E)
Java constructs a pricing `Map<String, Object>`, exposes it via `ProxyObject.fromMap()` directly to a restricted Python/JavaScript context, and returns the transformed map without JSON round-trips.

### Script Persistence & Telemetry Endpoints
- `GET /api/scripts` — List all saved scripts
- `GET /api/scripts/{id}` — Retrieve single script
- `POST /api/scripts` — Create script (`name`, `language`, `code`, `description`, `author`)
- `PUT /api/scripts/{id}` — Update existing script
- `DELETE /api/scripts/{id}` — Delete script
- `GET /api/history?page=0&size=10` — Paginated execution history
- `GET /api/metrics` — Aggregated counts, failure totals, average duration, and language distribution
- `GET /api/health` — Runtime status and per-language availability (`javascript`, `python`, `ruby`)

---

## 5. Security Sandbox & Limitations

1. **In-Process GraalVM Isolation**: Every request spawns a fresh `Context` with `HostAccess.NONE`, `IOAccess.NONE`, `EnvironmentAccess.NONE`, `allowNativeAccess(false)`, `allowCreateProcess(false)`, `allowCreateThread(false)`, and `ResourceLimits.statementLimit`.
2. **Termination Strategy & Limitations**: A scheduled watchdog invokes `context.close(true)` at the configured deadline. Because JVM thread interruption alone cannot stop native/CPU-bound loops, `docker-compose.yml` adds OS-level cgroup memory/CPU limits, `read_only: true`, `cap_drop: ALL`, and a non-root container user (`polyglot`).
3. **Never Claim Unverified Production Security**: Before exposing this IDE to untrusted public traffic, run each execution inside ephemeral isolated microVMs or gVisor containers.

---

## 6. GitHub Publishing Commands (Windows PowerShell)

```powershell
git remote add origin https://github.com/madhavgorla/polyglotmesh.git
git push -u origin main
git push origin feature/hariom-graalvm-core feature/naveen-backend-api feature/trishul-database feature/madhav-frontend
```
