# PolyglotMesh — Internship Project Report

**Intern / Team:** Team 6 (Hariom Verma, Naveen, Trishul, Madhav Gorla)  
**Company:** Infotact Solutions  
**Project Title:** PolyglotMesh: GraalVM Multi-Language Runtime Sandbox

---

## 1. Executive Summary
PolyglotMesh provides a browser-based polyglot development workspace enabling users to write and execute JavaScript, Python, and Ruby code via a reactive Java 21 Spring WebFlux backend powered by the GraalVM Polyglot API, backed by PostgreSQL R2DBC persistence and React 19 + Monaco Editor.

## 2. Implemented Modules
- **Module A (Polyglot Code Editor):** Monaco Editor with language tabs (JavaScript, Python, Ruby), live AST syntax diagnostic markers (`setModelMarkers`), Run/Save/Update/Reset/Clear controls, and empty-input validation.
- **Module B & C (Execution Engine & WebFlux API):** Non-blocking REST API (`POST /api/execute`, `/api/health`, `/api/history`, `/api/metrics`, `/api/scripts/**`) backed by per-request isolated `Context` creation, concurrency semaphore, and OpenAPI docs.
- **Module D (Sandbox & Security):** `HostAccess.NONE`, `IOAccess.NONE`, `EnvironmentAccess.NONE`, disabled process/thread creation, 64KB payload cap, statement limit, watchdog timeout (`context.close(true)`), and Docker container hardening (`cap_drop: ALL`, `read_only: true`).
- **Module E (Cross-Language Data Exchange):** `CrossLanguageInteropService` binds a Java pricing `Map` directly to a restricted guest context via `ProxyObject.fromMap()` without JSON serialization/deserialization overhead.
- **Module F & G (Console & Performance Dashboard):** Separate stdout/stderr/sandbox/API inspector tabs, real computed KPIs, language breakdown, paginated history, and a live reproducible latency benchmark distinguishing guest execution time from HTTP round-trip latency.
- **Module H (Script Persistence):** PostgreSQL `schema.sql`, R2DBC reactive entities/repositories, and full CRUD endpoints.

## 3. GraalVM Native Image Investigation (Week 3)
A `native` Maven profile (`native-maven-plugin`) is provided in `backend/pom.xml`. Because GraalPy plus dynamic R2DBC PostgreSQL proxies require extensive reachability metadata and longer AOT build times, the primary supported production deployment uses the official `ghcr.io/graalvm/jdk-community:21` JVM container so execution correctness and runtime language compatibility are preserved.

## 4. Known Limitations
1. Ruby (`TruffleRuby`) requires the optional Maven `-Pruby-runtime` profile on a compatible GraalVM JDK; when absent, the API explicitly reports runtime unavailability rather than simulating execution.
2. In-process GraalVM `Context` restrictions must be paired with OS/container isolation (included in `docker-compose.yml`) before serving untrusted internet traffic.
