import { DashboardView } from "@/components/icp/dashboard-view";

export default async function DashboardProfilePage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const { profileId } = await params;
  return <DashboardView profileId={Number(profileId)} />;
}
