# PolyglotMesh — Team 6

A starter full-stack web IDE for running supported programming languages through GraalVM Polyglot. This ZIP is a **local starter scaffold** based on the project description and branch/ownership details supplied by the team. It is not a clone of a live GitHub repository, and the supplied commit hashes/PR numbers have not been verified or recreated as Git objects.

## Architecture

- `frontend/`: React 19 + Vite + Monaco Editor UI
- `backend/`: Java 21 + Spring Boot WebFlux REST API
- Execution: GraalVM Polyglot API with restrictive host/IO permissions
- Persistence: thread-safe in-memory script store and execution telemetry (resets on restart)

## Requirements

- JDK 21
- Maven 3.9+
- Node.js 20+ and npm
- GraalVM distribution/runtime matching the selected language artifacts

> **Language runtime note:** GraalJS and GraalPy availability depends on the installed GraalVM distribution and dependencies. Verify runtime compatibility before demoing. The default sample dependency includes the Polyglot API and JS language artifact; Python support may require additional GraalPy dependencies/runtime setup.

## Run locally

### Backend

```bash
cd backend
mvn spring-boot:run
```

Backend default URL: `http://localhost:8080`

### Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Vite default URL: `http://localhost:5173`

## API

`POST /api/execute`

```json
{"language":"js","code":"console.log('Hello from PolyglotMesh')"}
```

Example response:

```json
{"success":true,"output":"Hello from PolyglotMesh\n","error":null,"executionTimeMs":15}
```

Supported language IDs depend on the runtime installed. The UI currently offers JavaScript (`js`) and Python (`python`); Python requests return a clear error if GraalPy is unavailable.

## Important security limitations

This is a learning/internship starter, **not a production-safe public code execution service**. Host access and IO are restricted in the Polyglot context, but an in-process context plus request timeouts is not a complete security boundary for hostile code. Before exposing this service to untrusted users, isolate executions in separate processes/containers with OS-level CPU, memory, filesystem, network, and wall-clock limits, and conduct a security review. Do not claim sandbox safety without testing the exact runtime build and threat model.

## Team branch ownership (as supplied)

| Engineer | Branch | Ownership | Supplied feature commit |
|---|---|---|---|
| Hariom Verma | `feature/hariom-graalvm-core` | GraalVM execution core and sandbox controls | `ee12ab9` |
| Naveen | `feature/naveen-backend-api` | WebFlux API and validation | `ad50d9f` |
| Trishul | `feature/trishul-persistence` | In-memory script store and telemetry | `8038db5` |
| Madhav Gorla | `feature/madhav-frontend` | React/Monaco UI and diagnostics | `8e55b25` |

The supplied PR merge metadata is documented in `docs/github-branch-plan.md`. It is included as reference only; this ZIP does not fabricate repository history.

## Suggested Git workflow

```bash
git init -b main
git add .
git commit -m "chore: initialize PolyglotMesh starter"
git branch feature/hariom-graalvm-core
git branch feature/naveen-backend-api
git branch feature/trishul-persistence
git branch feature/madhav-frontend
```

These commands create local branches from the current snapshot; they do not recreate the original individual commits or pull requests. Push to your actual GitHub repository after reviewing and testing the code.
