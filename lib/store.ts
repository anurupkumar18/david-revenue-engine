"use client";

// Client-side demo state. Seeded entirely from the deterministic engine (lib/seed),
// so the whole app works with no network and no API keys.

import { create } from "zustand";
import { getSeedAccounts } from "./seed";
import type {
  FittingStrategy,
  OutreachSequence,
  PipelineStage,
  RevenueAccount,
  RoutedReply,
} from "./types";

export type DemoScenarioKey = "all" | "local" | "applied_ai" | "partner";

export const DEMO_SCENARIOS: {
  key: DemoScenarioKey;
  label: string;
  blurb: string;
  bucket: RevenueAccount["bucket"] | null;
}[] = [
  { key: "all", label: "Full book", blurb: "All 15 prospects", bucket: null },
  { key: "local", label: "Local business", blurb: "David Marketing & Growth", bucket: "local_business" },
  { key: "applied_ai", label: "Applied AI", blurb: "Fittings, Agents & AI OS", bucket: "applied_ai" },
  { key: "partner", label: "Partner / white-label", blurb: "Channel & platform revenue", bucket: "partner" },
];

function accountsFor(key: DemoScenarioKey): RevenueAccount[] {
  const all = getSeedAccounts();
  const scenario = DEMO_SCENARIOS.find((s) => s.key === key);
  if (!scenario || scenario.bucket === null) return all;
  return all.filter((a) => a.bucket === scenario.bucket);
}

export type LastRouted = {
  accountId: string;
  replyText: string;
  routed: RoutedReply;
  applied: boolean;
};

type EngineState = {
  accounts: RevenueAccount[];
  loadedScenario: DemoScenarioKey | null;
  selectedAccountId: string | null;
  drawerOpen: boolean;

  strategy: FittingStrategy | null;
  strategyLoading: boolean;

  outreachByAccount: Record<string, OutreachSequence>;
  lastRouted: LastRouted | null;

  loadScenario: (key: DemoScenarioKey) => void;
  reset: () => void;
  selectAccount: (id: string | null) => void;
  closeDrawer: () => void;
  setStage: (accountId: string, stage: PipelineStage, note?: string) => void;

  setStrategy: (s: FittingStrategy | null) => void;
  setStrategyLoading: (b: boolean) => void;

  setOutreach: (accountId: string, seq: OutreachSequence) => void;
  setLastRouted: (r: LastRouted | null) => void;
  applyRoutedStage: () => void;
};

export const useEngine = create<EngineState>((set, get) => ({
  // Start populated so the demo is never blank.
  accounts: accountsFor("all"),
  loadedScenario: "all",
  selectedAccountId: null,
  drawerOpen: false,

  strategy: null,
  strategyLoading: false,

  outreachByAccount: {},
  lastRouted: null,

  loadScenario: (key) =>
    set({
      accounts: accountsFor(key),
      loadedScenario: key,
      selectedAccountId: null,
      drawerOpen: false,
      lastRouted: null,
    }),

  reset: () =>
    set({
      accounts: [],
      loadedScenario: null,
      selectedAccountId: null,
      drawerOpen: false,
      strategy: null,
      outreachByAccount: {},
      lastRouted: null,
    }),

  selectAccount: (id) => set({ selectedAccountId: id, drawerOpen: id != null }),
  closeDrawer: () => set({ drawerOpen: false }),

  setStage: (accountId, stage) =>
    set((state) => ({
      accounts: state.accounts.map((a) => (a.id === accountId ? { ...a, stage } : a)),
    })),

  setStrategy: (s) => set({ strategy: s }),
  setStrategyLoading: (b) => set({ strategyLoading: b }),

  setOutreach: (accountId, seq) =>
    set((state) => ({ outreachByAccount: { ...state.outreachByAccount, [accountId]: seq } })),

  setLastRouted: (r) => set({ lastRouted: r }),

  applyRoutedStage: () => {
    const { lastRouted } = get();
    if (!lastRouted) return;
    get().setStage(lastRouted.accountId, lastRouted.routed.updatePipelineStage);
    set({ lastRouted: { ...lastRouted, applied: true } });
  },
}));

// ---- derived selectors -----------------------------------------------------

const mid = (r: [number, number]) => (r[0] + r[1]) / 2;

/** Sum of expected recurring monthly revenue across live (non-lost/suppressed) accounts. */
export function pipelineRecurringMonthly(accounts: RevenueAccount[]): number {
  return accounts
    .filter((a) => a.stage !== "closed_lost" && a.stage !== "suppressed")
    .reduce((sum, a) => sum + mid(a.revenueModel.estimatedRecurringMonthlyUsd), 0);
}

export function selectedAccount(state: EngineState): RevenueAccount | null {
  return state.accounts.find((a) => a.id === state.selectedAccountId) ?? null;
}
