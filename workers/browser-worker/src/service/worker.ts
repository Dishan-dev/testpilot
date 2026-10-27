import { readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { validateUrl } from "../security/urlValidator.js";
import { errorMessage, type TestResult } from "../types/testResult.js";
import { WorkerApi, WorkerApiError, type Claim } from "./api.js";
import type { ServiceConfig } from "./config.js";

export type Executor = (job: Claim, signal: AbortSignal) => Promise<TestResult>;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validateClaim(job: Claim, config: ServiceConfig): void {
  if (!job || !uuid.test(job.runId) || !uuid.test(job.projectId) || !uuid.test(job.attemptId) || !uuid.test(job.claimToken)) throw new Error("Invalid claim identifiers.");
  if (job.testType !== "NAVIGATION_SMOKE") throw new Error("Unsupported test type.");
  const target = validateUrl(job.requestedUrl, config.browser.authorizedHosts);
  if (target.search || target.hash) throw new Error("Service targets cannot include query parameters or fragments.");
  if (!Number.isFinite(Date.parse(job.leaseExpiresAt)) || Date.parse(job.leaseExpiresAt) <= Date.now() || !Number.isFinite(Date.parse(job.deadlineAt)) || Date.parse(job.deadlineAt) <= Date.now()) throw new Error("Claim has expired or invalid dates.");
}
export async function processJob(job: Claim, config: ServiceConfig, api: WorkerApi, execute: Executor, shutdown: AbortSignal): Promise<void> {
  // Reject malformed IDs before ever building a request path from backend data.
  if (!job || !uuid.test(job.runId) || !uuid.test(job.attemptId) || !uuid.test(job.claimToken)) throw new Error("Malformed claim.");
  const controller = new AbortController();
  const stopHeartbeat = new AbortController();
  const onShutdown = () => controller.abort(new Error("Worker shutting down."));
  shutdown.addEventListener("abort", onShutdown, { once: true });
  if (shutdown.aborted) onShutdown();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let heartbeat: Promise<void> | undefined;
  try {
    validateClaim(job, config);
    controller.signal.throwIfAborted();
    timer = setTimeout(() => controller.abort(new Error("Execution deadline exceeded.")), Math.min(config.executionTimeoutMs, Date.parse(job.deadlineAt) - Date.now() - 1000));
    heartbeat = (async () => {
      let lease = Date.parse(job.leaseExpiresAt);
      while (!stopHeartbeat.signal.aborted) {
        try { await delay(Math.max(250, Math.min(5000, (lease - Date.now()) / 3)), undefined, { signal: stopHeartbeat.signal }); }
        catch { return; }
        try {
          const renewed = await api.heartbeat(job);
          if (!renewed || !Number.isFinite(Date.parse(renewed.leaseExpiresAt))) throw new Error("Invalid heartbeat response.");
          lease = Date.parse(renewed.leaseExpiresAt);
        } catch {
          controller.abort(new Error("Could not renew worker claim; execution stopped.")); return;
        }
      }
    })();
    const result = await execute(job, controller.signal);
    controller.signal.throwIfAborted();
    let screenshotBase64: string | null = null;
    if (result.screenshotPath) {
      const expected = resolve(config.browser.artifactsDir, job.runId, "screenshot.png");
      if (resolve(result.screenshotPath) !== expected) throw new Error("Executor returned an invalid artifact path.");
      const screenshot = await readFile(join(config.browser.artifactsDir, job.runId, "screenshot.png"));
      if (screenshot.length > 5 * 1024 * 1024) throw new Error("Screenshot exceeds the 5 MiB upload limit.");
      screenshotBase64 = screenshot.toString("base64");
    }
    const payload = { ...api.proof(job), status: result.status, requestedUrl: job.requestedUrl, finalUrl: result.finalUrl,
      pageTitle: result.title, httpStatusCode: result.statusCode, consoleErrors: result.consoleErrors, pageErrors: result.pageErrors,
      failedRequests: result.failedRequests, executionErrors: result.errors, executionDurationMs: result.durationMs,
      droppedEvidenceCount: result.droppedEvidenceCount, screenshotBase64 };
    // Retry only delivery of the same result, never browser execution.
    for (let attempt = 0; ; attempt++) {
      controller.signal.throwIfAborted();
      try { await api.post(`/runs/${job.runId}/results`, payload); break; }
      catch (error) {
        if (attempt >= 2 || (error instanceof WorkerApiError && error.status < 500)) throw error;
        await delay(500 * (attempt + 1), undefined, { signal: controller.signal });
      }
    }
  } catch (error) {
    const message = controller.signal.aborted ? errorMessage(controller.signal.reason) : errorMessage(error);
    try { await api.post(`/runs/${job.runId}/failure`, { ...api.proof(job), message }); }
    catch { console.error(JSON.stringify({ event: "failure-report-unavailable", runId: job.runId })); }
    if (error instanceof WorkerApiError && error.status === 401) throw error;
  } finally {
    clearTimeout(timer); stopHeartbeat.abort(); await heartbeat;
    shutdown.removeEventListener("abort", onShutdown);
  }
}
export async function runWorker(config: ServiceConfig, execute: Executor, signal: AbortSignal, api = new WorkerApi(config)): Promise<void> {
  // One claim at a time per process. Scale only by starting additional bounded workers.
  while (!signal.aborted) {
    try {
      const job = await api.claim();
      if (job) await processJob(job, config, api, execute, signal);
    } catch (error) {
      if (error instanceof WorkerApiError && error.status === 401) throw error;
      console.error(JSON.stringify({ event: "worker-request-failed", message: errorMessage(error) }));
    }
    try { await delay(config.pollIntervalMs, undefined, { signal }); }
    catch { return; }
  }
}
