import assert from "node:assert/strict";
import { stat } from "node:fs/promises";
import { test } from "node:test";
import { readEnvironment } from "../src/config/environment.js";
import { runBasicTest } from "../src/runners/basicTestRunner.js";

test("live example.com smoke creates a real report and screenshot", async () => {
  const config = readEnvironment({ ...process.env, AUTHORIZED_HOSTS: "example.com" });
  const { result, reportPath } = await runBasicTest("https://example.com", config);
  assert.equal(result.status, "PASSED", JSON.stringify(result.errors));
  assert.equal(result.statusCode, 200);
  assert.equal(result.title, "Example Domain");
  assert.ok(result.screenshotPath);
  assert.ok((await stat(result.screenshotPath)).size > 0);
  assert.ok((await stat(reportPath)).size > 0);
  console.log(JSON.stringify({ reportPath, screenshotPath: result.screenshotPath }));
});
