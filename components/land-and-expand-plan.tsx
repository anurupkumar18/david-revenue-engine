import { ArrowRight, Sparkles } from "lucide-react";
import { campaignAngleLabel, isDavidCampaignInput, type CampaignIntelligence } from "@/lib/campaign";
import { OFFER_PATHS } from "@/lib/constants";
import { OfferPathChip } from "@/components/chips";
import type { DavidOfferPath, LandAndExpandPlan } from "@/lib/types";

function Node({
  label,
  path,
  campaign,
}: {
  label: string;
  path: DavidOfferPath;
  campaign?: CampaignIntelligence | null;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
      <span className="font-mono text-[9.5px] uppercase tracking-wider text-ink-faint">{label}</span>
      <OfferPathChip path={path} label={campaignAngleLabel(path, campaign)} />
      <span className="font-mono text-[9.5px] leading-tight text-ink-faint">
        {OFFER_PATHS[path].revenueType}
      </span>
    </div>
  );
}

export function LandAndExpandPlanView({
  plan,
  campaign,
}: {
  plan: LandAndExpandPlan;
  campaign?: CampaignIntelligence | null;
}) {
  const revenueLogic =
    campaign && !isDavidCampaignInput(campaign.input)
      ? "Start with a narrow signal test, expand into approved campaign workflows, then retain the team through tracking, learning, and repeat campaign memory."
      : plan.revenueLogic;

  return (
    <div className="panel-2 p-4">
      <div className="flex items-stretch gap-1.5">
        <Node label="Land" path={plan.landOffer} campaign={campaign} />
        <ArrowRight size={15} className="mt-5 shrink-0 text-ink-faint" />
        <Node label="Expand" path={plan.expansionOffer} campaign={campaign} />
        {plan.longTermOffer && (
          <>
            <ArrowRight size={15} className="mt-5 shrink-0 text-ink-faint" />
            <Node label="Long-term" path={plan.longTermOffer} campaign={campaign} />
          </>
        )}
      </div>

      <div className="mt-4 flex items-start gap-2 border-t border-line pt-3">
        <Sparkles size={13} className="mt-0.5 shrink-0 text-accent" />
        <p className="text-[12.5px] leading-snug text-ink-dim">{revenueLogic}</p>
      </div>
    </div>
  );
}
