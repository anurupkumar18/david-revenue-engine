import { NextResponse } from "next/server";
import { generateStructured } from "@/lib/llm";
import { buildBrief } from "@/lib/brief";
import { BRIEF_SCHEMA, BRIEF_SYSTEM, buildBriefUser } from "@/lib/prompts";
import type { CampaignIntelligence } from "@/lib/campaign";

type BriefCounts = {
  sent?: number;
  inbound?: number;
  routed?: number;
  positive?: number;
  meetings?: number;
  badFits?: number;
  approvals?: number;
  edits?: number;
  suppressed?: number;
};

type BriefInput = {
  period?: "daily" | "weekly";
  periodStart?: string;
  periodEnd?: string;
  clientName?: string;
  counts?: BriefCounts;
  campaign?: CampaignIntelligence;
};

type LlmBrief = {
  narrative: string;
  recommendations: string[];
};

export async function POST(req: Request) {
  let input: BriefInput;
  try {
    const body = await req.json();
    input = {
      period: body.period === "weekly" ? "weekly" : "daily",
      periodStart: String(body.periodStart ?? ""),
      periodEnd: String(body.periodEnd ?? ""),
      clientName: String(body.clientName ?? ""),
      counts: body.counts ?? {},
      campaign: body.campaign,
    };
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!input.campaign || !input.periodStart || !input.periodEnd) {
    return NextResponse.json({ error: "Missing brief input" }, { status: 400 });
  }

  const det = buildBrief({
    period: input.period ?? "daily",
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    campaign: input.campaign,
    counts: input.counts ?? {},
    clientName: input.clientName || undefined,
  });

  const llm = await generateStructured<LlmBrief>({
    system: BRIEF_SYSTEM,
    user: buildBriefUser({
      period: det.period,
      periodStart: det.periodStart,
      periodEnd: det.periodEnd,
      clientName: det.clientName,
      counts: det.counts,
      winningSignal: det.learningInsights.winningSignal,
      commonObjection: det.learningInsights.commonObjection,
      nextCampaignRecommendation: det.learningInsights.nextCampaignRecommendation,
    }),
    schema: BRIEF_SCHEMA,
    maxTokens: 700,
  });

  if (llm) {
    const narrative = String(llm.narrative ?? "").trim();
    const recommendations = Array.isArray(llm.recommendations)
      ? llm.recommendations.map((item) => String(item).trim()).filter(Boolean)
      : [];
    if (narrative && recommendations.length > 0) {
      return NextResponse.json({
        ...det,
        narrative,
        recommendations,
        source: "llm",
      });
    }
  }

  return NextResponse.json(det);
}
