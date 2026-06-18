/** Inboxes used for synthetic ICP / demo sends so live OAuth tests deliver to real mailboxes. */
export const SYNTHETIC_TEST_EMAILS = [
  "sanjay.bhatia01@gmail.com",
  "bhatia.sanjay01@gmail.com",
  "81anurup@gmail.com",
] as const;

export function pickSyntheticTestEmail(index: number): string {
  return SYNTHETIC_TEST_EMAILS[Math.abs(index) % SYNTHETIC_TEST_EMAILS.length];
}

export function syntheticTestEmailForKey(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash + key.charCodeAt(i)) | 0;
  return pickSyntheticTestEmail(hash);
}
