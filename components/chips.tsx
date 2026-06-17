import { Cpu, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LEAKS,
  OFFER_PATHS,
  SEGMENT_LABELS,
  STAGE_LABELS,
} from "@/lib/constants";
import { OFFER_PATH_CLASSES, STAGE_CLASSES } from "@/lib/theme";
import type { DavidLeakType, DavidOfferPath, PipelineStage, Segment } from "@/lib/types";

export function SourceBadge({ source }: { source: "deterministic" | "llm" }) {
  const isLlm = source === "llm";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[10px]",
        isLlm
          ? "border-cyan/35 bg-cyan/10 text-cyan"
          : "border-line bg-surface-2 text-ink-faint",
      )}
      title={isLlm ? "Authored by Claude" : "Deterministic engine — works with no API key"}
    >
      {isLlm ? <Sparkles size={10} /> : <Cpu size={10} />}
      {isLlm ? "Claude" : "Deterministic"}
    </span>
  );
}

export function OfferPathChip({
  path,
  className,
}: {
  path: DavidOfferPath;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[11px] whitespace-nowrap",
        OFFER_PATH_CLASSES[path],
        className,
      )}
    >
      {OFFER_PATHS[path].label}
    </span>
  );
}

export function LeakChip({ type, className }: { type: DavidLeakType; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-amber/30 bg-amber/8 px-1.5 py-0.5 font-mono text-[10.5px] text-amber/90 whitespace-nowrap",
        className,
      )}
    >
      {LEAKS[type].label}
    </span>
  );
}

export function SegmentChip({ segment }: { segment: Segment }) {
  return (
    <span className="inline-flex items-center rounded-md border border-line bg-surface-2 px-2 py-0.5 font-mono text-[10.5px] text-ink-dim whitespace-nowrap">
      {SEGMENT_LABELS[segment]}
    </span>
  );
}

export function StageChip({ stage }: { stage: PipelineStage }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border bg-surface-2/60 px-2 py-0.5 font-mono text-[10.5px] whitespace-nowrap",
        STAGE_CLASSES[stage],
      )}
    >
      <span className="h-1 w-1 rounded-full bg-current" />
      {STAGE_LABELS[stage]}
    </span>
  );
}
