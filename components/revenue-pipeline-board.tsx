"use client";

import { useEngine } from "@/lib/store";
import { cn } from "@/lib/utils";
import { PIPELINE_COLUMNS, STAGE_LABELS } from "@/lib/constants";
import { fmtMoneyCompact } from "@/lib/format";
import { STAGE_CLASSES } from "@/lib/theme";
import { GradePill } from "@/components/ui";
import { OfferPathChip } from "@/components/chips";
import type { RevenueAccount } from "@/lib/types";

const mid = (r: [number, number]) => (r[0] + r[1]) / 2;

export function RevenuePipelineBoard() {
  const accounts = useEngine((s) => s.accounts);
  const selectAccount = useEngine((s) => s.selectAccount);

  const byStage = new Map<string, RevenueAccount[]>();
  for (const a of accounts) {
    const list = byStage.get(a.stage) ?? [];
    list.push(a);
    byStage.set(a.stage, list);
  }

  // Show columns that have cards, always keeping the core early stages visible.
  const columns = PIPELINE_COLUMNS.filter(
    (s) => (byStage.get(s)?.length ?? 0) > 0 || ["researched", "meeting_ready", "info_sent"].includes(s),
  );

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-3" style={{ minWidth: columns.length * 230 }}>
        {columns.map((stage) => {
          const list = byStage.get(stage) ?? [];
          const monthly = list
            .filter((a) => stage !== "suppressed")
            .reduce((sum, a) => sum + mid(a.revenueModel.estimatedRecurringMonthlyUsd), 0);
          return (
            <div key={stage} className="w-[220px] shrink-0">
              <div className="mb-2 flex items-center justify-between px-1">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 font-mono text-[11px]",
                    STAGE_CLASSES[stage].split(" ")[0],
                  )}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {STAGE_LABELS[stage]}
                </span>
                <span className="font-mono text-[10px] text-ink-faint">{list.length}</span>
              </div>

              <div className="space-y-2 rounded-[12px] border border-line/60 bg-surface/40 p-2">
                {monthly > 0 && (
                  <div className="px-1 pb-0.5 font-mono text-[10px] text-ink-faint">
                    {fmtMoneyCompact(monthly)}/mo potential
                  </div>
                )}
                {list.length === 0 ? (
                  <div className="grid place-items-center py-6 font-mono text-[10px] text-ink-faint">
                    empty
                  </div>
                ) : (
                  list.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => selectAccount(a.id)}
                      className="hover-row panel-2 block w-full p-2.5 text-left"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-display text-[12.5px] font-semibold leading-tight text-ink">
                          {a.name}
                        </span>
                        <GradePill grade={a.revenueOpportunity.grade} />
                      </div>
                      <div className="mt-1.5">
                        <OfferPathChip path={a.recommendedDavidOfferPath} />
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-ink-faint">
                        {a.nextBestConversionAction}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
