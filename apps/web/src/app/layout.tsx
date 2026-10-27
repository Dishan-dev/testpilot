import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { Navigation } from "@/components/navigation";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "TestPilot · Workspace", template: "%s · TestPilot" },
  description: "Your workspace for browser testing and evidence you can inspect.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-link">Skip to content</a>
        <div className="app-shell">
          <aside className="sidebar">
            <Link href="/" className="flex items-center gap-3 text-xl font-semibold tracking-tight" aria-label="TestPilot home"><span className="brand-mark" aria-hidden="true">T</span>TestPilot<span className="text-emerald-400">.</span></Link>
            <div className="mt-10 mb-3 hidden text-[10px] font-semibold tracking-[0.18em] text-slate-500 md:block">WORKSPACE</div>
            <Suspense fallback={<div className="mt-5 text-sm text-slate-400">Loading navigation…</div>}><Navigation /></Suspense>
            <div className="mt-auto hidden border-t border-slate-800 pt-5 md:block"><p className="text-sm text-slate-300">Development workspace</p><p className="mt-1 text-xs text-slate-500">Browser testing foundation</p></div>
          </aside>
          <div className="min-w-0">
            <header className="flex h-20 items-center justify-between border-b border-slate-800 px-6 sm:px-10"><span className="text-sm text-slate-400">Workspace <span className="px-2 text-slate-600">/</span> TestPilot</span><span className="badge">LOCAL PREVIEW</span></header>
            <main id="main-content" className="mx-auto max-w-7xl px-6 py-10 sm:px-10 sm:py-12">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
