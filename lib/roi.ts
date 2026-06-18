// Deterministic ROI / proof math. Pure functions over the account revenue models and
// fitting grades — no events, no LLM, no network — so the numbers are reproducible and
// defensible ("here's exactly how we computed it"), not invented.

import type { CampaignMetrics } from "./campaign";
import type { RevenueAccount } from "./types";

const mid = (r: [number, number]) => (r[0] + r[1]) / 2;

// Share of a cold, unfiltered list that is even on-target, used for a like-for-like
// "vs spray-and-pray" comparison. Conservative industry-style baseline.
const BASELINE_ONTARGET_SHARE = 15; // %

export type CampaignRoi = {
  targetedAccounts: number;
  highFitAccounts: number;
  highFitShare: number; // %
  qualifiedPipelineMonthly: number; // $ recurring/mo across working accounts
  qualifiedPipelineAnnual: number; // $ recurring/yr
  liftVsBaseline: number; // × more on-target than an unfiltered list
  projectedMeetings: number; // working accounts × (live or modeled) meeting rate
};

/** Modeled meeting rate (%) from fit when there's no live meeting data yet, so the
 * projection is never a flat zero on a fresh campaign. */
function modeledMeetingRate(highFitShare: number): number {
  // High-fit, signal-led lists convert better; keep it conservative.
  return Math.round(Math.min(35, 6 + highFitShare * 0.2));
}

export function computeRoi(accounts: RevenueAccount[], metrics?: CampaignMetrics | null): CampaignRoi {
  const working = accounts.filter((a) => a.stage !== "closed_lost" && a.stage !== "suppressed");
  const monthly = working.reduce(
    (sum, a) => sum + mid(a.revenueModel.estimatedRecurringMonthlyUsd),
    0,
  );
  const highFitAccounts = accounts.filter(
    (a) => a.fitting.grade === "A" || a.fitting.grade === "B",
  ).length;
  const highFitShare = accounts.length ? Math.round((highFitAccounts / accounts.length) * 100) : 0;
  const liftVsBaseline = Math.max(
    1,
    Math.round((highFitShare / BASELINE_ONTARGET_SHARE) * 10) / 10,
  );
  const meetingRate = metrics && metrics.meetingRate > 0 ? metrics.meetingRate : modeledMeetingRate(highFitShare);
  const projectedMeetings = Math.round((working.length * meetingRate) / 100);

  return {
    targetedAccounts: accounts.length,
    highFitAccounts,
    highFitShare,
    qualifiedPipelineMonthly: monthly,
    qualifiedPipelineAnnual: monthly * 12,
    liftVsBaseline,
    projectedMeetings,
  };
}
