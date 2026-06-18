"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Loader2 } from "lucide-react";
import { listBriefs } from "@/lib/icp-api";
import type { BriefView } from "@/lib/icp-api";
import { Button } from "@/components/ui";
import { IcpPageHeader, IcpShell } from "@/components/icp/icp-shell";

export default function BriefsIndexPage() {
  const [briefs, setBriefs] = useState<BriefView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listBriefs()
      .then((res) => setBriefs(res.briefs ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <IcpShell maxWidth="max-w-5xl">
      <div className="mb-8 flex items-start justify-between gap-4">
        <IcpPageHeader
          eyebrow="Phase 2d · Briefs"
          title="All customer briefs"
          subtitle="Stored daily and weekly briefs across every customer workspace, with the latest narrative, counts, and learning notes."
        />
        <Link href="/dashboard">
          <Button variant="outline">Campaigns</Button>
        </Link>
      </div>

      {loading ? (
        <div className="grid place-items-center py-16">
          <Loader2 size={24} className="animate-spin text-accent" />
        </div>
      ) : (
        <div className="space-y-3">
          {briefs.length === 0 ? (
            <div className="panel p-5 text-sm text-ink-dim">No briefs stored yet.</div>
          ) : (
            briefs.map((brief) => (
              <Link
                key={brief.id}
                href={`/briefs/${brief.profile_id}`}
                className="panel block p-4 transition-colors hover:border-line-strong"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-accent" />
                      <div className="font-display text-base font-semibold text-ink">{brief.client_name}</div>
                    </div>
                    <p className="mt-1 text-[13px] leading-relaxed text-ink-dim">{brief.narrative}</p>
                  </div>
                  <div className="font-mono text-[11px] text-ink-faint">
                    {brief.period}
                    <br />
                    {brief.created_at ? new Date(brief.created_at).toLocaleDateString() : "—"}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </IcpShell>
  );
}
