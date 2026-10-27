import { readEnvironment, type WorkerConfig } from "../config/environment.js";

export interface ServiceConfig {
  browser: WorkerConfig;
  apiUrl: string;
  token: string;
  pollIntervalMs: number;
  executionTimeoutMs: number;
}
function milliseconds(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) throw new Error(`Interval must be ${min}–${max} milliseconds.`);
  return parsed;
}
export function readServiceConfig(env: NodeJS.ProcessEnv = process.env): ServiceConfig {
  const browser = readEnvironment(env);
  if (!browser.authorizedHosts.size) throw new Error("Worker service requires AUTHORIZED_HOSTS.");
  const url = new URL(env.WORKER_API_URL ?? "http://127.0.0.1:8080");
  if (url.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("Milestone 2 worker API must be a loopback HTTP origin.");
  }
  const token = env.WORKER_API_TOKEN ?? "";
  if (token.length < 32 || /[\r\n]/.test(token)) throw new Error("WORKER_API_TOKEN must contain at least 32 characters and no newlines.");
  return { browser, apiUrl: url.origin, token,
    pollIntervalMs: milliseconds(env.POLL_INTERVAL_MS, 2000, 250, 60000),
    executionTimeoutMs: milliseconds(env.EXECUTION_TIMEOUT_MS, 120000, 1000, 300000) };
}
