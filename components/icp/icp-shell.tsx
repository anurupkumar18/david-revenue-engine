"use client";

import Link from "next/link";
import { AuthHeader } from "@/components/auth/auth-header";
import { cn } from "@/lib/utils";

const inputCls =
  "w-full rounded-[10px] border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-accent/50";

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
      <header className="sticky top-0 z-40 border-b border-line bg-base/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-3 sm:px-8">
          <Link href="/" className="font-display text-sm font-bold tracking-tight text-ink">
            AI GTM Campaign Builder
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="rounded-[10px] px-3 py-1.5 font-mono text-[11px] text-ink-dim transition-colors hover:bg-surface-2 hover:text-ink"
            >
              Campaigns
            </Link>
            <AuthHeader />
          </nav>
        </div>
      </header>

      <div className={cn("mx-auto flex max-w-[1400px] gap-8 px-5 py-10 sm:px-8", rail && "lg:gap-12")}>
        {rail}
        <main className={cn("flex-1", maxWidth)}>{children}</main>
      </div>
    </div>
  );
}

export function IcpPageHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <div className="reveal mb-8 max-w-2xl">
      <div className="eyebrow mb-2">{eyebrow}</div>
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{title}</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-dim">{subtitle}</p>
    </div>
  );
}

export function IcpFieldGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mb-5", className)}>{children}</div>;
}

export function IcpInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={inputCls} {...props} />;
}

export function IcpTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(inputCls, "resize-none leading-relaxed")}
      {...props}
    />
  );
}

export function IcpSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={inputCls} {...props} />;
}

export { inputCls };
