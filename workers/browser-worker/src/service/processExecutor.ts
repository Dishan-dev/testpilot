import { fork } from "node:child_process";
import type { Executor } from "./worker.js";
import type { TestResult } from "../types/testResult.js";

export const executeInChild: Executor = (job, signal) => new Promise((resolve, reject) => {
  signal.throwIfAborted();
  const extension = import.meta.url.endsWith(".ts") ? "ts" : "js";
  const child = fork(new URL(`./child.${extension}`, import.meta.url), [], {
    stdio: ["ignore", "ignore", "ignore", "ipc"],
    // Browser execution never inherits backend credentials.
    env: Object.fromEntries(Object.entries(process.env).filter(([key]) => !["WORKER_API_TOKEN", "ARTIFACT_SECRET", "DATABASE_PASSWORD"].includes(key))),
  });
  let killTimer: ReturnType<typeof setTimeout> | undefined;
  let received: TestResult | undefined;
  let failure: Error | undefined;
  const abort = () => {
    if (child.connected) child.send("abort");
    killTimer = setTimeout(() => child.kill(), 5000);
  };
  signal.addEventListener("abort", abort, { once: true });
  child.on("message", (message: { result?: TestResult; error?: string }) => { received = message.result; if (message.error) failure = new Error(message.error); });
  child.on("error", (error) => { failure = error; });
  child.on("exit", () => {
    clearTimeout(killTimer); signal.removeEventListener("abort", abort);
    if (signal.aborted) reject(signal.reason);
    else if (received) resolve(received);
    else reject(failure ?? new Error("Browser subprocess exited without a result."));
  });
  child.send(job);
  if (signal.aborted) abort();
});
