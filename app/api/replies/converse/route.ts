import { NextResponse } from "next/server";
import { generateStructured } from "@/lib/llm";
import { campaignAngleLabel, campaignCopy } from "@/lib/campaign";
import {
  REPLY_CONVERSATION_SCHEMA,
  REPLY_CONVERSATION_SYSTEM,
  buildReplyConversationUser,
} from "@/lib/prompts";
import { buildReplyDraft, type ReplyDraftContext } from "@/lib/reply-conversation";
import { validateReplyDraft } from "@/lib/reply-validators";
import { getSeedAccountById } from "@/lib/seed";
import { LEAKS } from "@/lib/constants";

type LlmReplyDraft = { subject: string; body: string; cta: string };

export async function POST(req: Request) {
  let replyText = "";
  let accountId = "";
  let companyName = "";
  let primaryLeakLabel = "";
  let offerPathLabel = "";
  let firstConversionAction = "";
  try {
    const body = await req.json();
    replyText = String(body.replyText ?? "");
    accountId = String(body.accountId ?? "");
    companyName = String(body.companyName ?? "");
    primaryLeakLabel = String(body.primaryLeakLabel ?? "");
    offerPathLabel = String(body.offerPathLabel ?? "");
    firstConversionAction = String(body.firstConversionAction ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!replyText.trim()) {
    return NextResponse.json({ error: "Empty reply" }, { status: 400 });
  }

  const account = getSeedAccountById(accountId);
  const ctx: ReplyDraftContext = account
    ? {
        companyName: account.name,
        primaryLeakLabel: LEAKS[account.primaryLeak].label,
        primaryLeakType: account.primaryLeak,
        offerPathLabel: campaignAngleLabel(account.recommendedDavidOfferPath, null),
        firstConversionAction: campaignCopy(account.nextBestConversionAction, null),
      }
    : {
        companyName: companyName || "your team",
        primaryLeakLabel: primaryLeakLabel || "the leak we flagged",
        offerPathLabel: offerPathLabel || "the right campaign angle",
        firstConversionAction: firstConversionAction || "a short teardown.",
      };

  const det = buildReplyDraft(replyText, ctx);

  if (det.routed.shouldSuppress) {
    return NextResponse.json(det);
  }

  const llm = await generateStructured<LlmReplyDraft>({
    system: REPLY_CONVERSATION_SYSTEM,
    user: buildReplyConversationUser(replyText, {
      companyName: ctx.companyName ?? "your team",
      primaryLeakLabel: ctx.primaryLeakLabel ?? "the leak we flagged",
      offerPathLabel: ctx.offerPathLabel ?? "the right campaign angle",
      firstConversionAction: ctx.firstConversionAction ?? "a short teardown.",
      intent: det.routed.intent,
      recommendedAction: det.routed.recommendedAction,
      shouldSuppress: det.routed.shouldSuppress,
    }),
    schema: REPLY_CONVERSATION_SCHEMA,
    maxTokens: 400,
  });

  if (llm) {
    const candidate = {
      subject: String(llm.subject ?? "").trim(),
      body: String(llm.body ?? "").trim(),
      cta: String(llm.cta ?? "").trim(),
    };
    const validation = validateReplyDraft({ ...candidate, routed: det.routed }, ctx);
    if (validation.passed) {
      return NextResponse.json({
        ...candidate,
        routed: det.routed,
        validation,
        source: "llm",
      });
    }
  }

  return NextResponse.json(det);
}
