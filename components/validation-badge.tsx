import { Check, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EmailValidation } from "@/lib/types";

function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]",
        ok
          ? "border-accent/35 bg-accent/10 text-accent"
          : "border-amber/40 bg-amber/10 text-amber",
      )}
    >
      {ok ? <Check size={10} /> : <TriangleAlert size={10} />}
      {label}
    </span>
  );
}

export function ValidationBadges({ validation }: { validation: EmailValidation }) {
  const v = validation;
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge ok={v.subjectLowercase} label="lowercase" />
      <Badge ok={v.subjectWordCountOk} label="2–4 words" />
      <Badge ok={v.bodyUnder100Words} label="<100 words" />
      <Badge ok={v.referencesLeak} label="leak-backed" />
      <Badge ok={v.hasLowFrictionCta} label="low-friction" />
      <Badge ok={v.noInventedClaims} label="no hype" />
    </div>
  );
}
