// Deterministic scoring: Fit Score + Revenue Opportunity Score.
// Pure functions — same inputs always produce the same scores (demo-safe).

import { RECURRING_POTENTIAL_VALUE } from "./constants";
import type {
  Confidence,
  FittingScore,
  Freshness,
  Grade,
  Leak,
  RecurringRevenuePotential,
  RevenueOpportunityScore,
} from "./types";

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
export const round = (n: number) => Math.round(n);

export function gradeFor(score: number): Grade {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 50) return "C";
  return "D";
}

const CONFIDENCE_MULT: Record<Confidence, number> = { low: 0.82, medium: 0.92, high: 1.0 };
const FRESHNESS_MULT: Record<Freshness, number> = {
  today: 1.0,
  this_week: 0.97,
  this_month: 0.93,
  older: 0.85,
  unknown: 0.9,
};

/**
 * Signal score from the detected leaks. The dominant (most severe) leak carries
 * the most weight; supporting leaks add a smaller boost. Confidence and freshness
 * discount the raw severity.
 */
export function computeSignalScore(leaks: Leak[]): number {
  if (leaks.length === 0) return 0;
  const adjusted = leaks
    .map((l) => l.severity * CONFIDENCE_MULT[l.confidence] * FRESHNESS_MULT[l.freshness])
    .sort((a, b) => b - a);

  const dominant = adjusted[0];
  const support = adjusted.slice(1).reduce((sum, v) => sum + v, 0);
  // dominant leak + diminishing contribution from the rest
  return clamp(round(dominant + Math.min(18, support * 0.18)));
}

/** Fit Score = fit*0.45 + signal*0.40 + channel*0.15 (rules.md). */
export function computeFittingScore(
  fitScore: number,
  signalScore: number,
  channelScore: number,
): FittingScore {
  const total = clamp(round(fitScore * 0.45 + signalScore * 0.4 + channelScore * 0.15));
  return {
    fitScore: clamp(round(fitScore)),
    signalScore: clamp(round(signalScore)),
    channelScore: clamp(round(channelScore)),
    total,
    grade: gradeFor(total),
  };
}

/**
 * Revenue Opportunity Score (addendum):
 *   icpFit*0.25 + leakSeverity*0.25 + abilityToPay*0.20 + speedToClose*0.15 + recurring*0.15
 */
export function computeRevenueOpportunity(args: {
  icpFit: number;
  leakSeverity: number;
  abilityToPay: number;
  speedToClose: number;
  baseRecurringPotential: RecurringRevenuePotential;
}): RevenueOpportunityScore {
  const recurring = RECURRING_POTENTIAL_VALUE[args.baseRecurringPotential];
  const total = clamp(
    round(
      args.icpFit * 0.25 +
        args.leakSeverity * 0.25 +
        args.abilityToPay * 0.2 +
        args.speedToClose * 0.15 +
        recurring * 0.15,
    ),
  );
  return {
    icpFit: clamp(round(args.icpFit)),
    leakSeverity: clamp(round(args.leakSeverity)),
    abilityToPay: clamp(round(args.abilityToPay)),
    speedToClose: clamp(round(args.speedToClose)),
    recurringRevenuePotential: recurring,
    total,
    grade: gradeFor(total),
  };
}

const POTENTIAL_ORDER: RecurringRevenuePotential[] = ["low", "medium", "high", "very_high"];

/** Final categorical recurring potential: base tier, bumped one level for an A-grade opportunity. */
export function finalRecurringPotential(
  base: RecurringRevenuePotential,
  revenueOpportunityScore: number,
): RecurringRevenuePotential {
  const idx = POTENTIAL_ORDER.indexOf(base);
  const bumped = revenueOpportunityScore >= 85 ? Math.min(idx + 1, POTENTIAL_ORDER.length - 1) : idx;
  return POTENTIAL_ORDER[bumped];
}
