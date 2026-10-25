import type { Page } from "playwright";
import type { TestResult } from "../types/testResult.js";

// Bound untrusted evidence to avoid unlimited report growth.
const MAX_ENTRIES = 200;
const clip = (value: string) => value.slice(0, 4000);

export function attachErrorCollector(page: Page, result: TestResult): () => void {
  function add<T>(list: T[], entry: T) {
    if (list.length < MAX_ENTRIES) list.push(entry);
    else result.droppedEvidenceCount++;
  }
  const onConsole = (message: import("playwright").ConsoleMessage) => {
    if (message.type() === "error") add(result.consoleErrors, clip(message.text()));
  };
  const onError = (error: Error) => add(result.pageErrors, clip(error.message));
  const onFailed = (request: import("playwright").Request) => add(result.failedRequests, {
    url: clip(request.url()), method: request.method(), failure: clip(request.failure()?.errorText ?? "Unknown network failure"),
  });
  page.on("console", onConsole);
  page.on("pageerror", onError);
  page.on("requestfailed", onFailed);
  return () => {
    page.off("console", onConsole);
    page.off("pageerror", onError);
    page.off("requestfailed", onFailed);
  };
}
