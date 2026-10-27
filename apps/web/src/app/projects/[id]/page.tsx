import Link from "next/link";
import { request, dateTime, type Project, type PageData, type TestRun } from "@/lib/api";
import { PageHeading } from "@/components/page-heading";
import { RunButton } from "@/components/run-button";
import { LiveHistory } from "@/components/live-history";
import { Pagination } from "@/components/pagination";

export default async function ProjectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string }> }) {
  const [{ id }, { page = "0" }] = await Promise.all([params, searchParams]);
  const projectPath = `/api/projects/${encodeURIComponent(id)}`;
  const historyPath = `${projectPath}/runs?page=${encodeURIComponent(page)}&size=20`;
  const [project, runs] = await Promise.all([request<Project>(projectPath), request<PageData<TestRun>>(historyPath)]);
  return <><Link className="mb-6 inline-block text-sm text-emerald-200" href="/projects">← All projects</Link><div className="flex flex-wrap items-start justify-between gap-5"><PageHeading eyebrow="PROJECT" title={project.name} description={project.description || "Read-only navigation checks with inspectable browser evidence."} /><RunButton projectId={project.id} /></div>
    <section className="panel mb-9 flex flex-wrap items-center justify-between gap-5 p-6"><div><p className="text-xs text-slate-500">AUTHORIZED TARGET</p><p className="mt-2 break-all font-mono text-sm text-slate-200">{project.baseUrl}</p><p className="mt-3 text-xs text-slate-500">Created {dateTime(project.createdAt)}</p></div><Link className="secondary-button" href={`/projects/${project.id}/edit`}>Edit project</Link></section><h2 className="mb-5 text-xl font-semibold">Execution history</h2><LiveHistory key={historyPath} initial={runs} endpoint={historyPath} /><Pagination {...runs} path={`/projects/${project.id}`} /></>;
}
