"use client";

import { createViemAdapterFromProvider } from "@circle-fin/adapter-viem-v2";
import { AppKit } from "@circle-fin/app-kit";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownUp, ArrowUpRight, Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { type EIP1193Provider, formatUnits, parseUnits } from "viem";
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

/** Settles a typed value after `ms` without a new keystroke. */
function useDebounced<T>(value: T, ms: number) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return settled;
}

function SwapPanel() {
  const { address, connector, chainId } = useConnection();
  const switchChain = useSwitchChain();
  const qc = useQueryClient();
  const [tokenIn, setTokenIn] = useState<SwapToken>("USDC");
  const [amount, setAmount] = useState("");
  const [swapping, setSwapping] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ out: string; token: string; url?: string } | null>(null);
  const balanceIn = useTokenBalance(TOKEN_ADDRESS[tokenIn]);
  const tokenOut = SWAP_TOKENS.find((t) => t !== tokenIn)!;
  const onArc = chainId === chain.id;
  const typed = useDebounced(amount, 400);

  const adapter = async () => createViemAdapterFromProvider({ provider: (await connector!.getProvider()) as EIP1193Provider });
  const request = (amountIn: string) => ({ tokenIn, tokenOut, amountIn, config: { slippageBps: 100 } });

  // live quote: refetches as you type (debounced) and every 15s while visible
  const quote = useQuery({
    queryKey: ["swap-quote", tokenIn, typed, address],
    enabled: isAmount(typed) && onArc && !!connector,
    refetchInterval: 15_000,
    retry: 1,
    queryFn: async () => getKit().estimateSwap({ from: { adapter: await adapter(), chain: ARC_KIT }, ...request(typed) }),
  });

  const balance = balanceIn.data;
  const tooMuch = balance !== undefined && isAmount(amount) && parseUnits(amount, 6) > balance;
  const current = quote.data && typed === amount ? quote.data : undefined;

  // only ever called from the Swap button, with the quote on screen
  async function swap() {
    setSwapping(true);
    setError("");
    setDone(null);
    try {
      const result = await getKit().swap({ from: { adapter: await adapter(), chain: ARC_KIT }, ...request(amount) });
      setDone({ out: result.amountOut ?? current?.estimatedOutput.amount ?? "", token: tokenOut, url: result.explorerUrl });
      setAmount("");
      await qc.invalidateQueries();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setSwapping(false);
    }
  }

  const action: { label: string; run?: () => void } = !onArc
    ? { label: `Switch to ${chain.name}`, run: () => switchChain.mutate({ chainId: chain.id }) }
    : !amount
      ? { label: "Enter an amount" }
      : !isAmount(amount)
        ? { label: "Invalid amount" }
        : tooMuch
          ? { label: `Insufficient ${tokenIn} balance` }
          : swapping
            ? { label: "Swapping…" }
            : !current
              ? { label: quote.isError ? "No route right now" : "Fetching best price…" }
              : { label: `Swap ${amount} ${tokenIn} → ${tokenOut}`, run: swap };

  const rate = current && Number(current.estimatedOutput.amount) / Number(current.amountIn);
  const fees = current?.fees?.map((f) => `${Number(f.amount).toFixed(4)} ${f.token}`).join(" + ");

  return (
    <div className="grid max-w-xl gap-1">
      <div className="rounded-2xl border border-line bg-paper-2 p-4">
        <div className="flex items-center justify-between">
          <span className={label}>You pay</span>
          <span className="text-xs text-muted">
            Balance {balance !== undefined ? usd(balance) : "…"}
            {balance !== undefined && balance > 0n && (
              <button className="ml-2 font-medium text-ink underline-offset-2 hover:underline" onClick={() => setAmount(formatUnits(balance, 6))}>
                Max
              </button>
            )}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <input
            aria-label={`Amount of ${tokenIn} to pay`}
            className="w-full bg-transparent font-mono text-3xl tracking-tight outline-none placeholder:text-muted/50"
            inputMode="decimal"
            placeholder="0"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value.replace(/[^\d.]/g, ""));
              setDone(null);
              setError("");
            }}
          />
          <TokenChip token={tokenIn} />
        </div>
      </div>

      <button
        aria-label="Switch pay and receive tokens"
        onClick={() => setTokenIn(tokenOut)}
        className="relative z-10 -my-4 grid size-10 place-items-center justify-self-center rounded-xl border-4 border-paper bg-ink text-paper transition-transform duration-300 hover:rotate-180"
      >
        <ArrowDownUp size={16} aria-hidden />
      </button>

      <div className="rounded-2xl border border-line bg-paper-2 p-4">
        <span className={label}>You receive</span>
        <div className="mt-2 flex items-center gap-3">
          <p className={`w-full font-mono text-3xl tracking-tight ${current ? "" : "text-muted/50"} ${quote.isFetching && !current ? "animate-pulse" : ""}`}>
            {current ? Number(current.estimatedOutput.amount).toFixed(4) : "0"}
          </p>
          <TokenChip token={tokenOut} />
        </div>
      </div>

      <button className={`${btn} mt-4 h-14 w-full text-base`} disabled={!action.run} onClick={action.run}>
        {(swapping || (quote.isFetching && !current && isAmount(amount))) && <Loader2 size={16} className="animate-spin" aria-hidden />}
        {action.label}
      </button>

      {current && (
        <dl className="mt-4 grid gap-1.5 text-sm">
          <Row k="Rate" v={`1 ${tokenIn} ≈ ${rate!.toFixed(4)} ${tokenOut}`} />
          <Row k="Minimum received" v={`${Number(current.stopLimit.amount).toFixed(4)} ${current.stopLimit.token}`} />
          <Row k="Max slippage" v="1%" />
          {fees && <Row k="Fees" v={fees} />}
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
            {quote.isFetching && <Loader2 size={12} className="animate-spin" aria-hidden />}
            Live price, refreshes every 15s. Routed via a third-party DEX aggregator (currently LiFi; may vary by route) — swapping accepts its terms.
          </p>
        </dl>
      )}

      {quote.isError && <p role="alert" className="mt-3 text-sm text-red">{errorText(quote.error)}</p>}
      {error && <p role="alert" className="mt-3 text-sm text-red">{error}</p>}
      {done && (
        <p className="mt-3 flex items-center gap-2 text-sm">
          <Check size={16} aria-hidden /> Received {done.out} {done.token}.
          {done.url && <ExplorerLink href={done.url} />}
        </p>
      )}
    </div>
  );
}

function TokenChip({ token }: { token: SwapToken }) {
  return (
    <span className="flex shrink-0 items-center gap-2 rounded-full bg-paper px-3 py-1.5 font-medium shadow-sm ring-1 ring-line">
      <span className={`grid size-6 place-items-center rounded-full text-[11px] font-semibold ${token === "USDC" ? "bg-[#2775ca] text-white" : "bg-ink text-paper"}`}>
        {token === "USDC" ? "$" : "€"}
      </span>
      {token}
    </span>
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
