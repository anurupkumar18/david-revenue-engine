// System prompts, user-message builders, and JSON output schemas for the optional
// Claude layer. Outputs are validated downstream and fall back to deterministic logic.

import { campaignAngleLabel, campaignCopy } from "./campaign";
import { LEAKS, OFFER_PATHS } from "./constants";
import type {
  FittingStrategyInput,
  OutreachTone,
  RevenueAccount,
} from "./types";

const LEAK_TYPES = Object.keys(LEAKS);
const OFFER_PATH_TYPES = Object.keys(OFFER_PATHS);
const SEGMENTS = [
  "local_business",
  "service_business",
  "multi_location",
  "platform",
  "agency",
  "enterprise",
  "other",
];
const INTENTS = [
  "positive_call",
  "asks_for_info",
  "objection_no_time",
  "not_interested",
  "wrong_person",
  "unsubscribe",
  "out_of_office",
  "ambiguous",
];
const STAGES = [
  "new",
  "researched",
  "sequenced",
  "replied",
  "meeting_ready",
  "info_sent",
  "objection",
  "nurture",
  "closed_won",
  "closed_lost",
  "suppressed",
];

// ---------------------------------------------------------------------------
// Fitting Strategy
// ---------------------------------------------------------------------------

export const STRATEGY_SYSTEM = `You are an AI GTM Campaign Builder strategist. Position the product as campaign intelligence, not campaign sending. Generate target audience, ICP filters, buying signals, sequence strategy, reply routing, tracking, learning, and the improved next campaign. Do not invent facts. Mark inferences as assumptions. Return only valid JSON.`;

export function buildStrategyUser(input: FittingStrategyInput): string {
  return `Build a GTM campaign strategy for this input.

Product / context:
${input.productDescription || "(Product not supplied - infer a conservative campaign around visible workflow leaks.)"}

Segment focus: ${input.segmentFocus}
Goal: ${input.fittingGoal}

Allowed segments: ${SEGMENTS.join(", ")}
Allowed leak types: ${LEAK_TYPES.join(", ")}
Allowed internal campaign angle keys: ${OFFER_PATH_TYPES.join(", ")}

Return JSON with: oneLiner, targetSegments, leakHypotheses (leak + one-line rationale), recommendedOfferPaths, idealCustomerProfile (bullets), assumptions (bullets).`;
}

export const STRATEGY_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  properties: {
    oneLiner: { type: "string" },
    targetSegments: { type: "array", items: { type: "string", enum: SEGMENTS } },
    leakHypotheses: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          leak: { type: "string", enum: LEAK_TYPES },
          rationale: { type: "string" },
        },
        required: ["leak", "rationale"],
      },
    },
    recommendedOfferPaths: { type: "array", items: { type: "string", enum: OFFER_PATH_TYPES } },
    idealCustomerProfile: { type: "array", items: { type: "string" } },
    assumptions: { type: "array", items: { type: "string" } },
  },
  required: [
    "oneLiner",
    "targetSegments",
    "leakHypotheses",
    "recommendedOfferPaths",
    "idealCustomerProfile",
    "assumptions",
  ],
};

// ---------------------------------------------------------------------------
// Conversion Outreach
// ---------------------------------------------------------------------------

export const OUTREACH_SYSTEM = `You write concise B2B outbound for an AI GTM Campaign Builder. Rules, strictly enforced: subject lowercase and 2-4 words; body under 100 words; reference the detected leak; one low-friction CTA phrased as a short question; never invent facts or imply research that did not happen. Return only valid JSON.`;

export function buildOutreachUser(account: RevenueAccount, tone: OutreachTone): string {
  const leak = LEAKS[account.primaryLeak];
  const path = OFFER_PATHS[account.recommendedDavidOfferPath];
  const campaignAngle = campaignAngleLabel(account.recommendedDavidOfferPath, null);
  return `Write a 2-step outbound sequence.

Company: ${account.name}
Industry: ${account.industry}${account.city ? ` (${account.city})` : ""}
Segment: ${account.segment}
Primary leak: ${leak.label} — ${leak.meaning}
Campaign angle: ${campaignAngle} (${path.revenueType})
Suggested CTA for step 1: "${path.primaryCta}"
Tone: ${tone}

Return JSON: { "steps": [ { "stepNumber": 1, "subject", "body", "cta" }, { "stepNumber": 2, "subject", "body", "cta" } ] }.`;
}

export const OUTREACH_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  properties: {
    steps: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          stepNumber: { type: "integer", enum: [1, 2] },
          subject: { type: "string" },
          body: { type: "string" },
          cta: { type: "string" },
        },
        required: ["stepNumber", "subject", "body", "cta"],
      },
    },
  },
  required: ["steps"],
};

