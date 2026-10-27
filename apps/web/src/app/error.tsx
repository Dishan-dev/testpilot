"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <section className="panel p-8"><h1 className="text-2xl font-semibold">Could not load this page</h1><p role="alert" className="my-4 max-w-xl leading-7 text-slate-400">The API may be unavailable, or this project or run may no longer exist. Check that PostgreSQL and the backend are running, then try again.</p><button className="button inline-flex" onClick={reset}>Try again</button></section>;
}
