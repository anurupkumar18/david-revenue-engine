// Literal Tailwind class maps for status colors. Kept as full strings so the
// Tailwind JIT can see every class (no runtime-constructed class names).

import type { DavidOfferPath, Grade, PipelineStage, RecurringRevenuePotential } from "./types";

export const GRADE_CLASSES: Record<Grade, { pill: string; text: string; bar: string }> = {
  A: { pill: "text-accent bg-accent/12 border-accent/40", text: "text-accent", bar: "bg-accent" },
  B: { pill: "text-lime bg-lime/12 border-lime/40", text: "text-lime", bar: "bg-lime" },
  C: { pill: "text-amber bg-amber/12 border-amber/40", text: "text-amber", bar: "bg-amber" },
  D: { pill: "text-danger bg-danger/12 border-danger/40", text: "text-danger", bar: "bg-danger" },
};

export const RECURRING_CLASSES: Record<RecurringRevenuePotential, { text: string; dot: string }> = {
  low: { text: "text-ink-dim", dot: "bg-ink-faint" },
  medium: { text: "text-lime", dot: "bg-lime" },
  high: { text: "text-accent", dot: "bg-accent" },
  very_high: { text: "text-cyan", dot: "bg-cyan" },
};

export const RECURRING_DOTS: Record<RecurringRevenuePotential, number> = {
  low: 1,
  medium: 2,
  high: 3,
  very_high: 4,
};

export const STAGE_CLASSES: Record<PipelineStage, string> = {
  new: "text-ink-dim border-line",
  researched: "text-ink-dim border-line",
  sequenced: "text-lime border-lime/35",
  replied: "text-lime border-lime/35",
  meeting_ready: "text-accent border-accent/40",
  info_sent: "text-cyan border-cyan/40",
  objection: "text-amber border-amber/40",
  nurture: "text-ink-dim border-line",
  closed_won: "text-accent border-accent/40",
  closed_lost: "text-ink-faint border-line",
  suppressed: "text-danger border-danger/40",
};

// Chip styling per offer path, tiered by revenue type.
const ACCENT = "text-accent border-accent/35 bg-accent/10";
const CYAN = "text-cyan border-cyan/35 bg-cyan/10";
const LIME = "text-lime border-lime/35 bg-lime/10";

export const OFFER_PATH_CLASSES: Record<DavidOfferPath, string> = {
  david_marketing: ACCENT,
  growth_plan: LIME,
  the_fitting: LIME,
  custom_agent: LIME,
  custom_ai_os: CYAN,
  embedded_ai_team: CYAN,
  white_label_deployment: CYAN,
  partner_program: CYAN,
};
