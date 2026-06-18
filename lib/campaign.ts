import { LEAKS } from "@/lib/constants";
import { validateEmail } from "@/lib/validators";
import type { DavidOfferPath, EmailValidation, FittingStrategy, RevenueAccount } from "@/lib/types";
import type { ICPFields } from "@/lib/types/icp";

export type CampaignInput = {
  websiteUrl: string;
  productName: string;
  productDescription: string;
  targetMarket?: string;
};

export type CampaignFilter = {
  id: string;
  label: string;
  value: string;
  rationale: string;
};

export type CampaignBuyingSignal = {
  id: string;
  label: string;
  description: string;
  source: "input" | "deterministic_seed" | "reply_history";
};

export type CampaignStrategy = {
  audienceSummary: string;
  icpFilters: CampaignFilter[];
  buyingSignals: CampaignBuyingSignal[];
  positioningAngle: string;
  assumptions: string[];
};

export type CampaignSequenceStep = {
  id: string;
  stepNumber: 1 | 2;
  subject: string;
  body: string;
  cta: string;
  signal: string;
  bodyWordCount: number;
  approvalStatus: "draft" | "approved";
  editedByHuman: boolean;
  validation: EmailValidation;
};

export type CampaignSequence = {
  tone: "direct" | "casual";
  source: "deterministic" | "llm";
  steps: [CampaignSequenceStep, CampaignSequenceStep];
};

export type CampaignEventType =
  | "campaign_created"
  | "filters_copied"
  | "sequence_copied"
  | "reply_routed"
  | "positive_reply"
  | "meeting_booked"
  | "bad_fit"
  | "human_edit"
  | "approval";

export type CampaignEvent = {
  type: CampaignEventType;
  signal?: string;
  objection?: string;
};

export type CampaignMetrics = {
  campaignsCreated: number;
  filtersCopied: number;
  sequencesCopied: number;
  repliesRouted: number;
  positiveReplyRate: number;
  meetingRate: number;
  badFitRate: number;
  winningSignal: string;
  commonObjection: string;
  humanEditRate: number;
  approvalRate: number;
};

export type LearningInsights = {
  winningSignal: string;
  commonObjection: string;
  recommendedIcpAdjustment: string;
  nextCampaignRecommendation: string;
};

export type ImprovedNextCampaign = {
  title: string;
  improvements: string[];
  revisedHypothesis: string;
};

export type CampaignPricingTier = {
  name: "Free" | "Starter" | "Pro" | "Team" | "Agency" | "Enterprise" | "White-label";
  price: string;
  fit: string;
  recurringValue: string;
};

export type CampaignIntelligence = {
  input: CampaignInput;
  positioning: {
    category: string;
    promise: string;
    noSendBoundary: string;
  };
  strategy: CampaignStrategy;
  sequence: CampaignSequence;
  metrics: CampaignMetrics;
  learningInsights: LearningInsights;
  nextCampaign: ImprovedNextCampaign;
  agencyWorkspace: {
    clientName: string;
    exportLabel: string;
    reusableMemory: string[];
  };
  pricing: CampaignPricingTier[];
};

const DAVID_OFFER_TERMS = [
  "David Marketing",
  "Growth Plan",
  "The Fitting",
  "Custom Agent",
  "Custom AI OS",
  "Embedded AI Team",
  "White-label Deployment",
  "Partner Program",
];

export const CAMPAIGN_PRICING_TIERS: CampaignPricingTier[] = [
  {
    name: "Free",
    price: "$0",
    fit: "One-off campaign previews",
    recurringValue: "Proves the strategy loop before signup.",
  },
  {
    name: "Starter",
    price: "$49/mo",
    fit: "Founders creating repeat campaigns",
    recurringValue: "Saved campaign memory and basic reply learning.",
  },
  {
    name: "Pro",
    price: "$149/mo",
    fit: "Small GTM teams",
    recurringValue: "Performance tracking, approvals, and next-campaign recommendations.",
  },
  {
    name: "Team",
    price: "$399/mo",
    fit: "Sales teams with review workflows",
    recurringValue: "Shared workspaces, governance, and campaign analytics.",
  },
  {
    name: "Agency",
    price: "$799/mo",
    fit: "Agencies managing multiple clients",
    recurringValue: "Client workspaces, exports, and reusable campaign memory.",
  },
  {
    name: "Enterprise",
    price: "Custom",
    fit: "Governed GTM organizations",
    recurringValue: "Scale, permissions, review controls, and private deployment options.",
  },
  {
    name: "White-label",
    price: "Custom",
    fit: "Platforms embedding campaign intelligence",
    recurringValue: "Recurring platform workflow and branded client delivery.",
  },
];

