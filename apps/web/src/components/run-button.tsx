"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { request, type TestRun } from "@/lib/api";

export function RunButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  async function run() {
    setBusy(true); setError(undefined);
    try { const run = await request<TestRun>(`/api/projects/${projectId}/runs`, { method: "POST" }); router.push(`/runs/${run.id}`); }
    catch (error) { setError(error instanceof Error ? error.message : "Could not create run."); setBusy(false); }
  }
  return <div><button type="button" className="button inline-flex" disabled={busy} onClick={run}><Play size={16} aria-hidden="true" />{busy ? "Queueing…" : "Run test"}</button>{error && <p role="alert" className="mt-3 max-w-lg text-sm text-rose-300">{error}</p>}</div>;
}
