import type { ConfidenceLevel } from "@/lib/types/icp";
import { cn } from "@/lib/utils";

export function ConfidenceBadge({ level }: { level?: ConfidenceLevel }) {
  if (!level) return null;
  return (
    <span
      className={cn(
        "mr-1.5 inline-block h-2 w-2 rounded-full",
        level === "high" && "bg-accent",
        level === "medium" && "bg-amber",
        level === "low" && "bg-ink-faint",
      )}
      title={`${level} confidence`}
    />
  );
}

export function FieldLabel({
  label,
  confidence,
  microcopy,
}: {
  label: string;
  confidence?: ConfidenceLevel;
  microcopy?: string;
}) {
  return (
    <>
      <label className="mb-1.5 flex items-center font-mono text-[11px] uppercase tracking-[0.16em] text-ink-dim">
        <ConfidenceBadge level={confidence} />
        {label}
      </label>
      {microcopy && <p className="mb-2 text-[12px] leading-[1.7] text-ink-faint">{microcopy}</p>}
    </>
  );
}
