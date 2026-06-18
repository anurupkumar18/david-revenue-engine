import { BusinessProfileWorkspace } from "@/components/business-profile-workspace";

export default async function BusinessPage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const { profileId } = await params;
  return <BusinessProfileWorkspace profileId={Number(profileId)} />;
}
