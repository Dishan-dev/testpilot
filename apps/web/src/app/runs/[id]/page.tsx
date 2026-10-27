import { request, type TestRun, type TestResult } from "@/lib/api";
import { PageHeading } from "@/components/page-heading";
import { RunDetails } from "@/components/run-details";
export const metadata = { title: "Execution details" };
export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const path = `/api/runs/${encodeURIComponent(id)}`;
  const [run, results] = await Promise.all([request<TestRun>(path), request<TestResult[]>(`${path}/results`)]);
  return <><PageHeading eyebrow="EXECUTION DETAILS" title="Inspect the evidence." description="Navigation outcome, browser observations, and a captured screenshot in one place." /><RunDetails key={id} initial={run} initialResults={results} /></>;
}
