"use client";
/* eslint-disable @next/next/no-img-element -- Signed local evidence must not be cached by the image optimizer. */

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { apiBase, dateTime, duration, isActive, request, type TestResult, type TestRun } from "@/lib/api";
import { StatusBadge } from "./status-badge";

function Evidence({ title, items }: { title: string; items: string[] }) {
  return <section className="panel p-6"><h2 className="mb-4 font-semibold">{title} <span className="ml-2 text-slate-500">{items.length}</span></h2>{items.length ? <ul className="space-y-3">{items.map((item, index) => <li key={index}><pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-md bg-slate-950/60 p-3 text-xs leading-6 text-slate-300">{item}</pre></li>)}</ul> : <p className="text-sm text-slate-400">None captured during this execution.</p>}</section>;
}
function Field({ label, children }: { label: string; children: ReactNode }) { return <div><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-2 break-all text-sm text-slate-200">{children ?? "—"}</dd></div>; }

export function RunDetails({ initial, initialResults }: { initial: TestRun; initialResults: TestResult[] }) {
  const [run, setRun] = useState(initial);
  const [results, setResults] = useState(initialResults);
  const [error, setError] = useState<string>();
  const [refresh, setRefresh] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const next = await request<TestRun>(`/api/runs/${initial.id}`, { signal: controller.signal });
        if (!isActive(next.status)) setResults(await request<TestResult[]>(`/api/runs/${initial.id}/results`, { signal: controller.signal }));
        setRun(next); setError(undefined);
        if (isActive(next.status)) timer = setTimeout(poll, 2000);
      } catch (error) {
        if (!controller.signal.aborted) { setError(error instanceof Error ? error.message : "Could not refresh execution."); timer = setTimeout(poll, 10000); }
      }
    }
    if (isActive(initial.status) || refresh > 0) timer = setTimeout(poll, refresh ? 0 : 1000);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [initial.id, initial.status, refresh]);
  const result = results[0];
  async function cancel() {
    try { setRun(await request<TestRun>(`/api/runs/${run.id}/cancel`, { method: "POST" })); setRefresh(value => value + 1); }
    catch (error) { setError(error instanceof Error ? error.message : "Cancellation failed."); }
  }
  return <div className="space-y-6">
    <section className="panel p-6 sm:p-8"><div className="flex flex-wrap items-center justify-between gap-4"><div aria-live="polite"><StatusBadge status={run.status} /><p className="mt-3 text-sm text-slate-400">{isActive(run.status) ? "Waiting for execution evidence. Status refreshes automatically." : "Execution finished. Review the captured evidence below."}</p></div>{run.status === "QUEUED" && <button type="button" className="secondary-button" onClick={cancel}>Cancel queued run</button>}</div>
      <dl className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"><Field label="Project"><Link className="text-emerald-200" href={`/projects/${run.projectId}`}>{run.projectName}</Link></Field><Field label="Run identifier">{run.id}</Field><Field label="Duration">{duration(run.durationMs)}</Field><Field label="Requested URL">{run.requestedUrl}</Field><Field label="Created">{dateTime(run.createdAt)}</Field><Field label="Started">{dateTime(run.startedAt)}</Field><Field label="Completed">{dateTime(run.completedAt)}</Field><Field label="Final URL">{result?.finalUrl}</Field><Field label="HTTP status">{result?.httpStatusCode}</Field><Field label="Page title">{result?.pageTitle}</Field><Field label="Browser execution">{result ? duration(result.executionDurationMs) : "—"}</Field></dl>
    </section>
    {error && <p role="alert" className="error-notice">{error}</p>}{run.errorMessage && <p className="error-notice">{run.errorMessage}</p>}
    <p className="rounded-lg border border-slate-700/70 px-5 py-4 text-sm leading-6 text-slate-400">This read-only smoke test checks navigation and captures evidence. A pass does not verify all functionality or establish that a website is bug-free. Console and network errors are observations, not confirmed defects.</p>
    {result ? <><section className="panel overflow-hidden"><div className="border-b border-slate-800 p-6"><h2 className="font-semibold">Screenshot</h2><p className="mt-1 text-sm text-slate-400">Captured browser viewport · untrusted website content</p></div>{result.screenshotUrl && !imageFailed ? <div className="max-h-[640px] overflow-auto bg-slate-950 p-4">{/* Captured local evidence is served by a signed API endpoint, not an image optimizer. */}<img src={`${apiBase}${result.screenshotUrl}`} alt={`Screenshot from execution ${run.id}`} className="h-auto w-full rounded" referrerPolicy="no-referrer" onError={() => setImageFailed(true)} /></div> : <div className="p-6 text-sm text-slate-400"><p>{imageFailed ? "Screenshot link expired or the artifact is unavailable." : "No screenshot was captured."}</p>{imageFailed && <button className="secondary-button mt-3" onClick={() => { setImageFailed(false); setRefresh(value => value + 1); }}>Refresh artifact link</button>}</div>}</section>
      {result.droppedEvidenceCount > 0 && <p className="text-sm text-amber-200">{result.droppedEvidenceCount} extra evidence entries were omitted to keep the report bounded.</p>}
      <div className="grid gap-6 lg:grid-cols-2"><Evidence title="JavaScript exceptions" items={result.pageErrors} /><Evidence title="Console errors" items={result.consoleErrors} /><Evidence title="Failed network requests" items={result.failedRequests.map(r => `${r.method} ${r.url}\n${r.failure}`)} /><Evidence title="Execution diagnostics" items={result.executionErrors.map(e => `${e.phase}: ${e.message}`)} /></div></> : <section className="panel p-8 text-center text-slate-400">{isActive(run.status) ? "Evidence will appear when the worker finishes." : "No browser result was recorded for this run."}</section>}
  </div>;
}
