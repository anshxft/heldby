"use client";

import { createViemAdapterFromProvider } from "@circle-fin/adapter-viem-v2";
import { AppKit, type SwapEstimate } from "@circle-fin/app-kit";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDownUp, ArrowUpRight, Check, Loader2 } from "lucide-react";
import { useState } from "react";
import type { EIP1193Provider } from "viem";
import { useConnection, useReadContract, useSwitchChain } from "wagmi";
import { ARC_KIT, BRIDGE_SOURCES, EURC, IS_TESTNET, SWAP_TOKENS, type SwapToken, isAmount } from "@/lib/circle";
import { USDC, chain, errorText, usd, usdcAbi } from "@/lib/escrow";
import { Wallet, btn, btnGhost, field, label } from "../ui";

// One App Kit for swap + bridge. Keyless: a kit key must never reach the browser.
let kit: AppKit | undefined;
const getKit = () => (kit ??= new AppKit());

const TOKEN_ADDRESS: Record<SwapToken, `0x${string}`> = { USDC, EURC };

export default function WalletPage() {
  const { isConnected } = useConnection();
  const [tab, setTab] = useState<"swap" | "bridge">("swap");

  return (
    <>
      <h1 className="display text-[clamp(44px,7vw,104px)]">
        Your
        <br />
        <span className="ml-[0.6em]">wallet.</span>
      </h1>
      <p className="mt-6 max-w-xl text-muted">
        Get USDC onto Arc from another chain, or swap between USDC and EURC — powered by Circle App Kit.
      </p>

      {!IS_TESTNET && (
        <p role="note" className="mt-6 max-w-xl border-l-2 border-red pl-3 text-sm">
          Mainnet: these actions move real funds. Start with a small amount.
        </p>
      )}

      <div className="mt-12">
        {!isConnected ? (
          <div className="flex flex-col items-start gap-5">
            <p className="text-lg">Connect a wallet to swap or bridge.</p>
            <Wallet />
          </div>
        ) : (
          <div className="grid gap-12 lg:grid-cols-[1fr_340px]">
            <div>
              <div role="tablist" className="mb-8 inline-flex rounded-full border border-line p-1">
                {(["swap", "bridge"] as const).map((t) => (
                  <button
                    key={t}
                    role="tab"
                    aria-selected={tab === t}
                    onClick={() => setTab(t)}
                    className={`h-9 rounded-full px-5 text-sm font-medium capitalize transition ${tab === t ? "bg-ink text-paper" : "hover:bg-paper-2"}`}
                  >
                    {t === "bridge" ? "Bridge to Arc" : "Swap"}
                  </button>
                ))}
              </div>
              {tab === "swap" ? <SwapPanel /> : <BridgePanel />}
            </div>
            <Balances />
          </div>
        )}
      </div>
    </>
  );
}

/** Wallet adapter for App Kit, after making sure the wallet is on `chainId`. */
function useAdapter() {
  const { connector, chainId: current } = useConnection();
  const switchChain = useSwitchChain();
  return async (chainId: number) => {
    if (!connector) throw new Error("Wallet not connected");
    if (current !== chainId) await switchChain.mutateAsync({ chainId });
    const provider = (await connector.getProvider()) as EIP1193Provider;
    return createViemAdapterFromProvider({ provider });
  };
}

function useTokenBalance(token: `0x${string}`) {
  const { address } = useConnection();
  return useReadContract({
    address: token,
    abi: usdcAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: chain.id,
    query: { enabled: !!address, refetchInterval: 10_000 },
  });
}

function Balances() {
  const usdc = useTokenBalance(USDC);
  const eurc = useTokenBalance(EURC);
  return (
    <aside className="flex flex-col justify-between gap-8 self-start bg-red p-6 text-red-ink lg:sticky lg:top-6 lg:aspect-square">
      <p className="text-[11px] font-medium uppercase tracking-wider">On {chain.name}</p>
      <div className="grid gap-5">
        {[
          ["USDC", usdc.data],
          ["EURC", eurc.data],
        ].map(([name, v]) => (
          <p key={name as string}>
            <span className="block text-[44px] font-semibold leading-none tracking-[-0.06em]">{v !== undefined ? usd(v as bigint) : "…"}</span>
            <span className="text-[11px] font-medium">{name as string}</span>
          </p>
        ))}
      </div>
      <p className="text-xs">USDC is also Arc’s gas token — one balance pays for everything.</p>
    </aside>
  );
}

