import Link from "next/link";
import { PageHeading } from "@/components/page-heading";

export default function OverviewPage() {
  return (
    <>
      <PageHeading eyebrow="YOUR QA WORKSPACE" title="Confidence starts here." description="A clear view of your applications, test runs, and the evidence behind them." />
      <section className="grid gap-4 sm:grid-cols-3" aria-label="Workspace status">
        {[["Projects", "Not connected"], ["Test runs", "No runs yet"], ["Browser engine", "Local CLI"]].map(([label, value]) => (
          <div className="panel p-6" key={label}><p className="text-sm text-slate-400">{label}</p><p className="mt-4 text-2xl font-semibold tracking-tight">{value}</p></div>
        ))}
      </section>
      <section className="panel mt-8 overflow-hidden md:grid md:grid-cols-2">
        <div className="p-7 sm:p-10">
          <span className="badge">MILESTONE 01</span>
          <h2 className="mt-6 text-3xl font-semibold tracking-tight">Your first browser test,<br />one command away.</h2>
          <p className="mt-4 max-w-md leading-7 text-slate-400">Start with an authorized website. TestPilot opens Chromium, checks navigation, and collects a screenshot and browser evidence.</p>
          <Link className="button mt-7 inline-flex" href="/test-runs">Run your first smoke test <span aria-hidden="true">↗</span></Link>
        </div>
        <div className="flex flex-col justify-center border-t border-slate-800 bg-[#0b111b] p-7 sm:p-10 md:border-t-0 md:border-l">
          <div className="mb-6 flex items-center gap-2 text-xs text-slate-500"><span className="h-2 w-2 rounded-full bg-emerald-400" /> LOCAL WORKFLOW</div>
          <ol className="space-y-7">
            {[["01", "Authorize your target", "Choose an exact HTTPS hostname you have permission to test."], ["02", "Run the browser engine", "Execute a headless smoke test from your terminal."], ["03", "Inspect the evidence", "Review the JSON report and full-page screenshot."]].map(([number, title, text]) => (
              <li className="flex gap-4" key={number}><span className="font-mono text-sm text-emerald-400">{number}</span><div><h3 className="font-medium">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-400">{text}</p></div></li>
            ))}
          </ol>
        </div>
      </section>
      <p className="mt-6 text-sm leading-6 text-slate-400">This workspace is an initial preview. Project management and run history will arrive in a future milestone.</p>
    </>
  );
}
