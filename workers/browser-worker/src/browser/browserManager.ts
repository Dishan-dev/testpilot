import { chromium, type Browser } from "playwright";
import type { WorkerConfig } from "../config/environment.js";

export type BrowserLauncher = (config: WorkerConfig) => Promise<Browser>;

export const launchBrowser: BrowserLauncher = (config) => chromium.launch({
  headless: true,
  timeout: config.launchTimeoutMs,
  chromiumSandbox: true,
});
