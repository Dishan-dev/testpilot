import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { readEnvironment } from "./config/environment.js";
import { runBasicTest } from "./runners/basicTestRunner.js";
import { errorMessage } from "./types/testResult.js";

try {
  if (existsSync(".env")) loadEnvFile(".env");
  const args = process.argv.slice(2);
  if (args.length !== 1 || !args[0]) throw new Error("Usage: npm run test:url -- https://example.com");
  const { result, reportPath } = await runBasicTest(args[0], readEnvironment());
  // JSON encoding prevents target-controlled text from acting as terminal control sequences.
  console.log(JSON.stringify({ status: result.status, reportPath, screenshotPath: result.screenshotPath, errors: result.errors }, null, 2));
  process.exitCode = result.status === "PASSED" ? 0 : result.status === "FAILED" ? 1 : 2;
} catch (error) {
  console.error(JSON.stringify({ error: errorMessage(error) }));
  process.exitCode = 2;
}
