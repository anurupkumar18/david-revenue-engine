"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  Download,
  History,
  Layers,
  LineChart,
  RefreshCw,
  Signal,
  SlidersHorizontal,
} from "lucide-react";
import { CAMPAIGN_PRICING_TIERS } from "@/lib/campaign";
import { computeRoi } from "@/lib/roi";
import { fmtMoneyCompact } from "@/lib/format";
import { useEngine } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button, Eyebrow, ScoreMeter } from "@/components/ui";
import { ProvenanceLabel } from "@/components/provenance-label";

function EmptyCampaignState() {
  return (
    <div className="panel grid place-items-center py-12 text-center">
      <p className="max-w-sm text-sm text-ink-dim">
        Create or open a campaign profile to see deterministic strategy, tracking, and learning
        insights.
      </p>
    </div>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="panel-2 p-4">
      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">{label}</div>
      <div className="mt-2 font-display text-2xl font-bold text-ink">{value}</div>
      <p className="mt-1 text-[12px] leading-relaxed text-ink-dim">{detail}</p>
    </div>
  );
}

export function CampaignStrategyPanel() {
  const campaign = useEngine((s) => s.campaign);
  if (!campaign) return <EmptyCampaignState />;

  return (
    <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="panel p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-accent/30 bg-accent/10 text-accent">
            <SlidersHorizontal size={18} />
          </div>
          <div>
            <Eyebrow>Generated Campaign Strategy</Eyebrow>
            <h3 className="mt-2 font-display text-2xl font-bold text-ink">
              {campaign.strategy.positioningAngle}
            </h3>
            <p className="mt-3 text-[14px] leading-relaxed text-ink-dim">
              {campaign.strategy.audienceSummary}
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-[14px] border border-line bg-surface-2/60 p-4">
          <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">
            Product input
          </div>
          <div className="mt-2 font-display text-lg font-bold text-ink">
            {campaign.input.productName}
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-dim">
            {campaign.input.productDescription}
          </p>
        </div>
      </div>

      <div className="panel p-5">
        <Eyebrow>Strategy assumptions</Eyebrow>
        <ul className="mt-4 space-y-3">
          {campaign.strategy.assumptions.map((assumption) => (
            <li key={assumption} className="flex gap-2 text-[13px] leading-relaxed text-ink-dim">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              {assumption}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function CampaignFiltersSignalsPanel() {
  const campaign = useEngine((s) => s.campaign);
  const logCampaignEvent = useEngine((s) => s.logCampaignEvent);
  const [copied, setCopied] = useState(false);
  if (!campaign) return <EmptyCampaignState />;

  const copyFilters = () => {
    const text = campaign.strategy.icpFilters.map((f) => `${f.label}: ${f.value}`).join("\n");
    navigator.clipboard?.writeText(text);
    setCopied(true);
    logCampaignEvent({ type: "filters_copied" });
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="panel p-5">
        <div className="mb-4 flex items-center justify-between">
          <Eyebrow>ICP Filters</Eyebrow>
          <Button size="sm" variant="outline" onClick={copyFilters}>
            {copied ? <Check size={13} className="text-accent" /> : <Copy size={13} />}
            {copied ? "Copied" : "Copy filters"}
          </Button>
        </div>
        <div className="space-y-3">
          {campaign.strategy.icpFilters.map((filter) => (
            <div key={filter.id} className="rounded-[12px] border border-line bg-surface-2/60 p-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="font-display text-sm font-semibold text-ink">{filter.label}</div>
                <span className="font-mono text-[10px] text-accent">filter</span>
              </div>
              <div className="mt-1 text-[13px] text-ink">{filter.value}</div>
              <p className="mt-1.5 text-[12px] leading-relaxed text-ink-faint">{filter.rationale}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="panel p-5">
        <div className="mb-4 flex items-center gap-2">
          <Signal size={15} className="text-amber" />
          <Eyebrow>Buying Signals</Eyebrow>
        </div>
        <div className="grid gap-3">
          {campaign.strategy.buyingSignals.map((signal) => (
            <div key={signal.id} className="panel-2 p-3.5">
              <div className="font-display text-sm font-semibold text-ink">{signal.label}</div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-dim">{signal.description}</p>
              <span className="mt-2 inline-flex rounded-md border border-line px-2 py-0.5 font-mono text-[10px] text-ink-faint">
                {signal.source.replace(/_/g, " ")}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CampaignPerformanceTracker() {
  const campaign = useEngine((s) => s.campaign);
  const accounts = useEngine((s) => s.accounts);
  const loadDemoHistory = useEngine((s) => s.loadDemoHistory);
  if (!campaign) return <EmptyCampaignState />;
  const m = campaign.metrics;
  const roi = computeRoi(accounts, m);

  return (
    <div className="panel p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <LineChart size={16} className="text-accent" />
          <Eyebrow>Campaign Performance Tracker</Eyebrow>
          <span className="font-mono text-[10px] text-ink-faint">
            · updates live as you copy filters, copy sequences, and route replies
          </span>
        </div>
        <Button size="sm" variant="outline" onClick={loadDemoHistory}>
          <History size={13} />
          Load demo history
        </Button>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[12px] border border-accent/25 bg-accent/[0.06] p-3.5">
          <div className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
            Qualified pipeline
          </div>
          <div className="mt-1 font-display text-2xl font-bold text-ink">
            {fmtMoneyCompact(roi.qualifiedPipelineAnnual)}
            <span className="ml-0.5 text-sm text-ink-faint">/yr</span>
          </div>
        </div>
        <div className="rounded-[12px] border border-line bg-surface-2/60 p-3.5">
          <div className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
            On-target vs cold list
          </div>
          <div className="mt-1 font-display text-2xl font-bold text-accent">{roi.liftVsBaseline}×</div>
        </div>
        <div className="rounded-[12px] border border-line bg-surface-2/60 p-3.5">
          <div className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
            Projected meetings
          </div>
          <div className="mt-1 font-display text-2xl font-bold text-ink">{roi.projectedMeetings}</div>
        </div>
      </div>
      <div className="mb-4 flex items-center gap-2">
        <ProvenanceLabel provenance="inferred" />
        <span className="font-mono text-[10px] text-ink-faint">
          pipeline = account revenue ranges × 12 · lift vs a 15% on-target cold list
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Campaigns created" value={`${m.campaignsCreated}`} detail="Users come back to create more campaigns." />
        <MetricCard label="Filters copied" value={`${m.filtersCopied}`} detail="ICP strategy becomes reusable workflow." />
        <MetricCard label="Sequences copied" value={`${m.sequencesCopied}`} detail="Approved copy can leave the system, but sending is external." />
        <MetricCard label="Replies routed" value={`${m.repliesRouted}`} detail="The router feeds learning without owning the inbox." />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {[
          ["Positive reply rate", m.positiveReplyRate],
          ["Meeting rate", m.meetingRate],
          ["Bad-fit rate", m.badFitRate],
          ["Human edit rate", m.humanEditRate],
          ["Approval rate", m.approvalRate],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[12px] border border-line bg-surface-2/60 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[11px] text-ink-faint">{label}</span>
              <span className="font-mono text-[11px] text-ink">{value}%</span>
            </div>
            <ScoreMeter value={Number(value)} />
          </div>
        ))}
        <div className="rounded-[12px] border border-amber/25 bg-amber/[0.07] p-3">
          <div className="font-mono text-[11px] text-amber">winning signal</div>
          <div className="mt-1 text-sm font-semibold text-ink">{m.winningSignal}</div>
        </div>
        <div className="rounded-[12px] border border-danger/25 bg-danger/[0.07] p-3">
          <div className="font-mono text-[11px] text-danger">common objection</div>
          <div className="mt-1 text-sm font-semibold text-ink">{m.commonObjection}</div>
        </div>
      </div>
    </div>
  );
}

export function LearningInsightsPanel() {
  const campaign = useEngine((s) => s.campaign);
  if (!campaign) return <EmptyCampaignState />;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="panel p-5">
        <Eyebrow>Learning Insights</Eyebrow>
        <div className="mt-4 space-y-3">
          <Insight label="Winning signal" value={campaign.learningInsights.winningSignal} />
          <Insight label="Common objection" value={campaign.learningInsights.commonObjection} />
          <Insight label="Recommended ICP adjustment" value={campaign.learningInsights.recommendedIcpAdjustment} />
        </div>
      </div>
      <div className="panel p-5">
        <div className="mb-3 flex items-center gap-2">
          <RefreshCw size={15} className="text-accent" />
          <Eyebrow>Improved Next Campaign</Eyebrow>
        </div>
        <h3 className="font-display text-xl font-bold text-ink">{campaign.nextCampaign.title}</h3>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-dim">
          {campaign.nextCampaign.revisedHypothesis}
        </p>
        <ul className="mt-4 space-y-2">
          {campaign.nextCampaign.improvements.map((item) => (
            <li key={item} className="flex gap-2 text-[13px] leading-relaxed text-ink-dim">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Insight({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-line bg-surface-2/60 p-3.5">
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">{label}</div>
      <div className="mt-1 text-[13px] leading-relaxed text-ink">{value}</div>
    </div>
  );
}

export function AgencyWorkspacePanel() {
  const campaign = useEngine((s) => s.campaign);
  const profileId = useEngine((s) => s.profileId);
  const agencyName = useEngine((s) => s.agencyName);
  const setAgencyName = useEngine((s) => s.setAgencyName);
  if (!campaign) return <EmptyCampaignState />;

  return (
    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="panel p-5">
        <div className="mb-3 flex items-center gap-2">
          <Layers size={15} className="text-accent" />
          <Eyebrow>Agency Workspace / Client Export</Eyebrow>
        </div>
        <h3 className="font-display text-xl font-bold text-ink">{campaign.agencyWorkspace.clientName}</h3>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-dim">
          Brand the workspace, save a reusable campaign memory per client, and export a white-label
          strategy brief — then improve the next campaign from reply outcomes.
        </p>
        <label className="mt-4 block">
          <span className="font-mono text-[11px] text-ink-faint">White-label agency name</span>
          <input
            value={agencyName}
            onChange={(e) => setAgencyName(e.target.value)}
            placeholder="Your agency / studio name"
            className="mt-1.5 w-full rounded-[10px] border border-line bg-surface-2 px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-accent/50"
          />
        </label>
        <div className="mt-4 rounded-[12px] border border-line bg-surface-2/60 p-3.5">
          <div className="font-mono text-[11px] text-ink-faint">Reusable campaign memory</div>
          <ul className="mt-2 space-y-2">
            {campaign.agencyWorkspace.reusableMemory.map((memory) => (
              <li key={memory} className="text-[12.5px] text-ink-dim">{memory}</li>
            ))}
          </ul>
        </div>
        {profileId ? (
          <Link href={`/report/${profileId}`} className="mt-4 block">
            <Button className="w-full" variant="solid">
              <Download size={14} />
              {campaign.agencyWorkspace.exportLabel}
            </Button>
          </Link>
        ) : (
          <Button className="mt-4 w-full" variant="solid" disabled>
            <Download size={14} />
            {campaign.agencyWorkspace.exportLabel}
          </Button>
        )}
      </div>

      <div className="panel p-5">
        <Eyebrow>Pricing mock</Eyebrow>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {CAMPAIGN_PRICING_TIERS.map((tier) => (
            <div
              key={tier.name}
              className={cn(
                "rounded-[12px] border bg-surface-2/60 p-3",
                tier.name === "Agency" ? "border-accent/40 glow-accent" : "border-line",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-sm font-bold text-ink">{tier.name}</span>
                <span className="font-mono text-[11px] text-accent">{tier.price}</span>
              </div>
              <p className="mt-1 text-[12px] text-ink-dim">{tier.fit}</p>
              <p className="mt-2 text-[11px] leading-relaxed text-ink-faint">{tier.recurringValue}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
