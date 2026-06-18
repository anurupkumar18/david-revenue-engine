import { cn } from "@/lib/utils";
import { GRADE_CLASSES } from "@/lib/theme";
import { Eyebrow, GradePill, ScoreMeter } from "@/components/ui";
import type { Grade } from "@/lib/types";

export type ScoreRow = { label: string; value: number; weight: number };

export function ScoreCard({
  eyebrow,
  subtitle,
  total,
  grade,
  rows,
  accentBar,
}: {
  eyebrow: string;
  subtitle: string;
  total: number;
  grade: Grade;
  rows: ScoreRow[];
  accentBar: string;
}) {
  const c = GRADE_CLASSES[grade];
  return (
    <div className="panel-2 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Eyebrow>{eyebrow}</Eyebrow>
          <p className="mt-1.5 max-w-[16rem] text-[11.5px] leading-[1.7] text-ink-faint">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("font-mono text-[30px] font-semibold leading-none tabular-nums", c.text)}>
            {total}
          </span>
          <GradePill grade={grade} />
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-3">
            <span className="w-28 shrink-0 font-mono text-[11px] text-ink-dim">{r.label}</span>
            <ScoreMeter value={r.value} barClass={accentBar} className="flex-1" />
            <span className="w-7 shrink-0 text-right font-mono text-[11px] tabular-nums text-ink">
              {r.value}
            </span>
            <span className="w-9 shrink-0 text-right font-mono text-[10px] text-ink-faint">
              {r.weight}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
