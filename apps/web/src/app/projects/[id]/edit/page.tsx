import { request, type Project } from "@/lib/api";
import { PageHeading } from "@/components/page-heading";
import { ProjectForm } from "@/components/project-form";
import { DeleteProject } from "@/components/delete-project";
export default async function EditProject({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await request<Project>(`/api/projects/${encodeURIComponent(id)}`);
  return <><PageHeading eyebrow="PROJECT SETTINGS" title="Edit project." description="Updates apply to future runs. Existing runs retain their submitted URL." /><ProjectForm project={project} /><DeleteProject id={project.id} /></>;
}
