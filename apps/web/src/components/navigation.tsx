"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Overview", icon: "◈" },
  { href: "/projects", label: "Projects", icon: "▣" },
  { href: "/test-runs", label: "Test Runs", icon: "▷" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export function Navigation() {
  const pathname = usePathname();
  return <nav aria-label="Main navigation" className="mt-5 flex flex-wrap gap-1 md:mt-0 md:flex-col">{links.map(({ href, label, icon }) => {
    const active = pathname === href;
    return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm transition-colors ${active ? "bg-emerald-400/10 text-emerald-200" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}><span aria-hidden="true" className="w-4 text-center">{icon}</span>{label}</Link>;
  })}</nav>;
}
