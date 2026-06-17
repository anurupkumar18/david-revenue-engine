import { ScoreCard } from "@/components/score-card";
import type { RevenueOpportunityScore } from "@/lib/types";

export function RevenueOpportunityBadge({ score }: { score: RevenueOpportunityScore }) {
  return (
    <ScoreCard
      eyebrow="Revenue Opportunity"
      subtitle="How much recurring revenue this account can become for David."
      total={score.total}
      grade={score.grade}
      accentBar="bg-cyan"
      rows={[
        { label: "ICP fit", value: score.icpFit, weight: 25 },
        { label: "Leak severity", value: score.leakSeverity, weight: 25 },
        { label: "Ability to pay", value: score.abilityToPay, weight: 20 },
        { label: "Speed to close", value: score.speedToClose, weight: 15 },
        { label: "Recurring", value: score.recurringRevenuePotential, weight: 15 },
      ]}
    />
  );
}
