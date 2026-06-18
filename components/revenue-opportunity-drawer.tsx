"use client";

import { useEffect } from "react";
import {
  ArrowRight,
  Banknote,
  Building2,
  MessageSquareQuote,
  Target,
  Users,
  X,
} from "lucide-react";
import { campaignAngleLabel, campaignCopy } from "@/lib/campaign";
import { useEngine } from "@/lib/store";
import { cn } from "@/lib/utils";
import { OFFER_PATHS, PIPELINE_COLUMNS, STAGE_LABELS } from "@/lib/constants";
import { fmtUsdRange } from "@/lib/format";
import { OfferPathChip, SegmentChip } from "@/components/chips";
import { Button, Eyebrow, RecurringDots } from "@/components/ui";
import { FittingScoreBadge } from "@/components/fitting-score-badge";
import { RevenueOpportunityBadge } from "@/components/revenue-opportunity-badge";
import { LeaksLeversCard } from "@/components/leaks-levers-card";
import { LandAndExpandPlanView } from "@/components/land-and-expand-plan";

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function RevenueOpportunityDrawer() {
  const open = useEngine((s) => s.drawerOpen);
  const id = useEngine((s) => s.selectedAccountId);
  const account = useEngine((s) => s.accounts.find((a) => a.id === id) ?? null);
  const closeDrawer = useEngine((s) => s.closeDrawer);
  const setStage = useEngine((s) => s.setStage);
  const campaign = useEngine((s) => s.campaign);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeDrawer();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeDrawer]);

  const path = account ? OFFER_PATHS[account.recommendedDavidOfferPath] : null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
      aria-hidden={!open}
    >
      {/* backdrop */}
      <div
        onClick={closeDrawer}
        className={cn(
          "absolute inset-0 bg-black/55 backdrop-blur-[2px] transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
      />

      {/* panel */}
      <aside
        className={cn(
          "absolute right-0 top-0 flex h-full w-full max-w-[580px] flex-col border-l border-line bg-surface shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {account && path && (
          <>
            {/* header */}
            <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
              <div className="min-w-0">
                <Eyebrow>Campaign Opportunity</Eyebrow>
                <h2 className="mt-1.5 font-display text-2xl font-bold leading-tight text-ink">
                  {account.name}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <SegmentChip segment={account.segment} />
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] text-ink-faint">
                    <Building2 size={12} /> {account.industry}
                  </span>
                  {account.employeeCount && (
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] text-ink-faint">
                      <Users size={12} /> {account.employeeCount}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={closeDrawer}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line text-ink-dim transition-colors hover:bg-surface-2 hover:text-ink"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* scroll body */}
            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              {account.description && (
                <p className="text-[13px] leading-relaxed text-ink-dim">{account.description}</p>
              )}

              {/* verdict: recommended campaign angle + money */}
              <div className="glow-accent rounded-[14px] border border-accent/25 bg-accent/[0.05] p-4">
                <div className="flex items-center justify-between gap-3">
                  <Eyebrow>Recommended campaign angle</Eyebrow>
                  <RecurringDots level={account.recurringRevenuePotential} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <OfferPathChip
                    path={account.recommendedDavidOfferPath}
                    label={campaignAngleLabel(account.recommendedDavidOfferPath, campaign)}
                  />
                  <span className="font-mono text-[11px] text-ink-faint">{path.revenueType}</span>
                </div>
                <div className="mt-3 flex items-start gap-2">
                  <Banknote size={15} className="mt-0.5 shrink-0 text-accent" />
                  <p className="text-[13px] font-medium text-ink">
                    {campaignCopy(account.revenueModel.narrative, campaign)}
                  </p>
                </div>
                <div className="mt-1 grid grid-cols-2 gap-2 pl-[23px] font-mono text-[10.5px] text-ink-faint">
                  <span>first deal · {fmtUsdRange(account.revenueModel.estimatedFirstDealUsd)}</span>
                  <span>
                    recurring · {fmtUsdRange(account.revenueModel.estimatedRecurringMonthlyUsd)}/mo
                  </span>
                </div>
              </div>

              {/* next best action */}
              <div className="flex items-start gap-2.5 rounded-[14px] border border-line bg-surface-2 p-3.5">
                <Target size={15} className="mt-0.5 shrink-0 text-cyan" />
                <div>
                  <Eyebrow>Next best campaign action</Eyebrow>
                  <p className="mt-1 text-[13.5px] font-medium text-ink">
                    {campaignCopy(account.nextBestConversionAction, campaign)}
                  </p>
                </div>
              </div>

              {/* scores */}
              <div className="grid gap-4">
                <FittingScoreBadge fitting={account.fitting} />
                <RevenueOpportunityBadge score={account.revenueOpportunity} />
              </div>

              {/* leaks & levers */}
              <div>
                <Eyebrow className="mb-2">Leaks &amp; Levers · {account.leaks.length}</Eyebrow>
                <div className="space-y-2.5">
                  {account.leaks.map((leak) => (
                    <LeaksLeversCard key={leak.type} leak={leak} campaign={campaign} />
                  ))}
                </div>
              </div>

              {/* land & expand */}
              <div>
                <Eyebrow className="mb-2">Land &amp; expand</Eyebrow>
                <LandAndExpandPlanView plan={account.landAndExpandPlan} campaign={campaign} />
              </div>

              {/* rationale */}
              <div>
                <Eyebrow className="mb-2 flex items-center gap-1.5">
                  <MessageSquareQuote size={12} /> Why this account
                </Eyebrow>
                <ul className="space-y-1.5">
                  {account.rationale.map((r, i) => (
                    <li key={i} className="flex gap-2 text-[12.5px] leading-snug text-ink-dim">
                      <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-accent" />
                      {campaignCopy(r, campaign)}
                    </li>
                  ))}
                </ul>
              </div>

              {/* manual stage control */}
              <div>
                <Eyebrow className="mb-2">Move pipeline stage</Eyebrow>
                <div className="flex flex-wrap gap-1.5">
                  {PIPELINE_COLUMNS.map((stage) => (
                    <button
                      key={stage}
                      onClick={() => setStage(account.id, stage)}
                      className={cn(
                        "rounded-md border px-2 py-1 font-mono text-[10.5px] transition-colors",
                        account.stage === stage
                          ? "border-accent/50 bg-accent/10 text-accent"
                          : "border-line text-ink-dim hover:bg-surface-2 hover:text-ink",
                      )}
                    >
                      {STAGE_LABELS[stage]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* footer actions */}
            <div className="flex gap-2 border-t border-line px-6 py-4">
              <Button
                variant="solid"
                className="flex-1"
                onClick={() => {
                  closeDrawer();
                  scrollToSection("outreach");
                }}
              >
                Draft sequence
                <ArrowRight size={15} />
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  closeDrawer();
                  scrollToSection("router");
                }}
              >
                Route a reply
              </Button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
