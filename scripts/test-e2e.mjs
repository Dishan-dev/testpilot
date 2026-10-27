import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { chromium } from "../workers/browser-worker/node_modules/playwright/index.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const web = process.env.E2E_WEB_URL ?? "http://127.0.0.1:3000";
const api = process.env.WORKER_API_URL ?? "http://127.0.0.1:8080";
for (const value of [web, api]) {
  const url = new URL(value);
  assert.ok(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname), "E2E services must be loopback HTTP origins.");
}
assert.ok(process.env.WORKER_API_TOKEN?.length >= 32, "Set WORKER_API_TOKEN for the running API.");
const output = join(root, "artifacts", "e2e");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, chromiumSandbox: true });
let worker;
const evidence = { externalTargetsContacted: false, assertions: [], projectId: null, runId: null };
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.route("**/*", route => {
    const url = new URL(route.request().url());
    return [new URL(web).origin, new URL(api).origin].includes(url.origin) ? route.continue() : route.abort("blockedbyclient");
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("dialog", dialog => { errors.push("Untrusted evidence executed a dialog"); void dialog.dismiss(); });
  await page.goto(`${web}/projects/new`);
  await page.getByLabel("Project name").fill(`Offline E2E ${Date.now()}`);
  await page.getByLabel("Authorized website URL").fill("https://fixture.test/?secret=bad");
  await page.getByRole("button", { name: "Create project", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "without credentials" }).waitFor();
  evidence.assertions.push("Client URL validation");
  await page.getByLabel("Authorized website URL").fill("https://not-authorized.test");
  await page.getByRole("button", { name: "Create project", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "authorized HTTPS" }).waitFor();
  evidence.assertions.push("Server validation error displayed");
  await page.getByLabel("Authorized website URL").fill("https://fixture.test/");
  await page.getByLabel("Description").fill("Offline intercepted navigation; no external traffic.");
  await page.getByRole("button", { name: "Create project", exact: true }).click();
  await page.waitForURL(/\/projects\/[0-9a-f-]{36}$/);
  evidence.projectId = page.url().split("/").at(-1);
  evidence.assertions.push("Project form persisted via API");
  await page.getByRole("button", { name: "Run test", exact: true }).click();
  await page.waitForURL(/\/runs\/[0-9a-f-]{36}$/);
  evidence.runId = page.url().split("/").at(-1);
  await page.getByText("QUEUED", { exact: true }).waitFor();
  let runRequests = 0;
  page.on("request", request => { if (request.url() === `${api}/api/runs/${evidence.runId}`) runRequests++; });
  worker = spawn(process.execPath, ["--import", "tsx", "test/offline-worker.ts"], {
    cwd: join(root, "workers", "browser-worker"), windowsHide: true,
    env: { ...process.env, AUTHORIZED_HOSTS: "fixture.test", WORKER_API_URL: api, POLL_INTERVAL_MS: "250", ARTIFACTS_DIR: join(output, "worker") },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let workerLog = "";
  worker.stdout.on("data", chunk => { workerLog += chunk; }); worker.stderr.on("data", chunk => { workerLog += chunk; });
  worker.on("error", error => errors.push(error.message));
  await page.getByText("RUNNING", { exact: true }).waitFor({ timeout: 20000 });
  await page.getByText("PASSED", { exact: true }).waitFor({ timeout: 45000 });
  await page.getByText("TestPilot offline fixture", { exact: true }).waitFor();
  await page.getByText("Captured console evidence", { exact: true }).waitFor();
  await page.getByText("<img src=x onerror=alert(1)>", { exact: true }).waitFor();
  const screenshot = page.getByRole("img", { name: `Screenshot from execution ${evidence.runId}` });
  await screenshot.waitFor();
  await page.waitForFunction(() => [...document.images].some(image => image.alt.startsWith("Screenshot from execution") && image.complete && image.naturalWidth > 0));
  evidence.assertions.push("QUEUED → RUNNING → PASSED", "Stored evidence rendered as text", "Signed screenshot loaded");
  const settledRequests = runRequests;
  await new Promise(resolve => setTimeout(resolve, 4500));
  assert.equal(runRequests, settledRequests, "Polling must stop after a terminal result.");
  evidence.assertions.push("Polling stopped at terminal status");
  await page.screenshot({ path: join(output, "run-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Run page must not overflow on mobile.");
  await page.screenshot({ path: join(output, "run-mobile.png"), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${web}/dashboard`);
  await page.getByRole("heading", { name: "Recent executions" }).waitFor();
  await page.screenshot({ path: join(output, "dashboard.png"), fullPage: true });
  const saved = await (await fetch(`${api}/api/runs/${evidence.runId}/results`)).json();
  assert.equal(saved[0].pageTitle, "TestPilot offline fixture");
  assert.ok(saved[0].pageErrors.some(error => error.includes("Captured JavaScript evidence")));
  assert.ok(saved[0].failedRequests.some(request => request.url.endsWith("/broken.png")));
  const denied = await fetch(`${api}/api/runs/${evidence.runId}/screenshot?expires=0&signature=invalid`);
  assert.equal(denied.status, 403);
  evidence.assertions.push("Persisted API result contains JS and network evidence", "Unsigned screenshot rejected", "Dashboard and mobile layout rendered");
  assert.deepEqual(errors, [], "Frontend must not have uncaught errors.");
  await writeFile(join(output, "worker.log"), workerLog);
  await writeFile(join(output, "verification.json"), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  worker?.kill("SIGTERM");
  await browser.close();
}
