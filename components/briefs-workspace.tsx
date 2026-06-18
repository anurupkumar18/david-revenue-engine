"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, FileText, RefreshCw } from "lucide-react";
import { getProfile, listProfileBriefs, runBrief, type BriefView } from "@/lib/icp-api";
import { Button, Eyebrow } from "@/components/ui";
import { IcpPageHeader, IcpShell } from "@/components/icp/icp-shell";
import { cn } from "@/lib/utils";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? "—" : dt.toLocaleString();
}

export function BriefsWorkspace({ profileId }: { profileId: number }) {
  const [companyName, setCompanyName] = useState("");
  const [briefs, setBriefs] = useState<BriefView[]>([]);
  const [selectedBriefId, setSelectedBriefId] = useState<number | null>(null);
  const [period, setPeriod] = useState<"daily" | "weekly">("daily");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selectedBrief = useMemo(
    () => briefs.find((brief) => brief.id === selectedBriefId) ?? briefs[0] ?? null,
    [briefs, selectedBriefId],
  );

  async function refresh(nextSelectedId?: number) {
    const res = await listProfileBriefs(profileId);
    const items = res.briefs ?? [];
    setBriefs(items);
    const preferred = nextSelectedId ?? selectedBriefId ?? items[0]?.id ?? null;
    setSelectedBriefId(preferred);
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const profile = await getProfile(profileId);
        if (!active) return;
        setCompanyName(profile.company_name);
        await refresh();
      } catch {
        if (active) setError("Failed to load briefs. Is the API server running?");
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  async function generate() {
    setBusy(true);
    try {
      const brief = await runBrief(profileId, period);
      setSelectedBriefId(brief.id);
      await refresh(brief.id);
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return <div className="panel p-6 text-danger">{error}</div>;
  }

  return (
    <IcpShell maxWidth="max-w-none">
      <div className="mb-10 flex items-start justify-between gap-4">
        <IcpPageHeader
          eyebrow="Phase 2d · Briefs"
          title={companyName || "Campaign briefs"}
          subtitle="Generate daily or weekly campaign briefs from stored activity. The brief reuses the campaign learning and adds fresh send and reply counts."
        />
        <Link href={`/inbox/${profileId}`}>
          <Button variant="outline">Open inbox</Button>
        </Link>
      </div>

      <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
        <aside className="space-y-5">
          <div className="panel p-5">
            <Eyebrow>Run brief</Eyebrow>
            <div className="mt-3 flex gap-2">
              <Button variant={period === "daily" ? "solid" : "outline"} active={period === "daily"} onClick={() => setPeriod("daily")}>
                Daily
              </Button>
              <Button variant={period === "weekly" ? "solid" : "outline"} active={period === "weekly"} onClick={() => setPeriod("weekly")}>
                Weekly
              </Button>
            </div>
            <Button variant="solid" className="mt-4" onClick={generate} disabled={busy}>
              <RefreshCw size={14} />
              {busy ? "Working…" : "Generate brief"}
            </Button>
          </div>

          <div className="panel p-5">
            <div className="mb-3 flex items-center justify-between">
              <Eyebrow>Stored briefs</Eyebrow>
              <span className="font-mono text-[10px] text-ink-faint">{briefs.length}</span>
            </div>
            <div className="space-y-2">
              {briefs.length === 0 ? (
                  <div className="rounded-[14px] border border-dashed border-line px-3 py-5 text-[14px] text-ink-dim">
                  No briefs yet. Generate one to start the learning loop.
                </div>
              ) : (
                briefs.map((brief) => (
                  <button
                    key={brief.id}
                    onClick={() => setSelectedBriefId(brief.id)}
                    className={cn(
                      "w-full rounded-[14px] border border-line bg-surface-2/60 px-3 py-3 text-left transition-colors hover:border-line-strong",
                      selectedBrief?.id === brief.id && "border-accent/40 bg-accent/[0.06]",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate font-display text-[15px] font-semibold text-ink">{brief.period}</div>
                      <span className="font-mono text-[10px] text-ink-faint">{formatDate(brief.created_at)}</span>
                    </div>
                    <div className="mt-1.5 truncate text-[12.5px] leading-[1.7] text-ink-dim">{brief.narrative}</div>
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>

        <section className="panel min-h-[680px] p-6">
          {!selectedBrief ? (
            <div className="grid h-full place-items-center text-center">
              <div>
                <FileText size={18} className="mx-auto text-ink-faint" />
                <p className="mt-3 max-w-sm text-sm text-ink-dim">
                  Run a brief to generate the latest daily or weekly summary for this customer.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Eyebrow>Brief</Eyebrow>
                  <h2 className="mt-1 font-display text-[28px] font-semibold text-ink">
                    {selectedBrief.client_name}
                  </h2>
                  <p className="mt-1 font-mono text-[11px] text-ink-faint">
                    {selectedBrief.period} · {selectedBrief.period_start} to {selectedBrief.period_end} · {formatDate(selectedBrief.created_at)}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                  <CalendarClock size={11} /> stored brief
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {[
                  ["sends", selectedBrief.counts?.sent ?? 0],
                  ["inbound", selectedBrief.counts?.inbound ?? 0],
                  ["routed", selectedBrief.counts?.routed ?? 0],
                  ["positive", selectedBrief.counts?.positive ?? 0],
                  ["meetings", selectedBrief.counts?.meetings ?? 0],
                  ["suppressed", selectedBrief.counts?.suppressed ?? 0],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[14px] border border-line bg-surface-2/70 p-4">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">{label}</div>
                    <div className="mt-1 font-display text-[28px] font-semibold text-ink">{String(value)}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-[14px] border border-line bg-surface-2/70 p-5">
                <Eyebrow className="mb-2">Narrative</Eyebrow>
                <p className="text-[14px] leading-[1.8] text-ink">{selectedBrief.narrative}</p>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-[14px] border border-line bg-surface-2/70 p-5">
                  <Eyebrow className="mb-2">Recommendations</Eyebrow>
                  <ul className="space-y-2">
                    {selectedBrief.recommendations.map((recommendation) => (
                      <li key={recommendation} className="flex gap-2 text-[13.5px] leading-[1.75] text-ink-dim">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                        <span>{recommendation}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-[14px] border border-line bg-surface-2/70 p-5">
                  <Eyebrow className="mb-2">Learning</Eyebrow>
                  <div className="space-y-3 text-[13.5px] leading-[1.75] text-ink-dim">
                    {selectedBrief.learningInsights ? (
                      <>
                        <p>
                          <span className="font-semibold text-ink">Winning signal:</span>{" "}
                          {selectedBrief.learningInsights.winningSignal}
                        </p>
                        <p>
                          <span className="font-semibold text-ink">Common objection:</span>{" "}
                          {selectedBrief.learningInsights.commonObjection}
                        </p>
                        <p>
                          <span className="font-semibold text-ink">Next campaign:</span>{" "}
                          {selectedBrief.learningInsights.nextCampaignRecommendation}
                        </p>
                      </>
                    ) : (
                      <p>Learning insights are stored with each brief.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </IcpShell>
  );
}
