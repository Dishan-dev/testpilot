import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createRunDirectory, writeReport } from "../src/reports/reportGenerator.js";
import type { TestResult } from "../src/types/testResult.js";

test("report round-trips untrusted text and never overwrites an existing report", async () => {
  const root = await mkdtemp(join(tmpdir(), "testpilot-report-"));
  try {
    const directory = await createRunDirectory(root, "test-run");
    const result: TestResult = {
      runId: "test-run", url: "https://example.com/", finalUrl: "https://example.com/",
      title: '<script>alert("untrusted")</script>', statusCode: 200, status: "PASSED",
      durationMs: 42, consoleErrors: ["line one\nline two"], pageErrors: [], failedRequests: [],
      droppedEvidenceCount: 0, screenshotPath: null, timestamp: new Date().toISOString(), errors: [],
    };
    const path = await writeReport(directory, result);
    assert.deepEqual(JSON.parse(await readFile(path, "utf8")), result);
    await assert.rejects(writeReport(directory, result), /EEXIST/);
    await assert.rejects(createRunDirectory(root, "../escape"), /Invalid run ID/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
