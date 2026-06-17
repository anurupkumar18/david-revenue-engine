// Optional Claude layer. Returns null whenever there is no API key or anything
// fails — callers then use the deterministic fallback, so the demo never depends
// on a network call or a key. Uses the official Anthropic SDK + structured outputs.

const DEFAULT_MODEL = "claude-opus-4-8";

export type StructuredArgs = {
  system: string;
  user: string;
  /** JSON Schema for the structured output (additionalProperties:false on every object). */
  schema: Record<string, unknown>;
  maxTokens?: number;
};

export function llmEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Generate a JSON object validated against `schema`, or null on any failure. */
export async function generateStructured<T>(args: StructuredArgs): Promise<T | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey });
    const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

    // Cast params: output_config is GA but may not be in this SDK version's types.
    const res = await client.messages.create({
      model,
      max_tokens: args.maxTokens ?? 1024,
      system: args.system,
      output_config: { format: { type: "json_schema", schema: args.schema }, effort: "low" },
      messages: [{ role: "user", content: args.user }],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const text = (res.content as Array<{ type: string; text?: string }>)
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("")
      .trim();

    if (!text) return null;
    return JSON.parse(text) as T;
  } catch (err) {
    console.warn("[llm] falling back to deterministic:", (err as Error).message);
    return null;
  }
}
