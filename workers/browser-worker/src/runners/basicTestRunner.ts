import { randomUUID } from "node:crypto";
import { join, relative } from "node:path";
import type { Browser, BrowserContext, Page } from "playwright";
import { launchBrowser, type BrowserLauncher } from "../browser/browserManager.js";
import { withTimeout } from "../browser/withTimeout.js";
import { attachErrorCollector } from "../collectors/errorCollector.js";
import type { WorkerConfig } from "../config/environment.js";
import { createRunDirectory, writeReport } from "../reports/reportGenerator.js";
import { validateUrl } from "../security/urlValidator.js";
import { errorMessage, type TestResult } from "../types/testResult.js";

export async function runBasicTest(input: string, config: WorkerConfig, launcher: BrowserLauncher = launchBrowser) {
  const url = validateUrl(input, config.authorizedHosts);
  const started = performance.now();
  const result: TestResult = {
    runId: randomUUID(), url: url.href, finalUrl: null, title: null, statusCode: null,
    status: "ERROR", durationMs: 0, consoleErrors: [], pageErrors: [], failedRequests: [],
    droppedEvidenceCount: 0, screenshotPath: null, timestamp: new Date().toISOString(), errors: [],
  };
  const directory = await createRunDirectory(config.artifactsDir, result.runId);
  let browser: Browser | undefined;
  let context: BrowserContext | undefined;
  let page: Page | undefined;
  let detach: (() => void) | undefined;
  try {
    browser = await launcher(config);
    context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: "block", acceptDownloads: false });
    page = await withTimeout(context.newPage(), config.launchTimeoutMs, "Page creation");
    page.setDefaultTimeout(config.captureTimeoutMs);
    detach = attachErrorCollector(page, result);
    try {
      const response = await page.goto(url.href, { waitUntil: "load", timeout: config.navigationTimeoutMs });
      result.statusCode = response?.status() ?? null;
      result.status = result.statusCode !== null && result.statusCode >= 200 && result.statusCode < 400 ? "PASSED" : "FAILED";
      if (result.status === "FAILED") result.errors.push({ phase: "navigation", message: `Expected HTTP 2xx/3xx; received ${result.statusCode ?? "no response"}.` });
    } catch (error) {
      result.status = "FAILED";
      result.errors.push({ phase: "navigation", message: errorMessage(error) });
    }
    result.finalUrl = page.url();
    try {
      result.title = (await withTimeout(page.title(), config.captureTimeoutMs, "Page title capture")).slice(0, 4000);
    } catch (error) {
      result.errors.push({ phase: "capture", message: errorMessage(error) });
      if (result.status === "PASSED") result.status = "ERROR";
    }
    try {
      const screenshot = join(directory, "screenshot.png");
      await page.screenshot({ path: screenshot, fullPage: true, timeout: config.captureTimeoutMs });
      result.screenshotPath = relative(process.cwd(), screenshot).replaceAll("\\", "/");
    } catch (error) {
      result.errors.push({ phase: "capture", message: errorMessage(error) });
      if (result.status === "PASSED") result.status = "ERROR";
    }
  } catch (error) {
    result.status = "ERROR";
    result.errors.push({ phase: "execution", message: errorMessage(error) });
  } finally {
    detach?.();
    // Try both closes even if context closure fails.
    for (const resource of [context, browser]) {
      try { await resource?.close(); }
      catch (error) {
        result.errors.push({ phase: "cleanup", message: errorMessage(error) });
        result.status = "ERROR";
      }
    }
  }
  result.durationMs = Math.round(performance.now() - started);
  const reportPath = await writeReport(directory, result);
  return { result, reportPath };
}
