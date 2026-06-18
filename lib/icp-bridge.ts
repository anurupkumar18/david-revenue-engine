import type { ICPContact, ICPFields } from "@/lib/types/icp";
import { getSeedAccounts } from "@/lib/seed";
import type { FittingStrategyInput, RevenueAccount } from "@/lib/types";
import type { CampaignIntelligence } from "@/lib/campaign";

export function icpFieldsToStrategyInput(fields: ICPFields): FittingStrategyInput {
  const parts = [
    fields.company_name ? `Company: ${fields.company_name}` : "",
    fields.core_offering,
    fields.pain_points ? `Pain points:\n${fields.pain_points}` : "",
    fields.value_proposition ? `Outcomes:\n${fields.value_proposition}` : "",
    fields.decision_makers ? `Buyers:\n${fields.decision_makers}` : "",
  ].filter(Boolean);

  return {
    productDescription: parts.join("\n\n") || "Custom AI systems for sales, ops, and back-office.",
    segmentFocus: "auto",
    fittingGoal: "book_fittings",
  };
}

function industryMatches(accountIndustry: string, targetIndustries: string[]): boolean {
  const ai = accountIndustry.toLowerCase();
  return targetIndustries.some((t) => {
    const ti = t.toLowerCase();
    return ai.includes(ti) || ti.includes(ai.split(/[\s/]/)[0]);
  });
}

export function buildAccountsForProfile(
  fields: ICPFields,
  contacts: ICPContact[] = [],
): RevenueAccount[] {
  void contacts;
  const targets = fields.best_fit_industries || [];
  const allSeed = getSeedAccounts();

  const accounts = targets.length
    ? allSeed.filter((a) => industryMatches(a.industry, targets))
    : [...allSeed];

  if (accounts.length < 8) {
    const seen = new Set(accounts.map((a) => a.id));
    for (const a of allSeed) {
      if (accounts.length >= 12) break;
      if (!seen.has(a.id)) {
        accounts.push(a);
        seen.add(a.id);
      }
    }
  }

  accounts.sort((a, b) => b.revenueOpportunityScore - a.revenueOpportunityScore);
  return accounts.slice(0, 15);
}

export type RevenuePersistedState = {
  accounts: RevenueAccount[];
  loadedScenario: string | null;
  strategy: unknown | null;
  campaign?: CampaignIntelligence | null;
  outreachByAccount: Record<string, unknown>;
  lastRouted: unknown | null;
};

export function emptyRevenueState(accounts: RevenueAccount[]): RevenuePersistedState {
  return {
    accounts,
    loadedScenario: "icp",
    strategy: null,
    campaign: null,
    outreachByAccount: {},
    lastRouted: null,
  };
}
