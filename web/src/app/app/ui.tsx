"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, ChevronDown, LayoutList, LogOut, Plus, Repeat, WalletMinimal } from "lucide-react";
import { animate } from "animejs";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useConnect, useConnection, useConnectors, useDisconnect, useReadContract, useSwitchChain } from "wagmi";
import { type Status, USDC, errorText, short, usdcAbi } from "@/lib/escrow";
import { formatUnits } from "viem";
import { NETWORKS, type NetworkId, explorer } from "@/lib/networks";
import { setNetwork, useNetwork } from "./network";

export const btn =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-paper transition hover:bg-red hover:text-red-ink active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40";
export const btnGhost =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-ink/20 px-5 text-sm font-medium transition hover:border-ink active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40";
export const field =
  "w-full rounded-xl border border-line bg-paper-2 px-4 py-3 text-base outline-none transition placeholder:text-muted/70 focus:border-ink";
export const label = "text-[11px] font-medium uppercase tracking-wider text-muted";

const subscribeClock = (cb: () => void) => {
  const t = setInterval(cb, 30_000);
  return () => clearInterval(t);
};
/** Current unix time in seconds, refreshed every 30s (0 during SSR). Keeps render pure. */
export const useNow = () =>
  useSyncExternalStore(subscribeClock, () => Math.floor(Date.now() / 30_000) * 30, () => 0);

type Provider = { request(a: { method: string; params?: unknown[] }): Promise<unknown> };
// Asking for eth_accounts permission makes MetaMask show its account picker.
const perms = [{ eth_accounts: {} }];

