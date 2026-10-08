import "server-only";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

type Opts = {
  model: string;
  /** Used once if `model` hits its rate limit (429). Each Groq model has its own per-minute token budget. */
  fallbackModel?: string;
  json?: boolean;
  maxTokens?: number;
  temperature?: number;
  /** gpt-oss models think before answering; "low" spends far fewer of the per-minute tokens. */
  reasoningEffort?: "low" | "medium" | "high";
};

/** One chat completion from Groq's OpenAI-compatible API (open-source models, free tier). */
export async function groqChat(messages: ChatMessage[], opts: Opts): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not set on the server.");

  const call = (model: string) =>
    fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(45_000),
      body: JSON.stringify({
        model,
        messages,
        temperature: opts.temperature ?? 0,
        max_completion_tokens: opts.maxTokens,
        reasoning_effort: opts.reasoningEffort,
        response_format: opts.json ? { type: "json_object" } : undefined,
      }),
    });

  let res = await call(opts.model);
  if (res.status === 429 && opts.fallbackModel) res = await call(opts.fallbackModel);
  if (!res.ok) throw new Error(`AI model request failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).choices?.[0]?.message?.content ?? "";
}
