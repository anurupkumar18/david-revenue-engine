"use client";

import { ChevronRight } from "lucide-react";
import { campaignAngleLabel, campaignCopy } from "@/lib/campaign";
import { useEngine } from "@/lib/store";
import { cn } from "@/lib/utils";
import { GRADE_CLASSES } from "@/lib/theme";
import { LeakChip, OfferPathChip, SegmentChip, StageChip } from "@/components/chips";
import { RecurringDots } from "@/components/ui";
import type { RevenueAccount } from "@/lib/types";

function ScoreCell({ score, grade }: { score: number; grade: RevenueAccount["fitting"]["grade"] }) {
  const c = GRADE_CLASSES[grade];
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className={cn("font-mono text-[15px] font-semibold tabular-nums", c.text)}>{score}</span>
      <span className={cn("font-mono text-[10px]", c.text, "opacity-70")}>{grade}</span>
    </span>
  );
}

const COLS = [
  "Company",
  "Segment",
  "Top leak",
  "Fit",
  "Rev Opp",
  "Campaign angle",
  "Recurring",
  "Stage",
];

export function AccountTable() {
  const accounts = useEngine((s) => s.accounts);
  const selectAccount = useEngine((s) => s.selectAccount);
  const selectedId = useEngine((s) => s.selectedAccountId);
  const campaign = useEngine((s) => s.campaign);

  if (accounts.length === 0) {
    return (
      <div className="panel grid place-items-center px-6 py-16 text-center">
        <p className="font-display text-lg text-ink">No accounts on the board.</p>
        <p className="mt-1 max-w-sm text-sm text-ink-dim">
          Load a campaign profile above to see signals, fit scores, campaign angles, and recurring
          opportunity.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* desktop table */}
      <div className="panel hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line">
                {COLS.map((c) => (
                  <th
                    key={c}
                    className="px-4 py-3 font-mono text-[10px] font-normal uppercase tracking-wider text-ink-faint"
                  >
                    {c}
                  </th>
                ))}
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {accounts.map((a, i) => (
                <tr
                  key={a.id}
                  onClick={() => selectAccount(a.id)}
                  className={cn(
                    "hover-row reveal cursor-pointer border-b border-line/60 last:border-0",
                    selectedId === a.id && "bg-surface-2",
                  )}
                  style={{ animationDelay: `${Math.min(i * 35, 400)}ms` }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {a.fitting.grade === "A" && (
                        <span className="pulse-a h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      )}
                      <div className={cn(a.fitting.grade !== "A" && "pl-[16px]")}>
                        <div className="font-display text-[14px] font-semibold leading-tight text-ink">
                          {a.name}
                        </div>
                        <div className="mt-0.5 font-mono text-[10.5px] text-ink-faint">
                          {a.industry}
                          {a.geography ? ` · ${a.geography}` : ""}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <SegmentChip segment={a.segment} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <LeakChip type={a.primaryLeak} />
                      {a.detectedLeakTypes.length > 1 && (
                        <span className="font-mono text-[10px] text-ink-faint">
                          +{a.detectedLeakTypes.length - 1}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <ScoreCell score={a.fittingScore} grade={a.fitting.grade} />
                  </td>
                  <td className="px-4 py-3">
                    <ScoreCell score={a.revenueOpportunityScore} grade={a.revenueOpportunity.grade} />
                  </td>
                  <td className="px-4 py-3">
                    <OfferPathChip
                      path={a.recommendedDavidOfferPath}
                      label={campaignAngleLabel(a.recommendedDavidOfferPath, campaign)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <RecurringDots level={a.recurringRevenuePotential} showLabel={false} />
                  </td>
                  <td className="px-4 py-3">
                    <StageChip stage={a.stage} />
                  </td>
                  <td className="pr-3">
                    <ChevronRight size={15} className="text-ink-faint" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* mobile cards */}
      <div className="space-y-2.5 md:hidden">
        {accounts.map((a) => (
          <button
            key={a.id}
            onClick={() => selectAccount(a.id)}
            className="panel hover-row w-full p-4 text-left"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-display text-[15px] font-semibold text-ink">{a.name}</div>
                <div className="mt-0.5 font-mono text-[10.5px] text-ink-faint">{a.industry}</div>
              </div>
              <div className="flex items-center gap-3 text-right">
                <ScoreCell score={a.revenueOpportunityScore} grade={a.revenueOpportunity.grade} />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <LeakChip type={a.primaryLeak} />
              <OfferPathChip
                path={a.recommendedDavidOfferPath}
                label={campaignAngleLabel(a.recommendedDavidOfferPath, campaign)}
              />
              <RecurringDots level={a.recurringRevenuePotential} />
            </div>
            <p className="mt-2.5 text-[12.5px] text-ink-dim">
              <span className="text-ink-faint">Next — </span>
              {campaignCopy(a.nextBestConversionAction, campaign)}
            </p>
          </button>
        ))}
      </div>
    </>
  );
}
