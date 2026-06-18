#!/usr/bin/env tsx
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import fixture from "../data/campaign-fixtures/david-ai-profile.json";
import {
  CAMPAIGN_PRICING_TIERS,
  DEFAULT_CAMPAIGN_EVENTS,
  buildCampaignIntelligence,
  campaignInputFromICPFields,
  containsDavidSpecificOfferLanguage,
} from "../lib/campaign";
import { buildAccountsForProfile, emptyRevenueState, icpFieldsToStrategyInput } from "../lib/icp-bridge";
import { routeReply } from "../lib/reply-router";
import { buildFittingStrategy } from "../lib/strategy";
import type { ICPFields } from "../lib/types/icp";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const fields = fixture.fields as ICPFields;
const campaignInput = campaignInputFromICPFields(fields);
const strategyInput = icpFieldsToStrategyInput(fields);
const accounts = buildAccountsForProfile(fields);
const strategy = { ...buildFittingStrategy(strategyInput), source: "deterministic" as const };
const campaign = buildCampaignIntelligence({
  input: campaignInput,
  fields,
  accounts,
  strategy,
  events: DEFAULT_CAMPAIGN_EVENTS,
});

assert(campaign.positioning.promise === "Campaign intelligence, not campaign sending.", "wrong positioning promise");
assert(campaign.strategy.audienceSummary.length > 40, "missing target audience summary");
assert(campaign.strategy.icpFilters.length >= 5, "expected at least 5 ICP filters");
assert(campaign.strategy.buyingSignals.length >= 4, "expected at least 4 buying signals");
assert(campaign.sequence.steps.length === 2, "campaign sequence must be exactly two steps");
assert(campaign.sequence.steps.every((step) => step.approvalStatus === "approved"), "seed sequence must be approved");
assert(campaign.sequence.steps.every((step) => step.bodyWordCount < 100), "sequence body must stay under 100 words");
assert(campaign.sequence.steps.every((step) => step.validation.passed), "sequence steps must pass deterministic validators");
assert(campaign.metrics.campaignsCreated >= 1, "campaign creation metric missing");
assert(campaign.metrics.filtersCopied >= 1, "filters copied metric missing");
assert(campaign.metrics.sequencesCopied >= 1, "sequences copied metric missing");
assert(campaign.metrics.repliesRouted >= 1, "replies routed metric missing");
assert(campaign.metrics.positiveReplyRate > 0, "positive reply rate missing");
assert(campaign.metrics.meetingRate > 0, "meeting rate missing");
assert(campaign.metrics.badFitRate > 0, "bad-fit rate missing");
assert(campaign.metrics.humanEditRate > 0, "human edit rate missing");
assert(campaign.metrics.approvalRate > 0, "approval rate missing");
assert(campaign.metrics.winningSignal.length > 0, "winning signal missing");
assert(campaign.metrics.commonObjection.length > 0, "common objection missing");
assert(campaign.learningInsights.recommendedIcpAdjustment.length > 0, "recommended ICP adjustment missing");
assert(campaign.learningInsights.nextCampaignRecommendation.length > 0, "next campaign recommendation missing");
assert(campaign.nextCampaign.improvements.length >= 3, "improved next campaign needs concrete improvements");
assert(CAMPAIGN_PRICING_TIERS.map((tier) => tier.name).join(",") === "Free,Starter,Pro,Team,Agency,Enterprise,White-label", "pricing tiers changed");

const nonDavidInput = {
  ...campaignInput,
  productName: "Acme Workflow OS",
  websiteUrl: "https://acme.example",
  productDescription: "Operations software for home-services dispatch teams.",
};
const nonDavidCampaign = buildCampaignIntelligence({
  input: nonDavidInput,
  fields: { ...fields, company_name: "Acme Workflow OS", website_url: "https://acme.example" },
  accounts,
  strategy,
  events: DEFAULT_CAMPAIGN_EVENTS,
});

assert(!containsDavidSpecificOfferLanguage(nonDavidCampaign), "non-David campaigns must not expose David-specific offer language");

const routed = routeReply("sure, happy to chat next week", {
  companyName: accounts[0].name,
  primaryLeakLabel: accounts[0].leaks[0].label,
  offerPathLabel: "workflow diagnostic",
  firstConversionAction: "Send the approved campaign brief.",
});
assert(routed.intent === "positive_call", "reply router should classify positive replies");
assert(routed.updatePipelineStage === "meeting_ready", "positive replies should move to meeting_ready");

const revenueState = {
  ...emptyRevenueState(accounts),
  strategy,
  campaign,
  lastRouted: {
    accountId: accounts[0].id,
    replyText: "sure, happy to chat next week",
    routed,
    applied: true,
  },
};

const testDir = mkdtempSync(join(tmpdir(), "campaign-verify-"));
const payloadPath = join(testDir, "payload.json");
writeFileSync(
  payloadPath,
  JSON.stringify(
    {
      fields,
      confidence: fixture.confidence,
      revenueState,
    },
    null,
    2,
  ),
);

const result = spawnSync("python3", ["test_e2e.py"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    CAMPAIGN_VERIFY_PAYLOAD_PATH: payloadPath,
  },
  encoding: "utf8",
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

rmSync(testDir, { recursive: true, force: true });

if (result.status !== 0) {
  throw new Error(`Campaign backend verification failed with exit code ${result.status ?? "unknown"}`);
}

console.log("\nCampaign verification passed: deterministic strategy, tracking, learning, and persistence are healthy.");
