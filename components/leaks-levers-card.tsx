import { Wrench } from "lucide-react";
import { LeakChip } from "@/components/chips";
import { ProvenanceLabel } from "@/components/provenance-label";
import { ScoreMeter } from "@/components/ui";
import type { Leak } from "@/lib/types";

export function LeaksLeversCard({ leak }: { leak: Leak }) {
  return (
    <div className="panel-2 p-3.5">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <LeakChip type={leak.type} />
        <span className="font-mono text-[10px] text-ink-faint">
          {leak.confidence} confidence · {leak.freshness.replace(/_/g, " ")}
        </span>
        <ProvenanceLabel provenance={leak.provenance} className="ml-auto" />
      </div>

      <p className="text-[13px] leading-snug text-ink-dim">
        <span className="text-ink-faint">Evidence — </span>
        {leak.evidence}
      </p>
      <p className="mt-1.5 text-[13px] leading-snug text-ink-dim">
        <span className="text-ink-faint">Why it matters — </span>
        {leak.whyItMatters}
      </p>

      <div className="mt-2.5 flex items-start gap-1.5 rounded-lg border border-accent/20 bg-accent/[0.06] px-2.5 py-2">
        <Wrench size={13} className="mt-0.5 shrink-0 text-accent" />
        <p className="text-[12.5px] leading-snug text-ink">{leak.leverAngle}</p>
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <span className="font-mono text-[10px] text-ink-faint">severity</span>
        <ScoreMeter value={leak.severity} barClass="bg-amber" className="flex-1" />
        <span className="font-mono text-[11px] text-amber tabular-nums">{leak.severity}</span>
      </div>
    </div>
  );
}
