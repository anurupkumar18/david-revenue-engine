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

// --- Phase 2c / 2d: threads and briefs -----------------------------------

export type ThreadDraft = {
  subject: string;
  body: string;
  cta: string;
  routed: {
    intent: string;
    confidence: number;
    recommendedAction: string;
    responseTemplate: string;
    updatePipelineStage: string;
    shouldSuppress: boolean;
    source: string;
  };
  validation: {
    subjectLowercase: boolean;
    subjectWordCountOk: boolean;
    bodyUnder100Words: boolean;
    hasLowFrictionCta: boolean;
    referencesLeak: boolean;
    noInventedClaims: boolean;
    passed: boolean;
    warnings: string[];
  };
  source: string;
  status?: string;
};

export type ThreadMessage = {
  id: number;
  thread_id: string;
  profile_id: number;
  account_id: string | null;
  contact_email: string | null;
  direction: "inbound" | "outbound";
  step: string;
  subject: string;
  body: string;
  esp_message_id: string | null;
  in_reply_to: string | null;
  intent: string | null;
  confidence: string | null;
  auto_sent: boolean;
  status: string;
  reviewed_at: string | null;
  created_at: string | null;
  sent_at: string | null;
};

export type ThreadView = {
  thread_id: string;
  profile_id: number;
  account_id: string | null;
  contact_email: string;
  status: string;
  message_count: number;
  latest_message_at: string | null;
  routed: ThreadDraft["routed"] | null;
  draft: ThreadDraft | null;
  messages: ThreadMessage[];
};

export async function listThreads(profileId: number): Promise<{ threads: ThreadView[] }> {
  const res = await fetch(`${API}/threads/${profileId}`);
  return res.json();
}

export async function getThread(threadId: string): Promise<ThreadView> {
  const res = await fetch(`${API}/threads/detail/${threadId}`);
  return res.json();
}

export async function patchThread(
  threadId: string,
  payload: { action: string; subject?: string; body?: string; cta?: string },
): Promise<ThreadView> {
  const res = await fetch(`${API}/threads/${threadId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function simulateInbound(
  payload: {
    profile_id: number;
    account_id?: string;
    contact_email: string;
    subject?: string;
    body: string;
    in_reply_to?: string;
    message_id?: string;
    company_name?: string;
    primary_leak_label?: string;
    offer_path_label?: string;
    first_conversion_action?: string;
    grade?: string;
  },
): Promise<{ thread: ThreadView; decision: { auto_send: boolean; reason: string }; draft: ThreadDraft }> {
  const res = await fetch(`${API}/email/simulate-inbound`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export type BriefCountView = {
  sent: number;
  inbound: number;
  routed: number;
  positive: number;
  meetings: number;
  badFits: number;
  approvals: number;
  edits: number;
  suppressed: number;
};

export type BriefView = {
  id: number;
  profile_id: number;
  client_name: string;
  period: string;
  period_start: string | null;
  period_end: string | null;
  metrics: Record<string, unknown>;
  recommendations: string[];
  narrative: string;
  created_at: string | null;
  counts?: BriefCountView;
  learningInsights?: {
    winningSignal: string;
    commonObjection: string;
    nextCampaignRecommendation: string;
  };
  source?: string;
};

export async function listBriefs(): Promise<{ briefs: BriefView[] }> {
  const res = await fetch(`${API}/briefs`);
  return res.json();
}

export async function listProfileBriefs(profileId: number): Promise<{ briefs: BriefView[] }> {
  const res = await fetch(`${API}/briefs/${profileId}`);
  return res.json();
}

export async function runBrief(
  profileId: number,
  period: "daily" | "weekly" = "daily",
): Promise<BriefView> {
  const res = await fetch(`${API}/briefs/${profileId}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ period }),
  });
  return res.json();
}
