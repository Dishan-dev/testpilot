"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FolderKanban, Activity, Settings } from "lucide-react";

const links = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/test-runs", label: "Executions", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Navigation() {
  const pathname = usePathname();
  return <nav aria-label="Main navigation" className="mt-5 flex flex-wrap gap-1 md:mt-0 md:flex-col">{links.map(({ href, label, icon: Icon }) => {
    const active = pathname === href || pathname.startsWith(`${href}/`) || (href === "/test-runs" && pathname.startsWith("/runs/"));
    return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm transition-colors ${active ? "bg-emerald-400/10 text-emerald-200" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}><Icon size={17} aria-hidden="true" />{label}</Link>;
  })}</nav>;
}
