import { InboxWorkspace } from "@/components/inbox-workspace";

export default async function InboxPage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const { profileId } = await params;
  return <InboxWorkspace profileId={Number(profileId)} />;
}
