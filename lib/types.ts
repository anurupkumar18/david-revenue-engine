// AI GTM Campaign Builder core domain types.
// Source of truth for the deterministic revenue brain. No UI, no LLM here.

// ---------------------------------------------------------------------------
// Internal campaign angle keys. The legacy type name is kept for compatibility.
// ---------------------------------------------------------------------------

export type DavidOfferPath =
  | "david_marketing"
  | "growth_plan"
  | "the_fitting"
  | "custom_agent"
  | "custom_ai_os"
  | "embedded_ai_team"
  | "white_label_deployment"
  | "partner_program";

export type RevenueModel =
  | "monthly_retainer"
  | "diagnostic"
  | "one_time_project"
  | "platform_recurring"
  | "channel";

// ---------------------------------------------------------------------------
// Leaks & Levers (replaces generic "buying signals")
// ---------------------------------------------------------------------------

export type DavidLeakType =
  | "missed_calls"
  | "weak_map_pack"
  | "stale_content"
  | "manual_follow_up"
  | "review_gap"
  | "basic_website"
  | "multi_location_complexity"
  | "crm_copy_paste"
  | "platform_distribution"
  | "ops_bottleneck"
  | "high_ticket_service"
  | "appointment_driven"
  | "lead_quality_gap"
  | "slow_speed_to_lead"
  | "reporting_gap"
  | "ai_capability_gap";

export type Confidence = "low" | "medium" | "high";
export type Freshness = "today" | "this_week" | "this_month" | "older" | "unknown";
export type Provenance = "verified" | "inferred" | "demo";

/** A detected leak/lever attached to an account (the "why now"). */
export type Leak = {
  type: DavidLeakType;
  label: string;
  evidence: string;
  whyItMatters: string;
  leverAngle: string; // how David fixes it
  confidence: Confidence;
  freshness: Freshness;
  severity: number; // 0-100
  provenance: Provenance;
  isDemoData: boolean;
};

// ---------------------------------------------------------------------------
// Segments & recurring revenue
// ---------------------------------------------------------------------------

export type Segment =
  | "local_business"
  | "service_business"
  | "multi_location"
  | "platform"
  | "agency"
  | "enterprise"
  | "other";

export type RecurringRevenuePotential = "low" | "medium" | "high" | "very_high";

export type Grade = "A" | "B" | "C" | "D";

// ---------------------------------------------------------------------------
// Scores
// ---------------------------------------------------------------------------

/** Fit Score = how well the account fits a campaign hypothesis. */
export type FittingScore = {
  fitScore: number; // ICP fit, 0-100
  signalScore: number; // leak strength/freshness, 0-100
  channelScore: number; // reachability, 0-100
  total: number; // weighted, 0-100
  grade: Grade;
};

/** Revenue Opportunity Score = how much recurring revenue this account can become. */
export type RevenueOpportunityScore = {
  icpFit: number;
  leakSeverity: number;
  abilityToPay: number;
  speedToClose: number;
  recurringRevenuePotential: number; // numeric input to the formula
  total: number; // weighted, 0-100
  grade: Grade;
};

/** Concrete revenue framing so judges see dollars, not just labels. */
export type RevenueModelSummary = {
  model: RevenueModel;
  revenueType: string; // e.g. "Monthly recurring retainer"
  estimatedFirstDealUsd: [number, number];
  estimatedRecurringMonthlyUsd: [number, number];
  narrative: string;
};

// ---------------------------------------------------------------------------
// Land-and-expand
// ---------------------------------------------------------------------------

export type LandAndExpandPlan = {
  landOffer: DavidOfferPath;
  firstConversionAction: string;
  expansionOffer: DavidOfferPath;
  longTermOffer?: DavidOfferPath;
  revenueLogic: string;
};

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

export type PipelineStage =
  | "new"
  | "researched"
  | "sequenced"
  | "replied"
  | "meeting_ready"
  | "info_sent"
  | "objection"
  | "nurture"
  | "closed_won"
  | "closed_lost"
  | "suppressed";

