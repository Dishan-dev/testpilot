import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { chromium, type Browser, type Route } from "playwright";
import { readEnvironment } from "../src/config/environment.js";
import { runBasicTest } from "../src/runners/basicTestRunner.js";
import type { BrowserLauncher } from "../src/browser/browserManager.js";

async function fixture(handler: (route: Route) => Promise<void>, navigationTimeoutMs = 2000) {
  const artifactsDir = await mkdtemp(join(tmpdir(), "testpilot-browser-"));
  const config = { ...readEnvironment({ AUTHORIZED_HOSTS: "example.com" }), artifactsDir, navigationTimeoutMs, captureTimeoutMs: 2000 };
  let browser: Browser | undefined;
  const launcher: BrowserLauncher = async () => {
    browser = await chromium.launch({ headless: true, chromiumSandbox: true });
    const original = browser.newContext.bind(browser);
    browser.newContext = async (options) => {
      const context = await original(options);
      await context.route("**/*", handler);
      return context;
    };
    return browser;
  };
  return { config, launcher, closed: () => browser?.isConnected() === false, cleanup: () => rm(artifactsDir, { recursive: true, force: true }) };
}

test("real browser captures navigation, JS/console/network evidence and screenshot", async () => {
  const f = await fixture(async (route) => {
    if (route.request().url().endsWith("/broken.png")) return route.abort("failed");
    await route.fulfill({ status: 200, contentType: "text/html", body: '<title>Controlled fixture</title><h1>Hello</h1><img src="/broken.png"><script>console.error("console evidence"); throw new Error("page evidence");</script>' });
  });
  try {
    const { result, reportPath } = await runBasicTest("https://example.com", f.config, f.launcher);
    assert.equal(result.status, "PASSED");
    assert.equal(result.title, "Controlled fixture");
    assert.equal(result.statusCode, 200);
    assert.ok(result.consoleErrors.includes("console evidence"));
    assert.ok(result.pageErrors.includes("page evidence"));
    assert.ok(result.failedRequests.some((r) => r.url.endsWith("/broken.png")));
    assert.ok(result.screenshotPath);
    assert.ok((await stat(result.screenshotPath)).size > 0);
    assert.equal(JSON.parse(await readFile(reportPath, "utf8")).status, "PASSED");
    assert.ok(f.closed());
  } finally { await f.cleanup(); }
});
test("navigation failure produces a useful report and closes browser", async () => {
  const f = await fixture((route) => route.abort("connectionrefused"));
  try {
    const { result } = await runBasicTest("https://example.com", f.config, f.launcher);
    assert.equal(result.status, "FAILED");
    assert.equal(result.statusCode, null);
    assert.match(result.errors[0]?.message ?? "", /ERR_CONNECTION_REFUSED/);
    assert.ok(result.failedRequests.length > 0);
    assert.ok(f.closed());
  } finally { await f.cleanup(); }
});
test("timeout is reported as navigation failure", async () => {
  const f = await fixture(async () => {}, 100);
  try {
    const { result } = await runBasicTest("https://example.com", f.config, f.launcher);
    assert.equal(result.status, "FAILED");
    assert.match(result.errors[0]?.message ?? "", /timeout/i);
    assert.ok(f.closed());
  } finally { await f.cleanup(); }
});
test("HTTP error fails navigation assertion", async () => {
  const f = await fixture((route) => route.fulfill({ status: 503, body: "Unavailable" }));
  try {
    const { result } = await runBasicTest("https://example.com", f.config, f.launcher);
    assert.equal(result.status, "FAILED");
    assert.equal(result.statusCode, 503);
    assert.ok(result.screenshotPath);
    assert.ok(f.closed());
  } finally { await f.cleanup(); }
});
test("launch failure produces an ERROR report", async () => {
  const root = await mkdtemp(join(tmpdir(), "testpilot-launch-"));
  try {
    const { result, reportPath } = await runBasicTest("https://example.com", { ...readEnvironment({ AUTHORIZED_HOSTS: "example.com" }), artifactsDir: root }, async () => { throw new Error("Browser missing"); });
    assert.equal(result.status, "ERROR");
    assert.equal(result.errors[0]?.message, "Browser missing");
    assert.equal(result.screenshotPath, null);
    assert.ok((await stat(reportPath)).size > 0);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("unauthorized target is rejected before launching", async () => {
  let launched = false;
  await assert.rejects(runBasicTest("https://unauthorized.test", readEnvironment({ AUTHORIZED_HOSTS: "example.com" }), async () => { launched = true; throw new Error("Must not launch"); }), /not in AUTHORIZED_HOSTS/);
  assert.equal(launched, false);
});