// ---------------------------------------------------------------------------
// Fast Conversion Router
// ---------------------------------------------------------------------------

export const REPLY_SYSTEM = `You classify B2B prospect replies for an AI GTM Campaign Builder and return the fastest compliant next action, framed around the recommended campaign angle. If the reply asks to stop/unsubscribe, set shouldSuppress true and do not write persuasive copy. Return only valid JSON.`;

export function buildReplyUser(
  replyText: string,
  ctx: { companyName: string; primaryLeakLabel: string; offerPathLabel: string; firstConversionAction: string },
): string {
  return `Classify and route this reply.

Reply:
"""${replyText}"""

Context:
Company: ${ctx.companyName}
Primary leak: ${ctx.primaryLeakLabel}
Recommended campaign angle: ${ctx.offerPathLabel}
First conversion action: ${campaignCopy(ctx.firstConversionAction, null)}

Allowed intents: ${INTENTS.join(", ")}
Allowed pipeline stages: ${STAGES.join(", ")}

Return JSON: { intent, confidence (0-1), recommendedAction, responseTemplate, updatePipelineStage, shouldSuppress }.`;
}

export const REPLY_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  properties: {
    intent: { type: "string", enum: INTENTS },
    confidence: { type: "number" },
    recommendedAction: { type: "string" },
    responseTemplate: { type: "string" },
    updatePipelineStage: { type: "string", enum: STAGES },
    shouldSuppress: { type: "boolean" },
  },
  required: [
    "intent",
    "confidence",
    "recommendedAction",
    "responseTemplate",
    "updatePipelineStage",
    "shouldSuppress",
  ],
};

// ---------------------------------------------------------------------------
// Reply Conversations
// ---------------------------------------------------------------------------

export const REPLY_CONVERSATION_SYSTEM = `You draft concise reply emails for an AI GTM Campaign Builder. Rules: subject must be lowercase and 2-4 words; body under 100 words; CTA must be a short, low-friction question. If the thread is an opt-out, return a simple non-persistent acknowledgement and do not generate persuasion. Return only valid JSON.`;

export function buildReplyConversationUser(
  replyText: string,
  ctx: {
    companyName: string;
    primaryLeakLabel: string;
    offerPathLabel: string;
    firstConversionAction: string;
    intent: string;
    recommendedAction: string;
    shouldSuppress: boolean;
  },
): string {
  return `Draft a reply email for this prospect response.

Reply:
"""${replyText}"""

Context:
Company: ${ctx.companyName}
Primary leak: ${ctx.primaryLeakLabel}
Recommended campaign angle: ${ctx.offerPathLabel}
First conversion action: ${campaignCopy(ctx.firstConversionAction, null)}
Classified intent: ${ctx.intent}
Recommended action: ${ctx.recommendedAction}
Should suppress: ${ctx.shouldSuppress ? "yes" : "no"}

Return JSON: { "subject": string, "body": string, "cta": string }.
Keep the reply concise, specific, and compliant.`;
}

export const REPLY_CONVERSATION_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  properties: {
    subject: { type: "string" },
    body: { type: "string" },
    cta: { type: "string" },
  },
  required: ["subject", "body", "cta"],
};

// ---------------------------------------------------------------------------
// Briefs
// ---------------------------------------------------------------------------

export const BRIEF_SYSTEM = `You write a concise daily or weekly stats-and-insights brief for an AI GTM Campaign Builder. Use the provided counts and campaign learning. Do not invent metrics. Return only valid JSON.`;

export function buildBriefUser(input: {
  period: "daily" | "weekly";
  periodStart: string;
  periodEnd: string;
  clientName: string;
  counts: Record<string, number>;
  winningSignal: string;
  commonObjection: string;
  nextCampaignRecommendation: string;
}): string {
  return `Write a ${input.period} campaign brief.

Client: ${input.clientName}
Window: ${input.periodStart} to ${input.periodEnd}
Counts:
${Object.entries(input.counts)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join("\n")}

Campaign learning:
- Winning signal: ${input.winningSignal}
- Common objection: ${input.commonObjection}
- Next campaign recommendation: ${input.nextCampaignRecommendation}

Return JSON: { "narrative": string, "recommendations": string[] }.
Keep the narrative short, concrete, and specific to the provided counts.`;
}

export const BRIEF_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  properties: {
    narrative: { type: "string" },
    recommendations: { type: "array", items: { type: "string" } },
  },
  required: ["narrative", "recommendations"],
};