/** Connect → switch network → show address + USDC balance. */
export function Wallet() {
  const [error, setError] = useState("");
  const { address, chainId, isConnected, connector } = useConnection();
  const connectors = useConnectors();
  const connect = useConnect();
  const disconnect = useDisconnect();
  const switchChain = useSwitchChain();
  const { chain } = useNetwork();
  const balance = useReadContract({
    address: USDC,
    abi: usdcAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: chain.id,
    query: { enabled: !!address, refetchInterval: 10_000 },
  });

  // EIP-6963 wallets announce themselves by name; prefer those over the generic window.ethereum,
  // which another extension may have hijacked. MetaMask first.
  const named = connectors.filter((c) => c.id !== "injected");
  const choices = (named.length ? named : connectors).toSorted((a, b) => Number(b.id === "io.metamask") - Number(a.id === "io.metamask"));

  const pick = async (c: (typeof choices)[number], e?: React.MouseEvent) => {
    e?.currentTarget.closest("details")?.removeAttribute("open");
    setError("");
    try {
      // always show the wallet's account picker, even if this site was approved before
      const p = (await c.getProvider()) as Provider;
      await p.request({ method: "wallet_requestPermissions", params: perms });
    } catch (err) {
      if ((err as { code?: number }).code === 4001) return; // user closed the picker
    }
    connect.mutate({ connector: c }, { onError: (err) => setError(errorText(err)) });
  };
  const connectLabel = connect.isPending ? "Connecting…" : <><span className="sm:hidden">Connect</span><span className="hidden sm:inline">Connect wallet</span></>;

  if (!isConnected)
    return (
      <div className="relative flex flex-col items-end gap-1">
        {choices.length <= 1 ? (
          <button className={btn} disabled={connect.isPending || !choices[0]} onClick={() => choices[0] && pick(choices[0])}>
            {connectLabel}
          </button>
        ) : (
          // several wallet extensions installed: one button, pick from a list (fits a phone header)
          <details className="group relative">
            <summary className={`${btn} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
              {connectLabel}
              <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <div className="absolute right-0 z-20 mt-2 w-60 rounded-2xl border border-line bg-paper-2 p-2 text-sm shadow-xl">
              {choices.map((c) => (
                <button key={c.uid} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-paper" disabled={connect.isPending} onClick={(e) => pick(c, e)}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- wallet icons are tiny data: URIs */}
                  {c.icon ? <img src={c.icon} alt="" className="size-6" /> : <span className="size-6 rounded-full bg-line" />}
                  {c.name}
                </button>
              ))}
            </div>
          </details>
        )}
        {error && <p className="absolute top-full mt-1 max-w-60 text-right text-xs text-red">{error}</p>}
      </div>
    );

  if (chainId !== chain.id)
    return (
      <button className={`${btn} bg-red text-red-ink`} onClick={() => switchChain.mutate({ chainId: chain.id })}>
        Switch to {chain.name}
      </button>
    );

  const wallet = async () => (await connector!.getProvider()) as Provider;
  const close = (e: React.MouseEvent) => e.currentTarget.closest("details")?.removeAttribute("open");

  return (
    <details className="group relative">
      <summary className={`${btnGhost} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
        <span className="hidden font-mono sm:inline"><CountUp value={balance.data} /> USDC</span>
        <span className="hidden h-4 w-px bg-line sm:block" />
        <span className="font-mono text-muted">{short(address!)}</span>
        <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-64 rounded-2xl border border-line bg-paper-2 p-2 text-sm shadow-xl">
        <p className="break-all px-3 py-2 font-mono text-xs text-muted">{address}</p>
        <button
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left hover:bg-paper"
          onClick={async (e) => {
            close(e);
            setError("");
            await (await wallet())
              .request({ method: "wallet_requestPermissions", params: perms })
              .catch((err) => (err as { code?: number }).code !== 4001 && setError(errorText(err)));
          }}
        >
          <Repeat className="size-4" aria-hidden /> Switch account
        </button>
        <button
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-red hover:bg-paper"
          onClick={async (e) => {
            close(e);
            // revoke so the next "Connect" asks which account to use instead of silently reusing this one
            await (await wallet()).request({ method: "wallet_revokePermissions", params: perms }).catch(() => {});
            disconnect.mutate();
          }}
        >
          <LogOut className="size-4" aria-hidden /> Disconnect
        </button>
        <p className="px-3 pt-1 text-[11px] text-muted">Using {connector?.name}</p>
      </div>
      {error && <p className="absolute right-0 mt-1 text-xs text-red">{error}</p>}
    </details>
  );
}

/** Gate for escrow pages: the contract must exist on this network and the wallet must be on it. */
export function NeedsWallet({ children }: { children: React.ReactNode }) {
  const { isConnected, chainId } = useConnection();
  const net = useNetwork();
  const { chain } = net;
  if (!net.escrow) return <NotDeployed />;
  if (isConnected && chainId === chain.id) return children;
  return (
    <div className="flex flex-col items-start gap-5 py-10" data-reveal>
      <p className="max-w-md text-lg">
        {isConnected ? `Switch your wallet to ${chain.name} to continue.` : "Connect a wallet to see and create escrows."}
      </p>
      <Wallet />
    </div>
  );
}

const pill: Record<Status, string> = {
  None: "border-line text-muted",
  Funded: "border-ink",
  Submitted: "border-ink bg-ink text-paper",
  Disputed: "border-red bg-red text-red-ink",
  Released: "border-transparent bg-paper-2 text-muted",
  Refunded: "border-transparent bg-paper-2 text-muted",
  Resolved: "border-transparent bg-paper-2 text-muted",
};

export function StatusPill({ status }: { status: Status }) {
  return (
    // keyed by status so a change remounts it and pops in
    <span key={status} data-reveal="pop" className={`inline-flex h-7 items-center rounded-full border px-3 text-xs font-medium ${pill[status]}`}>
      {status}
    </span>
  );
}

export function TxLink({ hash }: { hash: string }) {
  const net = useNetwork();
  return (
    <Link href={explorer(net, `tx/${hash}`)} target="_blank" className="link inline-flex items-center gap-0.5 font-mono text-xs">
      {short(hash)} <ArrowUpRight className="size-3" aria-hidden />
    </Link>
  );
}

export function NotDeployed() {
  return (
    <div className="flex flex-col items-start gap-4 py-10" data-reveal>
      <p className="max-w-md text-lg">Heldby escrow isn’t live on Arc mainnet yet — it’s coming soon.</p>
      <p className="max-w-md text-sm text-muted">Swap and bridge already work on mainnet from the Wallet page. Switch to Testnet to try escrows now.</p>
      <button className={btnGhost} onClick={() => setNetwork("testnet")}>
        Switch to Testnet
      </button>
    </div>
  );
}

/** Testnet | Mainnet toggle. Also moves a connected wallet to the chosen Arc network. */
export function NetworkSwitch() {
  const net = useNetwork();
  const { isConnected } = useConnection();
  const switchChain = useSwitchChain();
  const pick = (id: NetworkId) => {
    if (id === net.id) return;
    setNetwork(id);
    if (isConnected) switchChain.mutate({ chainId: NETWORKS[id].chain.id });
  };
  return (
    <div role="radiogroup" aria-label="Network" className="inline-flex rounded-full border border-line p-0.5 text-xs font-medium">
      {(["testnet", "mainnet"] as const).map((id) => (
        <button
          key={id}
          role="radio"
          aria-checked={net.id === id}
          onClick={() => pick(id)}
          className={`flex h-8 items-center gap-1.5 rounded-full px-2.5 transition sm:px-3 ${net.id === id ? (id === "mainnet" ? "bg-red text-red-ink" : "bg-ink text-paper") : "text-muted hover:text-ink"}`}
        >
          <span className={`size-1.5 rounded-full ${id === "mainnet" ? "bg-current" : "border border-current"}`} aria-hidden />
          {NETWORKS[id].label}
        </button>
      ))}
    </div>
  );
}

/** Footer line that follows the selected network. */
export function NetworkNote() {
  const net = useNetwork();
  return (
    <>
      <span>Heldby · {net.chain.name}</span>
      <span>{net.testnet ? "Test funds only" : "Real funds — mainnet"}</span>
    </>
  );
}

/** Page heading in the landing-page style: each line rises out of its mask (CSS in globals.css). */
export function Title({ lines, className = "text-[clamp(44px,7vw,104px)]" }: { lines: string[]; className?: string }) {
  return (
    <h1 data-reveal="title" className={`display ${className}`}>
      {lines.map((l, i) => (
        <span key={l} className={`line ${i ? "ml-[0.6em]" : ""}`}>
          <span>{l}</span>
        </span>
      ))}
    </h1>
  );
}

/** A 6-decimal token amount that counts up/down to its new value. Text is written by the effect only. */
export function CountUp({ value }: { value: bigint | undefined }) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (value === undefined) return void (el.textContent = "…");
    const to = Number(formatUnits(value, 6));
    const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return void (el.textContent = fmt((shown.current = to)));
    const state = { n: shown.current };
    shown.current = to;
    const a = animate(state, { n: to, duration: 1000, ease: "out(3)", onUpdate: () => void (el.textContent = fmt(state.n)) });
    return () => void a.pause();
  }, [value]);
  return <span ref={ref} />;
}

