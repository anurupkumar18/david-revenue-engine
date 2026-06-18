"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Inbox, Loader2 } from "lucide-react";
import { listProfiles } from "@/lib/icp-api";
import type { ICPProfile } from "@/lib/types/icp";
import { Button } from "@/components/ui";
import { IcpPageHeader, IcpShell } from "@/components/icp/icp-shell";

export default function InboxIndexPage() {
  const [profiles, setProfiles] = useState<ICPProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listProfiles()
      .then(setProfiles)
      .finally(() => setLoading(false));
  }, []);

  return (
    <IcpShell maxWidth="max-w-5xl">
      <div className="mb-8 flex items-start justify-between gap-4">
        <IcpPageHeader
          eyebrow="Phase 2c · Inboxes"
          title="Review inboxes"
          subtitle="Pick a customer workspace to inspect reply threads, draft responses, and approval actions."
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => (
            <Link key={profile.id} href={`/inbox/${profile.id}`} className="panel p-4 transition-colors hover:border-line-strong">
              <div className="flex items-center gap-2">
                <Inbox size={14} className="text-accent" />
                <div className="font-display text-base font-semibold text-ink">{profile.company_name}</div>
              </div>
              <div className="mt-2 font-mono text-[11px] text-ink-faint">
                {profile.status} · {profile.contacts?.length || 0} contacts
              </div>
            </Link>
          ))}
        </div>
      )}
    </IcpShell>
  );
}
