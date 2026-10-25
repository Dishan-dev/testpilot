export interface FailedRequest {
  url: string;
  method: string;
  failure: string;
}

export interface TestResult {
  runId: string;
  url: string;
  finalUrl: string | null;
  title: string | null;
  statusCode: number | null;
  status: "PASSED" | "FAILED" | "ERROR";
  durationMs: number;
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: FailedRequest[];
  droppedEvidenceCount: number;
  screenshotPath: string | null;
  timestamp: string;
  errors: { phase: "navigation" | "capture" | "execution" | "cleanup"; message: string }[];
}

export function errorMessage(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).slice(0, 4000);
}
