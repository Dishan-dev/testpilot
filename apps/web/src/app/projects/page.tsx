import Link from "next/link";
import { Plus, ArrowUpRight } from "lucide-react";
import { request, dateTime, type Project, type PageData } from "@/lib/api";
import { PageHeading } from "@/components/page-heading";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { RunButton } from "@/components/run-button";
import { Pagination } from "@/components/pagination";

export const metadata = { title: "Projects" };
export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams;
  const data = await request<PageData<Project>>(`/api/projects?page=${encodeURIComponent(params.page ?? "0")}&size=12`);
  return <><div className="flex flex-wrap items-start justify-between gap-5"><PageHeading eyebrow="PROJECTS" title="A home for every application." description="Manage authorized targets and keep their execution history together." /><Link className="button inline-flex" href="/projects/new"><Plus size={17} aria-hidden="true" />New project</Link></div>
    {data.content.length ? <div className="grid gap-5 lg:grid-cols-2">{data.content.map(project => <article className="panel flex flex-col p-6" key={project.id}><div className="flex items-start justify-between gap-3"><h2 className="min-w-0 break-words text-xl font-semibold"><Link href={`/projects/${project.id}`} className="hover:text-emerald-200">{project.name}</Link></h2><StatusBadge status={project.recentStatus} /></div><p className="mt-3 break-all font-mono text-xs leading-6 text-slate-400">{project.baseUrl}</p><p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-400">{project.description || "No description added."}</p><p className="mt-5 mb-5 text-xs text-slate-500">Created {dateTime(project.createdAt)}</p><div className="mt-auto flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 pt-5"><Link className="inline-flex items-center gap-2 text-sm text-emerald-200" href={`/projects/${project.id}`}>View project <ArrowUpRight size={16} aria-hidden="true" /></Link><RunButton projectId={project.id} /></div></article>)}</div> : <EmptyState title="Create your first project" description="Add an authorized HTTPS target, then start a read-only navigation test."><Link className="button mt-6 inline-flex" href="/projects/new">Create project</Link></EmptyState>}
    <Pagination {...data} path="/projects" /></>;
}
