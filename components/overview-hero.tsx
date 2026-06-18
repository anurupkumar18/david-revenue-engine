"use client";

import { pipelineRecurringMonthly, useEngine } from "@/lib/store";
import { fmtMoneyCompact } from "@/lib/format";
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
  const accounts = useEngine((s) => s.accounts);
  const businessName = useEngine((s) => s.businessName);
  const profileId = useEngine((s) => s.profileId);

  const monthly = pipelineRecurringMonthly(accounts);
  const aGrade = accounts.filter((a) => a.revenueOpportunity.grade === "A").length;
  const paths = new Set(accounts.map((a) => a.recommendedDavidOfferPath)).size;
  const avgFitting =
    accounts.length === 0
      ? 0
      : Math.round(accounts.reduce((s, a) => s + a.fittingScore, 0) / accounts.length);

  return (
    <section id="top" className="mx-auto max-w-[1400px] px-5 pt-10 pb-2 sm:px-8">
      <div className="reveal max-w-3xl">
        <div className="eyebrow mb-3">
          {profileId ? `${businessName} · Revenue Engine` : "David Revenue Engine · GTM Fitting Engine"}
        </div>
        <h1 className="text-balance font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-5xl">
          {profileId ? `Grow ${businessName}.` : "The sales brain for David."}
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-dim">
          {profileId ? (
            <>
              Your accepted ICP powers this workspace — fitting strategy, account scoring, outreach,
              reply routing, and pipeline tracking for{" "}
              <span className="text-ink">{businessName}</span>.
            </>
          ) : (
            <>
              It finds businesses leaking time, leads, or margin, diagnoses the right David offer,
              writes the outreach, and routes every reply into{" "}
              <span className="text-ink">Fittings, growth plans, custom agents, or white-label deals</span>
              {" "}— the fastest path to recurring revenue.
            </>
          )}
        </p>
      </div>

      <div
        className="reveal mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4"
        style={{ animationDelay: "120ms" }}
      >
        <Kpi value={`${fmtMoneyCompact(monthly)}/mo`} label="Recurring in play" tone="text-accent" />
        <Kpi value={String(aGrade)} label="Grade-A opportunities" tone="text-cyan" />
        <Kpi value={`${paths}/8`} label="David paths engaged" tone="text-lime" />
        <Kpi value={String(avgFitting)} label="Avg Fitting Score" tone="text-ink" />
      </div>

      <div className="reveal mt-6" style={{ animationDelay: "200ms" }}>
        {!profileId && <DemoConsole />}
      </div>
    </section>
  );
}
