import type { ConfidenceLevel, ICPFields } from "@/lib/types/icp";

const KEY = "icp-wizard-draft";

export type WizardDraft = {
  fields: ICPFields;
  confidence: Record<string, ConfidenceLevel>;
};

export function saveWizardDraft(draft: WizardDraft) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY, JSON.stringify(draft));
}

export function loadWizardDraft(): WizardDraft | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WizardDraft;
  } catch {
    return null;
  }
}

export function clearWizardDraft() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
}
