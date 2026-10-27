export type RunStatus = "QUEUED" | "RUNNING" | "PASSED" | "FAILED" | "ERROR" | "CANCELLED";
export interface ProjectInput { name: string; description: string; baseUrl: string }
export interface Project extends ProjectInput { id: string; createdAt: string; updatedAt: string; recentStatus: RunStatus | null }
export interface TestRun {
  id: string; projectId: string; projectName: string; requestedUrl: string; status: RunStatus;
  startedAt: string | null; completedAt: string | null; durationMs: number | null; errorMessage: string | null;
  createdAt: string; updatedAt: string;
}
export interface TestResult {
  id: string; testRunId: string; requestedUrl: string; finalUrl: string | null; pageTitle: string | null;
  httpStatusCode: number | null; consoleErrors: string[]; pageErrors: string[];
  failedRequests: { url: string; method: string; failure: string }[];
  executionErrors: { phase: string; message: string }[];
  executionDurationMs: number; droppedEvidenceCount: number; createdAt: string; screenshotUrl: string | null;
}
export interface PageData<T> { content: T[]; page: number; size: number; totalElements: number; totalPages: number }
export interface Dashboard { totalProjects: number; totalRuns: number; passedRuns: number; failedRuns: number; recentRuns: TestRun[] }
export const apiBase = (typeof window === "undefined" ? process.env.API_BASE_URL : undefined)
  ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8080";
export class ApiError extends Error {
  constructor(public status: number, message: string, public invalidFields: string[] = []) { super(message); }
}
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiBase}${path}`, { ...init, cache: "no-store", signal: init.signal ?? AbortSignal.timeout(10000),
      headers: { Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers } });
  } catch (error) {
    if (init.signal?.aborted) throw error;
    throw new ApiError(0, "Could not reach the API. Check that the backend and PostgreSQL are running.");
  }
  if (!response.ok) {
    const problem = await response.json().catch(() => ({})) as { detail?: string; invalidFields?: string[] };
    throw new ApiError(response.status, problem.detail ?? `Request failed (${response.status}).`, problem.invalidFields);
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}
export const isActive = (status: RunStatus) => status === "QUEUED" || status === "RUNNING";
export const dateTime = (value: string | null) => value ? new Date(value).toLocaleString("en-GB", { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" }) + " UTC" : "—";
export const duration = (ms: number | null) => ms === null ? "—" : `${(ms / 1000).toFixed(1)}s`;
