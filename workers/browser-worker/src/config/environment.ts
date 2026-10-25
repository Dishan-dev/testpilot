import { resolve } from "node:path";
import { parseAuthorizedHosts } from "../security/urlValidator.js";

export interface WorkerConfig {
  authorizedHosts: ReadonlySet<string>;
  navigationTimeoutMs: number;
  captureTimeoutMs: number;
  launchTimeoutMs: number;
  artifactsDir: string;
}

function timeout(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(parsed) || parsed < 1 || parsed > 120_000) {
    throw new Error(`${name} must be an integer between 1 and 120000 milliseconds.`);
  }
  return parsed;
}

export function readEnvironment(env: NodeJS.ProcessEnv = process.env): WorkerConfig {
  if (env.ARTIFACTS_DIR !== undefined && !env.ARTIFACTS_DIR.trim()) {
    throw new Error("ARTIFACTS_DIR must not be empty.");
  }
  return {
    authorizedHosts: parseAuthorizedHosts(env.AUTHORIZED_HOSTS),
    navigationTimeoutMs: timeout(env.NAVIGATION_TIMEOUT_MS, 30_000, "NAVIGATION_TIMEOUT_MS"),
    captureTimeoutMs: timeout(env.CAPTURE_TIMEOUT_MS, 10_000, "CAPTURE_TIMEOUT_MS"),
    launchTimeoutMs: timeout(env.LAUNCH_TIMEOUT_MS, 30_000, "LAUNCH_TIMEOUT_MS"),
    artifactsDir: resolve(env.ARTIFACTS_DIR ?? "artifacts"),
  };
}
