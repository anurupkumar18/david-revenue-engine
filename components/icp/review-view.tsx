"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createProfile, ApiAuthError } from "@/lib/icp-api";
import { useAuth } from "@/components/auth/auth-provider";
import { clearWizardDraft, loadWizardDraft } from "@/lib/icp-session";
import type { ConfidenceLevel, ICPFields } from "@/lib/types/icp";
import { Button } from "@/components/ui";
import { IcpPageHeader, IcpShell } from "@/components/icp/icp-shell";
import { ProfileReviewCard } from "@/components/icp/profile-review-card";

export function ReviewView() {
  const router = useRouter();
  const { needsSignIn, promptSignIn } = useAuth();
  const [fields, setFields] = useState<ICPFields | null>(null);
  const [confidence, setConfidence] = useState<Record<string, ConfidenceLevel>>({});
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileId, setProfileId] = useState<number | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const draft = loadWizardDraft();
      if (!draft?.fields) {
        router.replace("/wizard");
        return;
      }
      setFields(draft.fields);
      setConfidence(draft.confidence || {});
    }, 0);

    return () => window.clearTimeout(timer);
  }, [router]);

  const handleReject = () => router.push("/wizard");

  const handleAccept = async () => {
    if (!fields) return;
    if (needsSignIn) {
      const ok = await promptSignIn("Sign in or create an account to save this campaign profile.");
      if (!ok) return;
    }
    setSaving(true);
    try {
      const profile = await createProfile(fields, confidence, "accepted");
      clearWizardDraft();
      setProfileId(profile.id);
      setShowModal(true);
    } catch (e) {
      const msg =
        e instanceof ApiAuthError
          ? "Sign in required to save your campaign profile."
          : e instanceof Error
            ? e.message
            : "Failed to save profile";
      alert(msg);
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
    <IcpShell maxWidth="max-w-3xl">
      <IcpPageHeader
        eyebrow="Review"
        title="Review your campaign profile"
        subtitle="Confirm the product input, ICP filters, and buying signals before opening the campaign workspace."
      />

      <ProfileReviewCard fields={fields} confidence={confidence} />

      {needsSignIn && (
        <p className="mt-4 rounded-[12px] border border-amber/40 bg-amber/10 px-4 py-3 text-[13px] text-ink-dim">
          Sign in is required to save this profile and connect Gmail for live sending.
        </p>
      )}

      <div className="mt-10 flex gap-2">
        <Button variant="outline" onClick={handleReject} className="border-danger/40 text-danger hover:bg-danger/10">
          Reject & edit
        </Button>
        <Button variant="solid" onClick={handleAccept} disabled={saving} className="pulse-a">
          {saving ? <Loader2 size={15} className="animate-spin" /> : null}
          {saving ? "Saving…" : "Accept profile"}
        </Button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-base/85 p-5">
          <div className="panel glow-accent max-w-md p-7">
            <h2 className="font-display text-[26px] font-semibold text-ink">Campaign profile saved</h2>
            <p className="mt-3 text-[14px] leading-[1.8] text-ink-dim">
              Your campaign profile is stored locally. Find matching contacts from deterministic sources, or go straight to the campaign workspace.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button variant="solid" onClick={() => handleDiscover(true)}>Yes, find contacts</Button>
              <Button variant="outline" onClick={() => handleDiscover(false)}>Open campaign workspace</Button>
            </div>
          </div>
        </div>
      )}
    </IcpShell>
  );
}
