"use client";

import { create } from "zustand";
import type { CampaignEvent, CampaignIntelligence } from "@/lib/campaign";
import { DEFAULT_CAMPAIGN_EVENTS, recomputeCampaign } from "@/lib/campaign";
import type { RevenuePersistedState } from "@/lib/icp-bridge";
import { getSeedAccounts } from "@/lib/seed";
import type {
  FittingStrategy,
  OutreachSequence,
  PipelineStage,
  RevenueAccount,
  RoutedReply,
} from "@/lib/types";

export type DemoScenarioKey = "all" | "local" | "applied_ai" | "partner" | "icp";

export const DEMO_SCENARIOS: {
  key: DemoScenarioKey;
  label: string;
  blurb: string;
  bucket: RevenueAccount["bucket"] | null;
}[] = [
  { key: "all", label: "Full book", blurb: "All 15 prospects", bucket: null },
  { key: "local", label: "Local business", blurb: "Local demand capture", bucket: "local_business" },
  { key: "applied_ai", label: "Applied AI", blurb: "Diagnostics, automation, and AI workflows", bucket: "applied_ai" },
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
  profileId: number | null;
  businessName: string;
  productDescription: string;
  accounts: RevenueAccount[];
  loadedScenario: DemoScenarioKey | null;
  selectedAccountId: string | null;
  drawerOpen: boolean;
  strategy: FittingStrategy | null;
  campaign: CampaignIntelligence | null;
  campaignEvents: CampaignEvent[];
  agencyName: string;
  strategyLoading: boolean;
  outreachByAccount: Record<string, OutreachSequence>;
  lastRouted: LastRouted | null;

  initBusinessProfile: (
    profileId: number,
    businessName: string,
    state: RevenuePersistedState,
    productDescription?: string,
  ) => void;
  loadScenario: (key: DemoScenarioKey) => void;
  reset: () => void;
  selectAccount: (id: string | null) => void;
  closeDrawer: () => void;
  setStage: (accountId: string, stage: PipelineStage) => void;
  setStrategy: (s: FittingStrategy | null) => void;
  setCampaign: (c: CampaignIntelligence | null) => void;
  logCampaignEvent: (e: CampaignEvent) => void;
  loadDemoHistory: () => void;
  setAgencyName: (name: string) => void;
  setStrategyLoading: (b: boolean) => void;
  setOutreach: (accountId: string, seq: OutreachSequence) => void;
  setLastRouted: (r: LastRouted | null) => void;
  applyRoutedStage: () => void;
  getPersistedState: () => RevenuePersistedState;
};

export const useEngine = create<EngineState>((set, get) => ({
  profileId: null,
  businessName: "",
  productDescription: "",
  accounts: accountsFor("all"),
  loadedScenario: "all",
  selectedAccountId: null,
  drawerOpen: false,
  strategy: null,
  campaign: null,
  campaignEvents: [],
  agencyName: "",
  strategyLoading: false,
  outreachByAccount: {},
  lastRouted: null,

  initBusinessProfile: (profileId, businessName, state, productDescription = "") => {
    // Events are the source of truth for the self-improving loop. Use any persisted
    // events; otherwise start clean with a single campaign_created event (legacy/new
    // profiles) and recompute the campaign so the tracker reflects real actions only.
    const campaign = state.campaign || null;
    const events =
      state.campaignEvents && state.campaignEvents.length
        ? state.campaignEvents
        : ([{ type: "campaign_created" }] as CampaignEvent[]);
    set({
      profileId,
      businessName,
      productDescription,
      accounts: state.accounts.map((a) => structuredClone(a as RevenueAccount)),
      loadedScenario: (state.loadedScenario as DemoScenarioKey) || "icp",
      selectedAccountId: null,
      drawerOpen: false,
      strategy: (state.strategy as FittingStrategy) || null,
      campaign: campaign ? recomputeCampaign(campaign, events) : null,
      campaignEvents: events,
      agencyName: state.agencyName || "",
      strategyLoading: false,
      outreachByAccount: (state.outreachByAccount as Record<string, OutreachSequence>) || {},
      lastRouted: (state.lastRouted as LastRouted) || null,
    });
  },

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
      profileId: null,
      businessName: "",
      productDescription: "",
      accounts: [],
      loadedScenario: null,
      selectedAccountId: null,
      drawerOpen: false,
      strategy: null,
      campaign: null,
      campaignEvents: [],
      agencyName: "",
      outreachByAccount: {},
      lastRouted: null,
    }),

  selectAccount: (id) => set({ selectedAccountId: id, drawerOpen: id != null }),
  closeDrawer: () => set({ drawerOpen: false }),

  setStage: (accountId, stage) =>
    set((s) => ({
      accounts: s.accounts.map((a) => (a.id === accountId ? { ...a, stage } : a)),
    })),

  setStrategy: (s) => set({ strategy: s }),
  setCampaign: (c) => set({ campaign: c }),

  // Append a real campaign event and recompute the metrics-driven parts of the campaign.
  // This is the heart of the self-improving loop: copying filters, approving copy, or
  // routing a reply moves the tracker, winning signal, and next-campaign recommendation.
  logCampaignEvent: (e) =>
    set((s) => {
      if (!s.campaign) return {};
      const campaignEvents = [...s.campaignEvents, e];
      return { campaignEvents, campaign: recomputeCampaign(s.campaign, campaignEvents) };
    }),

  // Pitch helper: replay a representative event history so the tracker fills instantly.
  loadDemoHistory: () =>
    set((s) => {
      if (!s.campaign) return {};
      const campaignEvents = [...DEFAULT_CAMPAIGN_EVENTS];
      return { campaignEvents, campaign: recomputeCampaign(s.campaign, campaignEvents) };
    }),

  setAgencyName: (name) => set({ agencyName: name }),

  setStrategyLoading: (b) => set({ strategyLoading: b }),

  setOutreach: (accountId, seq) =>
    set((s) => ({ outreachByAccount: { ...s.outreachByAccount, [accountId]: seq } })),

  setLastRouted: (r) => set({ lastRouted: r }),

  applyRoutedStage: () => {
    const { lastRouted } = get();
    if (!lastRouted) return;
    get().setStage(lastRouted.accountId, lastRouted.routed.updatePipelineStage);
    set({ lastRouted: { ...lastRouted, applied: true } });
  },

  getPersistedState: () => {
    const s = get();
    return {
      accounts: s.accounts,
      loadedScenario: s.loadedScenario,
      strategy: s.strategy,
      campaign: s.campaign,
      campaignEvents: s.campaignEvents,
      agencyName: s.agencyName,
      outreachByAccount: s.outreachByAccount,
      lastRouted: s.lastRouted,
    };
  },
}));

const mid = (r: [number, number]) => (r[0] + r[1]) / 2;

export function pipelineRecurringMonthly(accounts: RevenueAccount[]): number {
  return accounts
    .filter((a) => a.stage !== "closed_lost" && a.stage !== "suppressed")
    .reduce((sum, a) => sum + mid(a.revenueModel.estimatedRecurringMonthlyUsd), 0);
}

export function selectedAccount(state: EngineState): RevenueAccount | null {
  return state.accounts.find((a) => a.id === state.selectedAccountId) ?? null;
}
