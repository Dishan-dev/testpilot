import { readEnvironment } from "../config/environment.js";
import { runBasicTest } from "../runners/basicTestRunner.js";
import { errorMessage } from "../types/testResult.js";
import type { Claim } from "./api.js";

const controller = new AbortController();
process.on("message", (message: unknown) => { if (message === "abort") controller.abort(); });
process.on("disconnect", () => controller.abort());
process.once("message", async (message: Claim) => {
  try {
    const { result } = await runBasicTest(message.requestedUrl, readEnvironment(), undefined, { runId: message.runId, signal: controller.signal, restrictNetwork: true });
    process.send?.({ result });
  } catch (error) { process.send?.({ error: errorMessage(error) }); }
  finally { process.disconnect?.(); }
});
