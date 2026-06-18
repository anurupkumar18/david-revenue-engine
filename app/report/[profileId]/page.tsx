import { CampaignReport } from "@/components/campaign-report";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const { profileId } = await params;
  return <CampaignReport profileId={Number(profileId)} />;
}
