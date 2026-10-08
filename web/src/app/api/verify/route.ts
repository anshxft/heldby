import { AgentError, verifyDeal } from "@/lib/agent";
import { rateLimit, tooMany } from "@/lib/rate-limit";

// POST /api/verify { id: "1" } — the AI agent reviews a submitted/disputed escrow and settles it.
export async function POST(request: Request) {
  const wait = rateLimit(request, "verify", 5, 60_000); // each call can hit the model and the chain
  if (wait) return tooMany(wait);
  const { id } = (await request.json().catch(() => ({}))) as { id?: unknown };
  if (typeof id !== "string" || !/^\d{1,9}$/.test(id)) return Response.json({ error: "Send { id: \"<escrow id>\" }." }, { status: 400 });

  try {
    return Response.json(await verifyDeal(BigInt(id)));
  } catch (e) {
    const status = e instanceof AgentError ? e.status : 500;
    const message = (e as { shortMessage?: string }).shortMessage ?? (e as Error).message;
    console.error("[agent]", id, message);
    return Response.json({ error: message }, { status });
  }
}
