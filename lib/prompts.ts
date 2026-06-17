// System prompts, user-message builders, and JSON output schemas for the optional
// Claude layer. Outputs are validated downstream and fall back to deterministic logic.

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

export const STRATEGY_SYSTEM = `You are David AI's GTM strategist. David sells: David Marketing retainers, Growth Plans, The Fitting (paid diagnostic), Custom Agents, Custom AI OS builds, Embedded AI Teams, White-label Deployments, and a Partner Program. Position every recommendation as a path to recurring revenue for David. Do not invent facts. Mark inferences as assumptions. Return only valid JSON.`;

export function buildStrategyUser(input: FittingStrategyInput): string {
  return `Build a David GTM "Fitting Strategy" for this input.

Product / context:
${input.productDescription || "(David AI itself — find businesses leaking time, leads, or margin.)"}

Segment focus: ${input.segmentFocus}
Goal: ${input.fittingGoal}

Allowed segments: ${SEGMENTS.join(", ")}
Allowed leak types: ${LEAK_TYPES.join(", ")}
Allowed David offer paths: ${OFFER_PATH_TYPES.join(", ")}

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

export const OUTREACH_SYSTEM = `You write concise B2B outbound for David AI. Rules, strictly enforced: subject lowercase and 2-4 words; body under 100 words; reference the detected leak; one low-friction CTA phrased as a short question; never invent facts or imply research that didn't happen. Return only valid JSON.`;

export function buildOutreachUser(account: RevenueAccount, tone: OutreachTone): string {
  const leak = LEAKS[account.primaryLeak];
  const path = OFFER_PATHS[account.recommendedDavidOfferPath];
  return `Write a 2-step outbound sequence.

Company: ${account.name}
Industry: ${account.industry}${account.city ? ` (${account.city})` : ""}
Segment: ${account.segment}
Primary leak: ${leak.label} — ${leak.meaning}
David should pitch: ${path.label} (${path.revenueType})
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

export const REPLY_SYSTEM = `You classify B2B prospect replies for David AI and return the fastest compliant next action, framed around the recommended David offer path. If the reply asks to stop/unsubscribe, set shouldSuppress true and do not write persuasive copy. Return only valid JSON.`;

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
Recommended David path: ${ctx.offerPathLabel}
First conversion action: ${ctx.firstConversionAction}

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
