import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { readServiceConfig } from "./config.js";
import { runWorker } from "./worker.js";
import { executeInChild } from "./processExecutor.js";
import { errorMessage } from "../types/testResult.js";

if (existsSync(".env")) loadEnvFile(".env");
const shutdown = new AbortController();
for (const signal of ["SIGINT", "SIGTERM"] as const) process.once(signal, () => shutdown.abort());
try { await runWorker(readServiceConfig(), executeInChild, shutdown.signal); }
catch (error) { console.error(JSON.stringify({ error: errorMessage(error) })); process.exitCode = 2; }
