"use client";

import { INDUSTRY_PRESETS } from "@/lib/types/icp";
import { Button } from "@/components/ui";

export function TagInput({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const addTag = (tag: string) => {
    const t = tag.trim();
    if (t && !tags.includes(t)) onChange([...tags, t]);
  };

  const removeTag = (tag: string) => onChange(tags.filter((t) => t !== tag));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag((e.target as HTMLInputElement).value);
      (e.target as HTMLInputElement).value = "";
    }
  };

  return (
    <div>
      <div className="flex min-h-[44px] flex-wrap items-center gap-2 rounded-[10px] border border-line bg-surface-2 px-3 py-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-md border border-line bg-surface-3 px-2 py-0.5 font-mono text-[11px] text-ink-dim"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="text-ink-faint hover:text-ink"
              aria-label={`Remove ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          placeholder="Type and press Enter…"
          onKeyDown={handleKeyDown}
          className="min-w-[120px] flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {INDUSTRY_PRESETS.filter((p) => !tags.includes(p))
          .slice(0, 8)
          .map((preset) => (
            <Button key={preset} size="sm" variant="outline" onClick={() => addTag(preset)}>
              + {preset}
            </Button>
          ))}
      </div>
    </div>
  );
}
