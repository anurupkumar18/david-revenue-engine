"use client";

import { cn } from "@/lib/utils";

interface Step {
  id: string;
  title: string;
  subtitle: string;
}

export function ProgressRail({ steps, current }: { steps: Step[]; current: number }) {
  return (
    <aside className="hidden w-56 shrink-0 lg:block">
      <div className="sticky top-24">
        <div className="eyebrow mb-1">Campaign Builder</div>
        <div className="mb-6 font-display text-lg font-bold text-ink">Campaign profile</div>
        <div className="space-y-1">
          {steps.map((step, i) => (
            <div
              key={step.id}
              className={cn(
                "flex items-start gap-3 rounded-[12px] border px-3 py-2.5 transition-colors",
                i === current
                  ? "border-accent/40 bg-accent/10"
                  : i < current
                    ? "border-line bg-surface-2/60"
                    : "border-transparent",
              )}
            >
              <div
                className={cn(
                  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[11px]",
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
                <div className="text-[13px] font-medium text-ink">{step.title}</div>
                <div className="text-[11px] text-ink-faint">{step.subtitle}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
