"use client";

import { RotateCcw } from "lucide-react";
import { DEMO_SCENARIOS, useEngine } from "@/lib/store";
import { Button } from "@/components/ui";

export function DemoConsole() {
  const loaded = useEngine((s) => s.loadedScenario);
  const loadScenario = useEngine((s) => s.loadScenario);
  const reset = useEngine((s) => s.reset);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="eyebrow mr-1">Load campaign set</span>
      {DEMO_SCENARIOS.map((s) => (
        <Button
          key={s.key}
          size="sm"
          variant="outline"
          active={loaded === s.key}
          onClick={() => loadScenario(s.key)}
          title={s.blurb}
        >
          {s.label}
        </Button>
      ))}
      <Button size="sm" variant="ghost" onClick={reset} title="Clear the board">
        <RotateCcw size={14} />
        Reset
      </Button>
    </div>
  );
}
