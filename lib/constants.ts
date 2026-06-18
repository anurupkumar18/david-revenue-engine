// AI GTM Campaign Builder deterministic reference data.
// Encodes the revenue motion map, leak-to-angle routing,
// CTA-by-path table, and display labels. Single source of truth.

import type {
  DavidLeakType,
  DavidOfferPath,
  LeakMeta,
  OfferPathMeta,
  PipelineStage,
  RecurringRevenuePotential,
  ReplyIntent,
  Segment,
} from "./types";

// ---------------------------------------------------------------------------
// Internal campaign angle keys (revenue motion map + CTAs + $ ranges)
// ---------------------------------------------------------------------------

export const OFFER_PATHS: Record<DavidOfferPath, OfferPathMeta> = {
  david_marketing: {
    path: "david_marketing",
    label: "Local demand capture",
    revenueType: "Monthly recurring retainer",
    model: "monthly_retainer",
    bestFitProspect: "Local businesses needing better local presence",
    primaryCta: "Want me to send over the 3 places I'd tighten up first?",
    shortCta: "Copy demand plan",
    speedToClose: 78,
    baseRecurringPotential: "high",
    estimatedFirstDealUsd: [1500, 3000],
    estimatedRecurringMonthlyUsd: [2000, 5000],
  },
  growth_plan: {
    path: "growth_plan",
    label: "Fast test campaign",
    revenueType: "Entry diagnostic / conversion wedge",
    model: "diagnostic",
    bestFitProspect: "Local businesses with visible marketing gaps",
    primaryCta: "Want a quick growth plan for your market?",
    shortCta: "Copy test campaign",
    speedToClose: 90,
    baseRecurringPotential: "medium",
    estimatedFirstDealUsd: [0, 500],
    estimatedRecurringMonthlyUsd: [2000, 4000],
  },
  the_fitting: {
    path: "the_fitting",
    label: "Workflow diagnostic",
    revenueType: "Paid diagnostic",
    model: "diagnostic",
    bestFitProspect: "Businesses with complex workflow or AI opportunity",
    primaryCta: "Open to a 20-minute workflow diagnostic?",
    shortCta: "Book diagnostic",
    speedToClose: 70,
    baseRecurringPotential: "medium",
    estimatedFirstDealUsd: [2500, 7500],
    estimatedRecurringMonthlyUsd: [3000, 12000],
  },
  custom_agent: {
    path: "custom_agent",
    label: "Workflow automation",
    revenueType: "Project + support/maintenance",
    model: "one_time_project",
    bestFitProspect: "Teams with one leaking workflow",
    primaryCta: "Open to a 2-minute teardown of the workflow?",
    shortCta: "2-min Workflow Teardown",
    speedToClose: 80,
    baseRecurringPotential: "medium",
    estimatedFirstDealUsd: [5000, 15000],
    estimatedRecurringMonthlyUsd: [500, 2000],
  },
  custom_ai_os: {
    path: "custom_ai_os",
    label: "Campaign operating system",
    revenueType: "High-ticket build",
    model: "one_time_project",
    bestFitProspect: "Businesses ready for end-to-end AI-native operations",
    primaryCta: "Worth mapping what an AI-native operating layer could look like?",
    shortCta: "Scope operating layer",
    speedToClose: 45,
    baseRecurringPotential: "high",
    estimatedFirstDealUsd: [25000, 75000],
    estimatedRecurringMonthlyUsd: [2000, 8000],
  },
  embedded_ai_team: {
    path: "embedded_ai_team",
    label: "Managed AI workflow",
    revenueType: "High-ticket recurring retainer",
    model: "monthly_retainer",
    bestFitProspect: "Companies that need ongoing AI execution",
    primaryCta: "Worth a conversation on where a managed AI workflow would pay back fastest?",
    shortCta: "Workflow conversation",
    speedToClose: 45,
    baseRecurringPotential: "very_high",
    estimatedFirstDealUsd: [0, 0],
    estimatedRecurringMonthlyUsd: [8000, 25000],
  },
  white_label_deployment: {
    path: "white_label_deployment",
    label: "White-label campaign workspace",
    revenueType: "Scalable recurring platform revenue",
    model: "platform_recurring",
    bestFitProspect: "Platforms/agencies with distribution but no AI capability",
    primaryCta:
      "Would it be useful to see how this could become a branded campaign workspace for your clients?",
    shortCta: "Partner Conversation",
    speedToClose: 55,
    baseRecurringPotential: "very_high",
    estimatedFirstDealUsd: [10000, 30000],
    estimatedRecurringMonthlyUsd: [5000, 50000],
  },
  partner_program: {
    path: "partner_program",
    label: "Partner campaign motion",
    revenueType: "Channel revenue",
    model: "channel",
    bestFitProspect: "Agencies, consultants, local media, vertical platforms",
    primaryCta: "Worth a quick partner conversation?",
    shortCta: "Partner Call",
    speedToClose: 60,
    baseRecurringPotential: "very_high",
    estimatedFirstDealUsd: [0, 0],
    estimatedRecurringMonthlyUsd: [3000, 30000],
  },
};

