// Test-only worker entry point. No environment flag enables interception in production.
import { chromium } from "playwright";
import { readServiceConfig } from "../src/service/config.js";
import { runWorker } from "../src/service/worker.js";
import { runBasicTest } from "../src/runners/basicTestRunner.js";
import type { BrowserLauncher } from "../src/browser/browserManager.js";

const config = readServiceConfig();
const stop = new AbortController();
for (const signal of ["SIGINT", "SIGTERM"] as const) process.once(signal, () => stop.abort());
const fixture: BrowserLauncher = async () => {
  const browser = await chromium.launch({ headless: true, chromiumSandbox: true });
  const create = browser.newContext.bind(browser);
  browser.newContext = async options => {
    const context = await create(options);
    await context.route("**/*", async route => {
      const url = new URL(route.request().url());
      if (url.origin !== "https://fixture.test") return route.abort("blockedbyclient");
      if (url.pathname === "/broken.png") return route.abort("failed");
      await new Promise(resolve => setTimeout(resolve, 2500));
      await route.fulfill({ status: 200, contentType: "text/html", body: `<!doctype html><html><head><title>TestPilot offline fixture</title></head><body style="font-family:Arial;background:#f1f5f9;padding:64px"><h1>Offline navigation fixture</h1><p>Every request is intercepted. No external target was contacted.</p><img src="/broken.png" alt="Intentionally failed resource"><script>console.error('Captured console evidence'); console.error('<img src=x onerror=alert(1)>'); throw new Error('Captured JavaScript evidence');</script></body></html>` });
    });
    return context;
  };
  return browser;
};
await runWorker(config, async (job, signal) => (await runBasicTest(job.requestedUrl, config.browser, fixture, { runId: job.runId, signal, restrictNetwork: true })).result, stop.signal);
