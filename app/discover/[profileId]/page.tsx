import { DiscoveryView } from "@/components/icp/discovery-view";

export default async function DiscoverPage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const { profileId } = await params;
  return <DiscoveryView profileId={Number(profileId)} />;
}
