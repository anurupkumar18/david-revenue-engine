"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { exportOutreach, getOutreachQueue, listProfiles } from "@/lib/icp-api";
import type { ICPProfile } from "@/lib/types/icp";
import { Button } from "@/components/ui";
import { ContactTable } from "@/components/icp/contact-table";
import { IcpPageHeader, IcpShell } from "@/components/icp/icp-shell";
import { cn } from "@/lib/utils";

export function DashboardView({ profileId }: { profileId?: number }) {
  const router = useRouter();
  const [profiles, setProfiles] = useState<ICPProfile[]>([]);
  const [manualSelectedId, setManualSelectedId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<string | null>(null);
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    listProfiles().then(setProfiles);
  }, []);

  const selectedId = profileId ?? manualSelectedId ?? profiles[0]?.id ?? null;
  const selected = selectedId ? profiles.find((p) => p.id === selectedId) ?? null : null;

  useEffect(() => {
    if (selected) getOutreachQueue(selected.id).then((q) => setQueueCount(q.length));
  }, [selected]);

  const handleExport = async () => {
    if (!selected) return;
    setExporting(true);
    try {
      const res = await exportOutreach(selected.id);
      setExportResult(`Exported ${res.exported} contacts to outreach queue. CLI: ${res.cli_hint}`);
      setQueueCount(res.exported);
    } catch {
      setExportResult("Export failed. Run contact discovery first.");
    }
    setExporting(false);
  };

  return (
    <IcpShell maxWidth="max-w-5xl">
      <div className="mb-8 flex items-start justify-between gap-4">
        <IcpPageHeader
          eyebrow="Campaigns"
          title="Campaign workspace"
          subtitle="Saved campaign profiles, client contact queues, and local campaign handoff."
        />
        <Link href="/">
          <Button variant="solid">New campaign</Button>
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <div>
          <div className="eyebrow mb-3">Campaign profiles</div>
          {profiles.length === 0 && (
            <div className="panel p-4 text-sm text-ink-dim">No campaigns yet.</div>
          )}
          <div className="space-y-2">
            {profiles.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setManualSelectedId(p.id);
                  router.push(`/dashboard/${p.id}`);
                }}
                className={cn(
                  "panel w-full p-3 text-left transition-colors hover:border-line-strong",
                  selected?.id === p.id && "border-accent/40 glow-accent",
                )}
              >
                <div className="font-display text-sm font-semibold text-ink">{p.company_name}</div>
                <div className="mt-1 font-mono text-[10px] text-ink-faint">
                  <span className={cn(p.status === "accepted" && "text-accent")}>{p.status}</span>
                  {" · "}{p.contacts?.length || 0} contacts
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          {selected ? (
            <>
              <h2 className="font-display text-2xl font-bold text-ink">{selected.company_name}</h2>
              <p className="mt-1 text-[13px] text-ink-dim">
                {(selected.fields.best_fit_industries || []).join(", ")} · {selected.fields.company_size} · {selected.fields.geography}
              </p>

              <div className="mt-6">
                <ContactTable contacts={selected.contacts || []} />
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {selected.status === "accepted" && (
                  <Link href={`/business/${selected.id}`}>
                    <Button variant="solid">Open campaign workspace</Button>
                  </Link>
                )}
                {(!selected.contacts || selected.contacts.length === 0) && (
                  <Button variant="outline" onClick={() => router.push(`/discover/${selected.id}`)}>
                    Discover contacts
                  </Button>
                )}
                {selected.contacts && selected.contacts.length > 0 && (
                  <Button variant="solid" onClick={handleExport} disabled={exporting}>
                    {exporting ? <Loader2 size={15} className="animate-spin" /> : null}
                    Export client queue
                  </Button>
                )}
              </div>

              {exportResult && (
                <p className="mt-4 text-[13px] text-accent">{exportResult}</p>
              )}
              {queueCount > 0 && (
                <p className="mt-2 font-mono text-[11px] text-ink-faint">
                  {queueCount} items in outreach queue. Run:{" "}
                  <code className="text-amber">linkedin-outreach next --profile-id {selected.id}</code>
                </p>
              )}
            </>
          ) : (
            <div className="panel grid place-items-center py-16 text-sm text-ink-dim">
              Select a campaign or create a new one.
            </div>
          )}
        </div>
      </div>
    </IcpShell>
  );
}
