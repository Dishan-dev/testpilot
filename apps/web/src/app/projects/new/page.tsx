import { PageHeading } from "@/components/page-heading";
import { ProjectForm } from "@/components/project-form";
export const metadata = { title: "New project" };
export default function NewProject() {
  return <><PageHeading eyebrow="NEW PROJECT" title="Start with an authorized target." description="Give your application a name and configure its navigation smoke test URL." /><ProjectForm /></>;
}
