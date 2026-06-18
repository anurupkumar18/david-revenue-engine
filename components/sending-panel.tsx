"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Check, Mail, Play, Send, ShieldAlert, X } from "lucide-react";
import { useEngine } from "@/lib/store";
import type { ICPContact } from "@/lib/types/icp";
import { syntheticTestEmailForKey } from "@/lib/test-recipients";
import {
  approveSendJob,
  getEmailConnection,
  getProfile,
  getSendJobs,
  runSendQueue,
  skipSendJob,
  startSequence,
  type EmailConnectionInfo,
  type SendJobView,
  type SequenceSend,
} from "@/lib/icp-api";
import { EmailConnectionPanel } from "@/components/email-connection-panel";
import { Button, Eyebrow } from "@/components/ui";
import { cn } from "@/lib/utils";

const INACTIVE_STAGES = new Set(["closed_won", "closed_lost", "suppressed"]);

function demoEmail(account: { id?: string; domain?: string; name: string }): string {
  return syntheticTestEmailForKey(account.id || account.name);
}

function resolveContactEmail(
  account: { id: string; name: string; domain?: string },
  contacts: ICPContact[],
  allowDemo: boolean,
): string {
  const normalized = account.name.toLowerCase().trim();
  const match = contacts.find((c) => {
    const cn = c.company_name.toLowerCase().trim();
    return cn === normalized || cn.includes(normalized) || normalized.includes(cn);
  });
  if (match?.email) return match.email;
  return allowDemo ? demoEmail(account) : "";
}

const STATUS_TONE: Record<string, string> = {
  sent: "text-accent border-accent/40",
  pending: "text-cyan border-line",
  approved: "text-cyan border-line",
  needs_review: "text-amber border-amber/40",
  skipped: "text-ink-faint border-line",
  failed: "text-danger border-danger/40",
};

