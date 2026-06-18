// Validation for drafted reply conversations. Reuses the outbound validators where
// possible, with a suppression-safe branch for opt-outs.

import type { DavidLeakType, EmailValidation } from "./types";
import { validateEmail } from "./validators";
import type { ReplyDraft } from "./reply-conversation";

export type ReplyDraftValidationContext = {
  primaryLeakType?: DavidLeakType | null;
  primaryLeakLabel?: string | null;
};

function labelAppearsInBody(body: string, label: string | null | undefined): boolean {
  if (!label) return false;
  const normalized = label.toLowerCase().trim();
  if (!normalized) return false;
  return body.toLowerCase().includes(normalized);
}

export function validateReplyDraft(
  draft: Pick<ReplyDraft, "subject" | "body" | "cta" | "routed">,
  context: ReplyDraftValidationContext = {},
): EmailValidation {
  if (draft.routed.shouldSuppress) {
    return {
      subjectLowercase: true,
      subjectWordCountOk: true,
      bodyUnder100Words: true,
      hasLowFrictionCta: true,
      referencesLeak: true,
      noInventedClaims: true,
      passed: true,
      warnings: [],
    };
  }

  const base = validateEmail({
    subject: draft.subject,
    body: draft.body,
    cta: draft.cta,
    referencedLeak: context.primaryLeakType ?? null,
  });

  if (!base.referencesLeak && labelAppearsInBody(draft.body, context.primaryLeakLabel)) {
    return {
      ...base,
      referencesLeak: true,
      passed: base.subjectLowercase &&
        base.subjectWordCountOk &&
        base.bodyUnder100Words &&
        base.hasLowFrictionCta &&
        true &&
        base.noInventedClaims,
      warnings: base.warnings.filter((warning) => warning !== "Body should reference the detected leak."),
    };
  }

  return base;
}
