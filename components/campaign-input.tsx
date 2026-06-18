"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { SEGMENT_LABELS } from "@/lib/constants";
import { Button, Eyebrow } from "@/components/ui";
import type { FittingGoal, FittingStrategyInput, Segment, SegmentFocus } from "@/lib/types";

const DEFAULT_DESCRIPTION =
  "Paste a product description or website summary. The campaign builder will infer target audiences, ICP filters, buying signals, sequence copy, reply routing, and learning insights.";

const GOALS: { value: FittingGoal; label: string }[] = [
  { value: "land_recurring_retainers", label: "Build recurring workflow" },
  { value: "fast_growth_plans", label: "Fast test campaign" },
  { value: "book_fittings", label: "Diagnose workflow demand" },
  { value: "expand_partners", label: "Expand agencies / white-label" },
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
  "w-full rounded-[12px] border border-line bg-surface-2/80 px-3 py-2.5 text-[13px] text-ink outline-none focus:border-accent/50";

export function CampaignInput({
  loading,
  defaultDescription,
  onSubmit,
}: {
  loading: boolean;
  defaultDescription?: string;
  onSubmit: (input: FittingStrategyInput) => void;
}) {
  const [editedDescription, setEditedDescription] = useState<string | null>(null);
  const [segmentFocus, setSegmentFocus] = useState<SegmentFocus>("auto");
  const [fittingGoal, setFittingGoal] = useState<FittingGoal>("book_fittings");

  const productDescription = editedDescription ?? defaultDescription ?? DEFAULT_DESCRIPTION;

  return (
    <div className="panel p-6">
      <Eyebrow>Product input</Eyebrow>
      <textarea
        value={productDescription}
        onChange={(e) => setEditedDescription(e.target.value)}
        rows={4}
        placeholder="Describe the product, website, or service you want to build an outbound campaign for..."
        className="mt-3 w-full resize-none rounded-[12px] border border-line bg-surface-2/80 px-3 py-3 text-[14px] leading-[1.75] text-ink outline-none placeholder:text-ink-faint focus:border-accent/50"
      />

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="eyebrow">Segment focus</span>
          <select
            value={segmentFocus}
            onChange={(e) => setSegmentFocus(e.target.value as SegmentFocus)}
            className={`mt-1.5 ${selectCls}`}
          >
            <option value="auto">Auto (let the strategist choose)</option>
            {SEGMENTS.map((s) => (
              <option key={s} value={s}>
                {SEGMENT_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="eyebrow">Campaign goal</span>
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
        className="mt-5 w-full"
        disabled={loading}
        onClick={() => onSubmit({ productDescription, segmentFocus, fittingGoal })}
      >
        <Sparkles size={15} />
        {loading ? "Building campaign strategy..." : "Build campaign strategy"}
      </Button>
    </div>
  );
}
