# TestPilot

TestPilot is the foundation of an autonomous QA platform: a developer workspace, an application API, and an independent browser testing engine that collects inspectable evidence. Milestone 1 implements local smoke testing. AI scenario generation, persistence, and multi-tenant operation are future work.

## Stack and layout

- Frontend: Next.js 16.4.2, React 19.3, TypeScript strict mode, App Router, Tailwind CSS 4, ESLint.
- API: Java 21, Spring Boot 4.1.1, Maven 3.9.11 wrapper, Web MVC, Validation, Actuator, JPA/PostgreSQL dependencies (persistence disabled).
- Browser worker: Node.js, TypeScript strict mode, Playwright Chromium, tsx, Node's built-in test runner.
- All dependencies are free/open source; no hosted services or paid integrations are required.

```text
apps/
  web/src/{app,components}/        Workspace UI and reusable components
  api/src/main/java/com/testpilot/api/
    config/ controller/ dto/       HTTP configuration, endpoints, response types
    exception/                    Centralized ProblemDetail error handling
    service/ entity/ repository/   Reserved boundaries; no persistence yet
workers/browser-worker/
  src/{browser,collectors,config,reports,runners,security,types}/
  test/                           Deterministic tests and live smoke test
  artifacts/<run-id>/              Generated report.json and screenshot.png (ignored)
infrastructure/                    Optional local PostgreSQL Compose file
scripts/                          Cross-platform development helpers
docs/                             Security notes and verification record
  legacy-api-scaffold/             Preserved original Gradle scaffold, not active
```

The pre-existing Next.js scaffold was relocated from `workers/browser-worker/web` to `apps/web`. The existing API was migrated from Gradle to Maven without recreating Git or discarding the original build files.

## Prerequisites

- Node.js 22.13+ (Node 24 LTS recommended) and npm.
- JDK 21; set `JAVA_HOME` to the JDK directory and put its `bin` on `PATH`.
- Internet access for first-time npm/Maven/Chromium installation and the optional live smoke test.
- An OS supported by Playwright. On Linux, install browser system dependencies with `npx playwright install --with-deps chromium` from the worker directory.
- Docker and PostgreSQL are **not needed** for this milestone.

On Windows, use `npm.cmd` if PowerShell policy blocks `npm.ps1`. Wrapper commands use `mvnw.cmd` on Windows and `sh ./mvnw` on macOS/Linux; no global Maven installation is needed.

## Install

From the repository root:

```sh
npm run install:apps
npm run browsers:install
```

Each Node application has its own committed lockfile. Root scripts have no dependencies. The Maven wrapper downloads Maven/dependencies on first use; its official script-only distribution needs no wrapper JAR.

Configure the browser worker explicitly:

```sh
cd workers/browser-worker
cp .env.example .env
cd ../..
```

PowerShell equivalent: `Copy-Item workers/browser-worker/.env.example workers/browser-worker/.env`.
The example authorizes only `example.com`. Missing or empty `AUTHORIZED_HOSTS` denies all targets. The worker loads `.env` from its working directory using Node's built-in loader; existing process environment variables take precedence. Root npm scripts run it from `workers/browser-worker`.

## Start the applications

Use separate terminals from the repository root:

```sh
npm run dev:web
npm run dev:api
```

- Frontend: http://localhost:3000 — Overview, Projects, Test Runs, Settings. These are initial UI pages with honest empty states; no project creation, saved settings, or API-backed run history yet.
- API: http://localhost:8080/api/health — `{"status":"UP","application":"testpilot-api","timestamp":"..."}`.
- Actuator: http://localhost:8080/actuator/health.

Equivalent commands inside the app directories:

```sh
# apps/web
npm run dev
# apps/api (macOS/Linux)
sh ./mvnw spring-boot:run
# apps/api (Windows PowerShell)
.\mvnw.cmd spring-boot:run
```

The API binds to `127.0.0.1` by default. CORS permits `http://localhost:3000` and `http://127.0.0.1:3000` for API GET/OPTIONS requests, without credentials. CORS is not authentication. Only Actuator health/info endpoints are exposed. JPA and PostgreSQL dependencies are present, but DataSource and Hibernate auto-configuration are explicitly excluded in `application.yml`; no database connections or entities are created.

## Run a browser smoke test

After copying the worker `.env.example`:

```sh
# From the root
npm run test:url -- https://example.com

# Or from workers/browser-worker
npm run test:url -- https://example.com
# Watch mode during worker development:
npm run dev -- https://example.com
# Compile and run the standalone JavaScript entry point:
npm run build
npm start -- https://example.com
```

The engine validates the initial HTTPS URL and exact hostname, launches headless Chromium in a fresh context, waits for the page load event, captures title/status and browser evidence, takes a full-page screenshot, closes the context/browser, and writes a JSON report. Browser console/page/request events are collected during that run only; delayed behavior after capture is not covered.

Each run creates `workers/browser-worker/artifacts/<UUID>/report.json` and, when capture succeeds, `screenshot.png`. Paths are printed as JSON. A failed navigation still generates a report and attempts a screenshot. Browser launch failures have a report with a null screenshot. Invalid inputs are rejected before launching or creating artifacts. Filesystem failures print a useful error and exit 2; a report cannot be guaranteed if its destination is unwritable.

