import "server-only";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

/** One chat completion from Groq's OpenAI-compatible API (open-source models, free tier). */
export async function groqChat(
  messages: ChatMessage[],
  opts: { model: string; json?: boolean; maxTokens?: number; temperature?: number },
): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not set on the server.");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(45_000),
    body: JSON.stringify({
      model: opts.model,
      messages,
      temperature: opts.temperature ?? 0,
      max_completion_tokens: opts.maxTokens,
      response_format: opts.json ? { type: "json_object" } : undefined,
    }),
  });
  if (!res.ok) throw new Error(`AI model request failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).choices?.[0]?.message?.content ?? "";
}
