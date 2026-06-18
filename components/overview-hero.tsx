"use client";

import { useEngine } from "@/lib/store";
import { DemoConsole } from "@/components/demo-console";

function Kpi({ value, label, tone }: { value: string; label: string; tone: string }) {
  return (
    <div className="panel px-4 py-3.5">
      <div className={`font-mono text-[22px] font-semibold leading-none tabular-nums ${tone}`}>
        {value}
      </div>
      <div className="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
        {label}
      </div>
    </div>
  );
}

export function OverviewHero() {
  const businessName = useEngine((s) => s.businessName);
  const profileId = useEngine((s) => s.profileId);
  const campaign = useEngine((s) => s.campaign);

  const campaignsCreated = campaign?.metrics.campaignsCreated ?? (profileId ? 1 : 0);
  const repliesRouted = campaign?.metrics.repliesRouted ?? 0;
  const meetingRate = campaign?.metrics.meetingRate ?? 0;
  const approvalRate = campaign?.metrics.approvalRate ?? 0;

  return (
    <section id="top" className="mx-auto max-w-[1400px] px-5 pt-10 pb-2 sm:px-8">
      <div className="reveal max-w-3xl">
        <div className="eyebrow mb-3">
          {profileId ? `${businessName} · Campaign Workspace` : "AI GTM Campaign Builder"}
        </div>
        <h1 className="text-balance font-display text-5xl font-medium leading-[1.04] tracking-tight text-ink sm:text-6xl">
          {profileId ? (
            <>
              Improve the next <em className="font-display italic text-accent">{businessName}</em> campaign.
            </>
          ) : (
            <>
              Campaign <em className="font-display italic text-accent">intelligence</em>, not campaign sending.
            </>
          )}
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-dim">
          {profileId ? (
            <>
              Your accepted product profile powers strategy, ICP filters, signal-based outreach,
              reply routing, outcome tracking, and learning insights for{" "}
              <span className="text-ink">{businessName}</span>. No sending infrastructure required.
            </>
          ) : (
            <>
              Turn any website or product description into a complete outbound motion: who to
              target, why now, what to say, how to respond, and how to improve the next campaign.
            </>
          )}
        </p>
      </div>

      <div
        className="reveal mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4"
        style={{ animationDelay: "120ms" }}
      >
        <Kpi value={String(campaignsCreated)} label="Campaigns created" tone="text-accent" />
        <Kpi value={String(repliesRouted)} label="Replies routed" tone="text-cyan" />
        <Kpi value={`${meetingRate}%`} label="Meeting rate" tone="text-lime" />
        <Kpi value={`${approvalRate}%`} label="Approval rate" tone="text-ink" />
      </div>

      <div className="reveal mt-6" style={{ animationDelay: "200ms" }}>
        {!profileId && <DemoConsole />}
      </div>
    </section>
  );
}
