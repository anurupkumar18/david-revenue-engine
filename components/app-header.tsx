"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

const NAV = [
  { href: "#strategy", label: "Strategy" },
  { href: "#filters", label: "Signals" },
  { href: "#accounts", label: "Accounts" },
  { href: "#outreach", label: "Sequence" },
  { href: "#sending", label: "Sending" },
  { href: "#tracker", label: "Tracker" },
  { href: "#agency", label: "Agency" },
];

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-base/92">
      <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-5 py-4 sm:px-8">
        <Link href={pathname === "/" ? "#top" : "/"} className="group flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-[12px] border border-accent/35 bg-accent/10 text-accent shadow-[0_10px_26px_-18px_rgba(209,45,59,0.85)]">
            <span className="font-display text-xl font-semibold leading-none">D</span>
          </span>
          <span className="leading-none">
            <span className="block font-display text-[16px] font-semibold tracking-[0.01em] text-ink">
              DAVID <span className="text-accent">AI</span>
            </span>
            <span className="mt-1 block font-mono text-[10px] tracking-[0.28em] text-ink-faint">
              CAMPAIGN INTELLIGENCE
            </span>
          </span>
        </Link>

        <nav className="ml-6 hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="rounded-md px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.24em] text-ink-dim transition-colors hover:bg-white/5 hover:text-ink"
            >
              {n.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-[12px] border border-line bg-surface-2/70 px-3 py-2 sm:flex">
            <span className="h-2 w-2 rounded-full bg-accent" />
            <span className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-ink-dim">
              Demo Workspace
            </span>
            <ChevronRight size={12} className="text-ink-faint" />
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber/35 bg-amber/10 px-2.5 py-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber">
              Keyless demo
            </span>
          </span>
          <Link
            href="/wizard"
            className="hidden rounded-[12px] border border-accent/35 bg-accent px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[#fff8ef] transition-transform hover:-translate-y-px hover:bg-[#df3645] md:inline-flex"
          >
            New campaign
          </Link>
        </div>
      </div>
    </header>
  );
}
