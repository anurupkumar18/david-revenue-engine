"use client";

import { Lightbulb, Target, TriangleAlert } from "lucide-react";
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
    <div className="grid gap-5 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <CampaignInput
        loading={loading}
        defaultDescription={productDescription || undefined}
        onSubmit={run}
      />

      <div className="panel p-5">
        {!strategy ? (
          <div className="grid h-full min-h-[220px] place-items-center text-center">
            <div>
              <p className="font-display text-base text-ink">No strategy yet.</p>
              <p className="mt-1 max-w-xs text-sm text-ink-dim">
                Build a Fitting Strategy to see the segments, leaks, and David offer paths to
                target — the deterministic engine runs even without an API key.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Eyebrow>Fitting Strategy</Eyebrow>
                <p className="mt-1.5 max-w-xl text-balance font-display text-[17px] font-semibold leading-snug text-ink">
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
                      className="rounded-md border border-line bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-ink-dim"
                    >
                      {SEGMENT_LABELS[s] ?? s}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <Eyebrow className="mb-1.5">Recommended David paths</Eyebrow>
                <div className="flex flex-wrap gap-1.5">
                  {strategy.recommendedOfferPaths.map((p) => (
                    <OfferPathChip key={p} path={p} />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <Eyebrow className="mb-1.5">Leak hypotheses</Eyebrow>
              <ul className="space-y-1.5">
                {strategy.leakHypotheses.map((h) => (
                  <li key={h.leak} className="flex items-start gap-2 text-[13px] text-ink-dim">
                    <LeakChip type={h.leak} />
                    <span className="pt-0.5">{h.rationale}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[12px] border border-line bg-surface-2 p-3.5">
                <Eyebrow className="mb-1.5 flex items-center gap-1.5">
                  <Target size={12} /> Ideal customer
                </Eyebrow>
                <ul className="space-y-1">
                  {strategy.idealCustomerProfile.map((b, i) => (
                    <li key={i} className="flex gap-1.5 text-[12.5px] text-ink-dim">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-[12px] border border-amber/25 bg-amber/[0.05] p-3.5">
                <Eyebrow className="mb-1.5 flex items-center gap-1.5 text-amber/80">
                  <TriangleAlert size={12} /> Assumptions
                </Eyebrow>
                <ul className="space-y-1">
                  {strategy.assumptions.map((b, i) => (
                    <li key={i} className="flex gap-1.5 text-[12.5px] text-ink-dim">
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
