// Deterministic daily / weekly brief builder.
//
// This reuses the campaign metrics and learning output already derived by
// `lib/campaign.ts`, then folds in current send / reply / suppression counts.

import type { CampaignIntelligence, CampaignMetrics, LearningInsights } from "./campaign";

export type BriefPeriod = "daily" | "weekly";

export type BriefCounts = {
  sent?: number;
  inbound?: number;
  routed?: number;
  positive?: number;
  meetings?: number;
  badFits?: number;
  approvals?: number;
  edits?: number;
  suppressed?: number;
};

export type CampaignBrief = {
  period: BriefPeriod;
  periodStart: string;
  periodEnd: string;
  clientName: string;
  counts: Required<BriefCounts>;
  metrics: CampaignMetrics;
  learningInsights: LearningInsights;
  narrative: string;
  recommendations: string[];
};

export type BriefInput = {
  period: BriefPeriod;
  periodStart: string;
  periodEnd: string;
  campaign: CampaignIntelligence;
  counts: BriefCounts;
  clientName?: string;
};

function normalizeCounts(counts: BriefCounts): Required<BriefCounts> {
  return {
    sent: counts.sent ?? 0,
    inbound: counts.inbound ?? 0,
    routed: counts.routed ?? 0,
    positive: counts.positive ?? 0,
    meetings: counts.meetings ?? 0,
    badFits: counts.badFits ?? 0,
    approvals: counts.approvals ?? 0,
    edits: counts.edits ?? 0,
    suppressed: counts.suppressed ?? 0,
  };
}

function percent(part: number, total: number): string {
  if (!total) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

export function buildBrief(input: BriefInput): CampaignBrief {
  const counts = normalizeCounts(input.counts);
  const clientName = input.clientName ?? input.campaign.agencyWorkspace.clientName ?? input.campaign.input.productName;
  const metrics = input.campaign.metrics;
  const learning = input.campaign.learningInsights;
  const routeRate = percent(counts.routed, counts.inbound);
  const replyRate = percent(counts.inbound, counts.sent);

  const narrative = [
    `${input.period === "daily" ? "Daily" : "Weekly"} brief for ${clientName}.`,
    `${counts.sent} sends produced ${counts.inbound} inbound replies (${replyRate}) and ${counts.routed} routed replies (${routeRate}).`,
    `Suppressed threads held at ${counts.suppressed}; the current winning signal remains ${metrics.winningSignal}.`,
    `Common objection: ${metrics.commonObjection}.`,
  ].join(" ");

  const recommendations = [
    learning.nextCampaignRecommendation,
    `Keep the first-line hook anchored on ${learning.winningSignal}.`,
    `Protect the "${learning.commonObjection}" suppression rule before scaling volume.`,
  ];

  if (counts.edits > 0 || counts.approvals > 0) {
    recommendations.push(
      `Track ${counts.edits} edited drafts against ${counts.approvals} approvals to keep the human-review loop tight.`,
    );
  }

  return {
    period: input.period,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    clientName,
    counts,
    metrics,
    learningInsights: learning,
    narrative,
    recommendations,
  };
}
