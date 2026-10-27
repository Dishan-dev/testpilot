import Link from "next/link";
import { connection } from "next/server";
import { Plus, FolderKanban, Activity, CheckCircle2, CircleAlert } from "lucide-react";
import { request, type Dashboard } from "@/lib/api";
import { PageHeading } from "@/components/page-heading";
import { RunTable } from "@/components/run-table";

export const metadata = { title: "Dashboard" };
export default async function DashboardPage() {
  await connection();
  const data = await request<Dashboard>("/api/dashboard");
  const metrics = [{ label: "Projects", value: data.totalProjects, icon: FolderKanban }, { label: "Total executions", value: data.totalRuns, icon: Activity }, { label: "Passed", value: data.passedRuns, icon: CheckCircle2 }, { label: "Failed navigation", value: data.failedRuns, icon: CircleAlert }];
  return <><div className="flex flex-wrap items-start justify-between gap-5"><PageHeading eyebrow="WORKSPACE OVERVIEW" title="Your testing workspace." description="Run focused browser checks. Keep the evidence. Understand what happened." /><Link href="/projects/new" className="button inline-flex"><Plus size={17} aria-hidden="true" />New project</Link></div>
    <div className="mb-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(({ label, value, icon: Icon }) => <section className="panel p-6" key={label}><div className="flex items-center justify-between text-sm text-slate-400">{label}<Icon size={18} className="text-emerald-300" aria-hidden="true" /></div><p className="mt-5 text-4xl font-semibold tracking-tight">{value}</p></section>)}</div>
    <div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-semibold">Recent executions</h2><Link href="/test-runs" className="text-sm text-emerald-200">View all runs →</Link></div><RunTable runs={data.recentRuns} />
    <p className="mt-6 text-sm leading-6 text-slate-500">A passed navigation check is a starting point, not a guarantee of a bug-free application. Infrastructure errors and cancelled runs are included in total executions.</p></>;
}
