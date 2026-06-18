import { NextResponse } from "next/server";
import { campaignAngleLabel, campaignCopy } from "@/lib/campaign";
import { LEAKS } from "@/lib/constants";
import { generateStructured } from "@/lib/llm";
import { REPLY_SCHEMA, REPLY_SYSTEM, buildReplyUser } from "@/lib/prompts";
import { routeReply, type ReplyContext } from "@/lib/reply-router";
import { getSeedAccountById } from "@/lib/seed";
import type { RoutedReply } from "@/lib/types";

type LlmRouted = Omit<RoutedReply, "source">;

export async function POST(req: Request) {
  let accountId = "";
  let replyText = "";
  try {
    const body = await req.json();
    accountId = String(body.accountId ?? "");
    replyText = String(body.replyText ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!replyText.trim()) {
    return NextResponse.json({ error: "Empty reply" }, { status: 400 });
  }

  const account = getSeedAccountById(accountId);
  const ctx: ReplyContext = account
    ? {
        companyName: account.name,
        primaryLeakLabel: LEAKS[account.primaryLeak].label,
        offerPathLabel: campaignAngleLabel(account.recommendedDavidOfferPath, null),
        firstConversionAction: campaignCopy(account.nextBestConversionAction, null),
      }
    : {};

  // Deterministic routing always runs — it's the compliance backstop.
  const det = routeReply(replyText, ctx);

  const llm = await generateStructured<LlmRouted>({
    system: REPLY_SYSTEM,
    user: buildReplyUser(replyText, {
      companyName: ctx.companyName ?? "your team",
      primaryLeakLabel: ctx.primaryLeakLabel ?? "the leak we flagged",
      offerPathLabel: ctx.offerPathLabel ?? "the right campaign angle",
      firstConversionAction: ctx.firstConversionAction ?? "a short teardown.",
    }),
    schema: REPLY_SCHEMA,
    maxTokens: 500,
  });

  let routed: RoutedReply = llm ? { ...llm, source: "llm" } : det;

  // Safety net: never lose a suppression. If either side detects unsubscribe,
  // force suppression and do not emit persuasion copy.
  if (det.shouldSuppress || routed.intent === "unsubscribe") {
    routed = {
      intent: "unsubscribe",
      confidence: Math.max(routed.confidence, det.confidence),
      recommendedAction: "Suppress immediately. Do not generate persuasive follow-up.",
      responseTemplate: det.shouldSuppress ? det.responseTemplate : routed.responseTemplate,
      updatePipelineStage: "suppressed",
      shouldSuppress: true,
      source: routed.source,
    };
  }

  return NextResponse.json(routed);
}
