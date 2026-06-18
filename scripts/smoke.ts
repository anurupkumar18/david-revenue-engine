// Smoke test for the deterministic revenue brain.
// Run with: npm run smoke   (no API keys, no network required)
// Prints every account's full revenue narrative and asserts invariants.

import seedRepliesJson from "../data/seed-replies.json";
import campaignFixture from "../data/campaign-fixtures/david-ai-profile.json";
import {
  CAMPAIGN_PRICING_TIERS,
  DEFAULT_CAMPAIGN_EVENTS,
  buildCampaignIntelligence,
  campaignAngleLabel,
  campaignCopy,
  campaignInputFromICPFields,
  recomputeCampaign,
} from "../lib/campaign";
import type { CampaignEvent } from "../lib/campaign";
import { INTENT_LABELS, OFFER_PATHS, RECURRING_POTENTIAL_LABELS } from "../lib/constants";
import { buildAccountsForProfile, icpFieldsToStrategyInput } from "../lib/icp-bridge";
import { buildOutreachSequence } from "../lib/outreach";
import { routeReply } from "../lib/reply-router";
import { scheduleStepTwo, shouldAutoSend } from "../lib/sending";
import { getSeedAccounts } from "../lib/seed";
import { buildFittingStrategy } from "../lib/strategy";
import type { ReplyIntent } from "../lib/types";
import type { ICPFields } from "../lib/types/icp";

const failures: string[] = [];
function check(cond: boolean, msg: string) {
  if (!cond) failures.push(msg);
}

const line = "─".repeat(78);
const accounts = getSeedAccounts();

console.log(`\n${line}\nAI GTM CAMPAIGN BUILDER - deterministic smoke test\n${line}`);
console.log(`Loaded ${accounts.length} accounts (sorted by Revenue Opportunity).\n`);

// ---- Per-account narrative + invariants ----------------------------------
for (const a of accounts) {
  const plan = a.landAndExpandPlan;
  console.log(`${a.name}  [${a.segment}]`);
  console.log(`  Detected leaks      : ${a.detectedLeakTypes.join(", ")}`);
  console.log(`  Fit Score           : ${a.fittingScore} (${a.fitting.grade})`);
  console.log(`  Revenue Opportunity : ${a.revenueOpportunityScore} (${a.revenueOpportunity.grade})`);
  console.log(`  Recurring potential : ${RECURRING_POTENTIAL_LABELS[a.recurringRevenuePotential]}`);
  console.log(`  Recommended angle   : ${campaignAngleLabel(a.recommendedDavidOfferPath, null)}  - ${campaignCopy(a.revenueModel.narrative, null)}`);
  console.log(
    `  Land -> Expand      : ${campaignAngleLabel(plan.landOffer, null)} -> ${campaignAngleLabel(plan.expansionOffer, null)}` +
      (plan.longTermOffer ? ` -> ${campaignAngleLabel(plan.longTermOffer, null)}` : ""),
  );
  console.log(`  Next action         : ${campaignCopy(a.nextBestConversionAction, null)}\n`);

  check(a.detectedLeakTypes.length >= 1, `${a.name}: no detected leaks`);
  check(a.fittingScore >= 0 && a.fittingScore <= 100, `${a.name}: fittingScore out of range`);
  check(
    a.revenueOpportunityScore >= 0 && a.revenueOpportunityScore <= 100,
    `${a.name}: revenueOpportunityScore out of range`,
  );
  check(!!OFFER_PATHS[a.recommendedDavidOfferPath], `${a.name}: invalid offer path`);
  check(
    !!plan.landOffer && !!plan.expansionOffer && plan.revenueLogic.length > 10,
    `${a.name}: incomplete land-and-expand plan`,
  );
  check(a.nextBestConversionAction.trim().length > 0, `${a.name}: empty next action`);
  check(a.rationale.length >= 2, `${a.name}: needs >=2 rationale bullets`);
  check(
    a.recurringRevenuePotential != null,
    `${a.name}: missing recurring revenue potential`,
  );
}

// ---- Offer-path coverage --------------------------------------------------
const pathsHit = new Set(accounts.map((a) => a.recommendedDavidOfferPath));
console.log(`${line}\nCampaign angles represented: ${[...pathsHit].length}/8`);
console.log(`  ${[...pathsHit].map((path) => campaignAngleLabel(path, null)).join(", ")}\n`);
check(pathsHit.size >= 6, `Expected >=6 distinct offer paths, got ${pathsHit.size}`);

