import { request, type PageData, type TestRun } from "@/lib/api";
import { PageHeading } from "@/components/page-heading";
import { LiveHistory } from "@/components/live-history";
import { Pagination } from "@/components/pagination";
export const metadata = { title: "Executions" };
export default async function RunsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page = "0" } = await searchParams;
  const path = `/api/runs?page=${encodeURIComponent(page)}&size=20`;
  const runs = await request<PageData<TestRun>>(path);
  return <><PageHeading eyebrow="EXECUTIONS" title="Every run. All the evidence." description="Track navigation checks across your projects and inspect their captured results." /><LiveHistory key={path} initial={runs} endpoint={path} /><Pagination {...runs} path="/test-runs" /></>;
}
