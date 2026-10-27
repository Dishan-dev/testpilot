"use client";

import { useEffect, useState } from "react";
import { isActive, request, type PageData, type TestRun } from "@/lib/api";
import { RunTable } from "./run-table";

export function LiveHistory({ initial, endpoint }: { initial: PageData<TestRun>; endpoint: string }) {
  const [data, setData] = useState(initial);
  const [error, setError] = useState<string>();
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const next = await request<PageData<TestRun>>(endpoint, { signal: controller.signal });
        setData(next); setError(undefined);
        if (next.content.some(run => isActive(run.status))) timer = setTimeout(poll, 3000);
      } catch (error) {
        if (!controller.signal.aborted) { setError(error instanceof Error ? error.message : "Status refresh failed."); timer = setTimeout(poll, 10000); }
      }
    }
    if (initial.content.some(run => isActive(run.status))) timer = setTimeout(poll, 3000);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [endpoint, initial]);
  return <>{error && <p role="alert" className="error-notice mb-4">{error}</p>}<RunTable runs={data.content} /></>;
}
