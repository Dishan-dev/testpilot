import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { readServiceConfig } from "../src/service/config.js";
import { WorkerApi, WorkerApiError, type Claim } from "../src/service/api.js";
import { processJob, runWorker, validateClaim } from "../src/service/worker.js";
import type { TestResult } from "../src/types/testResult.js";

const config = readServiceConfig({ AUTHORIZED_HOSTS: "fixture.test", WORKER_API_TOKEN: "test-token-with-at-least-32-characters" });
const job = (): Claim => ({ runId: randomUUID(), projectId: randomUUID(), requestedUrl: "https://fixture.test/", testType: "NAVIGATION_SMOKE", attemptId: randomUUID(), claimToken: randomUUID(), leaseExpiresAt: new Date(Date.now() + 30000).toISOString(), deadlineAt: new Date(Date.now() + 180000).toISOString() });
const result = (claim: Claim): TestResult => ({ runId: claim.runId, url: claim.requestedUrl, finalUrl: claim.requestedUrl, title: "Fixture", statusCode: 200, status: "FAILED", durationMs: 1, consoleErrors: [], pageErrors: [], failedRequests: [], droppedEvidenceCount: 0, screenshotPath: null, timestamp: new Date().toISOString(), errors: [] });

test("service configuration denies missing hosts, credentials and remote API origins", () => {
  assert.throws(() => readServiceConfig({}), /AUTHORIZED_HOSTS/);
  assert.throws(() => readServiceConfig({ AUTHORIZED_HOSTS: "fixture.test" }), /TOKEN/);
  assert.throws(() => readServiceConfig({ AUTHORIZED_HOSTS: "fixture.test", WORKER_API_URL: "http://remote.test" }), /loopback/);
});
test("claim validation rejects unauthorized URLs, expired claims and unsupported tests", () => {
  validateClaim(job(), config);
  assert.throws(() => validateClaim({ ...job(), requestedUrl: "https://other.test" }, config), /AUTHORIZED_HOSTS/);
  assert.throws(() => validateClaim({ ...job(), leaseExpiresAt: "bad" }, config), /expired/);
  assert.throws(() => validateClaim({ ...job(), runId: "../escape" }, config), /identifiers/);
});
test("API authenticates polling, supports empty queues and surfaces authorization errors", async () => {
  const api = new WorkerApi(config, async (_url, init) => {
    assert.equal(new Headers(init?.headers).get("Authorization"), `Bearer ${config.token}`);
    assert.equal(init?.redirect, "error");
    return new Response(null, { status: 204 });
  });
  assert.equal(await api.claim(), null);
  const denied = new WorkerApi(config, async () => new Response(null, { status: 401 }));
  await assert.rejects(denied.claim(), WorkerApiError);
});
test("poll loop claims once, submits evidence and stops gracefully", async () => {
  const claim = job(); const stop = new AbortController(); const paths: string[] = [];
  const api = new WorkerApi(config, async (url, init) => {
    paths.push(String(url));
    if (String(url).endsWith("/claims")) return Response.json(claim);
    const body = JSON.parse(String(init?.body));
    assert.equal(body.claimToken, claim.claimToken);
    assert.equal(body.attemptId, claim.attemptId);
    assert.equal(body.requestedUrl, claim.requestedUrl);
    stop.abort(); return Response.json({});
  });
  let executions = 0;
  await runWorker(config, async claimed => { executions++; return result(claimed); }, stop.signal, api);
  assert.equal(executions, 1); assert.equal(paths.length, 2); assert.ok(paths[1]?.endsWith("/results"));
});
test("invalid authorized configuration reports ERROR without executing", async () => {
  const claim = { ...job(), requestedUrl: "https://unauthorized.test" }; let executed = false; let failure = false;
  const api = new WorkerApi(config, async url => { failure = String(url).endsWith("/failure"); return Response.json({}); });
  await processJob(claim, config, api, async c => { executed = true; return result(c); }, new AbortController().signal);
  assert.equal(executed, false); assert.equal(failure, true);
});
test("deadline aborts execution and reports infrastructure failure", async () => {
  const claim = job(); let message = ""; let aborted = false;
  const api = new WorkerApi(config, async (_url, init) => { message = JSON.parse(String(init?.body)).message; return Response.json({}); });
  await processJob(claim, { ...config, executionTimeoutMs: 30 }, api, (_job, signal) => new Promise((_resolve, reject) => {
    signal.addEventListener("abort", () => { aborted = true; reject(signal.reason); }, { once: true });
  }), new AbortController().signal);
  assert.equal(aborted, true); assert.match(message, /deadline exceeded/);
});
test("result upload retries delivery without rerunning navigation", async () => {
  let uploads = 0; let executions = 0;
  const api = new WorkerApi(config, async url => {
    assert.ok(String(url).endsWith("/results")); uploads++;
    return uploads === 1 ? new Response(null, { status: 503 }) : Response.json({});
  });
  await processJob(job(), config, api, async claim => { executions++; return result(claim); }, new AbortController().signal);
  assert.equal(uploads, 2); assert.equal(executions, 1);
});
test("lost heartbeat aborts the active execution", async () => {
  let abort = false;
  const api = new WorkerApi(config, async url => new Response(null, { status: String(url).endsWith("/heartbeat") ? 409 : 200 }));
  await processJob({ ...job(), leaseExpiresAt: new Date(Date.now() + 600).toISOString() }, config, api, (_claim, signal) => new Promise((_resolve, reject) => {
    signal.addEventListener("abort", () => { abort = true; reject(signal.reason); }, { once: true });
  }), new AbortController().signal);
  assert.equal(abort, true);
});
test("service never accepts artifact paths outside its run directory", async () => {
  const root = await mkdtemp(join(tmpdir(), "testpilot-service-")); let failure = "";
  try {
    const api = new WorkerApi(config, async (_url, init) => { failure = JSON.parse(String(init?.body)).message; return Response.json({}); });
    await processJob(job(), { ...config, browser: { ...config.browser, artifactsDir: root } }, api, async claim => ({ ...result(claim), screenshotPath: "../secret.png" }), new AbortController().signal);
    assert.match(failure, /invalid artifact path/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