/** Phone navigation: the header has no room for links, so they live in a bar pinned to the bottom. */
export function MobileNav() {
  const path = usePathname();
  const items = [
    { href: "/app", label: "Escrows", Icon: LayoutList, on: path === "/app" || path.startsWith("/app/deal") },
    { href: "/app/new", label: "New escrow", Icon: Plus, on: path === "/app/new" },
    { href: "/app/wallet", label: "Wallet", Icon: WalletMinimal, on: path === "/app/wallet" },
  ];
  return (
    <nav aria-label="App" className="fixed inset-x-2 bottom-2 z-40 grid grid-cols-3 rounded-[22px] bg-ink p-1.5 text-paper shadow-2xl sm:hidden">
      {items.map(({ href, label: text, Icon, on }) => (
        <Link
          key={href}
          href={href}
          aria-current={on ? "page" : undefined}
          className={`flex flex-col items-center gap-0.5 rounded-2xl py-2 text-[11px] font-medium transition ${on ? "bg-red text-red-ink" : "text-paper/70 active:bg-paper/10"}`}
        >
          <Icon className="size-5" aria-hidden />
          {text}
        </Link>
      ))}
    </nav>
  );
}

/** Grey placeholder blocks shaped like the content that is loading. */
export function Skeleton({ rows = 3, kind = "list" }: { rows?: number; kind?: "list" | "deal" }) {
  const bar = "rounded-md bg-ink/[0.07] animate-pulse";
  if (kind === "deal")
    return (
      <div role="status" aria-label="Loading escrow" className="grid gap-6">
        <div className={`${bar} h-4 w-40`} />
        <div className={`${bar} h-12 w-3/4`} />
        <div className="grid grid-cols-4 gap-1">{[0, 1, 2, 3].map((i) => <div key={i} className={`${bar} h-1`} />)}</div>
        <div className="grid gap-3 lg:w-2/3">{[0, 1, 2, 3].map((i) => <div key={i} className={`${bar} h-10`} />)}</div>
      </div>
    );
  return (
    <ul role="status" aria-label="Loading escrows" className="border-b border-line">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="grid grid-cols-[3rem_1fr_6rem] items-center gap-4 border-t border-line py-5">
          <div className={`${bar} h-3 w-6`} />
          <div className="grid gap-2">
            <div className={`${bar} h-5 w-2/3`} />
            <div className={`${bar} h-3 w-32`} />
          </div>
          <div className={`${bar} h-7 w-20 justify-self-end rounded-full`} />
        </li>
      ))}
    </ul>
  );
}
