"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { request, ApiError, type Project, type ProjectInput } from "@/lib/api";

export function ProjectForm({ project }: { project?: Project }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [fields, setFields] = useState<string[]>([]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input: ProjectInput = { name: String(form.get("name")).trim(), description: String(form.get("description")).trim(), baseUrl: String(form.get("baseUrl")).trim() };
    setError(undefined); setFields([]);
    try {
      const url = new URL(input.baseUrl);
      if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || (url.port && url.port !== "443")) throw new Error();
    } catch { setError("Use an HTTPS URL on port 443, without credentials, query parameters or fragments."); setFields(["baseUrl"]); return; }
    setBusy(true);
    try {
      const saved = await request<Project>(project ? `/api/projects/${project.id}` : "/api/projects", { method: project ? "PUT" : "POST", body: JSON.stringify(input) });
      router.push(`/projects/${saved.id}`); router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Could not save project."); if (error instanceof ApiError) setFields(error.invalidFields); setBusy(false); }
  }
  return <form onSubmit={submit} className="panel max-w-2xl space-y-6 p-6 sm:p-8">
    <div><label htmlFor="name">Project name</label><input id="name" name="name" required maxLength={120} defaultValue={project?.name} placeholder="Customer portal" aria-invalid={fields.includes("name")} /></div>
    <div><label htmlFor="description">Description <span className="font-normal text-slate-500">(optional)</span></label><textarea id="description" name="description" maxLength={2000} rows={3} defaultValue={project?.description ?? ""} placeholder="What does this project cover?" /></div>
    <div><label htmlFor="baseUrl">Authorized website URL</label><input id="baseUrl" name="baseUrl" type="url" required maxLength={2048} defaultValue={project?.baseUrl} placeholder="https://your-authorized-host.test" aria-describedby="url-help" aria-invalid={fields.includes("baseUrl")} /><p id="url-help" className="mt-2 text-sm leading-6 text-slate-400">Use a site you have permission to test. Its exact hostname must be configured in both the API and worker allowlists.</p></div>
    {error && <p role="alert" className="error-notice">{error}</p>}
    <button className="button inline-flex" disabled={busy}>{busy ? "Saving…" : project ? "Save changes" : "Create project"}</button>
  </form>;
}