// ---- Reply routing --------------------------------------------------------
console.log(`${line}\nReply routing:\n`);
const replies = seedRepliesJson as { id: string; text: string; expectedIntent: ReplyIntent }[];
const hero = accounts[0];
for (const r of replies) {
  const routed = routeReply(r.text, {
    companyName: hero.name,
    primaryLeakLabel: hero.leaks[0].label,
    offerPathLabel: campaignAngleLabel(hero.recommendedDavidOfferPath, null),
    firstConversionAction: campaignCopy(hero.nextBestConversionAction, null),
  });
  const ok = routed.intent === r.expectedIntent;
  console.log(
    `  ${ok ? "✓" : "✗"} "${r.text.slice(0, 42)}…" → ${INTENT_LABELS[routed.intent]} ` +
      `(stage: ${routed.updatePipelineStage}${routed.shouldSuppress ? ", suppressed" : ""})`,
  );
  check(ok, `Reply "${r.id}" expected ${r.expectedIntent}, got ${routed.intent}`);
}
const unsub = routeReply("please remove me from your list");
check(unsub.shouldSuppress && unsub.updatePipelineStage === "suppressed", "Unsubscribe must suppress");

// ---- Outreach validation --------------------------------------------------
console.log(`\n${line}\nOutreach validation:\n`);
for (const a of accounts.slice(0, 3)) {
  const seq = buildOutreachSequence(a);
  for (const step of seq.steps) {
    const v = step.validation;
    console.log(
      `  ${v.passed ? "✓" : "✗"} ${a.name} step ${step.stepNumber} ` +
        `subj="${step.subject}" words=${step.wordCount}` +
        (v.passed ? "" : ` warnings: ${v.warnings.join("; ")}`),
    );
    check(v.passed, `${a.name} step ${step.stepNumber} failed validation: ${v.warnings.join("; ")}`);
  }
}

// ---- Campaign intelligence ------------------------------------------------
console.log(`\n${line}\nCampaign intelligence:\n`);
const fixtureFields = campaignFixture.fields as ICPFields;
const fixtureAccounts = buildAccountsForProfile(fixtureFields, []);
const fixtureStrategy = {
  ...buildFittingStrategy(icpFieldsToStrategyInput(fixtureFields)),
  source: "deterministic" as const,
};
const campaign = buildCampaignIntelligence({
  input: campaignInputFromICPFields(fixtureFields),
  fields: fixtureFields,
  accounts: fixtureAccounts,
  strategy: fixtureStrategy,
  events: DEFAULT_CAMPAIGN_EVENTS,
});

console.log(`  Promise             : ${campaign.positioning.promise}`);
console.log(`  ICP filters         : ${campaign.strategy.icpFilters.length}`);
console.log(`  Buying signals      : ${campaign.strategy.buyingSignals.length}`);
console.log(`  Sequence steps      : ${campaign.sequence.steps.length}`);
console.log(`  Replies routed      : ${campaign.metrics.repliesRouted}`);
console.log(`  Winning signal      : ${campaign.metrics.winningSignal}`);
console.log(`  Next campaign       : ${campaign.nextCampaign.title}`);

check(campaign.positioning.promise === "Campaign intelligence, not campaign sending.", "Campaign promise missing");
check(campaign.strategy.icpFilters.length >= 5, "Campaign needs >=5 ICP filters");
check(campaign.strategy.buyingSignals.length >= 4, "Campaign needs >=4 buying signals");
check(campaign.sequence.steps.length === 2, "Campaign sequence must have exactly two steps");
check(campaign.sequence.steps.every((step) => step.validation.passed), "Campaign sequence must pass validators");
check(campaign.metrics.campaignsCreated >= 1, "Campaign metrics must include campaigns created");
check(campaign.metrics.filtersCopied >= 1, "Campaign metrics must include filters copied");
check(campaign.metrics.sequencesCopied >= 1, "Campaign metrics must include sequences copied");
check(campaign.metrics.repliesRouted >= 1, "Campaign metrics must include replies routed");
check(campaign.metrics.winningSignal.length > 0, "Campaign metrics must include winning signal");
check(campaign.metrics.commonObjection.length > 0, "Campaign metrics must include common objection");
check(campaign.learningInsights.nextCampaignRecommendation.length > 0, "Learning insights must include next-campaign recommendation");
check(campaign.nextCampaign.improvements.length >= 3, "Improved next campaign needs recommendations");
check(CAMPAIGN_PRICING_TIERS.length === 7, "Pricing mock must include seven tiers");

// ---- Self-improving loop: recompute from real events ----------------------
// The tracker/learning must reflect *actual* logged events, not a static seed.
const newEvents: CampaignEvent[] = [
  { type: "campaign_created" },
  { type: "filters_copied" },
  { type: "sequence_copied" },
  { type: "reply_routed", signal: "after-hours leads" },
  { type: "reply_routed", signal: "after-hours leads" },
  { type: "positive_reply", signal: "after-hours leads" },
  { type: "positive_reply", signal: "after-hours leads" },
  { type: "meeting_booked", signal: "after-hours leads" },
  { type: "bad_fit", objection: "Locked into an annual contract" },
];
const recomputed = recomputeCampaign(campaign, newEvents);
console.log(`  Recompute winner    : ${recomputed.metrics.winningSignal} (was ${campaign.metrics.winningSignal})`);

