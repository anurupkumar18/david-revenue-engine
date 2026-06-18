// Deterministic send guardrails for Phase 2 (real/scheduled sending + AI replies).
//
// These are pure functions with no I/O so the keyless demo and `npm run smoke` can
// exercise the conservative auto-send policy without a network or API key. The backend
// scheduler/inbound spine (FastAPI) and the Next reply-conversation route both decide
// auto-send vs human-review through `shouldAutoSend` so the policy lives in exactly one
// place. Opt-outs are never auto-sent; sensitive intents and low-confidence/low-fit
// cases always fall to human review.

import type { Grade, ReplyIntent } from "./types";

/** Conservative default: only the cleanest, highest-confidence cases auto-send. */
export const DEFAULT_AUTO_SEND_CONFIDENCE = 0.9;
export const DEFAULT_DAILY_SEND_CAP = 50;
/** Days to wait before the second step of a sequence (unless a reply arrives first). */
export const STEP_TWO_DELAY_DAYS = 3;

/** Reply intents that always require a human, even at high confidence. */
export const SENSITIVE_REPLY_INTENTS: ReplyIntent[] = [
  "objection_no_time",
  "not_interested",
  "wrong_person",
  "ambiguous",
];

export type AutoSendDecision = {
  autoSend: boolean;
  reason: string;
};

export type SendGuardInput = {
  /** Whether the outbound copy / drafted reply passed compliance validation. */
  validationPassed: boolean;
  /** Recipient is on the suppression list or replied with an opt-out. */
  suppressed: boolean;
  /** Remaining sends allowed under the per-customer daily cap. */
  capRemaining: number;
  /** Reply confidence (0-1). Omit for outbound sequence sends that have no classifier. */
  confidence?: number;
  /** Reply intent. Omit for outbound sequence sends. */
  intent?: ReplyIntent | null;
  /** Fit grade of the target account (D-grade falls to review). */
  grade?: Grade | null;
  /** Auto-send confidence threshold (default conservative 0.9). */
  threshold?: number;
};

/**
 * The single source of truth for "auto-send or hand to a human". Conservative by design:
 * any opt-out, failed validation, exhausted cap, sensitive intent, sub-threshold
 * confidence, or low-fit (grade D) account routes to human review.
 */
export function shouldAutoSend(input: SendGuardInput): AutoSendDecision {
  const threshold = input.threshold ?? DEFAULT_AUTO_SEND_CONFIDENCE;

  if (input.suppressed) {
    return { autoSend: false, reason: "Recipient is suppressed — do not send." };
  }
  if (!input.validationPassed) {
    return { autoSend: false, reason: "Copy failed compliance validation — needs review." };
  }
  if (input.capRemaining <= 0) {
    return { autoSend: false, reason: "Daily send cap reached — held for the next window." };
  }
  if (input.intent && SENSITIVE_REPLY_INTENTS.includes(input.intent)) {
    return { autoSend: false, reason: "Sensitive reply intent — needs human review." };
  }
  if (typeof input.confidence === "number" && input.confidence < threshold) {
    return { autoSend: false, reason: `Confidence ${input.confidence} below ${threshold} — needs review.` };
  }
  if (input.grade === "D") {
    return { autoSend: false, reason: "Low-fit account (grade D) — needs review." };
  }
  return { autoSend: true, reason: "Clean, high-confidence send." };
}

/** Deterministic scheduled time for the second sequence step. */
export function scheduleStepTwo(sentAt: Date | string, delayDays = STEP_TWO_DELAY_DAYS): string {
  const base = typeof sentAt === "string" ? new Date(sentAt) : sentAt;
  const next = new Date(base.getTime() + delayDays * 24 * 60 * 60 * 1000);
  return next.toISOString();
}