export const DEFAULT_CAMPAIGN_EVENTS: CampaignEvent[] = [
  { type: "campaign_created" },
  { type: "filters_copied" },
  { type: "filters_copied" },
  { type: "sequence_copied" },
  { type: "sequence_copied" },
  { type: "reply_routed", signal: "missed calls" },
  { type: "reply_routed", signal: "manual follow-up" },
  { type: "reply_routed", signal: "missed calls" },
  { type: "reply_routed", signal: "slow speed-to-lead" },
  { type: "reply_routed", signal: "manual follow-up" },
  { type: "positive_reply", signal: "missed calls" },
  { type: "positive_reply", signal: "missed calls" },
  { type: "positive_reply", signal: "manual follow-up" },
  { type: "meeting_booked", signal: "missed calls" },
  { type: "meeting_booked", signal: "manual follow-up" },
  { type: "bad_fit", objection: "No budget for a new workflow right now" },
  { type: "human_edit" },
  { type: "human_edit" },
  { type: "approval" },
  { type: "approval" },
  { type: "approval" },
  { type: "approval" },
  { type: "approval" },
  { type: "approval" },
];

function bulletLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);
}

function wordCount(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function percent(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function mostFrequent(values: string[], fallback: string): string {
  if (!values.length) return fallback;
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? fallback;
}

export function isDavidCampaignInput(input: CampaignInput): boolean {
  const haystack = `${input.productName} ${input.websiteUrl} ${input.productDescription}`.toLowerCase();
  return haystack.includes("david ai") || haystack.includes("getdavid.ai");
}

const GENERIC_ANGLE_LABELS: Record<DavidOfferPath, string> = {
  david_marketing: "Local demand capture",
  growth_plan: "Fast test campaign",
  the_fitting: "Workflow diagnostic",
  custom_agent: "Workflow automation",
  custom_ai_os: "Operating system angle",
  embedded_ai_team: "Managed AI workflow",
  white_label_deployment: "Channel expansion",
  partner_program: "Partner campaign",
};

const DAVID_ANGLE_LABELS: Record<DavidOfferPath, string> = {
  david_marketing: "David Marketing",
  growth_plan: "Growth Plan",
  the_fitting: "The Fitting",
  custom_agent: "Custom Agent",
  custom_ai_os: "Custom AI OS",
  embedded_ai_team: "Embedded AI Team",
  white_label_deployment: "White-label Deployment",
  partner_program: "Partner Program",
};

export function campaignAngleLabel(path: DavidOfferPath, campaign?: CampaignIntelligence | null): string {
  if (campaign && isDavidCampaignInput(campaign.input)) return DAVID_ANGLE_LABELS[path];
  return GENERIC_ANGLE_LABELS[path];
}

export function campaignCopy(value: string, campaign?: CampaignIntelligence | null): string {
  if (campaign && isDavidCampaignInput(campaign.input)) return value;

  return value
    .replaceAll("David Marketing", "campaign tracking retainer")
    .replaceAll("Growth Plan", "fast test campaign")
    .replaceAll("The Fitting", "workflow diagnostic")
    .replaceAll("AI Fitting", "workflow diagnostic")
    .replaceAll("Fitting Score", "Fit Score")
    .replaceAll("Fittings", "workflow diagnostics")
    .replaceAll("Fitting", "workflow diagnostic")
    .replaceAll("Custom Agent", "automation workflow")
    .replaceAll("Custom AI OS", "campaign operating system")
    .replaceAll("Embedded AI Team", "managed campaign team")
    .replaceAll("White-label Deployment", "white-label campaign workspace")
    .replaceAll("Partner Program", "partner campaign motion")
    .replaceAll("David earns recurring revenue", "Recurring value compounds")
    .replaceAll("David engagement", "campaign workflow")
    .replaceAll("for David", "for the team")
    .replaceAll("David", "the campaign system");
}

function targetMarket(fields: ICPFields): string {
  if (fields.best_fit_industries.length) return fields.best_fit_industries.slice(0, 4).join(", ");
  return "service businesses with repeatable sales or operations workflows";
}

function primarySignal(fields: ICPFields, accounts: RevenueAccount[]): string {
  const inputSignal = bulletLines(fields.buying_signals)[0];
  if (inputSignal) return inputSignal;
  const account = accounts[0];
  return account ? LEAKS[account.primaryLeak].label : "a visible workflow leak";
}

function buildFilters(fields: ICPFields): CampaignFilter[] {
  const industries = fields.best_fit_industries.length ? fields.best_fit_industries.join(", ") : "Service businesses";
  return [
    {
      id: "industry",
      label: "Industry fit",
      value: industries,
      rationale: "Start where the product promise maps to a painful operating workflow.",
    },
    {
      id: "company-size",
      label: "Company size",
      value: fields.company_size || "25-200 employees",
      rationale: "Large enough for repeatable pain, small enough for fast approval.",
    },
    {
      id: "geo",
      label: "Geography",
      value: fields.geography || "United States / North America",
      rationale: "Keeps early outreach culturally and operationally consistent.",
    },
    {
      id: "buyer",
      label: "Buyer roles",
      value: fields.decision_makers || "CEO, COO, CRO, VP Sales, Operations Lead",
      rationale: "Prioritize people who own both the pain and the workflow decision.",
    },
    {
      id: "pain",
      label: "Pain trigger",
      value: bulletLines(fields.pain_points)[0] ?? "Manual follow-up or missed revenue moments",
      rationale: "The first message needs a concrete reason to care now.",
    },
  ];
}

function buildSignals(fields: ICPFields, accounts: RevenueAccount[]): CampaignBuyingSignal[] {
  const inputSignals = bulletLines(fields.buying_signals);
  const seedSignals = accounts.slice(0, 4).map((account) => LEAKS[account.primaryLeak].label);
  const signals = [...inputSignals, ...seedSignals].filter(Boolean).slice(0, 6);

  return signals.map((signal, index) => ({
    id: `signal-${index + 1}`,
    label: signal,
    description:
      index < inputSignals.length
        ? "Directly inferred from the product input and used to shape targeting."
        : "Deterministic seed signal used to keep the demo loop local and repeatable.",
    source: index < inputSignals.length ? "input" : "deterministic_seed",
  }));
}

function buildSequenceStep(
  stepNumber: 1 | 2,
  input: CampaignInput,
  fields: ICPFields,
  accounts: RevenueAccount[],
): CampaignSequenceStep {
  const account = accounts[0];
  const leak = account?.primaryLeak ?? "manual_follow_up";
  const leakLabel = LEAKS[leak].label.toLowerCase();
  const signal = primarySignal(fields, accounts);
  const audience = targetMarket(fields);
  const subject = stepNumber === 1 ? "quick question" : "worth testing";
  const cta = stepNumber === 1 ? "Worth comparing notes?" : "Should I send the revised campaign angle?";
  const body =
    stepNumber === 1
      ? `Hi {{first_name}} - noticed ${audience} teams often lose pipeline when ${leakLabel} goes unresolved. ${input.productName} helps turn that signal into a focused campaign strategy before anyone sends more email. ${cta}`
      : `Following up, {{first_name}} - the strongest signal for this campaign is ${signal}, especially when ${leakLabel} is visible. The next step is tightening ICP filters and reply routing before scaling volume. ${cta}`;

  return {
    id: `step-${stepNumber}`,
    stepNumber,
    subject,
    body,
    cta,
    signal,
    bodyWordCount: wordCount(body),
    approvalStatus: "approved",
    editedByHuman: stepNumber === 2,
    validation: validateEmail({ subject, body, cta, referencedLeak: leak }),
  };
}

export function campaignInputFromICPFields(fields: ICPFields): CampaignInput {
  return {
    websiteUrl: fields.website_url,
    productName: fields.company_name || "Campaign product",
    productDescription:
      fields.core_offering || "A product that needs a repeatable outbound campaign strategy.",
    targetMarket: targetMarket(fields),
  };
}

export function buildCampaignMetrics(events: CampaignEvent[]): CampaignMetrics {
  const count = (type: CampaignEventType) => events.filter((event) => event.type === type).length;
  const repliesRouted = count("reply_routed");
  const positiveReplies = count("positive_reply");
  const meetings = count("meeting_booked");
  const badFits = count("bad_fit");
  const edits = count("human_edit");
  const approvals = count("approval");

  return {
    campaignsCreated: count("campaign_created"),
    filtersCopied: count("filters_copied"),
    sequencesCopied: count("sequence_copied"),
    repliesRouted,
    positiveReplyRate: percent(positiveReplies, repliesRouted),
    meetingRate: percent(meetings, repliesRouted),
    badFitRate: percent(badFits, repliesRouted),
    winningSignal: mostFrequent(
      events.filter((event) => event.type === "positive_reply" || event.type === "meeting_booked").map((event) => event.signal ?? ""),
      "missed calls",
    ),
    commonObjection: mostFrequent(
      events.filter((event) => event.type === "bad_fit").map((event) => event.objection ?? ""),
      "No budget for a new workflow right now",
    ),
    humanEditRate: percent(edits, edits + approvals),
    approvalRate: percent(approvals, edits + approvals),
  };
}

/** Metrics-derived learning + next-campaign copy. Shared by build and recompute so the
 * self-improving loop stays consistent whether it's seeded or driven by real events. */
function deriveLearning(
  metrics: CampaignMetrics,
  audience: string,
  firstFilterValue: string,
): { learningInsights: LearningInsights; nextCampaign: ImprovedNextCampaign } {
  return {
    learningInsights: {
      winningSignal: metrics.winningSignal,
      commonObjection: metrics.commonObjection,
      recommendedIcpAdjustment: `Prioritize accounts showing ${metrics.winningSignal}; suppress accounts that cite "${metrics.commonObjection}".`,
      nextCampaignRecommendation: `Lead with ${metrics.winningSignal}, tighten the ICP filter around ${audience} (${firstFilterValue}), and keep response routing before any sending workflow.`,
    },
    nextCampaign: {
      title: "Improved next campaign",
      improvements: [
        `Move ${metrics.winningSignal} into the first-line hook.`,
        `Add a bad-fit filter for "${metrics.commonObjection}".`,
        "Require approval on edited sequence copy before export.",
        "Reuse the best-performing reply route as the default next action.",
      ],
      revisedHypothesis: `The next campaign should trade volume for sharper ${metrics.winningSignal} targeting and faster objection handling.`,
    },
  };
}

function deriveReusableMemory(metrics: CampaignMetrics, firstFilterValue: string): string[] {
  return [
    `Winning signal: ${metrics.winningSignal}`,
    `Common objection: ${metrics.commonObjection}`,
    `Best ICP filter: ${firstFilterValue}`,
  ];
}

/** Recompute the metrics-driven parts of a campaign from a fresh event list, preserving
 * the strategy, sequence, positioning, and any edited agency/client identity. This is what
 * makes the tracker and learning insights reflect *real* user actions, not a static seed. */
export function recomputeCampaign(
  campaign: CampaignIntelligence,
  events: CampaignEvent[],
): CampaignIntelligence {
  const metrics = buildCampaignMetrics(events);
  const firstFilterValue = campaign.strategy.icpFilters[0]?.value ?? "your core ICP";
  const audience =
    campaign.strategy.audienceSummary.split(/ that show a visible need/i)[0] || firstFilterValue;
  const { learningInsights, nextCampaign } = deriveLearning(metrics, audience, firstFilterValue);
  return {
    ...campaign,
    metrics,
    learningInsights,
    nextCampaign,
    agencyWorkspace: {
      ...campaign.agencyWorkspace,
      reusableMemory: deriveReusableMemory(metrics, firstFilterValue),
    },
  };
}

export function buildCampaignIntelligence(args: {
  input: CampaignInput;
  fields: ICPFields;
  accounts: RevenueAccount[];
  strategy: FittingStrategy;
  events?: CampaignEvent[];
}): CampaignIntelligence {
  const events = args.events ?? DEFAULT_CAMPAIGN_EVENTS;
  const metrics = buildCampaignMetrics(events);
  const signals = buildSignals(args.fields, args.accounts);
  const audience = targetMarket(args.fields);
  const david = isDavidCampaignInput(args.input);
  const positioningAngle = david
    ? "Use David-specific revenue leaks only because David is the campaign input."
    : `Position ${args.input.productName} around the clearest workflow leak for ${audience}.`;

  return {
    input: args.input,
    positioning: {
      category: "AI GTM Campaign Builder",
      promise: "Campaign intelligence, not campaign sending.",
      noSendBoundary: "No email sending, no CRM sync, no massive lead database in this MVP.",
    },
    strategy: {
      audienceSummary: `${audience} that show a visible need for ${args.input.productName}: ${args.input.productDescription}`,
      icpFilters: buildFilters(args.fields),
      buyingSignals: signals,
      positioningAngle,
      assumptions: [
        "Signals are deterministic demo signals until live enrichment is added.",
        "Campaign quality is measured through copied filters, copied sequences, routed replies, approvals, and outcomes.",
        "LLM output can enhance copy later but must not be required for the demo loop.",
      ],
    },
    sequence: {
      tone: "direct",
      source: "deterministic",
      steps: [
        buildSequenceStep(1, args.input, args.fields, args.accounts),
        buildSequenceStep(2, args.input, args.fields, args.accounts),
      ],
    },
    metrics,
    ...deriveLearning(metrics, audience, buildFilters(args.fields)[0].value),
    agencyWorkspace: {
      clientName: args.input.productName,
      exportLabel: "Client-ready campaign brief",
      reusableMemory: deriveReusableMemory(metrics, buildFilters(args.fields)[0].value),
    },
    pricing: CAMPAIGN_PRICING_TIERS,
  };
}

export function containsDavidSpecificOfferLanguage(campaign: CampaignIntelligence): boolean {
  const serialized = JSON.stringify(campaign);
  return DAVID_OFFER_TERMS.some((term) => serialized.includes(term));
}
