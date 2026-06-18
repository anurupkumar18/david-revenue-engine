import { CircleCheck, CircleDot, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Provenance } from "@/lib/types";

const MAP: Record<Provenance, { label: string; cls: string; Icon: typeof CircleDot }> = {
  verified: { label: "verified", cls: "text-accent", Icon: CircleCheck },
  inferred: { label: "inferred", cls: "text-amber", Icon: CircleDot },
  demo: { label: "demo data", cls: "text-ink-faint", Icon: FlaskConical },
};

export function ProvenanceLabel({
  provenance,
  className,
}: {
  provenance: Provenance;
  className?: string;
}) {
  const { label, cls, Icon } = MAP[provenance];
  return (
    <span className={cn("inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.12em]", cls, className)}>
      <Icon size={11} />
      {label}
    </span>
  );
}
