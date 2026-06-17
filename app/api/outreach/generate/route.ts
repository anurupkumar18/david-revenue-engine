import { NextResponse } from "next/server";
import { generateStructured } from "@/lib/llm";
import { buildOutreachSequence } from "@/lib/outreach";
import { OUTREACH_SCHEMA, OUTREACH_SYSTEM, buildOutreachUser } from "@/lib/prompts";
import { getSeedAccountById } from "@/lib/seed";
import { countWords, validateEmail } from "@/lib/validators";
import type { EmailStep, OutreachSequence, OutreachTone } from "@/lib/types";

type LlmSteps = { steps: { stepNumber: 1 | 2; subject: string; body: string; cta: string }[] };

export async function POST(req: Request) {
  let accountId = "";
  let tone: OutreachTone = "casual";
  try {
    const body = await req.json();
    accountId = String(body.accountId ?? "");
    if (body.tone === "direct" || body.tone === "founder_led") tone = body.tone;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const account = getSeedAccountById(accountId);
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  // Deterministic version is always compliant — it's the guaranteed fallback.
  const fallback = buildOutreachSequence(account, tone);

  const llm = await generateStructured<LlmSteps>({
    system: OUTREACH_SYSTEM,
    user: buildOutreachUser(account, tone),
    schema: OUTREACH_SCHEMA,
    maxTokens: 700,
  });

  if (llm?.steps?.length === 2) {
    const steps: EmailStep[] = llm.steps
      .sort((a, b) => a.stepNumber - b.stepNumber)
      .map((s) => ({
        stepNumber: s.stepNumber,
        subject: s.subject,
        body: s.body,
        cta: s.cta,
        referencedLeak: account.primaryLeak,
        wordCount: countWords(s.body),
        validation: validateEmail({
          subject: s.subject,
          body: s.body,
          cta: s.cta,
          referencedLeak: account.primaryLeak,
        }),
      }));

    // Only use the LLM copy if every step passes the compliance rules.
    if (steps.every((s) => s.validation.passed)) {
      const sequence: OutreachSequence = {
        accountId: account.id,
        offerPath: account.recommendedDavidOfferPath,
        tone,
        source: "llm",
        steps,
      };
      return NextResponse.json(sequence);
    }
  }

  return NextResponse.json(fallback);
}
