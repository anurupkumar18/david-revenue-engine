// Deterministic reply-conversation draft builder.
//
// The reply router classifies the inbound text. This layer turns that routing into a
// short, compliant reply draft that can be enhanced by the optional LLM route.

import { routeReply, type ReplyContext } from "./reply-router";
import type { DavidLeakType, EmailValidation, ReplyIntent, RoutedReply } from "./types";
import { validateReplyDraft } from "./reply-validators";

export type ReplyDraftContext = ReplyContext & {
  primaryLeakType?: DavidLeakType | null;
  primaryLeakLabel?: string;
};

export type ReplyDraft = {
  subject: string;
  body: string;
  cta: string;
  routed: RoutedReply;
  validation: EmailValidation;
  source: "deterministic" | "llm";
};

type DraftTemplate = {
  subject: string;
  body: (ctx: Required<ReplyContext>) => string;
  cta: (ctx: Required<ReplyContext>) => string;
};

const DRAFTS: Record<ReplyIntent, DraftTemplate> = {
  positive_call: {
    subject: "re: next step",
    body: (ctx) =>
      `Sounds good - I can frame the next step around ${ctx.offerPathLabel} and the ${ctx.primaryLeakLabel} we flagged. Would Tuesday or Wednesday work?`,
    cta: () => "Would Tuesday or Wednesday work?",
  },
  asks_for_info: {
    subject: "re: the details",
    body: (ctx) =>
      `Of course - the short version is that this campaign targets ${ctx.primaryLeakLabel} through ${ctx.offerPathLabel}. I can send a 3-bullet breakdown of the first step. Want the short version?`,
    cta: () => "Want the short version?",
  },
  objection_no_time: {
    subject: "re: async teardown",
    body: (ctx) =>
      `Completely fair. I can send an async teardown focused on ${ctx.primaryLeakLabel} instead of a call. Worth sending?`,
    cta: () => "Worth sending?",
  },
  not_interested: {
    subject: "re: understood",
    body: (ctx) =>
      `Totally understood. I'll leave it there; if useful later, I can send one idea on ${ctx.primaryLeakLabel}. Should I circle back another time?`,
    cta: () => "Should I circle back another time?",
  },
  wrong_person: {
    subject: "re: right contact",
    body: (ctx) =>
      `Thanks for pointing me to the right person. Who owns ${ctx.primaryLeakLabel} or ${ctx.offerPathLabel} on your side?`,
    cta: () => "Who owns it on your side?",
  },
  unsubscribe: {
    subject: "re: no more emails",
    body: () => "Understood - I'll make sure you're not contacted again.",
    cta: () => "No further action needed?",
  },
  out_of_office: {
    subject: "re: when back",
    body: (ctx) =>
      `Thanks for the note. I'll follow up when you're back and keep it to the ${ctx.offerPathLabel} angle for ${ctx.companyName}. Should I check back then?`,
    cta: () => "Should I check back then?",
  },
  ambiguous: {
    subject: "re: quick follow-up",
    body: (ctx) =>
      `Thanks for the reply. I want to point you to the right thing - is ${ctx.primaryLeakLabel} worth a quick look, or should I follow up another time?`,
    cta: () => "Worth a quick look?",
  },
};

function fill(ctx: ReplyDraftContext): Required<ReplyContext> {
  return {
    companyName: ctx.companyName ?? "your team",
    primaryLeakLabel: ctx.primaryLeakLabel ?? "primary leak",
    offerPathLabel: ctx.offerPathLabel ?? "the right campaign angle",
    firstConversionAction: ctx.firstConversionAction ?? "a short teardown.",
  };
}

function draftForIntent(intent: ReplyIntent, ctx: Required<ReplyContext>): Pick<ReplyDraft, "subject" | "body" | "cta"> {
  const template = DRAFTS[intent];
  return {
    subject: template.subject,
    body: template.body(ctx),
    cta: template.cta(ctx),
  };
}

export function buildReplyDraft(replyText: string, context: ReplyDraftContext = {}): ReplyDraft {
  const ctx = fill(context);
  const routed = routeReply(replyText, ctx);
  const draft = draftForIntent(routed.intent, ctx);
  const validation = validateReplyDraft(
    { ...draft, routed },
    { primaryLeakType: context.primaryLeakType ?? null, primaryLeakLabel: context.primaryLeakLabel ?? ctx.primaryLeakLabel },
  );

  return {
    ...draft,
    routed,
    validation,
    source: "deterministic",
  };
}
