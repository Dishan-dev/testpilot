import type { ReactNode } from "react";

export function EmptyState({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return <section className="panel px-6 py-14 text-center"><div aria-hidden="true" className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-xl border border-slate-700 text-2xl text-emerald-300">◇</div><h2 className="text-xl font-semibold">{title}</h2><p className="mx-auto mt-3 max-w-lg leading-7 text-slate-400">{description}</p>{children}</section>;
}
