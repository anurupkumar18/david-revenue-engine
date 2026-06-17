// Deterministic Fitting Strategy generator (fallback for the LLM route).
// Turns a product description + focus + goal into a David-native GTM strategy.

import { LEAKS, OFFER_PATHS, SEGMENT_LABELS } from "./constants";
import type {
  DavidLeakType,
  DavidOfferPath,
  FittingStrategy,
  FittingStrategyInput,
  Segment,
} from "./types";

type GoalProfile = {
  oneLiner: string;
  segments: Segment[];
  leaks: DavidLeakType[];
  paths: DavidOfferPath[];
};

const GOAL_PROFILES: Record<FittingStrategyInput["fittingGoal"], GoalProfile> = {
  land_recurring_retainers: {
    oneLiner:
      "Find local and service businesses leaking leads, then land them on a monthly David Marketing retainer.",
    segments: ["local_business", "service_business"],
    leaks: ["weak_map_pack", "missed_calls", "manual_follow_up", "review_gap"],
    paths: ["growth_plan", "david_marketing", "custom_agent"],
  },
  book_fittings: {
    oneLiner:
      "Find operationally complex businesses with workflow bottlenecks and route them into a paid Fitting.",
    segments: ["enterprise", "multi_location", "service_business"],
    leaks: ["ops_bottleneck", "reporting_gap", "multi_location_complexity", "crm_copy_paste"],
    paths: ["the_fitting", "custom_agent", "custom_ai_os"],
  },
  expand_partners: {
    oneLiner:
      "Find platforms and agencies with distribution but no AI capability and turn them into recurring channel revenue.",
    segments: ["platform", "agency"],
    leaks: ["platform_distribution", "ai_capability_gap"],
    paths: ["partner_program", "white_label_deployment", "embedded_ai_team"],
  },
  fast_growth_plans: {
    oneLiner:
      "Find local businesses with visible conversion gaps and convert them fast with a Growth Plan wedge.",
    segments: ["local_business", "service_business"],
    leaks: ["basic_website", "lead_quality_gap", "slow_speed_to_lead", "appointment_driven"],
    paths: ["growth_plan", "david_marketing", "custom_agent"],
  },
};

export function buildFittingStrategy(input: FittingStrategyInput): FittingStrategy {
  const profile = GOAL_PROFILES[input.fittingGoal];

  const targetSegments =
    input.segmentFocus === "auto" ? profile.segments : [input.segmentFocus as Segment];

  const leakHypotheses = profile.leaks.slice(0, 4).map((leak) => ({
    leak,
    rationale: LEAKS[leak].meaning,
  }));

  const idealCustomerProfile = [
    `Segments: ${targetSegments.map((s) => SEGMENT_LABELS[s]).join(", ")}`,
    "Visible signs of leaking time, leads, or margin",
    "Enough budget to fund a recurring engagement",
    "A fast, low-friction first conversion step",
  ];

  const assumptions = [
    "Leak severity is inferred from public signals, not verified internal data.",
    "Dollar ranges are illustrative David engagement sizes, not quotes.",
    "Account list is demo seed data; swap in live enrichment after the hackathon.",
  ];

  return {
    oneLiner: input.productDescription.trim()
      ? `${profile.oneLiner}`
      : profile.oneLiner,
    targetSegments,
    leakHypotheses,
    recommendedOfferPaths: profile.paths,
    idealCustomerProfile,
    assumptions,
    source: "deterministic",
  };
}

/** Human label helpers reused by the UI. */
export function offerPathLabel(path: DavidOfferPath): string {
  return OFFER_PATHS[path].label;
}
