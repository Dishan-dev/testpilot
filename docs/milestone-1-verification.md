# Milestone 1 verification

Verified locally on 2026-10-22 (Asia/Colombo), Windows, Node 24.19.0, and portable Eclipse Temurin JDK 21.0.12.1. The installed system JDK was Java 26; the API also passed its initial build/tests there with compilation targeting Java 21. A portable JDK 21 was downloaded into ignored `.tools/jdk21` to verify the requested runtime without changing system Java settings.

## Results

| Check | Result |
| --- | --- |
| Frontend `npm run lint`, `npm run typecheck` | Passed |
| Frontend `npm run build` | Passed; `/`, `/projects`, `/test-runs`, `/settings` prerendered |
| Frontend `npm run dev -- --hostname 127.0.0.1 --port 3000` | Started successfully |
| Browser UI verification | All four routes and active navigation passed, no console/page errors, no horizontal overflow at 390px |
| Worker `npm run typecheck`, `npm run build` | Passed, including test type checking |
| Worker `npm test` | 25 tests passed, 0 failures |
| Worker `npm run test:smoke` | 1 live test passed; example.com returned HTTP 200, title `Example Domain` |
| Root `npm run test:url -- https://unauthorized.test` | Rejected before launch with exit code 2 and useful authorization error |
| API `mvnw.cmd -B -ntp verify` | Passed on system JDK with `--release 21` |
| Root `npm run build:api`, `JAVA_HOME` set to portable JDK 21 | Passed; 9 API tests, 0 failures/errors |
| Packaged API started on JDK 21 | Started without PostgreSQL; `/api/health` and `/actuator/health` returned `UP` |
| API tests | No DataSource bean; CORS, 404/405 preservation, validation and safe 500 responses passed |
| Git ignore check | Worker `.env` and generated report ignored |
| Frontend `npm audit --omit=dev --json` | No reported production advisories |
| Frontend full `npm audit --json` | Five high-severity entries in one ESLint transitive dependency chain; see below |

Live run ID: `07de90ba-6d85-4c62-bcd6-d6fa27ea294f`. Its measured duration was 3289 ms; console errors, page errors, failed requests and execution errors were all empty. Artifacts (ignored, local to this checkout):

- `workers/browser-worker/artifacts/07de90ba-6d85-4c62-bcd6-d6fa27ea294f/report.json`
- `workers/browser-worker/artifacts/07de90ba-6d85-4c62-bcd6-d6fa27ea294f/screenshot.png`
- `artifacts/ui-verification/desktop.png`
- `artifacts/ui-verification/mobile.png`
- `.tools/api-java21-verify.log`

These are actual execution results, not fixture values. Deterministic worker tests separately fulfill/abort requests locally in real Chromium.

## Setup problems resolved

- Relocated the existing Next.js scaffold into `apps/web`; kept the original Gradle files under `docs/legacy-api-scaffold` when migrating to Maven. The old empty frontend directory was locked by another process; no source files remain in it.
- npm cache access and external downloads required execution outside the filesystem sandbox. The approved retries succeeded.
- Chromium could launch inside the sandbox but page creation stalled. Tests and UI verification passed outside that restriction with Chromium's own sandbox enabled.
- Added explicit deadlines for page creation/title capture, including best-effort screenshot capture independently of title capture.
- Apache's raw wrapper source contained unreplaced build placeholders; replaced it with the official released script-only wrapper distribution.
- `JAVA_HOME` was absent. Set it per verification process, then downloaded a portable JDK 21 for final verification. No global Java configuration changed.
- Fixed the Windows root API helper to invoke `.\mvnw.cmd` explicitly through `cmd.exe` using a fixed allowlisted Maven goal.

## Remaining dependency finding

`eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces` is affected by [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), stack exhaustion with deeply nested patterns. `npm view braces version` returned `3.0.3`, which is affected. npm suggested a major downgrade of `eslint-config-next` to 14.2.35; that incompatible change was not applied. This is development tooling; the production-only audit was clear. Track an upstream patch and do not pass untrusted glob expressions to lint tooling.

## Scope

The frontend, API and browser CLI intentionally remain independent. No UI-triggered browser execution or persistence exists to verify. Tests establish local milestone behavior, not SSRF safety or tenant isolation. See [security.md](security.md) for the unresolved network boundary and [README](../README.md) for reproducible setup/build/test commands.
