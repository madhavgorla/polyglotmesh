# PolyglotMesh — Final Review Presentation Outline

1. **Problem Statement & Assignment Scope**
   - Multi-language browser execution with strict untrusted-code isolation using Java 21, Spring WebFlux, GraalVM Polyglot, PostgreSQL, and React 19.
2. **System Architecture Walkthrough**
   - React 19 + Monaco Editor -> Spring WebFlux Reactive API -> `GraalPolyglotExecutionService` & `SandboxPolicyFactory` -> R2DBC PostgreSQL.
3. **Live Demo 1: IDE Workspace & Real-Time Syntax Diagnostics**
   - Language switching (JavaScript, Python, Ruby availability check), live red squiggle markers before Run, execution output & duration telemetry.
4. **Live Demo 2: Security Sandbox & Timeout Enforcement**
   - Host/process isolation test, unsupported language `400 Bad Request`, and infinite loop watchdog interruption.
5. **Live Demo 3: Cross-Language Pricing Map Interop (Module E)**
   - Java `Map` -> `ProxyObject.fromMap()` -> Python/JS transformation -> host retrieval without JSON round-trip.
6. **Live Demo 4: Script Persistence (CRUD) & Performance Dashboard**
   - Save, update, load, and delete scripts; inspect live metrics, paginated history, and reproducible guest vs HTTP latency benchmark.
7. **Native Image Investigation & Lessons Learned**
   - Compatibility trade-offs between HotSpot GraalVM JDK 21 and AOT Native Image with R2DBC + GraalPy.
