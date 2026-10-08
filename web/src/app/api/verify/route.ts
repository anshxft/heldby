import { AgentError, verifyDeal } from "@/lib/agent";
import { NETWORKS, isNetworkId } from "@/lib/networks";
import { crossSite, forbidden, rateLimit, tooMany } from "@/lib/guard";

// POST /api/verify { id: "1" } — the AI agent reviews a submitted/disputed escrow and settles it.
export async function POST(request: Request) {
  if (crossSite(request)) return forbidden();
  const wait = rateLimit(request, "verify", 5, 60_000); // each call can hit the model and the chain
  if (wait) return tooMany(wait);
  const { id, network } = (await request.json().catch(() => ({}))) as { id?: unknown; network?: unknown };
  if (typeof id !== "string" || !/^\d{1,9}$/.test(id)) return Response.json({ error: "Send { id: \"<escrow id>\", network }." }, { status: 400 });
  if (!isNetworkId(network)) return Response.json({ error: "network must be \"testnet\" or \"mainnet\"." }, { status: 400 });

  try {
    return Response.json(await verifyDeal(BigInt(id), NETWORKS[network]));
  } catch (e) {
    // full detail goes to server logs; the browser only gets our own messages or viem's one-line summary
    console.error("[agent]", id, e);
    if (e instanceof AgentError) return Response.json({ error: e.message }, { status: e.status });
    const short = (e as { shortMessage?: string }).shortMessage;
    return Response.json({ error: short ?? "The agent hit an internal error. Try again shortly." }, { status: 500 });
  }
}
