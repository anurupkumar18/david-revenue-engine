"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { getProfile, getRevenueState } from "@/lib/icp-api";
import {
  buildCampaignIntelligence,
  campaignInputFromICPFields,
  recomputeCampaign,
  type CampaignEvent,
  type CampaignIntelligence,
} from "@/lib/campaign";
import { buildAccountsForProfile, icpFieldsToStrategyInput } from "@/lib/icp-bridge";
import { buildFittingStrategy } from "@/lib/strategy";
import { computeRoi } from "@/lib/roi";
import { fmtMoneyCompact } from "@/lib/format";
import type { RevenueAccount } from "@/lib/types";

type ReportData = {
  clientName: string;
  agencyName: string;
  campaign: CampaignIntelligence;
  accounts: RevenueAccount[];
};

function Section({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return (
    <section className="report-section border-t border-line pt-6">
      <div className="eyebrow mb-1.5">{eyebrow}</div>
      <h2 className="mb-4 font-display text-2xl font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

export function CampaignReport({ profileId }: { profileId: number }) {
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const p = await getProfile(profileId);
        const revenueState = await getRevenueState(profileId);
        const events: CampaignEvent[] = revenueState.campaignEvents?.length
          ? revenueState.campaignEvents
          : [{ type: "campaign_created" }];

        let accounts = (revenueState.accounts as RevenueAccount[]) ?? [];
        let campaign = revenueState.campaign ?? null;

        if (!campaign || !accounts.length) {
          accounts = accounts.length ? accounts : buildAccountsForProfile(p.fields, p.contacts || []);
          const strategy = {
            ...buildFittingStrategy(icpFieldsToStrategyInput(p.fields)),
            source: "deterministic" as const,
          };
          campaign = buildCampaignIntelligence({
            input: campaignInputFromICPFields(p.fields),
            fields: p.fields,
            accounts,
            strategy,
            events,
          });
        } else {
          campaign = recomputeCampaign(campaign, events);
        }

        setData({
          clientName: campaign.agencyWorkspace.clientName || p.company_name,
          agencyName: revenueState.agencyName || "Campaign Studio",
          campaign,
          accounts,
        });
      } catch {
        setError("Failed to load campaign report. Is the API server running?");
      }
    }
    load();
  }, [profileId]);

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-5 py-24 text-center">
        <p className="text-danger">{error}</p>
        <Link href={`/business/${profileId}`} className="mt-4 inline-block text-sm text-accent hover:underline">
          Back to workspace
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 size={28} className="animate-spin text-accent" />
      </div>
    );
  }

  const { campaign, accounts, clientName, agencyName } = data;
  const roi = computeRoi(accounts, campaign.metrics);
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="relative z-10 mx-auto max-w-3xl px-6 py-10 print:py-0">
      {/* toolbar — hidden in print/PDF */}
      <div className="no-print mb-8 flex items-center justify-between">
        <Link
          href={`/business/${profileId}`}
          className="inline-flex items-center gap-1.5 font-mono text-[11px] text-ink-dim hover:text-ink"
        >
          <ArrowLeft size={13} /> back to workspace
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-[10px] bg-accent px-3.5 py-2 font-mono text-[11px] uppercase tracking-wider text-[#f7f1e7] transition-opacity hover:opacity-90"
        >
          <Printer size={13} /> Print / Export PDF
        </button>
      </div>

      {/* white-label header */}
      <header className="bracket-frame mb-8 rounded-[14px] border border-line p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-display text-xl font-bold tracking-tight text-ink">
              {agencyName}
            </div>
            <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
              Campaign intelligence brief
            </div>
          </div>
          <div className="text-right font-mono text-[10px] uppercase tracking-wider text-ink-faint">
            {today}
          </div>
        </div>
        <h1 className="mt-5 font-display text-4xl font-medium leading-[1.05] text-ink">
          Campaign brief for <em className="italic text-accent">{clientName}</em>
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-ink-dim">
          {campaign.strategy.audienceSummary}
        </p>
      </header>

      <div className="space-y-7">
        <Section eyebrow="01 · Strategy" title="Recommended campaign angle">
          <p className="text-[14px] leading-relaxed text-ink">{campaign.strategy.positioningAngle}</p>
        </Section>

        <Section eyebrow="02 · Targeting" title="ICP filters">
          <div className="grid gap-2.5 sm:grid-cols-2">
            {campaign.strategy.icpFilters.map((f) => (
              <div key={f.id} className="rounded-[10px] border border-line bg-surface-2/50 p-3">
                <div className="font-display text-sm font-semibold text-ink">{f.label}</div>
                <div className="mt-0.5 text-[13px] text-ink">{f.value}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section eyebrow="03 · Why now" title="Buying signals">
          <ul className="space-y-2">
            {campaign.strategy.buyingSignals.map((s) => (
              <li key={s.id} className="flex gap-2 text-[13.5px] leading-relaxed text-ink">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <span>
                  <span className="font-semibold">{s.label}</span> — {s.description}
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section eyebrow="04 · Outreach" title="Signal-based two-step sequence">
          <div className="space-y-3">
            {campaign.sequence.steps.map((step) => (
              <div key={step.id} className="rounded-[10px] border border-line bg-surface-2/50 p-4">
                <div className="font-mono text-[11px] text-ink-faint">
                  Step {step.stepNumber} · subject: <span className="text-ink">{step.subject}</span>
                </div>
                <p className="mt-2 whitespace-pre-line text-[13.5px] leading-relaxed text-ink">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </Section>

        <Section eyebrow="05 · Projected impact" title="What this campaign is worth">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              [`${fmtMoneyCompact(roi.qualifiedPipelineAnnual)}/yr`, "Qualified pipeline"],
              [`${roi.liftVsBaseline}×`, "On-target vs cold list"],
              [String(roi.highFitAccounts), "High-fit accounts"],
              [String(roi.projectedMeetings), "Projected meetings"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-[10px] border border-line bg-surface-2/50 p-3">
                <div className="font-display text-xl font-bold text-ink">{value}</div>
                <div className="mt-1 font-mono text-[9.5px] uppercase tracking-wider text-ink-faint">
                  {label}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2.5 font-mono text-[10px] text-ink-faint">
            Modeled from account revenue ranges × 12 and fit grades · baseline = 15% on-target cold list.
          </p>
        </Section>

        <Section eyebrow="06 · Learning" title="What we improve next">
          <div className="space-y-2 text-[13.5px] leading-relaxed text-ink">
            <p>
              <span className="font-semibold">Winning signal:</span>{" "}
              {campaign.learningInsights.winningSignal}
            </p>
            <p>
              <span className="font-semibold">Common objection:</span>{" "}
              {campaign.learningInsights.commonObjection}
            </p>
            <p>
              <span className="font-semibold">Next campaign:</span>{" "}
              {campaign.learningInsights.nextCampaignRecommendation}
            </p>
          </div>
        </Section>
      </div>

      <footer className="mt-10 border-t border-line pt-4 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
        Powered by AI GTM Campaign Builder · campaign intelligence, not campaign sending
      </footer>
    </div>
  );
}
