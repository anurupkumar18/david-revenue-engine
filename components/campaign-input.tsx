"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { SEGMENT_LABELS } from "@/lib/constants";
import { Button, Eyebrow } from "@/components/ui";
import type { FittingGoal, FittingStrategyInput, Segment, SegmentFocus } from "@/lib/types";

const DEFAULT_DESCRIPTION =
  "David helps local businesses compete online through AI-powered marketing — content, lead follow-up, reviews, and conversion workflows — and builds custom AI agents and operating systems for teams with workflow leaks.";

const GOALS: { value: FittingGoal; label: string }[] = [
  { value: "land_recurring_retainers", label: "Land recurring retainers" },
  { value: "fast_growth_plans", label: "Fast Growth Plans" },
  { value: "book_fittings", label: "Book Fittings" },
  { value: "expand_partners", label: "Expand partners / white-label" },
];

const SEGMENTS: Segment[] = [
  "local_business",
  "service_business",
  "multi_location",
  "platform",
  "agency",
  "enterprise",
];

const selectCls =
  "w-full rounded-[10px] border border-line bg-surface-2 px-3 py-2 text-sm text-ink outline-none focus:border-accent/50";

export function CampaignInput({
  loading,
  onSubmit,
}: {
  loading: boolean;
  onSubmit: (input: FittingStrategyInput) => void;
}) {
  const [productDescription, setProductDescription] = useState(DEFAULT_DESCRIPTION);
  const [segmentFocus, setSegmentFocus] = useState<SegmentFocus>("auto");
  const [fittingGoal, setFittingGoal] = useState<FittingGoal>("land_recurring_retainers");

  return (
    <div className="panel p-5">
      <Eyebrow>Product input</Eyebrow>
      <textarea
        value={productDescription}
        onChange={(e) => setProductDescription(e.target.value)}
        rows={4}
        placeholder="Describe the product or business David is selling…"
        className="mt-2.5 w-full resize-none rounded-[10px] border border-line bg-surface-2 px-3 py-2.5 text-[13.5px] leading-relaxed text-ink outline-none placeholder:text-ink-faint focus:border-accent/50"
      />

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="eyebrow">Segment focus</span>
          <select
            value={segmentFocus}
            onChange={(e) => setSegmentFocus(e.target.value as SegmentFocus)}
            className={`mt-1.5 ${selectCls}`}
          >
            <option value="auto">Auto (let David choose)</option>
            {SEGMENTS.map((s) => (
              <option key={s} value={s}>
                {SEGMENT_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="eyebrow">Fitting goal</span>
          <select
            value={fittingGoal}
            onChange={(e) => setFittingGoal(e.target.value as FittingGoal)}
            className={`mt-1.5 ${selectCls}`}
          >
            {GOALS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Button
        variant="solid"
        className="mt-4 w-full"
        disabled={loading}
        onClick={() => onSubmit({ productDescription, segmentFocus, fittingGoal })}
      >
        <Sparkles size={15} />
        {loading ? "Building Fitting Strategy…" : "Build Fitting Strategy"}
      </Button>
    </div>
  );
}
