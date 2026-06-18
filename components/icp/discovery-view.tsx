"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { discoverContacts } from "@/lib/icp-api";
import { IcpPageHeader, IcpShell } from "@/components/icp/icp-shell";

export function DiscoveryView({ profileId }: { profileId: number }) {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");
  const [count, setCount] = useState(0);

  useEffect(() => {
    discoverContacts(profileId)
      .then((res) => {
        setCount(res.count);
        setStatus("done");
        setTimeout(() => router.push(`/business/${profileId}`), 1500);
      })
      .catch(() => setStatus("error"));
  }, [profileId, router]);

  return (
    <IcpShell maxWidth="max-w-xl">
      <div className="panel grid min-h-[40vh] place-items-center p-8 text-center">
        {status === "loading" && (
          <>
            <Loader2 size={32} className="mb-4 animate-spin text-accent" />
            <IcpPageHeader
              eyebrow="Contact discovery"
              title="Discovering contacts"
              subtitle="Searching public sources for decision-makers matching your ICP…"
            />
          </>
        )}
        {status === "done" && (
          <IcpPageHeader
            eyebrow="Contact discovery"
            title={`Found ${count} contacts`}
            subtitle="Redirecting to revenue engine…"
          />
        )}
        {status === "error" && (
          <>
            <IcpPageHeader eyebrow="Contact discovery" title="Discovery failed" subtitle="Could not find contacts. Try again from the dashboard." />
            <button
              className="mt-4 text-sm text-accent hover:underline"
              onClick={() => router.push("/dashboard")}
            >
              Go to dashboard
            </button>
          </>
        )}
      </div>
    </IcpShell>
  );
}
