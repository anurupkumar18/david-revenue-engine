import type { RevenuePersistedState } from "@/lib/icp-bridge";
import type { ConfidenceLevel, ICPFields, ICPProfile } from "@/lib/types/icp";

const API = "/api";

export async function scrapeWebsite(url: string): Promise<{
  fields: Partial<ICPFields>;
  confidence: Record<string, string>;
  sources: string[];
  error?: string;
}> {
  const res = await fetch(`${API}/scrape`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  return res.json();
}

export async function createProfile(
  fields: ICPFields,
  confidence: Record<string, ConfidenceLevel>,
  status = "draft",
): Promise<ICPProfile> {
  const res = await fetch(`${API}/profiles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields, confidence, status }),
  });
  return res.json();
}

export async function listProfiles(): Promise<ICPProfile[]> {
  const res = await fetch(`${API}/profiles`);
  return res.json();
}

export async function getProfile(id: number): Promise<ICPProfile> {
  const res = await fetch(`${API}/profiles/${id}`);
  return res.json();
}

export async function discoverContacts(
  profileId: number,
): Promise<{ count: number; profile: ICPProfile }> {
  const res = await fetch(`${API}/profiles/${profileId}/discover-contacts`, { method: "POST" });
  return res.json();
}

export async function exportOutreach(profileId: number): Promise<{
  exported: number;
  profile_id: number;
  db_path: string;
  cli_hint: string;
}> {
  const res = await fetch(`${API}/outreach/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile_id: profileId }),
  });
  return res.json();
}

export async function getOutreachQueue(profileId: number) {
  const res = await fetch(`${API}/outreach/queue/${profileId}`);
  return res.json();
}

export async function getRevenueState(profileId: number): Promise<RevenuePersistedState> {
  const res = await fetch(`${API}/profiles/${profileId}/revenue`);
  return res.json();
}

export async function saveRevenueState(
  profileId: number,
  state: RevenuePersistedState,
): Promise<void> {
  await fetch(`${API}/profiles/${profileId}/revenue`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state),
  });
}
