"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, Mail, MessageSquareReply, RefreshCw, Send, Trash2 } from "lucide-react";
import seedReplies from "@/data/seed-replies.json";
import {
  getProfile,
  getThread,
  listThreads,
  patchThread,
  simulateInbound,
  type ThreadView,
} from "@/lib/icp-api";
import { Button, Eyebrow } from "@/components/ui";
import { IcpPageHeader, IcpShell } from "@/components/icp/icp-shell";
import { cn } from "@/lib/utils";

type ReplySample = { id: string; label: string; text: string };
const SAMPLES = seedReplies as ReplySample[];

function formatTime(value: string | null | undefined): string {
  if (!value) return "—";
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? "—" : dt.toLocaleString();
}

function statusTone(status: string): string {
  if (status === "sent") return "text-accent border-accent/40";
  if (status === "needs_review") return "text-amber border-amber/40";
  if (status === "failed") return "text-danger border-danger/40";
  if (status === "skipped") return "text-ink-faint border-line";
  return "text-cyan border-line";
}

export function InboxWorkspace({ profileId }: { profileId: number }) {
  const [companyName, setCompanyName] = useState("");
  const [threads, setThreads] = useState<ThreadView[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedThread, setSelectedThread] = useState<ThreadView | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [contactEmail, setContactEmail] = useState("prospect@example.com");
  const [replyText, setReplyText] = useState(SAMPLES[1]?.text ?? "");
  const [replySubject, setReplySubject] = useState("need more info");
  const [replyGrade, setReplyGrade] = useState("D");
  const [draftSubject, setDraftSubject] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [draftCta, setDraftCta] = useState("");

  function applyDraft(thread: ThreadView | null) {
    setDraftSubject(thread?.draft?.subject ?? "");
    setDraftBody(thread?.draft?.body ?? "");
    setDraftCta(thread?.draft?.cta ?? "");
  }

  async function refreshThreads(nextSelectedId?: string) {
    const res = await listThreads(profileId);
    const items = res.threads ?? [];
    setThreads(items);
    const preferred = nextSelectedId ?? selectedThreadId ?? items[0]?.thread_id ?? null;
    setSelectedThreadId(preferred);
    const thread = preferred ? await getThread(preferred) : null;
    setSelectedThread(thread);
    applyDraft(thread);
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const profile = await getProfile(profileId);
        if (!active) return;
        setCompanyName(profile.company_name);
        await refreshThreads();
      } catch {
        if (active) setError("Failed to load review inbox. Is the API server running?");
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  async function loadThread(threadId: string) {
    setSelectedThreadId(threadId);
    const thread = await getThread(threadId);
    setSelectedThread(thread);
    applyDraft(thread);
  }

  async function simulate() {
    if (!replyText.trim() || !contactEmail.trim()) return;
    setBusy(true);
    setNote("");
    try {
      const result = await simulateInbound({
        profile_id: profileId,
        contact_email: contactEmail.trim(),
        subject: replySubject.trim(),
        body: replyText.trim(),
        grade: replyGrade,
      });
      setNote(
        result.decision.auto_send
          ? "Reply auto-sent under guardrails."
          : `Held for review: ${result.decision.reason}`,
      );
      setSelectedThread(result.thread);
      applyDraft(result.thread);
      await refreshThreads(result.thread.thread_id);
    } catch {
      setNote("Failed to simulate inbound reply.");
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    if (!selectedThread) return;
    setBusy(true);
    try {
      const updated = await patchThread(selectedThread.thread_id, {
        action: "edit",
        subject: draftSubject,
        body: draftBody,
        cta: draftCta,
      });
      setSelectedThread(updated);
      await refreshThreads(updated.thread_id);
      setNote("Draft saved.");
    } finally {
      setBusy(false);
    }
  }

  async function sendDraft() {
    if (!selectedThread) return;
    setBusy(true);
    try {
      const updated = await patchThread(selectedThread.thread_id, {
        action: "send",
        subject: draftSubject,
        body: draftBody,
        cta: draftCta,
      });
      setSelectedThread(updated);
      await refreshThreads(updated.thread_id);
      setNote("Draft sent.");
    } finally {
      setBusy(false);
    }
  }

  async function discardDraft() {
    if (!selectedThread) return;
    setBusy(true);
    try {
      const updated = await patchThread(selectedThread.thread_id, { action: "discard" });
      setSelectedThread(updated);
      await refreshThreads();
      setNote("Draft discarded.");
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
          eyebrow="Phase 2c · Reply inbox"
          title={companyName || "Review inbox"}
          subtitle="Simulate an inbound reply, inspect the drafted response, and approve, edit, send, or discard it with the same guardrails as the automated path."
        />
        <Link href={`/briefs/${profileId}`}>
          <Button variant="outline">Open briefs</Button>
        </Link>
      </div>

      {note && (
        <div className="mb-4 flex items-center gap-2 rounded-[12px] border border-line bg-surface-2/70 px-3 py-2 text-[13px] text-ink-dim">
          <AlertCircle size={14} className="text-accent" />
          {note}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <aside className="space-y-5">
          <div className="panel p-5">
            <Eyebrow>Simulate inbound</Eyebrow>
            <label className="mt-3 block text-[11px] uppercase tracking-[0.16em] text-ink-faint">
              Contact email
              <input
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="mt-1.5 w-full rounded-[12px] border border-line bg-surface-2/80 px-3 py-2.5 text-[13px] text-ink outline-none focus:border-accent/50"
              />
            </label>
            <label className="mt-3 block text-[11px] uppercase tracking-[0.16em] text-ink-faint">
              Subject
              <input
                value={replySubject}
                onChange={(e) => setReplySubject(e.target.value)}
                className="mt-1.5 w-full rounded-[12px] border border-line bg-surface-2/80 px-3 py-2.5 text-[13px] text-ink outline-none focus:border-accent/50"
              />
            </label>
            <label className="mt-3 block text-[11px] uppercase tracking-[0.16em] text-ink-faint">
              Reply text
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={5}
                className="mt-1.5 w-full rounded-[12px] border border-line bg-surface-2/80 px-3 py-2.5 text-[13px] leading-[1.75] text-ink outline-none focus:border-accent/50"
              />
            </label>
            <label className="mt-3 block text-[11px] uppercase tracking-[0.16em] text-ink-faint">
              Grade
              <select
                value={replyGrade}
                onChange={(e) => setReplyGrade(e.target.value)}
                className="mt-1.5 w-full rounded-[12px] border border-line bg-surface-2/80 px-3 py-2.5 text-[13px] text-ink outline-none focus:border-accent/50"
              >
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
              </select>
            </label>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button variant="solid" onClick={simulate} disabled={busy}>
                <MessageSquareReply size={14} />
                {busy ? "Working…" : "Simulate reply"}
              </Button>
              <Button variant="ghost" onClick={() => setReplyText(SAMPLES[0]?.text ?? replyText)} disabled={busy}>
                Sample text
              </Button>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {SAMPLES.slice(0, 4).map((sample) => (
                <button
                  key={sample.id}
                  onClick={() => setReplyText(sample.text)}
                className="rounded-md border border-line bg-surface-2/80 px-2 py-1 font-mono text-[10px] text-ink-dim transition-colors hover:bg-white/5 hover:text-ink"
              >
                {sample.label}
              </button>
              ))}
            </div>
          </div>

          <div className="panel p-5">
            <div className="mb-3 flex items-center justify-between">
              <Eyebrow>Threads</Eyebrow>
              <button
                onClick={() => refreshThreads()}
                className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 font-mono text-[10px] text-ink-dim hover:bg-white/5 hover:text-ink"
              >
                <RefreshCw size={11} /> refresh
              </button>
            </div>
            <div className="space-y-2">
              {threads.length === 0 ? (
                <div className="rounded-[14px] border border-dashed border-line px-3 py-5 text-[14px] text-ink-dim">
                  No reply threads yet. Simulate a reply to create one.
                </div>
              ) : (
                threads.map((thread) => (
                  <button
                    key={thread.thread_id}
                    onClick={() => loadThread(thread.thread_id)}
                    className={cn(
                      "w-full rounded-[14px] border border-line bg-surface-2/60 px-3 py-3 text-left transition-colors hover:border-line-strong",
                      selectedThreadId === thread.thread_id && "border-accent/40 bg-accent/[0.06]",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate font-display text-[15px] font-semibold text-ink">
                        {thread.contact_email}
                      </div>
                      <span className={cn("rounded-md border px-2 py-0.5 font-mono text-[10px]", statusTone(thread.status))}>
                        {thread.status}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-2 font-mono text-[10px] text-ink-faint">
                      <span>{thread.message_count} messages</span>
                      <span>{formatTime(thread.latest_message_at)}</span>
                    </div>
                    {thread.draft && (
                      <div className="mt-1.5 truncate text-[12.5px] text-ink-dim">
                        {thread.draft.subject} · {thread.draft.routed.intent}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>

        <section className="panel min-h-[720px] p-6">
          {!selectedThread ? (
            <div className="grid h-full place-items-center text-center">
              <div>
                <Mail size={18} className="mx-auto text-ink-faint" />
                <p className="mt-3 max-w-sm text-[14px] leading-[1.75] text-ink-dim">
                  Select a thread to review the draft, edit the response, and send it through the guarded reply path.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Eyebrow>Thread</Eyebrow>
                  <h2 className="mt-1 font-display text-[28px] font-semibold text-ink">{selectedThread.contact_email}</h2>
                  <p className="mt-1 font-mono text-[11px] text-ink-faint">
                    {selectedThread.thread_id} · {selectedThread.message_count} messages · last update {formatTime(selectedThread.latest_message_at)}
                  </p>
                </div>
                {selectedThread.draft && (
                  <span className={cn("rounded-md border px-2 py-0.5 font-mono text-[10px]", statusTone(selectedThread.status))}>
                    {selectedThread.status}
                  </span>
                )}
              </div>

              {selectedThread.draft ? (
                <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
                  <div className="space-y-4">
                    <label className="block">
                      <span className="eyebrow">Subject</span>
                      <input
                        value={draftSubject}
                        onChange={(e) => setDraftSubject(e.target.value)}
                        className="mt-1.5 w-full rounded-[12px] border border-line bg-surface-2/80 px-3 py-2.5 text-[13px] text-ink outline-none focus:border-accent/50"
                      />
                    </label>
                    <label className="block">
                      <span className="eyebrow">Reply body</span>
                      <textarea
                        value={draftBody}
                        onChange={(e) => setDraftBody(e.target.value)}
                        rows={10}
                        className="mt-1.5 w-full rounded-[12px] border border-line bg-surface-2/80 px-3 py-2.5 text-[13.5px] leading-[1.75] text-ink outline-none focus:border-accent/50"
                      />
                    </label>
                    <label className="block">
                      <span className="eyebrow">CTA</span>
                      <input
                        value={draftCta}
                        onChange={(e) => setDraftCta(e.target.value)}
                        className="mt-1.5 w-full rounded-[12px] border border-line bg-surface-2/80 px-3 py-2.5 text-[13px] text-ink outline-none focus:border-accent/50"
                      />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="solid" onClick={sendDraft} disabled={busy}>
                        <Send size={14} />
                        Send
                      </Button>
                      <Button variant="outline" onClick={saveDraft} disabled={busy}>
                        Save draft
                      </Button>
                      <Button variant="ghost" onClick={discardDraft} disabled={busy}>
                        <Trash2 size={14} />
                        Discard
                      </Button>
                    </div>
                    {selectedThread.draft.validation && (
                      <div className="rounded-[14px] border border-line bg-surface-2/70 p-4">
                        <div className="font-mono text-[11px] text-ink-faint">
                          Validation · {selectedThread.draft.validation.passed ? "passed" : "needs review"}
                        </div>
                        <p className="mt-1.5 text-[13px] leading-[1.75] text-ink-dim">
                          {selectedThread.draft.validation.warnings.join(" ")}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-[14px] border border-line bg-surface-2/70 p-4">
                      <div className="font-mono text-[11px] text-ink-faint">Intent</div>
                      <div className="mt-1 text-[14px] font-semibold text-ink">{selectedThread.draft.routed.intent}</div>
                      <div className="mt-1 font-mono text-[11px] text-ink-faint">
                        {Math.round(selectedThread.draft.routed.confidence * 100)}% confidence
                      </div>
                    </div>
                    <div className="rounded-[14px] border border-line bg-surface-2/70 p-4">
                      <div className="font-mono text-[11px] text-ink-faint">Recommended action</div>
                      <p className="mt-1.5 text-[13.5px] leading-[1.75] text-ink">{selectedThread.draft.routed.recommendedAction}</p>
                    </div>
                    <div className="rounded-[14px] border border-line bg-surface-2/70 p-4">
                      <div className="font-mono text-[11px] text-ink-faint">Messages</div>
                      <div className="mt-2 space-y-2">
                        {(selectedThread.messages || []).map((message) => (
                          <div key={message.id} className="rounded-[12px] border border-line bg-base p-3">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-[10px] text-ink-faint">{message.direction}</span>
                              <span className="font-mono text-[10px] text-ink-faint">{formatTime(message.created_at)}</span>
                            </div>
                            <div className="mt-1.5 text-[13px] font-semibold text-ink">{message.subject || "(no subject)"}</div>
                            <p className="mt-1.5 whitespace-pre-line text-[12.5px] leading-[1.75] text-ink-dim">{message.body}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-[14px] border border-dashed border-line px-4 py-10 text-center text-[14px] text-ink-dim">
                  No draft yet for this thread.
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </IcpShell>
  );
}
