"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Mail, Sparkles } from "lucide-react";
import { useEngine } from "@/lib/store";
import { cn } from "@/lib/utils";
import { OfferPathChip, SourceBadge } from "@/components/chips";
import { ValidationBadges } from "@/components/validation-badge";
import { Button, Eyebrow } from "@/components/ui";
import type { EmailStep, OutreachTone } from "@/lib/types";

const TONES: OutreachTone[] = ["casual", "direct", "founder_led"];
const TONE_LABEL: Record<OutreachTone, string> = {
  casual: "casual",
  direct: "direct",
  founder_led: "founder-led",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 font-mono text-[10px] text-ink-dim transition-colors hover:bg-surface-2 hover:text-ink"
    >
      {copied ? <Check size={11} className="text-accent" /> : <Copy size={11} />}
      {copied ? "copied" : "copy"}
    </button>
  );
}

function StepCard({ step }: { step: EmailStep }) {
  return (
    <div className="panel-2 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] text-ink-faint">
          Step {step.stepNumber} · {step.wordCount} words
        </span>
        <CopyButton text={`subject: ${step.subject}\n\n${step.body}`} />
      </div>
      <div className="font-mono text-[12px] text-ink-dim">
        subject: <span className="text-ink">{step.subject}</span>
      </div>
      <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-ink">{step.body}</p>
      <div className="mt-3 border-t border-line pt-2.5">
        <ValidationBadges validation={step.validation} />
      </div>
    </div>
  );
}

export function ConversionOutreachPanel() {
  const accounts = useEngine((s) => s.accounts);
  const selectedId = useEngine((s) => s.selectedAccountId);
  const outreachByAccount = useEngine((s) => s.outreachByAccount);
  const setOutreach = useEngine((s) => s.setOutreach);

  const [accountId, setAccountId] = useState<string>("");
  const [tone, setTone] = useState<OutreachTone>("casual");
  const [loading, setLoading] = useState(false);

  // Focus the account chosen from the drawer / table when it changes.
  useEffect(() => {
    if (selectedId) setAccountId(selectedId);
  }, [selectedId]);
  useEffect(() => {
    if (!accountId && accounts.length) setAccountId(accounts[0].id);
  }, [accounts, accountId]);

  const account = accounts.find((a) => a.id === accountId);
  const sequence = accountId ? outreachByAccount[accountId] : undefined;

  async function generate() {
    if (!accountId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/outreach/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accountId, tone }),
      });
      setOutreach(accountId, await res.json());
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel p-5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex-1">
          <span className="eyebrow">Account</span>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="mt-1.5 w-full rounded-[10px] border border-line bg-surface-2 px-3 py-2 text-sm text-ink outline-none focus:border-accent/50"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>

        <div>
          <span className="eyebrow">Tone</span>
          <div className="mt-1.5 flex gap-1">
            {TONES.map((t) => (
              <button
                key={t}
                onClick={() => setTone(t)}
                className={cn(
                  "rounded-md border px-2.5 py-2 font-mono text-[11px] transition-colors",
                  tone === t
                    ? "border-accent/50 bg-accent/10 text-accent"
                    : "border-line text-ink-dim hover:bg-surface-2",
                )}
              >
                {TONE_LABEL[t]}
              </button>
            ))}
          </div>
        </div>

        <Button variant="solid" disabled={loading || !accountId} onClick={generate}>
          <Sparkles size={15} />
          {loading ? "Writing…" : "Generate outreach"}
        </Button>
      </div>

      {account && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-ink-dim">
          <Mail size={13} className="text-ink-faint" />
          Pitching
          <OfferPathChip path={account.recommendedDavidOfferPath} />
          on leak <span className="text-amber/90">{account.primaryLeak.replace(/_/g, " ")}</span>
        </div>
      )}

      {sequence ? (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <Eyebrow>Two-step sequence</Eyebrow>
            <SourceBadge source={sequence.source} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {sequence.steps.map((s) => (
              <StepCard key={s.stepNumber} step={s} />
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4 grid place-items-center rounded-[12px] border border-dashed border-line py-10 text-center">
          <p className="text-sm text-ink-dim">
            No sequence yet. Pick an account and generate signal-based outreach.
          </p>
        </div>
      )}
    </div>
  );
}
