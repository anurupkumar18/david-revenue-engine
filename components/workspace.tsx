"use client";

import { AppHeader } from "@/components/app-header";
import { OverviewHero } from "@/components/overview-hero";
import { FittingStrategyPanel } from "@/components/fitting-strategy-panel";
import { AccountTable } from "@/components/account-table";
import { ConversionOutreachPanel } from "@/components/conversion-outreach-panel";
import { FastConversionRouter } from "@/components/fast-conversion-router";
import { RevenuePipelineBoard } from "@/components/revenue-pipeline-board";
import { RevenueOpportunityDrawer } from "@/components/revenue-opportunity-drawer";

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
            eyebrow="01 · Fitting Strategy"
            title="What David should sell, and to whom"
            description="Turn a product or business into a David-native GTM strategy: the segments to target, the leaks to look for, and the offer paths that become recurring revenue."
          />
          <FittingStrategyPanel />
        </Section>

        <Section id="accounts">
          <SectionHeading
            eyebrow="02 · Account workspace"
            title="Who David should land first"
            description="Sorted by Revenue Opportunity. Every account shows its leak, the David offer path it should be routed into, and how it becomes recurring revenue. Click any row to open the full Revenue Opportunity."
          />
          <AccountTable />
        </Section>

        <Section id="outreach">
          <SectionHeading
            eyebrow="03 · Conversion Outreach"
            title="Signal-based outreach, on the rails"
            description="A two-step sequence built from the detected leak and the recommended David path — auto-validated against the outbound rules. Works with or without an API key."
          />
          <ConversionOutreachPanel />
        </Section>

        <Section id="router">
          <SectionHeading
            eyebrow="04 · Fast Conversion Router"
            title="Every reply into the fastest next action"
            description="Paste or simulate a reply. David classifies it, drafts the offer-path-aware response, and moves the account to the right pipeline stage. Unsubscribes are suppressed instantly."
          />
          <FastConversionRouter />
        </Section>

        <Section id="pipeline">
          <SectionHeading
            eyebrow="05 · Revenue Pipeline"
            title="Where the recurring revenue is"
            description="The whole book, by stage. Routing a reply moves accounts here. Each column totals the recurring monthly revenue in play."
          />
          <RevenuePipelineBoard />
        </Section>
      </main>

      <RevenueOpportunityDrawer />
    </>
  );
}
