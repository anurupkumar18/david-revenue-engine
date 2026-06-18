"use client";

import Link from "next/link";
import { AuthHeader } from "@/components/auth/auth-header";
import { cn } from "@/lib/utils";

const inputCls =
  "w-full rounded-[12px] border border-line bg-surface-2/80 px-3 py-2.5 text-[13px] text-ink outline-none placeholder:text-ink-faint focus:border-accent/50";

export function IcpShell({
  children,
  rail,
  maxWidth = "max-w-3xl",
}: {
  children: React.ReactNode;
  rail?: React.ReactNode;
  maxWidth?: string;
}) {
  return (
    <div className="relative z-10 min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line bg-base/92">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="leading-none">
            <span className="block font-display text-[16px] font-semibold tracking-[0.01em] text-ink">
              DAVID <span className="text-accent">AI</span>
            </span>
            <span className="mt-1 block font-mono text-[10px] tracking-[0.24em] text-ink-faint">
              CAMPAIGN INTELLIGENCE
            </span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="rounded-[12px] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-dim transition-colors hover:bg-white/5 hover:text-ink"
            >
              Campaigns
            </Link>
            <AuthHeader />
            <Link
              href="/briefs"
              className="rounded-[12px] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-dim transition-colors hover:bg-white/5 hover:text-ink"
            >
              Briefs
            </Link>
          </nav>
        </div>
      </header>

      <div className={cn("mx-auto flex max-w-[1400px] gap-8 px-5 py-12 sm:px-8 sm:py-14", rail && "lg:gap-14")}>
        {rail}
        <main className={cn("flex-1", maxWidth)}>{children}</main>
      </div>
    </div>
  );
}

export function IcpPageHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <div className="reveal mb-10 max-w-2xl">
      <div className="eyebrow mb-3">{eyebrow}</div>
      <h1 className="section-title text-[clamp(2.4rem,3vw+1rem,4rem)]">{title}</h1>
      <p className="mt-4 text-[15px] leading-[1.8] text-ink-dim">{subtitle}</p>
    </div>
  );
}

export function IcpFieldGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mb-5", className)}>{children}</div>;
}

export function IcpInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputCls, className)} {...props} />;
}

export function IcpTextarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(inputCls, "resize-none leading-relaxed", className)}
      {...props}
    />
  );
}

export function IcpSelect({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(inputCls, className)} {...props} />;
}

export { inputCls };