Report fields include `url`, `finalUrl`, `title`, `statusCode`, `status`, `durationMs`, `consoleErrors`, `pageErrors`, `failedRequests`, `screenshotPath`, `timestamp`, `runId`, `errors` (with phase/message), and `droppedEvidenceCount`. Timestamps are UTC ISO-8601; screenshot paths are relative to the worker working directory. Titles and evidence messages are clipped at 4,000 characters and each evidence list at 200 entries; overflow entries increment `droppedEvidenceCount`.

| Status / exit | Meaning |
| --- | --- |
| `PASSED` / `0` | Navigation completed with HTTP 200–399 and required capture completed. This does **not** mean the site is bug-free. |
| `FAILED` / `1` | Navigation failed/timed out, returned no response, or returned an HTTP error. |
| `ERROR` / `2` | Invalid configuration/URL, browser setup, capture after successful navigation, cleanup, or filesystem failure. Invalid inputs/filesystem failures may have only CLI error output. |

Console errors, JavaScript exceptions, and failed network requests are evidence; they do not automatically fail the navigation assertion or become confirmed product defects. Failed requests cover transport failures, not every HTTP 4xx/5xx subresource response. A capture failure after failed navigation retains `FAILED` and records the additional error.

## Configuration

| Component / variable | Default / behavior |
| --- | --- |
| Worker `AUTHORIZED_HOSTS` | No default; exact comma-separated hostnames. Example file: `example.com`. No wildcards, URL schemes, paths, ports, or trailing dots. Subdomains need their own entries. |
| Worker `NAVIGATION_TIMEOUT_MS` | `30000` |
| Worker `CAPTURE_TIMEOUT_MS` | `10000` per title/screenshot capture |
| Worker `LAUNCH_TIMEOUT_MS` | `30000` for launch and page creation |
| Worker `ARTIFACTS_DIR` | `artifacts`, relative to the worker working directory |
| API `SERVER_ADDRESS` | `127.0.0.1` |
| API `SERVER_PORT` | `8080` |
| API `CORS_ALLOWED_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` |

Worker timeouts must be integer milliseconds from 1 to 120000. Only HTTPS on the default port 443 is accepted. URLs containing usernames/passwords are rejected. Use ASCII/punycode hostnames in the allowlist.

The frontend needs no environment variables yet. `apps/api/.env.example` documents API settings; Spring reads process environment variables, **not** `.env` automatically. For example, PowerShell: `$env:SERVER_PORT='8081'; npm run dev:api`; POSIX: `SERVER_PORT=8081 npm run dev:api`.

The existing `infrastructure/docker-compose.yml` is reserved for later database work. To run it optionally, copy `infrastructure/.env.example` to `infrastructure/.env`, set your own `POSTGRES_PASSWORD`, then run `docker compose -f infrastructure/docker-compose.yml up -d`. Its port is loopback-only. This does not enable API persistence.

## Build and test

From the repository root:

```sh
npm run lint:web
npm run typecheck
npm run build:web
npm run build:worker
npm run build:api
npm run test:worker
npm run test:smoke
```

`build:api` runs Maven `verify`, including backend tests. `npm test` runs worker and API tests; it does not invoke the live external smoke test. `npm run test:smoke` explicitly authorizes and visits `example.com`, checks its real title/status, and retains the screenshot/report.

Worker deterministic tests use real Chromium with locally intercepted HTTPS responses, so they require installed browsers but do not depend on external website availability. They cover URL validation, exact host authorization, report serialization/overwrite protection, successful capture with console/JS/network evidence, HTTP errors, navigation failures/timeouts, resource cleanup, and browser launch failure. Backend tests cover startup without a DataSource, health/Actuator, CORS, HTTP status preservation, validation, and safe error responses.

Production frontend startup after a successful build: `npm --prefix apps/web start`. Packaged backend startup: `java -jar apps/api/target/api-0.0.1-SNAPSHOT.jar`.

## Security and current limitations

Read [the worker security boundary](docs/security.md) before adding targets. A hostname allowlist alone does **not** protect against redirects, DNS changes/rebinding, subresource requests, or SSRF. Initial HTTPS validation does not guarantee redirected/subresource traffic stays HTTPS or authorized. Arbitrary public URL testing is **not safe** until network-level isolation and egress restrictions exist. Do not expose this worker as a service or run unknown targets in an environment containing credentials or private network access.

- No browser-to-API execution integration, project persistence, accounts, queues, AI, payments, or deployment.
- Basic navigation only; no exploration, assertions on application behavior, retries, trace capture, or multi-browser testing.
- Capture is best effort on failed/hostile pages; process termination or machine failure can prevent cleanup/reporting. Hard CPU/memory/disk/runtime quotas need an isolated worker environment.
- Artifacts can contain private page data, tokens in URLs, and untrusted text. They remain local and ignored by Git. Retention, redaction, secure serving, and access controls are future work.
- Dependency audit on 2026-10-22: production frontend dependencies had no reported advisories. The ESLint dependency chain has a high-severity `braces` recursion advisory with no compatible published fix. Do not run lint against untrusted glob patterns; track an upstream fix. See [verification notes](docs/milestone-1-verification.md).

## Next milestones

1. Add project and test-run persistence with database migrations, validated APIs, and dashboard read views; keep execution local while establishing network isolation and egress rules.
2. Add isolated execution, explicit redirect/subresource policy, resource limits, secure artifact storage/retention, and then controlled API-triggered runs.
3. Add scenario modeling, richer assertions and traces, followed by AI-assisted exploration and multi-tenant access controls.

Reference documentation: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), [Spring Boot requirements](https://docs.spring.io/spring-boot/system-requirements.html), [Playwright library](https://playwright.dev/docs/library).
