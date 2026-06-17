import * as React from "react";
import { cn } from "@/lib/utils";
import { GRADE_CLASSES, RECURRING_CLASSES, RECURRING_DOTS } from "@/lib/theme";
import { RECURRING_POTENTIAL_LABELS } from "@/lib/constants";
import type { Grade, RecurringRevenuePotential } from "@/lib/types";

// --- Button -----------------------------------------------------------------

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "solid" | "outline" | "ghost";
  size?: "sm" | "md";
  active?: boolean;
};

export function Button({
  variant = "outline",
  size = "md",
  active = false,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[10px] font-medium transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none cursor-pointer",
        size === "sm" ? "px-3 py-1.5 text-[13px]" : "px-4 py-2 text-sm",
        variant === "solid" &&
          "bg-accent text-[#04130c] hover:brightness-110 hover:-translate-y-px font-semibold",
        variant === "outline" &&
          cn(
            "border bg-surface-2/60 text-ink hover:bg-surface-3 hover:border-line-strong",
            active && "border-accent/50 text-accent bg-accent/10",
          ),
        variant === "ghost" && "text-ink-dim hover:text-ink hover:bg-surface-2",
        className,
      )}
      {...props}
    />
  );
}

// --- Eyebrow / section label ------------------------------------------------

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("eyebrow", className)}>{children}</div>;
}

// --- Grade pill -------------------------------------------------------------

export function GradePill({
  grade,
  score,
  className,
}: {
  grade: Grade;
  score?: number;
  className?: string;
}) {
  const c = GRADE_CLASSES[grade];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-xs",
        c.pill,
        className,
      )}
    >
      <span className="font-semibold">{grade}</span>
      {score != null && <span className="opacity-80">{score}</span>}
    </span>
  );
}

// --- Score meter ------------------------------------------------------------

export function ScoreMeter({
  value,
  barClass = "bg-accent",
  className,
}: {
  value: number;
  barClass?: string;
  className?: string;
}) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-3", className)}>
      <div
        className={cn("h-full rounded-full transition-[width] duration-500", barClass)}
        style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
      />
    </div>
  );
}

// --- Recurring potential dots ----------------------------------------------

export function RecurringDots({
  level,
  showLabel = true,
}: {
  level: RecurringRevenuePotential;
  showLabel?: boolean;
}) {
  const filled = RECURRING_DOTS[level];
  const c = RECURRING_CLASSES[level];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-flex items-center gap-[3px]">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn("h-1.5 w-1.5 rounded-full", i < filled ? c.dot : "bg-surface-3")}
          />
        ))}
      </span>
      {showLabel && (
        <span className={cn("font-mono text-[11px]", c.text)}>
          {RECURRING_POTENTIAL_LABELS[level]}
        </span>
      )}
    </span>
  );
}
