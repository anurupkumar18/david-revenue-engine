// Deterministic Conversion Outreach generator.
// Produces a compliant 2-step sequence that references the account's primary leak
// and uses the recommended David offer path's CTA. Always passes validators.

import { LEAKS, OFFER_PATHS } from "./constants";
import { validateEmail } from "./validators";
import type {
  DavidLeakType,
  EmailStep,
  OutreachSequence,
  OutreachTone,
  RevenueAccount,
  Segment,
} from "./types";

const SEGMENT_PHRASE: Record<Segment, string> = {
  local_business: "local businesses",
  service_business: "service businesses",
  multi_location: "multi-location operators",
  platform: "platforms like yours",
  agency: "agencies",
  enterprise: "teams",
  other: "teams",
};

/** Per-leak natural-language framing (observation references the leak; cost = revenue impact). */
const LEAK_PHRASE: Record<DavidLeakType, { observation: string; cost: string }> = {
  missed_calls: { observation: "missed calls during busy hours", cost: "booked jobs" },
  weak_map_pack: { observation: "a weak spot in local search and the map pack", cost: "high-intent local customers" },
  stale_content: { observation: "content that's gone a bit stale", cost: "trust with new customers" },
  manual_follow_up: { observation: "lead follow-up that's still manual", cost: "deals that quietly go cold" },
  review_gap: { observation: "an under-built review workflow", cost: "conversions across every channel" },
  basic_website: { observation: "a website that may not convert your traffic", cost: "demand you're already paying for" },
  multi_location_complexity: { observation: "execution that's fragmented across locations", cost: "margin and consistency" },
  crm_copy_paste: { observation: "hours lost to CRM copy-paste", cost: "billable time" },
  platform_distribution: { observation: "a base of clients that's ready for AI you don't yet offer", cost: "recurring revenue" },
  ops_bottleneck: { observation: "a repeatable workflow bottleneck", cost: "throughput" },
  high_ticket_service: { observation: "high-value deals that hinge on manual steps", cost: "revenue on every opportunity" },
  appointment_driven: { observation: "calendar gaps that are hard to refill", cost: "unrecoverable revenue" },
  lead_quality_gap: { observation: "lead spend that isn't turning into booked work", cost: "marketing budget" },
  slow_speed_to_lead: { observation: "response times that may be costing the first-responder edge", cost: "conversions" },
  reporting_gap: { observation: "limited visibility into what's actually working", cost: "budget aimed at the wrong places" },
  ai_capability_gap: { observation: "demand for AI you don't yet have the team to execute", cost: "recurring revenue to faster rivals" },
};

const OPENERS: Record<OutreachTone, string> = {
  casual: "Hi {{first_name}} —",
  direct: "{{first_name}} —",
  founder_led: "Hi {{first_name}}, founder to founder —",
};

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function buildStep(
  stepNumber: 1 | 2,
  account: RevenueAccount,
  tone: OutreachTone,
): EmailStep {
  const leak = account.primaryLeak;
  const phrase = LEAK_PHRASE[leak];
  const segPhrase = SEGMENT_PHRASE[account.segment];
  const lever = lowerFirst(LEAKS[leak].leverAngle);
  const where = account.city ? ` over in ${account.city}` : "";
  const path = OFFER_PATHS[account.recommendedDavidOfferPath];

  let subject: string;
  let body: string;
  let cta: string;

  if (stepNumber === 1) {
    subject = "quick idea";
    cta = path.primaryCta;
    body = `${OPENERS[tone]} ${account.name}${where} looks like ${phrase.observation} could be quietly costing you ${phrase.cost}.

David helps ${segPhrase} fix exactly that — ${lever} — without adding headcount.

${cta}`;
  } else {
    subject = "worth trying";
    cta = "Want me to send those 2 specifics over?";
    body = `Following up, {{first_name}} — most ${segPhrase} don't need more tools, they need ${phrase.observation} handled automatically.

If useful, I can share 2 specifics on how David would fix it for ${account.name}.

${cta}`;
  }

  return {
    stepNumber,
    subject,
    body,
    cta,
    referencedLeak: leak,
    wordCount: body.trim().split(/\s+/).filter(Boolean).length,
    validation: validateEmail({ subject, body, cta, referencedLeak: leak }),
  };
}

export function buildOutreachSequence(
  account: RevenueAccount,
  tone: OutreachTone = "casual",
): OutreachSequence {
  return {
    accountId: account.id,
    offerPath: account.recommendedDavidOfferPath,
    tone,
    source: "deterministic",
    steps: [buildStep(1, account, tone), buildStep(2, account, tone)],
  };
}