function JobRow({
  job,
  onApprove,
  onSkip,
}: {
  job: SendJobView;
  onApprove: (id: number) => void;
  onSkip: (id: number) => void;
}) {
  const when = job.scheduled_at ? new Date(job.scheduled_at).toLocaleString() : "—";
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line py-2.5 first:border-t-0">
      <div className="min-w-0">
        <div className="truncate text-[13px] text-ink">
          <span className="font-mono text-[11px] text-ink-faint">step {job.step}</span> · {job.subject}
        </div>
        <div className="truncate font-mono text-[11px] text-ink-faint">
          {job.contact_email} · {job.status === "sent" ? `sent ${job.sent_at ? new Date(job.sent_at).toLocaleString() : ""}` : when}
          {job.last_error ? ` · ${job.last_error}` : ""}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {job.auto ? null : (
          <span className="inline-flex items-center gap-1 font-mono text-[10px] text-amber">
            <ShieldAlert size={11} /> review
          </span>
        )}
        <span className={cn("rounded-md border px-2 py-0.5 font-mono text-[10px]", STATUS_TONE[job.status] ?? "text-ink-dim border-line")}>
          {job.status}
        </span>
        {job.status === "needs_review" && (
          <>
            <button
              onClick={() => onApprove(job.id)}
              className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 font-mono text-[10px] text-ink-dim hover:bg-surface-2 hover:text-ink"
            >
              <Check size={11} className="text-accent" /> approve
            </button>
            <button
              onClick={() => onSkip(job.id)}
              className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 font-mono text-[10px] text-ink-dim hover:bg-surface-2 hover:text-ink"
            >
              <X size={11} /> skip
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function SendingPanel() {
  const profileId = useEngine((s) => s.profileId);
  const accounts = useEngine((s) => s.accounts);
  const campaign = useEngine((s) => s.campaign);

  const [jobs, setJobs] = useState<SendJobView[]>([]);
  const [cap, setCap] = useState<{ cap: number; remaining: number } | null>(null);
  const [contacts, setContacts] = useState<ICPContact[]>([]);
  const [connection, setConnection] = useState<EmailConnectionInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string>("");

  const refresh = useCallback(async () => {
    if (!profileId) return;
    const res = await getSendJobs(profileId);
    setJobs(res.jobs ?? []);
    setCap({ cap: res.cap, remaining: res.cap_remaining });
  }, [profileId]);

  useEffect(() => {
    if (!profileId) return;
    let active = true;
    (async () => {
      const [res, profile, conn] = await Promise.all([
        getSendJobs(profileId),
        getProfile(profileId),
        getEmailConnection().catch(() => null),
      ]);
      if (!active) return;
      setJobs(res.jobs ?? []);
      setCap({ cap: res.cap, remaining: res.cap_remaining });
      setContacts(profile.contacts || []);
      setConnection(conn);
    })();
    return () => {
      active = false;
    };
  }, [profileId]);

  const enrollable = accounts.filter((a) => !INACTIVE_STAGES.has(a.stage));
  const demoMode = !connection?.auth_enabled;
  const mailboxReady = demoMode || Boolean(connection?.connected);
  const liveLabel = connection?.connected
    ? `Connected as ${connection.email_address}`
    : demoMode
      ? "Simulated sends (demo mode — connect mailbox for live delivery)"
      : "Connect your mailbox to send live emails";

  async function start() {
    if (!profileId || !campaign) return;
    setBusy(true);
    setNote("");
    try {
      const [s1, s2] = campaign.sequence.steps;
      const sends: SequenceSend[] = enrollable
        .map((a) => ({
          account_id: a.id,
          contact_email: resolveContactEmail(a, contacts, demoMode),
          grade: a.fitting.grade,
          step1: { subject: s1.subject, body: s1.body, validated: s1.validation.passed },
          step2: { subject: s2.subject, body: s2.body, validated: s2.validation.passed },
        }))
        .filter((s) => s.contact_email);
      if (!sends.length) {
        setNote("No recipient emails found. Discover contacts on the dashboard or use demo mode.");
        return;
      }
      const summary = await startSequence(profileId, sends);
      setNote(
        `Enrolled ${summary.threads} accounts · ${summary.auto} auto-send, ${summary.needs_review} need review.`,
      );
      await refresh();
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Failed to start sequence");
    } finally {
      setBusy(false);
    }
  }

  async function processQueue() {
    if (!profileId) return;
    setBusy(true);
    try {
      const summary = await runSendQueue(profileId);
      setNote(`Processed queue: ${summary.sent} sent, ${summary.skipped} skipped, ${summary.held} held, ${summary.failed} failed.`);
      await refresh();
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Queue processing failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleApprove(id: number) {
    await approveSendJob(id);
    await refresh();
  }
  async function handleSkip(id: number) {
    await skipSendJob(id);
    await refresh();
  }

  if (!profileId) {
    return (
      <div className="panel grid place-items-center p-10 text-center">
        <p className="text-sm text-ink-dim">Save this campaign to enable scheduled sending.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <EmailConnectionPanel compact />

      <div className="panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[13px] text-ink-dim">
            <Mail size={14} className="text-ink-faint" />
            {liveLabel}
          </div>
          {cap && (
            <span className="font-mono text-[11px] text-ink-faint">
              daily cap {cap.cap - cap.remaining}/{cap.cap}
            </span>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="solid" disabled={busy || !campaign || enrollable.length === 0 || !mailboxReady} onClick={start}>
            <Send size={15} />
            {busy ? "Working…" : `Start sequence (${enrollable.length})`}
          </Button>
          <Button variant="ghost" disabled={busy || jobs.length === 0} onClick={processQueue}>
            <Play size={15} />
            Process queue now
          </Button>
        </div>

        {note && <p className="mt-3 text-[12px] text-ink-dim">{note}</p>}

        <div className="mt-4">
          <div className="mb-1 flex items-center gap-2">
            <CalendarClock size={13} className="text-ink-faint" />
            <Eyebrow>Send queue</Eyebrow>
          </div>
          {jobs.length === 0 ? (
            <div className="grid place-items-center rounded-[12px] border border-dashed border-line py-8 text-center">
              <p className="text-sm text-ink-dim">No sends scheduled yet. Start the sequence to enroll accounts.</p>
            </div>
          ) : (
            <div className="panel-2 px-4 py-1">
              {jobs.map((j) => (
                <JobRow key={j.id} job={j} onApprove={handleApprove} onSkip={handleSkip} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
