"use client";

import { useState } from "react";
import { ArrowRight, Ban, Check, Copy, Route as RouteIcon } from "lucide-react";
import seedReplies from "@/data/seed-replies.json";
import { useEngine } from "@/lib/store";
import { cn } from "@/lib/utils";
import { INTENT_LABELS, STAGE_LABELS } from "@/lib/constants";
import { STAGE_CLASSES } from "@/lib/theme";
import { SourceBadge, StageChip } from "@/components/chips";
import { Button, Eyebrow } from "@/components/ui";

const SAMPLES = seedReplies as { id: string; label: string; text: string }[];

export function FastConversionRouter() {
  const accounts = useEngine((s) => s.accounts);
  const selectedId = useEngine((s) => s.selectedAccountId);
  const lastRouted = useEngine((s) => s.lastRouted);
  const setLastRouted = useEngine((s) => s.setLastRouted);
  const applyRoutedStage = useEngine((s) => s.applyRoutedStage);
  const selectAccount = useEngine((s) => s.selectAccount);

  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const accountId = selectedId || accounts[0]?.id || "";

  async function route() {
    if (!replyText.trim() || !accountId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/replies/route", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accountId, replyText }),
      });
      const routed = await res.json();
      setLastRouted({ accountId, replyText, routed, applied: false });
    } finally {
      setLoading(false);
    }
  }

  const routed = lastRouted?.routed;
  const account = accounts.find((a) => a.id === (lastRouted?.accountId ?? accountId));

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* input */}
      <div className="panel p-5">
        <label className="block">
          <span className="eyebrow">Account</span>
          <select
            value={accountId}
            onChange={(e) => selectAccount(e.target.value)}
            className="mt-1.5 w-full rounded-[10px] border border-line bg-surface-2 px-3 py-2 text-sm text-ink outline-none focus:border-accent/50"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-3 block">
          <span className="eyebrow">Prospect reply</span>
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={4}
            placeholder="Paste a prospect reply…"
            className="mt-1.5 w-full resize-none rounded-[10px] border border-line bg-surface-2 px-3 py-2.5 text-[13.5px] leading-relaxed text-ink outline-none placeholder:text-ink-faint focus:border-accent/50"
          />
        </label>

        <div className="mt-2.5">
          <span className="eyebrow">Simulate a reply</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {SAMPLES.map((s) => (
              <button
                key={s.id}
                onClick={() => setReplyText(s.text)}
                className="rounded-md border border-line bg-surface-2 px-2 py-1 font-mono text-[10.5px] text-ink-dim transition-colors hover:bg-surface-3 hover:text-ink"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <Button
          variant="solid"
          className="mt-4 w-full"
          disabled={loading || !replyText.trim()}
          onClick={route}
        >
          <RouteIcon size={15} />
          {loading ? "Routing…" : "Route reply"}
        </Button>
      </div>

      {/* result */}
      <div className="panel p-5">
        {!routed ? (
          <div className="grid h-full min-h-[220px] place-items-center text-center">
            <p className="max-w-xs text-sm text-ink-dim">
              Route a reply to see the fastest compliant next action and the pipeline stage it
              moves the account into.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Eyebrow>Classified intent</Eyebrow>
                <p className="mt-1 font-display text-lg font-semibold text-ink">
                  {INTENT_LABELS[routed.intent]}
                </p>
                <p className="font-mono text-[11px] text-ink-faint">
                  {Math.round(routed.confidence * 100)}% confidence
                </p>
              </div>
              <SourceBadge source={routed.source} />
            </div>

            <div className="rounded-[12px] border border-line bg-surface-2 p-3.5">
              <Eyebrow className="mb-1">Recommended action</Eyebrow>
              <p className="text-[13px] text-ink">{routed.recommendedAction}</p>
            </div>

            {routed.shouldSuppress ? (
              <div className="flex items-start gap-2 rounded-[12px] border border-danger/30 bg-danger/[0.07] p-3.5">
                <Ban size={15} className="mt-0.5 shrink-0 text-danger" />
                <p className="text-[12.5px] text-ink">
                  Suppressed. No persuasive follow-up will be generated.
                </p>
              </div>
            ) : (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <Eyebrow>Response template</Eyebrow>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(routed.responseTemplate);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1200);
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 font-mono text-[10px] text-ink-dim hover:bg-surface-2 hover:text-ink"
                  >
                    {copied ? <Check size={11} className="text-accent" /> : <Copy size={11} />}
                    {copied ? "copied" : "copy"}
                  </button>
                </div>
                <p className="whitespace-pre-line rounded-[12px] border border-line bg-surface-2 p-3.5 text-[13px] leading-relaxed text-ink">
                  {routed.responseTemplate}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 border-t border-line pt-3.5">
              <div className="flex items-center gap-2">
                <span className="eyebrow">Move to</span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md border bg-surface-2/60 px-2 py-0.5 font-mono text-[11px]",
                    STAGE_CLASSES[routed.updatePipelineStage],
                  )}
                >
                  {STAGE_LABELS[routed.updatePipelineStage]}
                </span>
              </div>
              {lastRouted?.applied ? (
                <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-accent">
                  <Check size={13} /> stage applied
                  {account && <StageChip stage={account.stage} />}
                </span>
              ) : (
                <Button variant="outline" size="sm" onClick={applyRoutedStage}>
                  Apply stage
                  <ArrowRight size={14} />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
