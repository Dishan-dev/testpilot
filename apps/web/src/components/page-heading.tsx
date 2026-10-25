export function PageHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="mb-9"><p className="mb-4 font-mono text-xs tracking-[0.15em] text-emerald-300">{eyebrow}</p><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1><p className="mt-4 max-w-2xl text-base leading-7 text-slate-400">{description}</p></div>;
}
