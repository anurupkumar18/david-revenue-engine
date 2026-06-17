// Deterministic routing: leak -> David offer path, land-and-expand plan,
// revenue model framing, and human-readable rationale.

import { LEAKS, OFFER_PATHS, RECURRING_POTENTIAL_LABELS } from "./constants";
import type {
  DavidLeakType,
  DavidOfferPath,
  Grade,
  LandAndExpandPlan,
  Leak,
  RecurringRevenuePotential,
  RevenueModelSummary,
  Segment,
} from "./types";

// ---------------------------------------------------------------------------
// Offer-path resolution
// ---------------------------------------------------------------------------

/** Resolve a single leak to an offer path, honoring segment-sensitive cases. */
function leakToOffer(type: DavidLeakType, segment: Segment): DavidOfferPath {
  if (type === "ai_capability_gap") {
    return segment === "platform" || segment === "agency"
      ? "white_label_deployment"
      : "embedded_ai_team";
  }
  if (type === "platform_distribution") {
    return segment === "agency" ? "partner_program" : "white_label_deployment";
  }
  return LEAKS[type].recommendedPath;
}

/**
 * Resolve the recommended David offer path for an account.
 * Channel/platform segments route by distribution first; everyone else routes by
 * a severity-weighted vote across detected leaks.
 */
