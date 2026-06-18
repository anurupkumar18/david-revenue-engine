"use client";

import { AppHeader } from "@/components/app-header";
import { OverviewHero } from "@/components/overview-hero";
import { FittingStrategyPanel } from "@/components/fitting-strategy-panel";
import { AccountTable } from "@/components/account-table";
import { ConversionOutreachPanel } from "@/components/conversion-outreach-panel";
import { FastConversionRouter } from "@/components/fast-conversion-router";
import { RevenuePipelineBoard } from "@/components/revenue-pipeline-board";
import { RevenueOpportunityDrawer } from "@/components/revenue-opportunity-drawer";
import {
  AgencyWorkspacePanel,
  CampaignFiltersSignalsPanel,
  CampaignPerformanceTracker,
  CampaignStrategyPanel,
  LearningInsightsPanel,
} from "@/components/campaign-intelligence-panel";

export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-5 max-w-2xl">
      <div className="eyebrow mb-2">{eyebrow}</div>
      <h2 className="font-display text-2xl font-bold tracking-tight text-ink">{title}</h2>
      {description && <p className="mt-2 text-[14px] leading-relaxed text-ink-dim">{description}</p>}
    </div>
  );
}

function Section({
  id,
  children,
  className,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`mx-auto max-w-[1400px] scroll-mt-20 px-5 pt-14 sm:px-8 ${className ?? ""}`}>
      {children}
    </section>
  );
}

export function Workspace() {
  return (
    <>
      <AppHeader />
      <main className="relative z-10 pb-28">
        <OverviewHero />

        <Section id="strategy">
          <SectionHeading
            eyebrow="01 · Product Input"
            title="Turn any website into a GTM campaign strategy"
            description="Start from a website or product description. The system builds campaign strategy, target audience, ICP filters, buying signals, and approved copy without depending on live APIs."
          />
          <FittingStrategyPanel />
        </Section>

        <Section id="campaign-strategy">
          <SectionHeading
            eyebrow="02 · Generated Campaign Strategy"
            title="Target audience, campaign angle, and assumptions"
            description="The strategist explains who to target, why now, and what campaign angle should drive the first outbound motion."
          />
          <CampaignStrategyPanel />
        </Section>

        <Section id="filters">
          <SectionHeading
            eyebrow="03 · ICP Filters + Buying Signals"
            title="The targeting logic behind the campaign"
            description="Copyable filters and signal hypotheses make the campaign reusable across teams, clients, and future iterations."
          />
          <CampaignFiltersSignalsPanel />
        </Section>

        <Section id="accounts">
          <SectionHeading
            eyebrow="04 · Target Account Fit"
            title="Who to prioritize first"
            description="Demo accounts stay deterministic. Each row shows the leak, fit, campaign angle, and recurring opportunity behind the targeting recommendation."
          />
          <AccountTable />
        </Section>

        <Section id="outreach">
          <SectionHeading
            eyebrow="05 · 2-Step Sequence"
            title="Signal-based outreach, on the rails"
            description="A two-step sequence built from the detected signal and recommended campaign angle, with approval/edit status and copy validation."
          />
          <ConversionOutreachPanel />
        </Section>

        <Section id="router">
          <SectionHeading
            eyebrow="06 · Dynamic Response Router"
            title="Every reply into the next best action"
            description="Paste or simulate a reply. The router classifies intent, suggests the right response, logs the outcome, and suppresses opt-outs."
          />
          <FastConversionRouter />
        </Section>

        <Section id="pipeline">
          <SectionHeading
            eyebrow="07 · Campaign Performance Tracker"
            title="Track what works before scaling volume"
            description="Campaign value compounds through copied filters, copied sequences, routed replies, approvals, meetings, bad-fit signals, and human edits."
          />
          <CampaignPerformanceTracker />
        </Section>

        <Section id="learning">
          <SectionHeading
            eyebrow="08 · Learning Insights"
            title="Turn replies into better future campaigns"
            description="The campaign memory records winning signals, common objections, ICP adjustments, and the improved next campaign."
          />
          <LearningInsightsPanel />
        </Section>

        <Section id="tracker-board">
          <SectionHeading
            eyebrow="09 · Campaign Tracker Board"
            title="Where active opportunities sit"
            description="The board shows campaign outcomes by stage. Routing replies updates local state and keeps the demo loop repeatable."
          />
          <RevenuePipelineBoard />
        </Section>

        <Section id="agency">
          <SectionHeading
            eyebrow="10 · Agency Workspace / Client Export"
            title="Recurring value for teams, agencies, and white-label buyers"
            description="Workspaces, client-ready exports, reusable memory, and governance explain the MRR/ARR path without building sending infrastructure."
          />
          <AgencyWorkspacePanel />
        </Section>
      </main>

      <RevenueOpportunityDrawer />
    </>
  );
}
