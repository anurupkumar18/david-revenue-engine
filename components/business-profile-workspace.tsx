"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { getProfile, getRevenueState, saveRevenueState } from "@/lib/icp-api";
import { buildCampaignIntelligence, campaignInputFromICPFields, DEFAULT_CAMPAIGN_EVENTS } from "@/lib/campaign";
import {
  buildAccountsForProfile,
  emptyRevenueState,
  icpFieldsToStrategyInput,
} from "@/lib/icp-bridge";
import { buildFittingStrategy } from "@/lib/strategy";
import { useEngine } from "@/lib/store";
import { Workspace } from "@/components/workspace";

export function BusinessProfileWorkspace({ profileId }: { profileId: number }) {
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const initBusinessProfile = useEngine((s) => s.initBusinessProfile);
  const getPersistedState = useEngine((s) => s.getPersistedState);
  const engineProfileId = useEngine((s) => s.profileId);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const p = await getProfile(profileId);
        if (p.status !== "accepted") {
          setError("This campaign profile has not been accepted yet. Complete the campaign builder first.");
          setLoading(false);
          return;
        }
        setCompanyName(p.company_name);

        let revenueState = await getRevenueState(profileId);
        const strategyInput = icpFieldsToStrategyInput(p.fields);

        if (!revenueState.accounts?.length) {
          const accounts = buildAccountsForProfile(p.fields, p.contacts || []);
          const strategy = { ...buildFittingStrategy(strategyInput), source: "deterministic" as const };
          const campaign = buildCampaignIntelligence({
            input: campaignInputFromICPFields(p.fields),
            fields: p.fields,
            accounts,
            strategy,
            events: DEFAULT_CAMPAIGN_EVENTS,
          });
          revenueState = { ...emptyRevenueState(accounts), strategy, campaign };
          await saveRevenueState(profileId, revenueState);
        } else if (!revenueState.campaign) {
          const strategy = (revenueState.strategy || {
            ...buildFittingStrategy(strategyInput),
            source: "deterministic" as const,
          }) as ReturnType<typeof buildFittingStrategy> & { source: "deterministic" };
          revenueState = {
            ...revenueState,
            campaign: buildCampaignIntelligence({
              input: campaignInputFromICPFields(p.fields),
              fields: p.fields,
              accounts: revenueState.accounts,
              strategy,
              events: DEFAULT_CAMPAIGN_EVENTS,
            }),
          };
          await saveRevenueState(profileId, revenueState);
        }

        initBusinessProfile(profileId, p.company_name, revenueState, strategyInput.productDescription);
      } catch {
        setError("Failed to load campaign profile. Is the API server running?");
      }
      setLoading(false);
    }
    load();
  }, [profileId, initBusinessProfile]);

  useEffect(() => {
    if (engineProfileId !== profileId) return;

    const unsub = useEngine.subscribe(() => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveRevenueState(profileId, getPersistedState()).catch(() => {});
      }, 1500);
    });

    return () => {
      unsub();
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [profileId, engineProfileId, getPersistedState]);

  if (loading) {
    return (
      <div className="relative z-10 grid min-h-screen place-items-center">
        <div className="text-center">
          <Loader2 size={32} className="mx-auto mb-4 animate-spin text-accent" />
          <p className="text-sm text-ink-dim">Loading campaign workspace...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative z-10 mx-auto max-w-lg px-5 py-20 text-center">
        <p className="text-danger">{error}</p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm text-accent hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="sticky top-0 z-50 border-b border-line bg-base/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-2.5 sm:px-8">
          <div>
            <div className="eyebrow">Campaign profile</div>
            <div className="font-display text-sm font-bold text-ink">{companyName}</div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/${profileId}`}>
              <span className="rounded-[10px] px-3 py-1.5 font-mono text-[11px] text-ink-dim transition-colors hover:bg-surface-2 hover:text-ink">
                Contacts
              </span>
            </Link>
            <Link href="/">
              <span className="rounded-[10px] border border-line px-3 py-1.5 font-mono text-[11px] text-ink-dim transition-colors hover:bg-surface-2 hover:text-ink">
                New campaign
              </span>
            </Link>
          </div>
        </div>
      </div>
      <Workspace />
    </>
  );
}
