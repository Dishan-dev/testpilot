import type { ServiceConfig } from "./config.js";

export interface Claim {
  runId: string; projectId: string; requestedUrl: string; testType: "NAVIGATION_SMOKE";
  attemptId: string; claimToken: string; leaseExpiresAt: string; deadlineAt: string;
}
export class WorkerApiError extends Error {
  constructor(public readonly status: number) { super(`Worker API returned HTTP ${status}.`); }
}
export class WorkerApi {
  constructor(private readonly config: Pick<ServiceConfig, "apiUrl" | "token">, private readonly transport: typeof fetch = fetch) {}
  async post<T>(path: string, body?: unknown): Promise<T | null> {
    const response = await this.transport(`${this.config.apiUrl}/internal/worker${path}`, {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(8000),
      headers: { Authorization: `Bearer ${this.config.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    if (!response.ok) throw new WorkerApiError(response.status);
    return response.status === 204 ? null : await response.json() as T;
  }
  claim() { return this.post<Claim>("/claims"); }
  heartbeat(job: Claim) { return this.post<Claim>(`/runs/${job.runId}/heartbeat`, this.proof(job)); }
  proof(job: Claim) { return { attemptId: job.attemptId, claimToken: job.claimToken }; }
}
