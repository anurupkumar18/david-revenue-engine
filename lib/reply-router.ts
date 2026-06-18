// Deterministic Fast Conversion Router.
// Classifies a prospect reply by keyword rules and returns the fastest compliant
// next action + a response template framed around the recommended campaign angle.
// Used directly in demo/offline mode and as the fallback for the LLM route.

import type { PipelineStage, ReplyIntent, RoutedReply } from "./types";

export type ReplyContext = {
  companyName?: string;
  primaryLeakLabel?: string;
  offerPathLabel?: string;
  firstConversionAction?: string;
};

type Rule = {
  intent: ReplyIntent;
  test: RegExp;
  confidence: number;
  stage: PipelineStage;
  suppress: boolean;
  action: string;
  template: (ctx: Required<ReplyContext>) => string;
};

// Order matters: the first matching rule wins. Unsubscribe is checked first.
const RULES: Rule[] = [
  {
    intent: "unsubscribe",
    test: /\b(unsubscribe|remove me|take me off|opt[- ]?out|stop (contacting|emailing|messaging)|do not (contact|email)|don'?t contact)\b/i,
    confidence: 0.97,
    stage: "suppressed",
    suppress: true,
    action: "Suppress immediately. Do not generate persuasive follow-up.",
    template: () => "Understood — I'll make sure you are not contacted again.",
  },
  {
    intent: "out_of_office",
    test: /\b(out of office|ooo|on vacation|on holiday|annual leave|away until|back (on|next)|maternity|paternity)\b/i,
    confidence: 0.9,
    stage: "nurture",
    suppress: false,
    action: "Schedule a follow-up for when they return.",
    template: (ctx) =>
      `Thanks for the note — I'll follow up when you're back. When that time comes I'd love to share the quick ${ctx.offerPathLabel} idea for ${ctx.companyName}.`,
  },
  {
    intent: "wrong_person",
    test: /\b(wrong person|not (the )?right (person|one)|do(n'?t| not) handle|not my (area|department|role)|you should (talk|speak|reach)|forward this|office manager|talk to our)\b/i,
    confidence: 0.88,
    stage: "replied",
    suppress: false,
    action: "Ask for a referral to the owner of this function.",
    template: (ctx) =>
      `Thanks for letting me know. Who would be closest to ${ctx.primaryLeakLabel} or ${ctx.offerPathLabel} on your team?`,
  },
  {
    intent: "asks_for_info",
    test: /\b(more info|send (me )?(some |more )?info|details|pricing|how (does|much|would)|learn more|case study|case studies|deck|tell me more|what (do|does|is)|send (me )?(a |the )?(link|overview))\b/i,
    confidence: 0.9,
    stage: "info_sent",
    suppress: false,
    action: "Send the most relevant campaign brief or a short explanation.",
    template: (ctx) =>
      `Of course - the short version is that this campaign targets ${ctx.primaryLeakLabel} through ${ctx.offerPathLabel}.

The most relevant next step would be: ${ctx.firstConversionAction} I can send a short breakdown of what we would look at first.`,
  },
  {
    intent: "objection_no_time",
    test: /\b(too busy|no time|not (a )?(good )?time|swamped|slammed|maybe later|next (quarter|month|year)|not right now|circle back|busy right now|reach out later)\b/i,
    confidence: 0.85,
    stage: "objection",
    suppress: false,
    action: "Reduce the ask — offer an async teardown instead of a call.",
    template: (ctx) =>
      `Completely fair. Instead of a call, I can send 3 quick notes on where ${ctx.companyName} may be leaking time or revenue.

Worth sending that over async?`,
  },
  {
    intent: "not_interested",
    test: /\b(not interested|no thanks|no thank you|we'?re (all )?set|already have|we pass|not for us|not a fit)\b/i,
    confidence: 0.85,
    stage: "nurture",
    suppress: false,
    action: "Acknowledge and ask permission to share an idea later.",
    template: (ctx) =>
      `Totally understand — I'll leave it there. If it's ever useful, I'm happy to send one idea on ${ctx.primaryLeakLabel} down the line. No pressure either way.`,
  },
  {
    intent: "positive_call",
    test: /\b(sure|happy to|sounds good|let'?s (chat|talk|do it)|yes|interested|what times?|works for me|set (up|something)|grab (a )?(call|time)|book|calendar|when (are|can|works)|love to)\b/i,
    confidence: 0.92,
    stage: "meeting_ready",
    suppress: false,
    action: "Send a calendar link framed around the recommended campaign angle.",
    template: (ctx) =>
      `Sounds good — here's my calendar: {{calendar_link}}

I'll frame it around ${ctx.offerPathLabel} and the main leak we flagged: ${ctx.primaryLeakLabel}.`,
  },
];

function fill(ctx: ReplyContext): Required<ReplyContext> {
  return {
    companyName: ctx.companyName ?? "your team",
    primaryLeakLabel: ctx.primaryLeakLabel ?? "primary leak",
    offerPathLabel: ctx.offerPathLabel ?? "the right campaign angle",
    firstConversionAction: ctx.firstConversionAction ?? "a short teardown.",
  };
}

export function routeReply(replyText: string, context: ReplyContext = {}): RoutedReply {
  const ctx = fill(context);
  const text = replyText.trim();

  for (const rule of RULES) {
    if (rule.test.test(text)) {
      return {
        intent: rule.intent,
        confidence: rule.confidence,
        recommendedAction: rule.action,
        responseTemplate: rule.template(ctx),
        updatePipelineStage: rule.stage,
        shouldSuppress: rule.suppress,
        source: "deterministic",
      };
    }
  }

  return {
    intent: "ambiguous",
    confidence: 0.5,
    recommendedAction: "Low confidence — route to human review before replying.",
    responseTemplate: `Thanks for the reply. Just so I point you to the right thing — is ${ctx.primaryLeakLabel} something worth a quick look, or should I follow up another time?`,
    updatePipelineStage: "replied",
    shouldSuppress: false,
    source: "deterministic",
  };
}
