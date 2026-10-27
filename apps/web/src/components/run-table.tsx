import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { dateTime, duration, type TestRun } from "@/lib/api";
import { StatusBadge } from "./status-badge";
import { EmptyState } from "./empty-state";

export function RunTable({ runs }: { runs: TestRun[] }) {
  if (!runs.length) return <EmptyState title="No executions yet" description="Run a navigation smoke test from a project to collect your first evidence." />;
  return <div className="panel overflow-x-auto"><table className="data-table"><caption className="sr-only">Test executions</caption><thead><tr><th>Execution / project</th><th>Status</th><th>Created</th><th>Duration</th><th><span className="sr-only">Details</span></th></tr></thead><tbody>{runs.map(run => <tr key={run.id}>
    <td><Link className="font-medium text-slate-100 hover:text-emerald-200" href={`/runs/${run.id}`}>{run.projectName}<span className="mt-1 block font-mono text-xs text-slate-500">{run.id.slice(0, 8)}</span></Link></td>
    <td><StatusBadge status={run.status} /></td><td className="whitespace-nowrap">{dateTime(run.createdAt)}</td><td>{duration(run.durationMs)}</td>
    <td><Link href={`/runs/${run.id}`} aria-label={`View run ${run.id}`}><ArrowUpRight size={18} /></Link></td></tr>)}</tbody></table></div>;
}
