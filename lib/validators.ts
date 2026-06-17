// Outbound copy validators (rules.md). Used by the deterministic generator and
// to validate any LLM-authored email before it reaches the UI.

import { LEAKS } from "./constants";
import type { DavidLeakType, EmailValidation } from "./types";

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function isLowercase(subject: string): boolean {
  return subject === subject.toLowerCase();
}

export function subjectWordCountOk(subject: string): boolean {
  const n = countWords(subject);
  return n >= 2 && n <= 4;
}

const DISALLOWED_CTA = /(demo now|sign up today|free tomorrow|at \d{1,2}\s?(am|pm)|send (over )?a contract|book a \d+-?minute)/i;

export function hasLowFrictionCta(cta: string): boolean {
  const trimmed = cta.trim();
  if (!trimmed.endsWith("?")) return false;
  if (countWords(trimmed) > 20) return false; // accommodates the longest canonical David CTA
  if (DISALLOWED_CTA.test(trimmed)) return false;
  return true;
}

/** Phrases that imply research that may not have happened (rules.md signal rules). */
const INVENTED_CLAIM_PATTERNS = [
  /noticed (you|your)[^.]*\b(hiring|github|repo|reviews?)/i,
  /saw your (github|repo|recent post)/i,
  /your reviews are (poor|bad|terrible)/i,
  /loved your recent post/i,
  /\bguaranteed\b/i,
  /\b10x\b/i,
];

export function noInventedClaims(body: string): boolean {
  return !INVENTED_CLAIM_PATTERNS.some((re) => re.test(body));
}

/** Extra reference keywords per leak so a natural paraphrase still counts. */
const LEAK_KEYWORDS: Partial<Record<DavidLeakType, string[]>> = {
  missed_calls: ["missed call", "missed calls", "inbound call"],
  weak_map_pack: ["map pack", "local search", "google map", "show up"],
  stale_content: ["content", "posts", "online presence"],
  manual_follow_up: ["follow-up", "follow up", "following up"],
  review_gap: ["review", "reviews", "reputation"],
  basic_website: ["website", "site", "landing"],
  multi_location_complexity: ["location", "locations"],
  crm_copy_paste: ["crm", "copy", "data entry", "copy-paste"],
  platform_distribution: ["clients", "platform", "white-label", "white label"],
  ops_bottleneck: ["workflow", "bottleneck", "manual steps"],
  high_ticket_service: ["high-value", "every deal", "each customer"],
  appointment_driven: ["calendar", "appointment", "booking", "slots"],
  lead_quality_gap: ["lead", "leads", "qualified"],
  slow_speed_to_lead: ["respond", "response", "speed", "reply"],
  reporting_gap: ["report", "reporting", "visibility"],
  ai_capability_gap: ["ai", "capability", "execution"],
};

export function referencesLeak(body: string, leak: DavidLeakType | null): boolean {
  if (!leak) return false;
  const hay = body.toLowerCase();
  const labelWords = LEAKS[leak].label.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const keywords = [...labelWords, ...(LEAK_KEYWORDS[leak] ?? [])];
  return keywords.some((k) => hay.includes(k));
}

export function validateEmail(args: {
  subject: string;
  body: string;
  cta: string;
  referencedLeak: DavidLeakType | null;
}): EmailValidation {
  const subjectLowercase = isLowercase(args.subject);
  const subjectWords = subjectWordCountOk(args.subject);
  const bodyOk = countWords(args.body) < 100;
  const ctaOk = hasLowFrictionCta(args.cta);
  const refOk = referencesLeak(args.body, args.referencedLeak);
  const noClaims = noInventedClaims(args.body);

  const warnings: string[] = [];
  if (!subjectLowercase) warnings.push("Subject should be lowercase.");
  if (!subjectWords) warnings.push("Subject should be 2-4 words.");
  if (!bodyOk) warnings.push("Body should be under 100 words.");
  if (!ctaOk) warnings.push("CTA should be a short, low-friction question.");
  if (!refOk) warnings.push("Body should reference the detected leak.");
  if (!noClaims) warnings.push("Body may contain an unverifiable claim.");

  return {
    subjectLowercase,
    subjectWordCountOk: subjectWords,
    bodyUnder100Words: bodyOk,
    hasLowFrictionCta: ctaOk,
    referencesLeak: refOk,
    noInventedClaims: noClaims,
    passed: subjectLowercase && subjectWords && bodyOk && ctaOk && refOk && noClaims,
    warnings,
  };
}