// ---------------------------------------------------------------------------
// Leaks & Levers (meaning + why it matters + campaign lever + base routing)
// ---------------------------------------------------------------------------

export const LEAKS: Record<DavidLeakType, LeakMeta> = {
  missed_calls: {
    type: "missed_calls",
    label: "Missed calls",
    meaning: "Leads are not being captured quickly enough.",
    whyItMatters: "Every missed call is a missed booking — revenue leaks straight out the door.",
    leverAngle: "An AI voice/booking agent that answers and captures every inbound lead.",
    recommendedPath: "custom_agent",
  },
  weak_map_pack: {
    type: "weak_map_pack",
    label: "Weak map pack",
    meaning: "Local business is not winning local search/maps.",
    whyItMatters: "Losing the map pack means losing the highest-intent local demand.",
    leverAngle: "AI-driven local SEO, content, and review velocity to win the 3-pack.",
    recommendedPath: "david_marketing",
  },
  stale_content: {
    type: "stale_content",
    label: "Stale content",
    meaning: "Local trust and visibility are weak.",
    whyItMatters: "Outdated presence erodes trust and lets competitors look more active.",
    leverAngle: "AI content engine keeping posts, pages, and offers fresh automatically.",
    recommendedPath: "david_marketing",
  },
  manual_follow_up: {
    type: "manual_follow_up",
    label: "Manual follow-up",
    meaning: "Conversion depends on repetitive human follow-up.",
    whyItMatters: "Deals die in the gap between inquiry and the third follow-up nobody sends.",
    leverAngle: "An AI follow-up agent that nurtures every lead until they book.",
    recommendedPath: "custom_agent",
  },
  review_gap: {
    type: "review_gap",
    label: "Review gap",
    meaning: "Reputation/review workflow is underdeveloped.",
    whyItMatters: "Thin or stale reviews suppress conversion on every channel at once.",
    leverAngle: "Automated review requests and response cadence to build a reputation moat.",
    recommendedPath: "david_marketing",
  },
  basic_website: {
    type: "basic_website",
    label: "Basic website",
    meaning: "Website likely fails to convert local demand.",
    whyItMatters: "Traffic without conversion is paid demand quietly wasted.",
    leverAngle: "A growth plan to fix the highest-leverage conversion gaps first.",
    recommendedPath: "growth_plan",
  },
  multi_location_complexity: {
    type: "multi_location_complexity",
    label: "Multi-location complexity",
    meaning: "Execution and reporting are fragmented.",
    whyItMatters: "Each location reinvents process; leadership can't see or scale what works.",
    leverAngle: "An AI operating layer that standardizes execution across every location.",
    recommendedPath: "custom_ai_os",
  },
  crm_copy_paste: {
    type: "crm_copy_paste",
    label: "CRM copy-paste",
    meaning: "Team is wasting hours moving data manually.",
    whyItMatters: "Hours of copy-paste is margin burned on work an agent should own.",
    leverAngle: "A custom agent that syncs and updates records without human keystrokes.",
    recommendedPath: "custom_agent",
  },
  platform_distribution: {
    type: "platform_distribution",
    label: "Platform distribution",
    meaning: "Company can resell campaign intelligence to many clients.",
    whyItMatters: "They already own the distribution — they just lack the AI product.",
    leverAngle: "A branded, white-label AI capability deployed across their client base.",
    recommendedPath: "white_label_deployment",
  },
  ops_bottleneck: {
    type: "ops_bottleneck",
    label: "Ops bottleneck",
    meaning: "Business has repeatable workflow pain.",
    whyItMatters: "A repeatable bottleneck compounds: it caps throughput and morale.",
    leverAngle: "A paid workflow diagnostic to map the bottleneck and scope the highest-ROI automation.",
    recommendedPath: "the_fitting",
  },
  high_ticket_service: {
    type: "high_ticket_service",
    label: "High-ticket service",
    meaning: "Each customer is valuable enough to justify automation.",
    whyItMatters: "When each deal is large, even small conversion lifts pay for the build.",
    leverAngle: "A custom agent that protects and accelerates every high-value opportunity.",
    recommendedPath: "custom_agent",
  },
  appointment_driven: {
    type: "appointment_driven",
    label: "Appointment-driven",
    meaning: "Calendar utilization directly impacts revenue.",
    whyItMatters: "Empty slots are unrecoverable revenue; full calendars are the whole game.",
    leverAngle: "AI marketing + booking flow that keeps the calendar full.",
    recommendedPath: "david_marketing",
  },
  lead_quality_gap: {
    type: "lead_quality_gap",
    label: "Lead quality gap",
    meaning: "Spend is not becoming qualified booked work.",
    whyItMatters: "Paying for leads that never book is the most expensive way to grow.",
    leverAngle: "A growth plan to fix targeting and qualification before scaling spend.",
    recommendedPath: "growth_plan",
  },
  slow_speed_to_lead: {
    type: "slow_speed_to_lead",
    label: "Slow speed-to-lead",
    meaning: "Business loses revenue by replying too slowly.",
    whyItMatters: "First responder usually wins; minutes of delay halve conversion.",
    leverAngle: "An instant-response agent that engages every lead in seconds.",
    recommendedPath: "custom_agent",
  },
  reporting_gap: {
    type: "reporting_gap",
    label: "Reporting gap",
    meaning: "Leaders cannot see what is working.",
    whyItMatters: "Without visibility, budget and effort flow to the wrong places.",
    leverAngle: "An AI operating layer with unified, real-time reporting for leadership.",
    recommendedPath: "custom_ai_os",
  },
  ai_capability_gap: {
    type: "ai_capability_gap",
    label: "AI capability gap",
    meaning: "Company has distribution but no AI execution team.",
    whyItMatters: "Demand for AI is here; without a team they forfeit the revenue to rivals.",
    leverAngle: "An embedded AI team or white-label deployment to execute immediately.",
    recommendedPath: "white_label_deployment",
  },
};

