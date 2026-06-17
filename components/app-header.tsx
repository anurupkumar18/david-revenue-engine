"use client";

import { Activity } from "lucide-react";
import { pipelineRecurringMonthly, useEngine } from "@/lib/store";
import { fmtMoneyCompact } from "@/lib/format";

const NAV = [
  { href: "#strategy", label: "Strategy" },
  { href: "#accounts", label: "Accounts" },
  { href: "#outreach", label: "Outreach" },
  { href: "#router", label: "Router" },
  { href: "#pipeline", label: "Pipeline" },
];

export function AppHeader() {
  const accounts = useEngine((s) => s.accounts);
  const monthly = pipelineRecurringMonthly(accounts);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-base/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-4 px-5 sm:px-8">
        {/* mark + wordmark */}
        <a href="#top" className="group flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-[10px] border border-accent/40 bg-accent/10 text-accent">
            <span className="font-display text-lg font-extrabold leading-none">D</span>
          </span>
          <span className="leading-none">
            <span className="block font-display text-[15px] font-bold tracking-tight text-ink">
              David Revenue Engine
            </span>
            <span className="mt-0.5 block font-mono text-[10px] tracking-wide text-ink-faint">
              GTM FITTING ENGINE
            </span>
          </span>
        </a>

        {/* nav */}
        <nav className="ml-6 hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="rounded-md px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-dim transition-colors hover:bg-surface-2 hover:text-ink"
            >
              {n.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {/* pipeline ticker */}
          <div className="hidden items-center gap-2 rounded-[10px] border border-line bg-surface-2/60 px-3 py-1.5 sm:flex">
            <Activity size={14} className="text-accent" />
            <span className="font-mono text-[11px] text-ink-dim">in play</span>
            <span className="font-mono text-sm font-semibold text-accent tabular-nums">
              {fmtMoneyCompact(monthly)}
              <span className="text-ink-faint">/mo</span>
            </span>
          </div>
          {/* demo pill */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber/40 bg-amber/10 px-2.5 py-1">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-amber">Demo</span>
          </span>
        </div>
      </div>
    </header>
  );
}
