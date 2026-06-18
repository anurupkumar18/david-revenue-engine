"use client";

import { cn } from "@/lib/utils";

interface Step {
  id: string;
  title: string;
  subtitle: string;
}

export function ProgressRail({ steps, current }: { steps: Step[]; current: number }) {
  return (
    <aside className="hidden w-60 shrink-0 lg:block">
      <div className="sticky top-24">
        <div className="eyebrow mb-2">Campaign Builder</div>
        <div className="mb-7 font-display text-[28px] font-semibold leading-[1.02] text-ink">Campaign profile</div>
        <div className="space-y-2">
          {steps.map((step, i) => (
            <div
              key={step.id}
              className={cn(
                "flex items-start gap-3 rounded-[14px] border px-3 py-3 transition-colors",
                i === current
                  ? "border-accent/40 bg-accent/10"
                  : i < current
                    ? "border-line bg-surface-2/60"
                    : "border-transparent",
              )}
              >
                <div
                  className={cn(
                    "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-[11px]",
                    i === current
                      ? "bg-accent text-[#04130c] font-semibold"
                      : i < current
                      ? "bg-surface-3 text-accent"
                      : "bg-surface-2 text-ink-faint",
                )}
              >
                {i < current ? "✓" : i + 1}
              </div>
                <div>
                <div className="text-[13.5px] font-medium text-ink">{step.title}</div>
                <div className="text-[11.5px] leading-[1.6] text-ink-faint">{step.subtitle}</div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </aside>
  );
}