// ---------------- swap ----------------

type Reviewed = { estimate: SwapEstimate; tokenIn: SwapToken; tokenOut: SwapToken; amountIn: string; account: string };

function SwapPanel() {
  const { address } = useConnection();
  const getAdapter = useAdapter();
  const qc = useQueryClient();
  const [tokenIn, setTokenIn] = useState<SwapToken>("USDC");
  const [amount, setAmount] = useState("");
  const [reviewed, setReviewed] = useState<Reviewed | null>(null);
  const [busy, setBusy] = useState<"quote" | "swap" | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ out: string; token: string; url?: string } | null>(null);
  const balanceIn = useTokenBalance(TOKEN_ADDRESS[tokenIn]);

  const tokenOut = SWAP_TOKENS.find((t) => t !== tokenIn)!;
  // a quote only stays valid for exactly what was reviewed
  const stale = !!reviewed && (reviewed.tokenIn !== tokenIn || reviewed.amountIn !== amount || reviewed.account !== address);

  function reset(next: () => void) {
    next();
    setReviewed(null);
    setDone(null);
    setError("");
  }

  async function quote() {
    setError("");
    if (!isAmount(amount)) return setError("Enter an amount like 10 or 2.50.");
    setBusy("quote");
    try {
      const adapter = await getAdapter(chain.id);
      const estimate = await getKit().estimateSwap({
        from: { adapter, chain: ARC_KIT },
        tokenIn,
        tokenOut,
        amountIn: amount,
        config: { slippageBps: 100 },
      });
      setReviewed({ estimate, tokenIn, tokenOut, amountIn: amount, account: address! });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(null);
    }
  }

  // only ever called from the Swap button, after the quote above is on screen
  async function swap() {
    if (!reviewed || stale) return setError("Get a fresh quote first.");
    setBusy("swap");
    setError("");
    try {
      const adapter = await getAdapter(chain.id);
      const result = await getKit().swap({
        from: { adapter, chain: ARC_KIT },
        tokenIn: reviewed.tokenIn,
        tokenOut: reviewed.tokenOut,
        amountIn: reviewed.amountIn,
        config: { slippageBps: 100 },
      });
      setDone({ out: result.amountOut ?? reviewed.estimate.estimatedOutput.amount, token: reviewed.tokenOut, url: result.explorerUrl });
      setReviewed(null);
      setAmount("");
      await qc.invalidateQueries();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(null);
    }
  }

  const overBalance = balanceIn.data !== undefined && isAmount(amount) && Number(amount) * 1e6 > Number(balanceIn.data);
  const fees = reviewed?.estimate.fees?.map((f) => `${f.amount} ${f.token}`).join(" + ");

  return (
    <div className="grid max-w-xl gap-6">
      <label className="grid gap-2">
        <span className={label}>You pay</span>
        <div className="flex gap-2">
          <input
            className={`${field} font-mono`}
            inputMode="decimal"
            placeholder="10.00"
            value={amount}
            onChange={(e) => reset(() => setAmount(e.target.value.replace(/[^\d.]/g, "")))}
          />
          <span className="grid w-24 place-items-center rounded-xl border border-line font-medium">{tokenIn}</span>
        </div>
        <span className="text-xs text-muted">
          Balance: {balanceIn.data !== undefined ? usd(balanceIn.data) : "…"} {tokenIn}
          {overBalance && <span className="text-red"> · more than you have</span>}
          {isAmount(amount) && Number(amount) > 100 && <span> · large amount, double-check it</span>}
        </span>
      </label>

      <button
        className={`${btnGhost} w-11 self-center px-0`}
        aria-label="Flip direction"
        onClick={() => reset(() => setTokenIn(tokenOut))}
      >
        <ArrowDownUp className="size-4" aria-hidden />
      </button>

      <div className="grid gap-2">
        <span className={label}>You receive</span>
        <p className="flex items-baseline justify-between rounded-xl border border-line bg-paper-2 px-4 py-3">
          <span className="font-mono text-lg">{reviewed && !stale ? `≈ ${reviewed.estimate.estimatedOutput.amount}` : "—"}</span>
          <span className="font-medium">{tokenOut}</span>
        </p>
      </div>

      {reviewed && !stale && (
        <dl className="grid gap-1 border-t border-line pt-4 text-sm">
          <Row k="Minimum received" v={`${reviewed.estimate.stopLimit.amount} ${reviewed.estimate.stopLimit.token}`} />
          <Row k="Slippage limit" v="1%" />
          {fees && <Row k="Fees" v={fees} />}
          <Row k="Network" v={chain.name} />
          <p className="mt-2 text-xs text-muted">
            Routed through a third-party DEX aggregator (currently LiFi; it may vary by route). By swapping you accept the aggregator’s terms.
          </p>
        </dl>
      )}

      <div className="flex flex-wrap gap-3">
        <button className={btnGhost} disabled={!!busy || !isAmount(amount)} onClick={quote}>
          {busy === "quote" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null} {reviewed && !stale ? "Refresh quote" : "Get quote"}
        </button>
        <button className={btn} disabled={!!busy || !reviewed || stale || overBalance} onClick={swap}>
          {busy === "swap" ? "Swapping…" : reviewed && !stale ? `Swap ${reviewed.amountIn} ${tokenIn} → ${tokenOut}` : "Swap"}
        </button>
      </div>

      {error && <p role="alert" className="text-sm text-red">{error}</p>}
      {done && (
        <p className="flex items-center gap-2 text-sm">
          <Check className="size-4" aria-hidden /> Received {done.out} {done.token}.
          {done.url && <ExplorerLink href={done.url} />}
        </p>
      )}
    </div>
  );
}

