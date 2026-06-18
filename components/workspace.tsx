"use client";

import { AppHeader } from "@/components/app-header";
import { OverviewHero } from "@/components/overview-hero";
import { FittingStrategyPanel } from "@/components/fitting-strategy-panel";
import { AccountTable } from "@/components/account-table";
import { ConversionOutreachPanel } from "@/components/conversion-outreach-panel";
import { SendingPanel } from "@/components/sending-panel";
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

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="section-heading">
      <div className="mb-3 eyebrow">{eyebrow}</div>
      <h2 className="section-title">{title}</h2>
      {description && <p className="section-copy mt-4">{description}</p>}
    </div>
  );
}

function Section({
  id,
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`section-band mx-auto max-w-[1400px] scroll-mt-24 px-5 py-20 sm:px-8 sm:py-24 ${className ?? ""}`}>
      <div className="section-grid gap-10 xl:section-grid-wide xl:gap-12">
        <SectionHeading eyebrow={eyebrow} title={title} description={description} />
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}

export function Workspace() {
  return (
    <>
      <AppHeader />
      <main className="relative z-10 pb-28">
        <OverviewHero />

        <Section
          id="strategy"
          eyebrow="01 · Campaign Strategy"
          title="Start with strategy, not sending."
          description="The campaign brain turns the input into a strategy, ICP framing, and practical guardrails before any sequence or reply logic appears."
        >
          <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
            <FittingStrategyPanel />
            <CampaignStrategyPanel />
          </div>
        </Section>

        <Section
          id="filters"
          eyebrow="02 · ICP Filters"
          title="Signals that make the campaign feel timely."
          description="These modules keep the targeting logic copyable and explainable so the page can breathe while still showing the reasoning."
        >
          <CampaignFiltersSignalsPanel />
        </Section>

        <Section
          id="accounts"
          eyebrow="03 · Account Fit"
          title="Who to prioritize first."
          description="The account table stays readable at a distance: fit, opportunity, recurring value, and the next action all remain visible."
        >
          <AccountTable />
        </Section>

        <Section
          id="outreach"
          eyebrow="04 · Sequence + Router"
          title="Two-step outreach on one side, reply logic on the other."
          description="The sequence and router should feel like a single chapter in the story, not two separate micro-panels fighting for attention."
        >
          <div className="grid gap-5 xl:grid-cols-2">
            <ConversionOutreachPanel />
            <FastConversionRouter />
          </div>
        </Section>

        <Section
          id="sending"
          eyebrow="05 · Send Guardrails"
          title="When sending exists, it stays behind the glass."
          description="The keyless demo keeps sending simulated, but the interface still makes the guardrails and approval path readable."
        >
          <SendingPanel />
        </Section>

        <Section
          id="tracker"
          eyebrow="06 · Tracker + Learning"
          title="Track the motion, then improve the next campaign."
          description="Progress, outcomes, and learning are grouped into a wider band so the page continues to scroll like a designed publication."
        >
          <div className="grid gap-5 xl:grid-cols-2">
            <CampaignPerformanceTracker />
            <LearningInsightsPanel />
          </div>
          <div className="mt-5">
            <RevenuePipelineBoard />
          </div>
        </Section>

        <Section
          id="agency"
          eyebrow="07 · Agency Export"
          title="Make the recurring value obvious."
          description="Agency workspace, client exports, reusable memory, and pricing live in one final section instead of getting squeezed into the footer."
        >
          <AgencyWorkspacePanel />
        </Section>
      </main>

      <RevenueOpportunityDrawer />
    </>
  );
}