// ---------------------------------------------------------------------------
// The fully-populated account (the heart of the demo)
// ---------------------------------------------------------------------------

export type RevenueAccount = {
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

  // Leaks & Levers
  leaks: Leak[];
  detectedLeakTypes: DavidLeakType[];
  primaryLeak: DavidLeakType;

  // Scores
  fitting: FittingScore;
  fittingScore: number; // convenience: fitting.total
  revenueOpportunity: RevenueOpportunityScore;
  revenueOpportunityScore: number; // convenience: revenueOpportunity.total
  recurringRevenuePotential: RecurringRevenuePotential;

  // Routing & revenue
  recommendedDavidOfferPath: DavidOfferPath;
  revenueModel: RevenueModelSummary;
  landAndExpandPlan: LandAndExpandPlan;
  nextBestConversionAction: string;
  rationale: string[];

  // Pipeline
  stage: PipelineStage;
};

// ---------------------------------------------------------------------------
// Conversion Outreach
// ---------------------------------------------------------------------------

export type OutreachTone = "direct" | "casual" | "founder_led";

export type EmailValidation = {
  subjectLowercase: boolean;
  subjectWordCountOk: boolean;
  bodyUnder100Words: boolean;
  hasLowFrictionCta: boolean;
  referencesLeak: boolean;
  noInventedClaims: boolean;
  passed: boolean;
  warnings: string[];
};

export type EmailStep = {
  stepNumber: 1 | 2;
  subject: string;
  body: string;
  cta: string;
  referencedLeak: DavidLeakType | null;
  wordCount: number;
  validation: EmailValidation;
};

export type OutreachSequence = {
  accountId: string;
  offerPath: DavidOfferPath;
  tone: OutreachTone;
  source: "deterministic" | "llm";
  steps: EmailStep[];
};

// ---------------------------------------------------------------------------
// Fast Conversion Router
// ---------------------------------------------------------------------------

export type ReplyIntent =
  | "positive_call"
  | "asks_for_info"
  | "objection_no_time"
  | "not_interested"
  | "wrong_person"
  | "unsubscribe"
  | "out_of_office"
  | "ambiguous";

export type RoutedReply = {
  intent: ReplyIntent;
  confidence: number; // 0-1
  recommendedAction: string;
  responseTemplate: string;
  updatePipelineStage: PipelineStage;
  shouldSuppress: boolean;
  source: "deterministic" | "llm";
};

// ---------------------------------------------------------------------------
// Fitting Strategy (campaign input -> strategy)
// ---------------------------------------------------------------------------

export type FittingGoal =
  | "land_recurring_retainers"
  | "book_fittings"
  | "expand_partners"
  | "fast_growth_plans";

export type SegmentFocus = "auto" | Segment;

export type FittingStrategyInput = {
  productDescription: string;
  segmentFocus: SegmentFocus;
  fittingGoal: FittingGoal;
};

export type FittingStrategy = {
  oneLiner: string;
  targetSegments: Segment[];
  leakHypotheses: { leak: DavidLeakType; rationale: string }[];
  recommendedOfferPaths: DavidOfferPath[];
  idealCustomerProfile: string[];
  assumptions: string[];
  source: "deterministic" | "llm";
};

// ---------------------------------------------------------------------------
// Metadata shapes (constants.ts)
// ---------------------------------------------------------------------------

export type OfferPathMeta = {
  path: DavidOfferPath;
  label: string;
  revenueType: string;
  model: RevenueModel;
  bestFitProspect: string;
  primaryCta: string; // outreach CTA copy
  shortCta: string; // button label
  speedToClose: number; // 0-100, lower friction = higher
  baseRecurringPotential: RecurringRevenuePotential;
  estimatedFirstDealUsd: [number, number];
  estimatedRecurringMonthlyUsd: [number, number];
};

export type LeakMeta = {
  type: DavidLeakType;
  label: string;
  meaning: string;
  whyItMatters: string;
  leverAngle: string;
  recommendedPath: DavidOfferPath;
};
