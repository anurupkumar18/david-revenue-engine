import { ScoreCard } from "@/components/score-card";
import type { FittingScore } from "@/lib/types";

export function FittingScoreBadge({ fitting }: { fitting: FittingScore }) {
  return (
    <ScoreCard
      eyebrow="Fitting Score"
      subtitle="How well this account fits a David engagement."
      total={fitting.total}
      grade={fitting.grade}
      accentBar="bg-accent"
      rows={[
        { label: "ICP fit", value: fitting.fitScore, weight: 45 },
        { label: "Leak signal", value: fitting.signalScore, weight: 40 },
        { label: "Reachability", value: fitting.channelScore, weight: 15 },
      ]}
    />
  );
}
