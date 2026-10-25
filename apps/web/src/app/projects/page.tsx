import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeading } from "@/components/page-heading";

export const metadata: Metadata = { title: "Projects" };
export default function ProjectsPage() {
  return <><PageHeading eyebrow="PROJECTS" title="A home for every application." description="Keep your testing work organized around the applications you build." /><EmptyState title="No projects connected yet" description="Project creation and storage are planned for the next milestone. You can already test an authorized website with the local browser engine."><Link className="button mt-6 inline-flex" href="/test-runs">Explore browser testing <span aria-hidden="true">→</span></Link></EmptyState></>;
}