check(recomputed.metrics.winningSignal === "after-hours leads", "recompute must derive winning signal from new events");
check(recomputed.metrics.winningSignal !== campaign.metrics.winningSignal, "recompute must change winning signal when events change");
check(recomputed.learningInsights.winningSignal === "after-hours leads", "recompute must propagate winning signal to learning insights");
check(recomputed.nextCampaign.revisedHypothesis.includes("after-hours leads"), "recompute must reflect winning signal in next-campaign hypothesis");
check(recomputed.metrics.commonObjection === "Locked into an annual contract", "recompute must derive common objection from new events");
check(recomputed.metrics.repliesRouted === 2, "recompute must recount replies routed");
check(recomputed.strategy.audienceSummary === campaign.strategy.audienceSummary, "recompute must preserve targeting (strategy) unchanged");
check(recomputed.sequence === campaign.sequence, "recompute must preserve the approved sequence");

// ---- Phase 2 send guardrails (conservative auto-send) ---------------------
// The send/reply spine asks shouldAutoSend() whether a send may go automatically.
// It must be conservative: opt-outs, failed validation, exhausted caps, sensitive
// intents, low confidence, and low-fit accounts all fall to human review.
console.log(`\n${line}\nSend guardrails:\n`);
const cleanSend = shouldAutoSend({ validationPassed: true, suppressed: false, capRemaining: 10, confidence: 0.95, grade: "A" });
const suppressedSend = shouldAutoSend({ validationPassed: true, suppressed: true, capRemaining: 10, confidence: 0.95, grade: "A" });
const lowConfidence = shouldAutoSend({ validationPassed: true, suppressed: false, capRemaining: 10, confidence: 0.6, grade: "A" });
const failedValidation = shouldAutoSend({ validationPassed: false, suppressed: false, capRemaining: 10, confidence: 0.95, grade: "A" });
const capReached = shouldAutoSend({ validationPassed: true, suppressed: false, capRemaining: 0, confidence: 0.95, grade: "A" });
const sensitiveIntent = shouldAutoSend({ validationPassed: true, suppressed: false, capRemaining: 10, confidence: 0.99, intent: "not_interested", grade: "A" });
const lowFit = shouldAutoSend({ validationPassed: true, suppressed: false, capRemaining: 10, confidence: 0.95, grade: "D" });
console.log(`  clean A-grade ≥0.9   : autoSend=${cleanSend.autoSend}`);
console.log(`  suppressed           : autoSend=${suppressedSend.autoSend} (${suppressedSend.reason})`);
console.log(`  low confidence       : autoSend=${lowConfidence.autoSend}`);
console.log(`  failed validation    : autoSend=${failedValidation.autoSend}`);
console.log(`  cap reached          : autoSend=${capReached.autoSend}`);
console.log(`  sensitive intent     : autoSend=${sensitiveIntent.autoSend}`);
console.log(`  grade D              : autoSend=${lowFit.autoSend}`);

check(cleanSend.autoSend === true, "clean high-confidence A-grade send must auto-send");
check(suppressedSend.autoSend === false, "suppressed recipient must never auto-send");
check(lowConfidence.autoSend === false, "below-threshold confidence must route to review");
check(failedValidation.autoSend === false, "copy that fails validation must route to review");
check(capReached.autoSend === false, "exhausted daily cap must route to review");
check(sensitiveIntent.autoSend === false, "sensitive reply intent must route to review even at high confidence");
check(lowFit.autoSend === false, "grade-D account must route to review");

// scheduleStepTwo is deterministic: step 2 lands exactly 3 days after step 1.
const step1At = "2026-06-18T12:00:00.000Z";
const step2At = scheduleStepTwo(step1At);
console.log(`  step 2 scheduled     : ${step2At} (from ${step1At})`);
check(step2At === "2026-06-21T12:00:00.000Z", "scheduleStepTwo must add exactly 3 days deterministically");

// ---- Result ---------------------------------------------------------------
console.log(`\n${line}`);
if (failures.length === 0) {
  console.log("SMOKE PASSED - deterministic campaign brain is healthy.\n");
  process.exit(0);
} else {
  console.log(`SMOKE FAILED - ${failures.length} issue(s):`);
  for (const f of failures) console.log(`   - ${f}`);
  console.log("");
  process.exit(1);
}