// ---------------- bridge ----------------

type StepName = "approve" | "burn" | "fetchAttestation" | "mint";
const STEPS: { name: StepName; label: string }[] = [
  { name: "approve", label: "Approve USDC" },
  { name: "burn", label: "Burn on source chain" },
  { name: "fetchAttestation", label: "Circle attestation" },
  { name: "mint", label: `Mint on ${chain.name}` },
];
type BridgeResult = Awaited<ReturnType<AppKit["bridge"]>>;
type Estimate = Awaited<ReturnType<AppKit["estimateBridge"]>>;

function BridgePanel() {
  const { address } = useConnection();
  const getAdapter = useAdapter();
  const qc = useQueryClient();
  const [source, setSource] = useState(BRIDGE_SOURCES[0]);
  const [amount, setAmount] = useState("");
  const [estimate, setEstimate] = useState<{ value: Estimate; key: string } | null>(null);
  const [busy, setBusy] = useState<"estimate" | "bridge" | null>(null);
  const [steps, setSteps] = useState<Partial<Record<StepName, { state: string; url?: string }>>>({});
  const [result, setResult] = useState<BridgeResult | null>(null);
  const [error, setError] = useState("");

  const key = `${source.kit}|${amount}|${address}`;
  const fresh = estimate?.key === key;

  // Circle's Forwarding Service mints on Arc for us, so the user only signs on the source chain
  const params = (adapter: Awaited<ReturnType<ReturnType<typeof useAdapter>>>) => ({
    from: { adapter, chain: source.kit },
    to: { recipientAddress: address!, chain: ARC_KIT, useForwarder: true as const },
    amount,
  });

  async function estimateFees() {
    setError("");
    if (!isAmount(amount)) return setError("Enter an amount like 10 or 2.50.");
    setBusy("estimate");
    try {
      const adapter = await getAdapter(source.viem.id);
      setEstimate({ value: await getKit().estimateBridge(params(adapter)), key });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(null);
    }
  }

  // live progress: App Kit emits one event per CCTP step
  const onEvent = (payload: unknown) => {
    const { method, values } = payload as { method?: string; values?: { state?: string; explorerUrl?: string } };
    if (!STEPS.some((s) => s.name === method)) return;
    setSteps((s) => ({ ...s, [method as StepName]: { state: values?.state ?? "success", url: values?.explorerUrl } }));
  };

  async function run(retry: boolean) {
    setBusy("bridge");
    setError("");
    const k = getKit();
    k.on("*", onEvent);
    try {
      const adapter = await getAdapter(source.viem.id);
      const res = retry && result ? await k.retryBridge(result, { from: adapter, to: adapter }) : await k.bridge(params(adapter));
      setResult(res);
      for (const s of res.steps) {
        const name = s.name as StepName;
        setSteps((prev) => ({ ...prev, [name]: { state: s.state, url: s.explorerUrl } }));
      }
      if (res.state === "error") setError(res.steps.find((s) => s.state === "error")?.errorMessage ?? "Bridge stopped part-way. You can resume it — funds already burned are not lost.");
      if (res.state === "success") await qc.invalidateQueries();
    } catch (e) {
      setError(errorText(e));
    } finally {
      k.off("*", onEvent);
      setBusy(null);
    }
  }

  const fees = estimate?.value.fees.filter((f) => f.amount).map((f) => `${f.amount} ${f.token} (${f.type})`);
  const started = Object.keys(steps).length > 0;

  return (
    <div className="grid max-w-xl gap-6">
      <label className="grid gap-2">
        <span className={label}>From</span>
        <select
          className={field}
          value={source.kit}
          disabled={!!busy}
          onChange={(e) => {
            setSource(BRIDGE_SOURCES.find((s) => s.kit === e.target.value)!);
            setResult(null);
            setSteps({});
          }}
        >
          {BRIDGE_SOURCES.map((s) => (
            <option key={s.kit} value={s.kit}>
              {s.viem.name}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-2">
        <span className={label}>Amount (USDC)</span>
        <input
          className={`${field} font-mono`}
          inputMode="decimal"
          placeholder="10.00"
          value={amount}
          disabled={!!busy}
          onChange={(e) => {
            setAmount(e.target.value.replace(/[^\d.]/g, ""));
            setResult(null);
            setSteps({});
          }}
        />
        <span className="text-xs text-muted">
          Arrives in your connected wallet on {chain.name} in about 20 seconds (CCTP fast transfer).
          {isAmount(amount) && Number(amount) > 100 && " Large amount — double-check it."}
        </span>
      </label>

      {fresh && (
        <dl className="grid gap-1 border-t border-line pt-4 text-sm">
          <Row k="Route" v={`${source.viem.name} → ${chain.name}`} />
          <Row k="Recipient" v="Your connected wallet" />
          <Row k="Fees" v={fees?.length ? fees.join(" + ") : "Network gas only"} />
          <p className="mt-2 text-xs text-muted">Uses Circle CCTP. Your wallet will ask you to approve USDC, then to burn it on {source.viem.name}.</p>
        </dl>
      )}

      <div className="flex flex-wrap gap-3">
        <button className={btnGhost} disabled={!!busy || !isAmount(amount)} onClick={estimateFees}>
          {busy === "estimate" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null} {fresh ? "Refresh estimate" : "Check fees"}
        </button>
        {result?.state === "error" ? (
          <button className={btn} disabled={!!busy} onClick={() => run(true)}>
            {busy === "bridge" ? "Resuming…" : "Resume bridge"}
          </button>
        ) : (
          <button className={btn} disabled={!!busy || !fresh} onClick={() => run(false)}>
            {busy === "bridge" ? "Bridging…" : fresh ? `Bridge ${amount} USDC to ${chain.name}` : "Bridge"}
          </button>
        )}
      </div>

      {started && (
        <ol className="grid gap-2 border-t border-line pt-4 text-sm">
          {STEPS.map(({ name, label: text }) => {
            const s = steps[name];
            return (
              <li key={name} className="flex items-center gap-3">
                <span className={`grid size-5 place-items-center rounded-full text-[10px] ${s?.state === "success" ? "bg-ink text-paper" : s?.state === "error" ? "bg-red text-red-ink" : "border border-line"}`}>
                  {s?.state === "success" ? <Check className="size-3" aria-hidden /> : s?.state === "error" ? "!" : ""}
                </span>
                <span className={s ? "" : "text-muted"}>{text}</span>
                {s?.url && <ExplorerLink href={s.url} />}
              </li>
            );
          })}
        </ol>
      )}

      {error && <p role="alert" className="text-sm text-red">{error}</p>}
      {result?.state === "success" && <p className="flex items-center gap-2 text-sm"><Check className="size-4" aria-hidden /> {result.amount} USDC is on {chain.name}.</p>}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right font-mono text-xs leading-5">{v}</dd>
    </div>
  );
}

function ExplorerLink({ href }: { href: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="link inline-flex items-center gap-0.5 text-xs">
      View <ArrowUpRight className="size-3" aria-hidden />
    </a>
  );
}
