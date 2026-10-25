import type { Metadata } from "next";
import { PageHeading } from "@/components/page-heading";

export const metadata: Metadata = { title: "Settings" };
export default function SettingsPage() {
  return <><PageHeading eyebrow="SETTINGS" title="A focused starting point." description="Your development workspace is ready for local browser testing. Workspace preferences will follow in a future milestone." /><section className="panel p-6 sm:p-8"><h2 className="text-xl font-semibold">Workspace capabilities</h2><dl className="mt-6 divide-y divide-slate-800">{[["Browser testing", "Available through the local CLI"], ["Project storage", "Planned"], ["Run history", "Planned"], ["Team access", "Planned"]].map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-2 py-5 text-sm"><dt className="text-slate-300">{label}</dt><dd className="text-slate-400">{value}</dd></div>)}</dl></section></>;
}
