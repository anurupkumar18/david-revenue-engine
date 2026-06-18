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
