"use client";

import { Lightbulb, Target, TriangleAlert } from "lucide-react";
import { campaignAngleLabel } from "@/lib/campaign";
import { useEngine } from "@/lib/store";
import { SEGMENT_LABELS } from "@/lib/constants";
import { CampaignInput } from "@/components/campaign-input";
import { LeakChip, OfferPathChip, SourceBadge } from "@/components/chips";
import { Eyebrow } from "@/components/ui";
import type { FittingStrategyInput } from "@/lib/types";

export function FittingStrategyPanel() {
  const strategy = useEngine((s) => s.strategy);
  const loading = useEngine((s) => s.strategyLoading);
  const setStrategy = useEngine((s) => s.setStrategy);
  const setLoading = useEngine((s) => s.setStrategyLoading);
  const productDescription = useEngine((s) => s.productDescription);
  const campaign = useEngine((s) => s.campaign);

  async function run(input: FittingStrategyInput) {
    setLoading(true);
    try {
      const res = await fetch("/api/fitting/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      setStrategy(await res.json());
    } catch {
      setStrategy(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
      <CampaignInput
        loading={loading}
        defaultDescription={productDescription || undefined}
        onSubmit={run}
      />

      <div className="panel p-6">
        {!strategy ? (
          <div className="grid min-h-[360px] place-items-center text-center">
            <div>
              <p className="font-display text-[24px] text-ink">No strategy yet.</p>
              <p className="mt-2 max-w-xs text-[14px] leading-[1.75] text-ink-dim">
                Build a campaign strategy to see target segments, buying signals, and campaign
                angles. The deterministic engine runs even without an API key.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Eyebrow>Generated Campaign Strategy</Eyebrow>
                <p className="mt-2 max-w-xl text-balance font-display text-[24px] font-semibold leading-[1.08] text-ink">
                  {strategy.oneLiner}
                </p>
              </div>
              <SourceBadge source={strategy.source} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Eyebrow className="mb-1.5">Target segments</Eyebrow>
                <div className="flex flex-wrap gap-1.5">
                  {strategy.targetSegments.map((s) => (
                    <span
                      key={s}
                      className="rounded-md border border-line bg-surface-2/80 px-2 py-0.5 font-mono text-[11px] text-ink-dim"
                    >
                      {SEGMENT_LABELS[s] ?? s}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <Eyebrow className="mb-1.5">Recommended campaign angles</Eyebrow>
                <div className="flex flex-wrap gap-1.5">
                  {strategy.recommendedOfferPaths.map((p) => (
                    <OfferPathChip key={p} path={p} label={campaignAngleLabel(p, campaign)} />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <Eyebrow className="mb-1.5">Buying signal hypotheses</Eyebrow>
              <ul className="space-y-2.5">
                {strategy.leakHypotheses.map((h) => (
                  <li key={h.leak} className="flex items-start gap-2 text-[13.5px] leading-[1.75] text-ink-dim">
                    <LeakChip type={h.leak} />
                    <span className="pt-0.5">{h.rationale}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[14px] border border-line bg-surface-2/70 p-4">
                <Eyebrow className="mb-1.5 flex items-center gap-1.5">
                  <Target size={12} /> Ideal customer
                </Eyebrow>
                <ul className="space-y-1">
                  {strategy.idealCustomerProfile.map((b, i) => (
                    <li key={i} className="flex gap-1.5 text-[13px] leading-[1.75] text-ink-dim">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-[14px] border border-amber/25 bg-amber/[0.05] p-4">
                <Eyebrow className="mb-1.5 flex items-center gap-1.5 text-amber/80">
                  <TriangleAlert size={12} /> Assumptions
                </Eyebrow>
                <ul className="space-y-1">
                  {strategy.assumptions.map((b, i) => (
                    <li key={i} className="flex gap-1.5 text-[13px] leading-[1.75] text-ink-dim">
                      <Lightbulb size={11} className="mt-0.5 shrink-0 text-amber/70" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