// ---------------------------------------------------------------------------
// Display labels
// ---------------------------------------------------------------------------

export const SEGMENT_LABELS: Record<Segment, string> = {
  local_business: "Local Business",
  service_business: "Service Business",
  multi_location: "Multi-location",
  platform: "Platform",
  agency: "Agency",
  enterprise: "Enterprise",
  other: "Other",
};

export const STAGE_LABELS: Record<PipelineStage, string> = {
  new: "New",
  researched: "Researched",
  sequenced: "Sequenced",
  replied: "Replied",
  meeting_ready: "Meeting Ready",
  info_sent: "Info Sent",
  objection: "Objection",
  nurture: "Nurture",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
  suppressed: "Suppressed",
};

/** Columns shown on the Campaign Tracker board (subset, in order). */
export const PIPELINE_COLUMNS: PipelineStage[] = [
  "new",
  "researched",
  "sequenced",
  "replied",
  "meeting_ready",
  "info_sent",
  "objection",
  "nurture",
  "suppressed",
];

export const INTENT_LABELS: Record<ReplyIntent, string> = {
  positive_call: "Positive — wants to talk",
  asks_for_info: "Asks for info",
  objection_no_time: "Objection / no time",
  not_interested: "Not interested",
  wrong_person: "Wrong person",
  unsubscribe: "Unsubscribe",
  out_of_office: "Out of office",
  ambiguous: "Ambiguous",
};

export const RECURRING_POTENTIAL_LABELS: Record<RecurringRevenuePotential, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  very_high: "Very High",
};

/** Numeric value of each recurring-potential tier (input to the revenue formula). */
export const RECURRING_POTENTIAL_VALUE: Record<RecurringRevenuePotential, number> = {
  low: 40,
  medium: 65,
  high: 82,
  very_high: 95,
};
