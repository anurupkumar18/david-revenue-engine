import { NextResponse } from "next/server";
import { generateStructured } from "@/lib/llm";
import { STRATEGY_SCHEMA, STRATEGY_SYSTEM, buildStrategyUser } from "@/lib/prompts";
import { buildFittingStrategy } from "@/lib/strategy";
import type { FittingStrategy, FittingStrategyInput } from "@/lib/types";

export async function POST(req: Request) {
  let input: FittingStrategyInput;
  try {
    const body = await req.json();
    input = {
      productDescription: String(body.productDescription ?? ""),
      segmentFocus: body.segmentFocus ?? "auto",
      fittingGoal: body.fittingGoal ?? "land_recurring_retainers",
    };
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const llm = await generateStructured<Omit<FittingStrategy, "source">>({
    system: STRATEGY_SYSTEM,
    user: buildStrategyUser(input),
    schema: STRATEGY_SCHEMA,
    maxTokens: 1200,
  });

  const strategy: FittingStrategy = llm
    ? { ...llm, source: "llm" }
    : buildFittingStrategy(input);

  return NextResponse.json(strategy);
}
