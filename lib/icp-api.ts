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

// --- Phase 2: real/scheduled sending -------------------------------------

export type SequenceSend = {
  account_id: string;
  contact_email: string;
  grade?: string;
  step1: { subject: string; body: string; validated?: boolean };
  step2?: { subject: string; body: string; validated?: boolean };
};

export type StartSequenceSummary = {
  threads: number;
  jobs_created: number;
  auto: number;
  needs_review: number;
};

export type SendJobView = {
  id: number;
  thread_id: string;
  account_id: string;
  contact_email: string;
  step: string;
  status: string;
  auto: boolean;
  scheduled_at: string | null;
  last_error: string | null;
  subject: string;
  sent_at: string | null;
};

export type SendJobsResponse = { jobs: SendJobView[]; cap: number; cap_remaining: number };
export type DrainSummary = { sent: number; skipped: number; failed: number; held: number };

export async function startSequence(
  profileId: number,
  sends: SequenceSend[],
): Promise<StartSequenceSummary> {
  const res = await fetch(`${API}/sequences/${profileId}/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sends }),
  });
  return res.json();
}

export async function getSendJobs(profileId: number): Promise<SendJobsResponse> {
  const res = await fetch(`${API}/send-jobs/${profileId}`);
  return res.json();
}

export async function approveSendJob(jobId: number): Promise<{ ok: boolean; status: string }> {
  const res = await fetch(`${API}/send-jobs/${jobId}/approve`, { method: "POST" });
  return res.json();
}

export async function skipSendJob(jobId: number): Promise<{ ok: boolean; status: string }> {
  const res = await fetch(`${API}/send-jobs/${jobId}/skip`, { method: "POST" });
  return res.json();
}

export async function runSendQueue(profileId: number): Promise<DrainSummary> {
  const res = await fetch(`${API}/send-jobs/${profileId}/run`, { method: "POST" });
  return res.json();
}
