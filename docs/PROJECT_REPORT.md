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

---

## 5. Bug-Fix Log (Build Stabilisation Pass)

Dated **2025-11-14**. Fixes were applied so that `mvn clean install` completes with
`BUILD SUCCESS` and all 9 integration tests in `ExecutionControllerTest` pass.
No public API contract changed and no feature behaviour regressed.

| # | Area | Root cause | Fix | Owner impact |
|---|------|-----------|-----|--------------|
| 1 | Test DB | Production `schema.sql` uses PostgreSQL-only `TIMESTAMPTZ`/`NOW()` that the in-memory H2 test DB cannot parse → Spring context failed to load → 9/9 tests errored. | New `src/test/resources/schema-h2.sql` (H2-compatible) wired into the `test` profile via `application-test.yml`. | Persistence (`schema.sql`, entities) untouched. |
| 2 | GraalVM Sandbox | `SandboxPolicyFactory` sets experimental GraalJS option `js.load=false` without `allowExperimentalOptions(true)` → every JS execution threw (`Option 'js.load' is experimental…`). | Added `.allowExperimentalOptions(true)` to both the isolated and restricted interop `Context.Builder`s. Sandbox restrictions unchanged. | Core/sandbox config (`SandboxPolicyFactory.java`). |
| 3 | GraalPy Interop (Module E) | (a) GraalPy cannot subscript a `ProxyObject` map under `HostAccess.NONE` (`'foreign' object is not subscriptable`); (b) a Python `dict` exposes built-in methods as interop members, breaking the old result loop; (c) first-use GraalPy startup can exceed the 3 s default deadline. | Bind each pricing field as a native top-level scalar; read dict results via the hash-entry iterator (`Value.getHashEntriesIterator()`); pre-warm both Graal engines in `@BeforeAll`. | `CrossLanguageInteropService.java`, `ExecutionControllerTest.java`. |

**Summary for the team:** items 1–3 are confined to the backend and test resources.
Frontend teams (Madhav) and API consumers (Naveen) can treat the HTTP contract as stable.

### Ownership coordination note
These fixes were applied from **Hariom's sandbox/execution role** but necessarily span a
few team files (test DB config lives in Trishul/Naveen's territory; the interop service is
credited **Hariom & Naveen**; `ExecutionControllerTest` is shared testing). Going forward
the working rule is: **no member edits outside their own role's files without telling the
owner first.** The pre-existing fixes below should be reviewed and owned by the respective
team member, who may adjust them — if they choose to rewrite, that is welcome so long as
`mvn test` stays green. Otherwise we keep working from what is already in the tree.
