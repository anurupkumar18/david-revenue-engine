import type { RevenuePersistedState } from "@/lib/icp-bridge";
import type { ConfidenceLevel, ICPFields, ICPProfile } from "@/lib/types/icp";

const API = "/api";

export type AuthUser = {
  id: number;
  email: string;
  name: string;
  is_demo: boolean;
  auth_enabled: boolean;
};

export type EmailConnectionInfo = {
  connected: boolean;
  provider: string | null;
  email_address: string | null;
  status: string | null;
  last_error?: string | null;
  connected_at?: string | null;
  live_mode?: boolean;
  oauth_configured: { google: boolean; microsoft: boolean };
  auth_enabled: boolean;
};

export class ApiAuthError extends Error {
  status = 401;

  constructor(message = "Not authenticated.") {
    super(message);
    this.name = "ApiAuthError";
  }
}

type AuthGate = () => Promise<boolean>;

let authGate: AuthGate | null = null;

export function registerAuthGate(gate: AuthGate | null) {
  authGate = gate;
}

type FetchOpts = { retried?: boolean; skipAuthGate?: boolean };

async function apiFetch<T>(path: string, init?: RequestInit, opts: FetchOpts = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (res.status === 401 && !opts.skipAuthGate && !opts.retried && authGate && !path.startsWith("/auth/")) {
    const ok = await authGate();
    if (ok) return apiFetch<T>(path, init, { ...opts, retried: true });
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || body.message || detail;
    } catch {
      /* ignore */
    }
    const message = typeof detail === "string" ? detail : JSON.stringify(detail);
    if (res.status === 401) throw new ApiAuthError(message);
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function getMe(): Promise<AuthUser> {
  return apiFetch<AuthUser>("/auth/me", undefined, { skipAuthGate: true });
}

export async function login(email: string, password: string): Promise<AuthUser> {
  return apiFetch<AuthUser>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function signup(email: string, password: string, name = ""): Promise<AuthUser> {
  return apiFetch<AuthUser>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  });
}

export async function logout(): Promise<void> {
  await apiFetch("/auth/logout", { method: "POST" });
}

export async function getEmailConnection(): Promise<EmailConnectionInfo> {
  return apiFetch<EmailConnectionInfo>("/email/connection");
}

export async function disconnectEmail(): Promise<void> {
  await apiFetch("/email/connection", { method: "DELETE" });
}

export async function testEmailConnection(to: string): Promise<{ ok: boolean; message_id?: string; simulated?: boolean }> {
  return apiFetch("/email/connection/test", {
    method: "POST",
    body: JSON.stringify({ to }),
  });
}

export function connectGoogleUrl(): string {
  return `${API}/email/connect/google`;
}

export function connectMicrosoftUrl(): string {
  return `${API}/email/connect/microsoft`;
}

export async function scrapeWebsite(url: string): Promise<{
  fields: Partial<ICPFields>;
  confidence: Record<string, string>;
  sources: string[];
  error?: string;
}> {
  return apiFetch("/scrape", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
}

export async function createProfile(
  fields: ICPFields,
  confidence: Record<string, ConfidenceLevel>,
  status = "draft",
): Promise<ICPProfile> {
  return apiFetch("/profiles", {
    method: "POST",
    body: JSON.stringify({ fields, confidence, status }),
  });
}

export async function listProfiles(): Promise<ICPProfile[]> {
  return apiFetch("/profiles");
}

export async function getProfile(id: number): Promise<ICPProfile> {
  return apiFetch(`/profiles/${id}`);
}

export async function discoverContacts(
  profileId: number,
): Promise<{ count: number; profile: ICPProfile }> {
  return apiFetch(`/profiles/${profileId}/discover-contacts`, { method: "POST" });
}

export async function exportOutreach(profileId: number): Promise<{
  exported: number;
  profile_id: number;
  db_path: string;
  cli_hint: string;
}> {
  return apiFetch("/outreach/export", {
    method: "POST",
    body: JSON.stringify({ profile_id: profileId }),
  });
}

export async function getOutreachQueue(profileId: number): Promise<unknown[]> {
  return apiFetch(`/outreach/queue/${profileId}`);
}

export async function getRevenueState(profileId: number): Promise<RevenuePersistedState> {
  return apiFetch(`/profiles/${profileId}/revenue`);
}

export async function saveRevenueState(
  profileId: number,
  state: RevenuePersistedState,
): Promise<void> {
  await apiFetch(`/profiles/${profileId}/revenue`, {
    method: "PUT",
    body: JSON.stringify(state),
  });
}

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
  return apiFetch(`/sequences/${profileId}/start`, {
    method: "POST",
    body: JSON.stringify({ sends }),
  });
}

export async function getSendJobs(profileId: number): Promise<SendJobsResponse> {
  return apiFetch(`/send-jobs/${profileId}`);
}

export async function approveSendJob(jobId: number): Promise<{ ok: boolean; status: string }> {
  return apiFetch(`/send-jobs/${jobId}/approve`, { method: "POST" });
}

export async function skipSendJob(jobId: number): Promise<{ ok: boolean; status: string }> {
  return apiFetch(`/send-jobs/${jobId}/skip`, { method: "POST" });
}

export async function runSendQueue(profileId: number): Promise<DrainSummary> {
  return apiFetch(`/send-jobs/${profileId}/run`, { method: "POST" });
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
