"use client";

import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpRight, Bot, Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import type { Hash } from "viem";
import { useConfig, useConnection } from "wagmi";
import { waitForTransactionReceipt, writeContract } from "wagmi/actions";
import { REVIEW_WINDOW_SECONDS, errorText, escrowAbi, short, usd } from "@/lib/escrow";
import { explorer, isNetworkId } from "@/lib/networks";
import { setNetwork, useNetwork } from "../../network";
import { type DealDetail, useDeal } from "../../data";
import { NotDeployed, Skeleton, StatusPill, TxLink, btn, btnGhost, field, label, useNow } from "../../ui";

export function DealView({ id }: { id: string }) {
  const net = useNetwork();
  const { data: deal, isPending, error } = useDeal(BigInt(id));
  const [created, setCreated] = useState(false);

  // shared links carry ?net=mainnet|testnet so the recipient lands on the right network;
  // ?created=1 comes from the New escrow form and is dropped from the URL so the link stays clean to share
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const wanted = q.get("net");
    if (isNetworkId(wanted)) setNetwork(wanted);
    if (q.has("created")) {
      setCreated(true); // eslint-disable-line react-hooks/set-state-in-effect -- reading the URL once on mount
      q.delete("created");
      history.replaceState(null, "", location.pathname + (q.size ? `?${q}` : ""));
    }
  }, []);

  if (!net.escrow) return <NotDeployed />;

  if (isPending) return <Skeleton kind="deal" />;
  if (error) return <p className="text-red">Couldn’t load escrow: {error.message}</p>;
  if (!deal) return <p className="text-lg">Escrow #{id} doesn’t exist.</p>;

  return (
    <>
      <Link href="/app" className="link inline-flex items-center gap-1 text-sm font-medium">
        <ArrowLeft className="size-4" aria-hidden /> All escrows
      </Link>

      {created && (
        <div role="status" data-reveal="card" className="mt-6 flex items-start gap-3 border-l-4 border-red bg-red/5 p-4 text-sm">
          <Check className="mt-0.5 size-4 shrink-0 text-red" aria-hidden />
          <p>
            <span className="font-medium">Escrow created — {usd(deal.amount)} USDC is locked on Arc.</span> Next, send this page to your freelancer
            (use “Copy link”) so they can submit the work.
          </p>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-3" data-reveal>
        <span className={label}>Escrow #{id.padStart(2, "0")}</span>
        <StatusPill status={deal.status} />
      </div>
      <h1 data-reveal className="mt-4 max-w-4xl text-[clamp(28px,4vw,56px)] font-medium leading-[1.02] tracking-[-0.04em]">{deal.terms}</h1>

      <Timeline deal={deal} />

      <div className="mt-14 grid gap-12 lg:grid-cols-[1fr_360px]">
        <div className="grid content-start gap-10">
          <Details deal={deal} />
          {deal.deliverable && (
            <Block title="Delivery">
              <Linkish text={deal.deliverable} />
            </Block>
          )}
          {deal.dispute && (
            <Block title={`Dispute · raised by ${deal.dispute.by === deal.client ? "client" : "freelancer"}`}>
              <p>{deal.dispute.reason || "No reason given."}</p>
            </Block>
          )}
          {deal.resolution && (
            <Block title="AI agent verdict">
              <p>{deal.resolution.reason}</p>
              <p className="mt-3 font-mono text-sm">
                Freelancer {usd(deal.resolution.toFreelancer)} · Client {usd(deal.resolution.toClient)} USDC
              </p>
            </Block>
          )}
        </div>
        <Actions deal={deal} />
      </div>
    </>
  );
}

const steps = ["Funded", "Submitted", "Verdict", "Paid out"];

function Timeline({ deal }: { deal: DealDetail }) {
  const reached = { None: 0, Funded: 1, Submitted: 2, Disputed: 3, Released: 4, Refunded: 4, Resolved: 4 }[deal.status];
  return (
    <ol className="mt-12 grid grid-cols-4 gap-1">
      {steps.map((s, i) => (
        <li key={s}>
          {/* grey track; the red fill mounts when a step is reached, so it grows in (CSS "bar" entrance) */}
          <span className="relative block h-1 bg-line">
            {i < reached && <span data-reveal="bar" style={{ "--i": i } as React.CSSProperties} className="absolute inset-0 origin-left bg-red" />}
          </span>
          <span className={`mt-2 block text-[11px] font-medium uppercase tracking-wider ${i < reached ? "" : "text-muted"}`}>{s}</span>
        </li>
      ))}
    </ol>
  );
}

function Details({ deal }: { deal: DealDetail }) {
  const { address } = useConnection();
  const net = useNetwork();
  const you = (a: string) => (a === address ? " (you)" : "");
  const left = deal.deadline - useNow();
  const rows: [string, React.ReactNode][] = [
    ["Amount", <span key="a" className="font-mono">{usd(deal.amount)} USDC</span>],
    ["Client", <AddressLink key="c" a={deal.client} suffix={you(deal.client)} />],
    ["Freelancer", <AddressLink key="f" a={deal.freelancer} suffix={you(deal.freelancer)} />],
    [
      "Deadline",
      <span key="d">
        {new Date(deal.deadline * 1000).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
        <span className="text-muted"> · {left > 0 ? `${Math.ceil(left / 86400)} day(s) left` : "passed"}</span>
      </span>,
    ],
    ["Contract", <AddressLink key="x" a={net.escrow!} />],
  ];
  return (
    <dl className="border-b border-line">
      {rows.map(([k, v], i) => (
        <div key={k} data-reveal style={{ "--i": i } as React.CSSProperties} className="grid grid-cols-[8rem_1fr] gap-4 border-t border-line py-4 text-sm">
          <dt className={label}>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function AddressLink({ a, suffix = "" }: { a: string; suffix?: string }) {
  const net = useNetwork();
  return (
    <a href={explorer(net, `address/${a}`)} target="_blank" className="link inline-flex items-center gap-0.5 font-mono">
      {short(a)}
      {suffix} <ArrowUpRight className="size-3" aria-hidden />
    </a>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section data-reveal className="border-t border-ink pt-4">
      <h2 className={label}>{title}</h2>
      <div className="mt-3 text-lg leading-snug">{children}</div>
    </section>
  );
}

function Linkish({ text }: { text: string }) {
  const url = /^https?:\/\//.test(text) ? text : /^[\w.-]+\.[a-z]{2,}\//i.test(text) ? `https://${text}` : null;
  return url ? (
    <a href={url} target="_blank" rel="noreferrer" className="link break-all">
      {text} ↗
    </a>
  ) : (
    <p className="break-words">{text}</p>
  );
}

/** Sends one escrow tx, waits for it, then refreshes all deal queries. */
function useTx() {
  const config = useConfig();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [hash, setHash] = useState<Hash>();

  async function send(name: string, write: () => Promise<Hash>) {
    setBusy(name);
    setError("");
    try {
      const h = await write();
      setHash(h);
      const r = await waitForTransactionReceipt(config, { hash: h });
      if (r.status !== "success") throw new Error("Transaction reverted on-chain.");
      await qc.invalidateQueries();
      return true;
    } catch (e) {
      setError(errorText(e));
      return false;
    } finally {
      setBusy(null);
    }
  }
  return { config, busy, error, hash, send };
}

function Actions({ deal }: { deal: DealDetail }) {
  const { address } = useConnection();
  const net = useNetwork();
  const ESCROW = net.escrow!;
  const { config, busy, error, hash, send } = useTx();
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);

  const isClient = address === deal.client;
  const isFreelancer = address === deal.freelancer;
  const now = useNow();
  const expired = now > 0 && now > deal.deadline;
  const reviewLeft = deal.submittedAt && now ? deal.submittedAt + REVIEW_WINDOW_SECONDS - now : 0;
  const id = deal.id;
  const call = (functionName: "release" | "refund") =>
    send(functionName, () => writeContract(config, { address: ESCROW, chainId: net.chain.id, abi: escrowAbi, functionName, args: [id] }));
  // text input is shared by submit and dispute, so clear it once a tx lands
  const withText = async (name: string, functionName: "submitWork" | "dispute") => {
    if (await send(name, () => writeContract(config, { address: ESCROW, chainId: net.chain.id, abi: escrowAbi, functionName, args: [id, text.trim()] }))) setText("");
  };
  const submit = () => withText("submit", "submitWork");
  const dispute = () => withText("dispute", "dispute");
  const label_ = (name: string, idle: string) => (busy === name ? "Confirming…" : idle);

  let title = "";
  let body: React.ReactNode = null;

  switch (deal.status) {
    case "Funded":
      if (isFreelancer && !expired) {
        title = "Submit your work";
        body = (
          <>
            <input className={`${field} border-red-ink/20 bg-paper`} placeholder="github.com/you/repo/pull/1" value={text} onChange={(e) => setText(e.target.value)} />
            <button className={btn} disabled={!!busy || !text.trim()} onClick={submit}>{label_("submit", "Submit work")}</button>
            <button className={btnGhost} disabled={!!busy} onClick={() => call("refund")}>{label_("refund", "Cancel & refund client")}</button>
          </>
        );
      } else if (expired) {
        title = "Deadline passed";
        body = isClient || isFreelancer
          ? <button className={btn} disabled={!!busy} onClick={() => call("refund")}>{label_("refund", "Refund the client")}</button>
          : <p>Anyone can trigger the refund to the client.</p>;
      } else if (isClient) {
        title = "Waiting for delivery";
        body = (
          <>
            <p>Send this page to your freelancer so they can submit the work.</p>
            <button
              className={btnGhost}
              onClick={() => navigator.clipboard.writeText(`${location.origin}${location.pathname}?net=${net.id}`).then(() => setCopied(true))}
            >
              {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />} {copied ? "Link copied" : "Copy link"}
            </button>
            <button className={btn} disabled={!!busy} onClick={() => call("release")}>{label_("release", "Release payment early")}</button>
          </>
        );
      }
      break;

    case "Submitted":
      title = isClient ? "Review the delivery" : "Waiting for review";
      body = (
        <>
          {isClient && <button className={btn} disabled={!!busy} onClick={() => call("release")}>{label_("release", "Approve & release")}</button>}
          {!isClient && <p>The client can release payment or raise a dispute.</p>}
          {reviewLeft > 0 ? (
            <p className="border-t border-red-ink/20 pt-3">
              Client review window: {formatLeft(reviewLeft)} left. After that the AI agent can settle it — or raise a dispute to ask it now.
            </p>
          ) : (
            <AgentButton id={id} />
          )}
          {(isClient || isFreelancer) && (
            <>
              <input className={`${field} border-red-ink/20 bg-paper`} placeholder="What’s wrong? (sent to the AI agent)" value={text} onChange={(e) => setText(e.target.value)} />
              <button className={btnGhost} disabled={!!busy || !text.trim()} onClick={dispute}>{label_("dispute", "Raise a dispute")}</button>
            </>
          )}
        </>
      );
      break;

    case "Disputed":
      title = "Over to the AI agent";
      body = (
        <>
          <p>The agent reads the brief, the delivery and the dispute, then splits the funds on-chain.</p>
          <AgentButton id={id} />
          {isClient && <button className={btnGhost} disabled={!!busy} onClick={() => call("release")}>{label_("release", "Settle: release in full")}</button>}
        </>
      );
      break;

    case "Released":
      title = "Paid in full";
      body = <p>{usd(deal.amount)} USDC went to the freelancer.</p>;
      break;
    case "Refunded":
      title = "Refunded";
      body = <p>{usd(deal.amount)} USDC went back to the client.</p>;
      break;
    case "Resolved":
      title = "Settled by the AI agent";
      body = <p>Funds were split as shown in the verdict.</p>;
      break;
  }

  if (!title) {
    title = "View only";
    body = <p>You’re not part of this escrow.</p>;
  }

  return (
    <aside data-reveal="card" className="flex flex-col gap-4 self-start bg-red p-6 text-red-ink lg:sticky lg:top-6">
      <p className="text-[11px] font-medium uppercase tracking-wider">Next step</p>
      <h2 className="text-3xl font-semibold leading-none tracking-[-0.04em]">{title}</h2>
      <div className="grid gap-3 text-sm leading-snug">{body}</div>
      {error && <p role="alert" className="text-sm font-medium">{error}</p>}
      {hash && (
        <p className="text-xs">
          Last tx: <TxLink hash={hash} />
        </p>
      )}
    </aside>
  );
}

type AgentReply = {
  verdict: "approve" | "partial" | "reject" | "unclear";
  freelancerPercent: number;
  reason: string;
  checks: { item: string; met: boolean }[];
  tx?: Hash;
  error?: string;
};

/** Asks the server-side agent to review this escrow; shows its reasoning, then refreshes the deal. */
function AgentButton({ id }: { id: bigint }) {
  const net = useNetwork();
  const qc = useQueryClient();
  const [state, setState] = useState<"idle" | "busy">("idle");
  const [reply, setReply] = useState<AgentReply>();

  async function ask() {
    setState("busy");
    setReply(undefined);
    try {
      const res = await fetch("/api/verify", { method: "POST", body: JSON.stringify({ id: id.toString(), network: net.id }) });
      const data = (await res.json()) as AgentReply;
      setReply(res.ok ? data : { ...data, verdict: "unclear", freelancerPercent: 0, reason: "", checks: [] });
      if (data.tx) await qc.invalidateQueries();
    } catch (e) {
      setReply({ verdict: "unclear", freelancerPercent: 0, reason: "", checks: [], error: errorText(e) });
    } finally {
      setState("idle");
    }
  }

  return (
    <div className="grid gap-3 border-t border-red-ink/20 pt-3">
      <button className={btn} disabled={state === "busy"} onClick={ask}>
        <Bot className="size-4" aria-hidden />
        {state === "busy" ? "Agent is reviewing…" : "Ask the AI agent to verify"}
      </button>
      {reply?.error && <p role="alert" className="font-medium">{reply.error}</p>}
      {reply && !reply.error && (
        <div data-reveal="pop" className="grid gap-2 bg-paper p-4 text-ink">
          <p className="flex items-baseline justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider">{reply.verdict === "unclear" ? "Needs a human" : `Verdict · ${reply.verdict}`}</span>
            {reply.verdict !== "unclear" && <span className="font-mono text-sm">{reply.freelancerPercent}% to freelancer</span>}
          </p>
          <p>{reply.reason}</p>
          {reply.checks.length > 0 && (
            <ul className="grid gap-1 text-xs">
              {reply.checks.map((c) => (
                <li key={c.item} className="flex gap-2">
                  <span className={c.met ? "" : "text-red"}>{c.met ? "✓" : "✗"}</span> {c.item}
                </li>
              ))}
            </ul>
          )}
          {reply.tx && <p className="text-xs">Settled on-chain: <TxLink hash={reply.tx} /></p>}
        </div>
      )}
    </div>
  );
}

const formatLeft = (sec: number) => (sec >= 3600 ? `${Math.ceil(sec / 3600)}h` : `${Math.max(1, Math.ceil(sec / 60))}m`);
