"use client";

import Link from "next/link";
import { ArrowUpRight, ChevronDown, LogOut, Repeat } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useConnect, useConnection, useConnectors, useDisconnect, useReadContract, useSwitchChain } from "wagmi";
import { type Status, USDC, chain, short, usd, usdcAbi } from "@/lib/escrow";

export const btn =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-paper transition hover:bg-red hover:text-red-ink disabled:pointer-events-none disabled:opacity-40";
export const btnGhost =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-ink/20 px-5 text-sm font-medium transition hover:border-ink disabled:pointer-events-none disabled:opacity-40";
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

/** Connect → switch network → show address + USDC balance. */
export function Wallet() {
  const { address, chainId, isConnected, connector } = useConnection();
  const connectors = useConnectors();
  const connect = useConnect();
  const disconnect = useDisconnect();
  const switchChain = useSwitchChain();
  const balance = useReadContract({
    address: USDC,
    abi: usdcAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 10_000 },
  });

  if (!isConnected)
    return (
      <button
        className={btn}
        disabled={connect.isPending}
        onClick={() => connectors[0] && connect.mutate({ connector: connectors[0] })}
      >
        {connect.isPending ? "Connecting…" : "Connect wallet"}
      </button>
    );

  if (chainId !== chain.id)
    return (
      <button className={`${btn} bg-red text-red-ink`} onClick={() => switchChain.mutate({ chainId: chain.id })}>
        Switch to {chain.name}
      </button>
    );

  // MetaMask remembers which accounts this site may use; these two calls open its account picker.
  const wallet = async () => (await connector!.getProvider()) as { request(a: { method: string; params?: unknown[] }): Promise<unknown> };
  const perms = [{ eth_accounts: {} }];
  const close = (e: React.MouseEvent) => e.currentTarget.closest("details")?.removeAttribute("open");

  return (
    <details className="group relative">
      <summary className={`${btnGhost} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
        <span className="font-mono">{balance.data !== undefined ? usd(balance.data) : "…"} USDC</span>
        <span className="h-4 w-px bg-line" />
        <span className="font-mono text-muted">{short(address!)}</span>
        <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-64 rounded-2xl border border-line bg-paper-2 p-2 text-sm shadow-xl">
        <p className="break-all px-3 py-2 font-mono text-xs text-muted">{address}</p>
        <button
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left hover:bg-paper"
          onClick={async (e) => {
            close(e);
            await (await wallet()).request({ method: "wallet_requestPermissions", params: perms }).catch(() => {});
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
      </div>
    </details>
  );
}

/** Gate for pages that need a connected wallet on the right chain. */
export function NeedsWallet({ children }: { children: React.ReactNode }) {
  const { isConnected, chainId } = useConnection();
  if (isConnected && chainId === chain.id) return children;
  return (
    <div className="flex flex-col items-start gap-5 py-10">
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
    <span className={`inline-flex h-7 items-center rounded-full border px-3 text-xs font-medium ${pill[status]}`}>
      {status}
    </span>
  );
}

export function TxLink({ hash }: { hash: string }) {
  return (
    <Link href={`${chain.blockExplorers.default.url}/tx/${hash}`} target="_blank" className="link inline-flex items-center gap-0.5 font-mono text-xs">
      {short(hash)} <ArrowUpRight className="size-3" aria-hidden />
    </Link>
  );
}
