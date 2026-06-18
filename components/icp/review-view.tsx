"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createProfile } from "@/lib/icp-api";
import { clearWizardDraft, loadWizardDraft } from "@/lib/icp-session";
import type { ConfidenceLevel, ICPFields } from "@/lib/types/icp";
import { Button } from "@/components/ui";
import { IcpPageHeader, IcpShell } from "@/components/icp/icp-shell";
import { ProfileReviewCard } from "@/components/icp/profile-review-card";

export function ReviewView() {
  const router = useRouter();
  const [fields, setFields] = useState<ICPFields | null>(null);
  const [confidence, setConfidence] = useState<Record<string, ConfidenceLevel>>({});
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileId, setProfileId] = useState<number | null>(null);

  useEffect(() => {
    const draft = loadWizardDraft();
    if (!draft?.fields) {
      router.replace("/wizard");
      return;
    }
    setFields(draft.fields);
    setConfidence(draft.confidence || {});
  }, [router]);

  const handleReject = () => router.push("/wizard");

  const handleAccept = async () => {
    if (!fields) return;
    setSaving(true);
    try {
      const profile = await createProfile(fields, confidence, "accepted");
      clearWizardDraft();
      setProfileId(profile.id);
      setShowModal(true);
    } catch {
      alert("Failed to save profile");
    }
    setSaving(false);
  };

  const handleDiscover = (yes: boolean) => {
    setShowModal(false);
    if (!profileId) {
      router.push("/dashboard");
      return;
    }
    router.push(yes ? `/discover/${profileId}` : `/business/${profileId}`);
  };

  if (!fields) return null;

  return (
    <IcpShell maxWidth="max-w-2xl">
      <IcpPageHeader
        eyebrow="Review"
        title="Review your ICP"
        subtitle="Confirm your targeting profile before finding contacts."
      />

      <ProfileReviewCard fields={fields} confidence={confidence} />

      <div className="mt-8 flex gap-2">
        <Button variant="outline" onClick={handleReject} className="border-danger/40 text-danger hover:bg-danger/10">
          Reject & edit
        </Button>
        <Button variant="solid" onClick={handleAccept} disabled={saving} className="pulse-a">
          {saving ? <Loader2 size={15} className="animate-spin" /> : null}
          {saving ? "Saving…" : "Accept profile"}
        </Button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-base/80 p-5 backdrop-blur-sm">
          <div className="panel glow-accent max-w-md p-6">
            <h2 className="font-display text-xl font-bold text-ink">Business profile saved</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-dim">
              Your ICP is now stored as a business profile. Find matching contacts from public sources, or go straight to the revenue engine.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button variant="solid" onClick={() => handleDiscover(true)}>Yes, find contacts</Button>
              <Button variant="outline" onClick={() => handleDiscover(false)}>Open revenue engine</Button>
            </div>
          </div>
        </div>
      )}
    </IcpShell>
  );
}
