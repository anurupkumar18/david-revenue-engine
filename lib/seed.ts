// Builds fully-populated RevenueAccounts from raw seed data by running the
// deterministic scoring + routing engine. This is the single source the entire
// demo reads from — no API keys, no network, fully reproducible.

import rawAccountsJson from "../data/seed-accounts.json";
import { LEAKS, OFFER_PATHS } from "./constants";
import {
  buildLandAndExpandPlan,
  buildRationale,
  buildRevenueModel,
  resolveOfferPath,
} from "./routing";
import {
  computeFittingScore,
  computeRevenueOpportunity,
  computeSignalScore,
  finalRecurringPotential,
} from "./scoring";
import type {
  Confidence,
  DavidLeakType,
  Freshness,
  Leak,
  RevenueAccount,
  Segment,
} from "./types";

type RawLeak = {
  type: DavidLeakType;
  evidence: string;
  confidence: Confidence;
  freshness: Freshness;
  severity: number;
};

type RawAccount = {
  id: string;
  name: string;
  domain?: string;
  industry: string;
  segment: Segment;
  bucket: "local_business" | "applied_ai" | "partner";
  city?: string;
  state?: string;
  geography?: string;
  employeeCount?: number;
  description?: string;
  inputs: { icpFit: number; abilityToPay: number; channel: number };
  leaks: RawLeak[];
};

function enrichLeak(raw: RawLeak): Leak {
  const meta = LEAKS[raw.type];
  return {
    type: raw.type,
    label: meta.label,
    evidence: raw.evidence,
    whyItMatters: meta.whyItMatters,
    leverAngle: meta.leverAngle,
    confidence: raw.confidence,
    freshness: raw.freshness,
    severity: raw.severity,
    provenance: "demo",
    isDemoData: true,
  };
}

function buildAccount(raw: RawAccount): RevenueAccount {
  const leaks = raw.leaks.map(enrichLeak);
  const detectedLeakTypes = leaks.map((l) => l.type);
  const primaryLeak = leaks.reduce((a, b) => (b.severity > a.severity ? b : a)).type;

  const signalScore = computeSignalScore(leaks);
  const fitting = computeFittingScore(raw.inputs.icpFit, signalScore, raw.inputs.channel);

  const recommendedDavidOfferPath = resolveOfferPath(raw.segment, leaks);
  const pathMeta = OFFER_PATHS[recommendedDavidOfferPath];

  const revenueOpportunity = computeRevenueOpportunity({
    icpFit: raw.inputs.icpFit,
    leakSeverity: signalScore,
    abilityToPay: raw.inputs.abilityToPay,
    speedToClose: pathMeta.speedToClose,
    baseRecurringPotential: pathMeta.baseRecurringPotential,
  });

  const recurringRevenuePotential = finalRecurringPotential(
    pathMeta.baseRecurringPotential,
    revenueOpportunity.total,
  );

  const landAndExpandPlan = buildLandAndExpandPlan(recommendedDavidOfferPath);
  const revenueModel = buildRevenueModel(recommendedDavidOfferPath);

  const rationale = buildRationale({
    primaryLeak,
    fittingTotal: fitting.total,
    fittingGrade: fitting.grade,
    fitScore: fitting.fitScore,
    revenueTotal: revenueOpportunity.total,
    revenueGrade: revenueOpportunity.grade,
    recurringPotential: recurringRevenuePotential,
    recommendedPath: recommendedDavidOfferPath,
    firstConversionAction: landAndExpandPlan.firstConversionAction,
  });

  return {
    id: raw.id,
    name: raw.name,
    domain: raw.domain,
    industry: raw.industry,
    segment: raw.segment,
    bucket: raw.bucket,
    city: raw.city,
    state: raw.state,
    geography: raw.geography,
    employeeCount: raw.employeeCount,
    description: raw.description,
    leaks,
    detectedLeakTypes,
    primaryLeak,
    fitting,
    fittingScore: fitting.total,
    revenueOpportunity,
    revenueOpportunityScore: revenueOpportunity.total,
    recurringRevenuePotential,
    recommendedDavidOfferPath,
    revenueModel,
    landAndExpandPlan,
    nextBestConversionAction: landAndExpandPlan.firstConversionAction,
    rationale,
    stage: "researched",
  };
}

const rawAccounts = rawAccountsJson as RawAccount[];

/** All seeded accounts, fully scored and routed (sorted by revenue opportunity, desc). */
export const SEED_ACCOUNTS: RevenueAccount[] = rawAccounts
  .map(buildAccount)
  .sort((a, b) => b.revenueOpportunityScore - a.revenueOpportunityScore);

export function getSeedAccounts(): RevenueAccount[] {
  // Return fresh clones so consumers (e.g. the store) can mutate stage safely.
  return SEED_ACCOUNTS.map((a) => structuredClone(a));
}

export function getSeedAccountById(id: string): RevenueAccount | undefined {
  const found = SEED_ACCOUNTS.find((a) => a.id === id);
  return found ? structuredClone(found) : undefined;
}

export function getSeedAccountsByBucket(
  bucket: RevenueAccount["bucket"],
): RevenueAccount[] {
  return getSeedAccounts().filter((a) => a.bucket === bucket);
}
