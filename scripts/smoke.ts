// Smoke test for the deterministic revenue brain.
// Run with: npm run smoke   (no API keys, no network required)
// Prints every account's full revenue narrative and asserts invariants.

import seedRepliesJson from "../data/seed-replies.json";
import { INTENT_LABELS, OFFER_PATHS, RECURRING_POTENTIAL_LABELS } from "../lib/constants";
import { buildOutreachSequence } from "../lib/outreach";
import { routeReply } from "../lib/reply-router";
import { getSeedAccounts } from "../lib/seed";
import type { ReplyIntent } from "../lib/types";

const failures: string[] = [];
function check(cond: boolean, msg: string) {
  if (!cond) failures.push(msg);
}

const line = "─".repeat(78);
const accounts = getSeedAccounts();

console.log(`\n${line}\nDAVID REVENUE ENGINE — deterministic smoke test\n${line}`);
console.log(`Loaded ${accounts.length} accounts (sorted by Revenue Opportunity).\n`);

// ---- Per-account narrative + invariants ----------------------------------
for (const a of accounts) {
  const path = OFFER_PATHS[a.recommendedDavidOfferPath];
  const plan = a.landAndExpandPlan;
  console.log(`${a.name}  [${a.segment}]`);
  console.log(`  Detected leaks      : ${a.detectedLeakTypes.join(", ")}`);
  console.log(`  Fitting Score       : ${a.fittingScore} (${a.fitting.grade})`);
  console.log(`  Revenue Opportunity : ${a.revenueOpportunityScore} (${a.revenueOpportunity.grade})`);
  console.log(`  Recurring potential : ${RECURRING_POTENTIAL_LABELS[a.recurringRevenuePotential]}`);
  console.log(`  Recommended path    : ${path.label}  — ${a.revenueModel.narrative}`);
  console.log(
    `  Land → Expand       : ${OFFER_PATHS[plan.landOffer].label} → ${OFFER_PATHS[plan.expansionOffer].label}` +
      (plan.longTermOffer ? ` → ${OFFER_PATHS[plan.longTermOffer].label}` : ""),
  );
  console.log(`  Next action         : ${a.nextBestConversionAction}\n`);

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
console.log(`${line}\nOffer paths represented: ${[...pathsHit].length}/8`);
console.log(`  ${[...pathsHit].join(", ")}\n`);
check(pathsHit.size >= 6, `Expected >=6 distinct offer paths, got ${pathsHit.size}`);

// ---- Reply routing --------------------------------------------------------
console.log(`${line}\nReply routing:\n`);
const replies = seedRepliesJson as { id: string; text: string; expectedIntent: ReplyIntent }[];
const hero = accounts[0];
for (const r of replies) {
  const routed = routeReply(r.text, {
    companyName: hero.name,
    primaryLeakLabel: hero.leaks[0].label,
    offerPathLabel: OFFER_PATHS[hero.recommendedDavidOfferPath].label,
    firstConversionAction: hero.nextBestConversionAction,
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

// ---- Result ---------------------------------------------------------------
console.log(`\n${line}`);
if (failures.length === 0) {
  console.log("✅ SMOKE PASSED — deterministic revenue brain is healthy.\n");
  process.exit(0);
} else {
  console.log(`❌ SMOKE FAILED — ${failures.length} issue(s):`);
  for (const f of failures) console.log(`   • ${f}`);
  console.log("");
  process.exit(1);
}
