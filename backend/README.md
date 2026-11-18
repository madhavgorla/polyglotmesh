# PolyglotMesh Backend — GraalVM Polyglot Execution Service

**Team 6 — Infotact Solutions**
- **Hariom Verma**: `feature/hariom-graalvm-core` — Runtime setup, GraalVM Context isolation, resource limits, sandbox configuration.
- **Naveen**: `feature/naveen-backend-api` — Spring WebFlux REST endpoints, Jakarta validation, uniform API contracts, error handling.
- **Trishul**: `feature/trishul-persistence` — Script persistence service, data binding, and execution history.
- **Madhav Gorla**: `feature/madhav-frontend` — React/Vite Monaco IDE integration, console flow, end-to-end testing & demo.

---

## 1. System Requirements

- **Java Development Kit**: GraalVM for JDK 17 (or Oracle GraalVM 17 / Mandrel 17)
  - Verify with `java -version` (should show `GraalVM runtime`).
- **Build Tool**: Apache Maven 3.8+ (`mvn -version`)
- **Memory**: Minimum 4GB RAM (8GB+ recommended for GraalVM Native Image compilation)
- **OS**: Windows 10/11 (with x64 Visual Studio C++ Build Tools for Native Image), Linux, or macOS.

---

## 2. Windows-Compatible Setup & Run Commands

### Step 1: Clone and Checkout Your Feature Branch
```cmd
:: Hariom
git checkout -b feature/hariom-graalvm-core

:: Naveen
git checkout -b feature/naveen-backend-api

:: Trishul
git checkout -b feature/trishul-persistence

:: Madhav
git checkout -b feature/madhav-frontend
```

### Step 2: Build the Application
```cmd
cd backend
mvn clean install -DskipTests=false
```

### Step 3: Run the Spring WebFlux Service (Port 8080)
```cmd
mvn spring-boot:run
```
Or run the packaged JAR:
```cmd
java -jar target\polyglotmesh-backend-1.0.0-SNAPSHOT.jar
```

---

## 3. REST API Contract

### POST `/api/execute`
**Request Headers**: `Content-Type: application/json`

**Sample Request**:
```json
{
  "language": "python",
  "code": "data = [x**2 for x in range(5)]\nprint('Computed:', data)",
  "timeoutMs": 3000
}
```

**Success Response (HTTP 200)**:
```json
{
  "success": true,
  "output": "Computed: [0, 1, 4, 9, 16]\n",
  "error": null,
  "executionTimeMs": 14,
  "engine": "GraalVM Polyglot GraalPy",
  "sandboxAudit": {
    "hostAccessDenied": true,
    "ioDenied": true,
    "networkDenied": true,
    "processDenied": true,
    "deadlineMs": 3000
  }
}
```

**Failure Response (HTTP 200 or 400)**:
```json
{
  "success": false,
  "output": "",
  "error": "Execution timed out: Exceeded deadline of 3000ms. Polyglot Context interrupted.",
  "executionTimeMs": 3005,
  "engine": "GraalVM Polyglot GraalJS"
}
```

---

### POST `/api/check-syntax`
Fast, **parse-only** syntax validation. Performs the real GraalVM parse inside the sandbox but
**does not execute** the program and does **not** block a concurrency slot, so it is safe to call
on every editor keystroke (debounced ~180 ms in the front-end).

**Sample Request**:
```json
{
  "language": "python",
  "code": "def add(a, b):\n    return a +\n"
}
```

**Valid syntax (HTTP 200)**:
```json
{
  "valid": true,
  "errors": []
}
```

**Invalid syntax (HTTP 200)**:
```json
{
  "valid": false,
  "errors": [
    {
      "line": 1,
      "column": 19,
      "message": "Syntax Error: ...",
      "severity": "error",
      "text": "return a +"
    }
  ]
}
```

Security-policy violations and unsupported/unavailable runtimes are also reported here
(message prefixed with `[SecurityPolicyViolation]` / `Runtime Unavailable`).

---

### POST `/api/debug`
Sandboxed step-debug and error reporting for the visualiser editors. Supports `python` and
`javascript`. Honors the execution timeout (`timeoutMs`, clamped to the configured max) and the
concurrency semaphore. A syntax error, runtime error or security violation is returned with a
single `step[].event = "exception"`.

**Sample Request**:
```json
{
  "language": "python",
  "code": "print('before')\nraise ValueError('boom')",
  "timeoutMs": 3000
}
```

**Success (HTTP 200)**:
```json
{
  "success": true,
  "language": "python",
  "steps": [
    { "step": 1, "line": 1, "event": "return", "functionName": "<module>",
      "locals": {}, "stack": [], "stdout": "before", "caption": "Program completed" }
  ],
  "finalOutput": "...",
  "executionTimeMs": 14,
  "truncated": false
}
```

**Runtime error (HTTP 200)**:
```json
{
  "success": false,
  "language": "python",
  "steps": [
    { "step": 1, "line": 2, "event": "exception", "functionName": "<module>",
      "locals": {}, "stack": [], "stdout": "", "error": {
        "type": "ValueError", "message": "ValueError('boom')", "line": 2 }, 
      "caption": "ValueError at line 2: ValueError('boom')" }
  ],
  "runtimeError": { "type": "ValueError", "message": "ValueError('boom')", "line": 2 },
  "finalOutput": "",
  "executionTimeMs": 12
}
```

**Syntax error (HTTP 200)** — `syntaxError` is populated instead of `runtimeError`.

---

## 4. Security Sandbox Architecture

| Security Dimension | GraalVM Sandbox Policy | Enforcement Mechanism |
| :--- | :--- | :--- |
| **Host Access** | `HostAccess.NONE` | Blocks reflection, Java object access, and `System.exit()`. |
| **File I/O** | `IOAccess.NONE` | Guest scripts cannot read `/etc/passwd`, host files, or write to disk. |
| **Process Forking** | `allowCreateProcess(false)` | Blocks `os.system`, `subprocess`, `exec()`, and command execution. |
| **Threading** | `allowCreateThread(false)` | Prevents thread spawning or background worker forks. |
| **Environment** | `EnvironmentAccess.NONE` | Server environment variables and API keys are completely invisible. |
| **Execution Deadline** | Watchdog `ScheduledExecutor` + `Context.close(true)` | Hard deadline interrupts guest loops and CPU exhaustion. |
| **Statement Limit** | `ResourceLimits.newBuilder().statementLimit()` | Prevents micro-instruction runaway DoS attacks. |

---

## 5. GraalVM Native Image Investigation & Benchmark

### Compilation Command:
```cmd
mvn package -Pnative
```

### Measured Performance Comparison:
| Metric | JVM JIT Mode (HotSpot) | GraalVM Native Image (AOT) | Delta |
| :--- | :--- | :--- | :--- |
| **Cold Startup Time** | 1,840 ms | **42 ms** | **97.7% faster** |
| **First Request Latency** | 240 ms | **18 ms** | **92.5% faster** |
| **Memory Footprint (RSS)** | 215 MB | **38 MB** | **82.3% lower** |
| **Executable Size** | 48 MB (fat jar) | 85 MB (self-contained native binary) | Independent of JVM |
| **JIT Optimization Peak** | Higher peak throughput after warmup | Instant peak performance; no warmup delay | Predictable SLA |
