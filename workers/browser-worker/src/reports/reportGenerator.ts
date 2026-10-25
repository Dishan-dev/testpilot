import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { TestResult } from "../types/testResult.js";

export async function createRunDirectory(artifactsDir: string, runId: string): Promise<string> {
  if (!/^[a-zA-Z0-9-]+$/.test(runId)) throw new Error("Invalid run ID.");
  const directory = join(artifactsDir, runId);
  await mkdir(directory, { recursive: true });
  return directory;
}

export async function writeReport(directory: string, result: TestResult): Promise<string> {
  const reportPath = join(directory, "report.json");
  await writeFile(reportPath, `${JSON.stringify(result, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  return reportPath;
}