export function resolveOfferPath(segment: Segment, leaks: Leak[]): DavidOfferPath {
  const types = leaks.map((l) => l.type);

  if (segment === "agency") return "partner_program";
  if (segment === "platform" && (types.includes("platform_distribution") || types.includes("ai_capability_gap"))) {
    return "white_label_deployment";
  }

  const votes = new Map<DavidOfferPath, number>();
  for (const leak of leaks) {
    const path = leakToOffer(leak.type, segment);
    votes.set(path, (votes.get(path) ?? 0) + leak.severity);
  }

  let best: DavidOfferPath = "growth_plan";
  let bestScore = -1;
  for (const [path, score] of votes) {
    if (score > bestScore) {
      best = path;
      bestScore = score;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Land-and-expand
// ---------------------------------------------------------------------------

type PlanTemplate = Omit<LandAndExpandPlan, "revenueLogic"> & { revenueLogic: string };

const PLAN_TEMPLATES: Record<DavidOfferPath, PlanTemplate> = {
  david_marketing: {
    landOffer: "growth_plan",
    firstConversionAction: "Send a short local visibility teardown.",
    expansionOffer: "david_marketing",
    longTermOffer: "custom_agent",
    revenueLogic:
      "Start with a low-friction growth plan, convert into a monthly David Marketing retainer, then expand into AI follow-up or a voice agent once lead flow increases.",
  },
  growth_plan: {
    landOffer: "growth_plan",
    firstConversionAction: "Send a quick growth plan for their market.",
    expansionOffer: "david_marketing",
    longTermOffer: "custom_agent",
    revenueLogic:
      "The growth plan is the wedge; once it lifts conversion, expand into a monthly marketing retainer and later an AI agent for follow-up.",
  },
  the_fitting: {
    landOffer: "the_fitting",
    firstConversionAction: "Offer a 30-minute AI Fitting on the biggest bottleneck.",
    expansionOffer: "custom_agent",
    longTermOffer: "custom_ai_os",
    revenueLogic:
      "A paid Fitting diagnoses the bottleneck and scopes the first automation, which expands into a broader AI operating layer.",
  },
  custom_agent: {
    landOffer: "custom_agent",
    firstConversionAction: "Offer a 2-minute teardown of the leaking workflow.",
    expansionOffer: "custom_ai_os",
    longTermOffer: "embedded_ai_team",
    revenueLogic:
      "Land with one high-ROI agent, prove payback, then expand into a full AI OS and ongoing embedded execution.",
  },
  custom_ai_os: {
    landOffer: "the_fitting",
    firstConversionAction: "Scope an AI Fitting across locations and reporting.",
    expansionOffer: "custom_ai_os",
    longTermOffer: "embedded_ai_team",
    revenueLogic:
      "A Fitting frames the multi-location problem; the build becomes a custom AI OS, sustained by an embedded AI team.",
  },
  embedded_ai_team: {
    landOffer: "the_fitting",
    firstConversionAction: "Open a conversation on where an embedded AI team pays back fastest.",
    expansionOffer: "embedded_ai_team",
    longTermOffer: "custom_ai_os",
    revenueLogic:
      "Start with a Fitting to prove value, then place an ongoing embedded AI team retainer, expanding into a custom AI OS.",
  },
  white_label_deployment: {
    landOffer: "partner_program",
    firstConversionAction: "Start a partner conversation around white-label AI deployment.",
    expansionOffer: "white_label_deployment",
    longTermOffer: "embedded_ai_team",
    revenueLogic:
      "The platform already has distribution. David earns recurring revenue by deploying branded AI across the platform's client base, then embedding a team to run it.",
  },
  partner_program: {
    landOffer: "partner_program",
    firstConversionAction: "Open a quick partner conversation.",
    expansionOffer: "white_label_deployment",
    longTermOffer: "embedded_ai_team",
    revenueLogic:
      "Land a channel partnership, then expand into a white-label deployment across their clients and an embedded team for delivery.",
  },
};

export function buildLandAndExpandPlan(recommendedPath: DavidOfferPath): LandAndExpandPlan {
  return { ...PLAN_TEMPLATES[recommendedPath] };
}

// ---------------------------------------------------------------------------
// Revenue model framing (dollars, not just labels)
// ---------------------------------------------------------------------------

function fmtUsd(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return `$${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  return `$${n}`;
}

function fmtRange([lo, hi]: [number, number]): string {
  if (lo === 0 && hi === 0) return "$0";
  if (lo === 0) return `up to ${fmtUsd(hi)}`;
  return `${fmtUsd(lo)}–${fmtUsd(hi)}`;
}

export function buildRevenueModel(path: DavidOfferPath): RevenueModelSummary {
  const meta = OFFER_PATHS[path];
  const first = meta.estimatedFirstDealUsd;
  const recurring = meta.estimatedRecurringMonthlyUsd;
  const hasRecurring = recurring[1] > 0;
  const hasFirst = first[1] > 0;

  let narrative: string;
  if (hasRecurring && hasFirst) {
    narrative = `${meta.revenueType} — ~${fmtRange(recurring)}/mo after a ${fmtRange(first)} start.`;
  } else if (hasRecurring) {
    narrative = `${meta.revenueType} — ~${fmtRange(recurring)}/mo recurring.`;
  } else {
    narrative = `${meta.revenueType} — ${fmtRange(first)} engagement.`;
  }

  return {
    model: meta.model,
    revenueType: meta.revenueType,
    estimatedFirstDealUsd: first,
    estimatedRecurringMonthlyUsd: recurring,
    narrative,
  };
}

// ---------------------------------------------------------------------------
// Rationale (why this account matters, in plain language)
// ---------------------------------------------------------------------------

export function buildRationale(args: {
  primaryLeak: DavidLeakType;
  fittingTotal: number;
  fittingGrade: Grade;
  fitScore: number;
  revenueTotal: number;
  revenueGrade: Grade;
  recurringPotential: RecurringRevenuePotential;
  recommendedPath: DavidOfferPath;
  firstConversionAction: string;
}): string[] {
  const leak = LEAKS[args.primaryLeak];
  const path = OFFER_PATHS[args.recommendedPath];
  return [
    `Primary leak — ${leak.label}: ${leak.whyItMatters}`,
    `Strong David fit (${args.fitScore}/100) → ${args.fittingGrade}-grade Fitting Score of ${args.fittingTotal}.`,
    `Revenue Opportunity ${args.revenueGrade} (${args.revenueTotal}/100): ${RECURRING_POTENTIAL_LABELS[args.recurringPotential]} recurring potential via ${path.label}.`,
    `Fastest path in: ${args.firstConversionAction}`,
  ];
}
