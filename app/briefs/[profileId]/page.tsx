import { BriefsWorkspace } from "@/components/briefs-workspace";

export default async function BriefsPage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const { profileId } = await params;
  return <BriefsWorkspace profileId={Number(profileId)} />;
}
