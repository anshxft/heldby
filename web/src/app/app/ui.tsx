"use client";

import Link from "next/link";
import { ArrowUpRight, ChevronDown, LogOut, Repeat } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { useConnect, useConnection, useConnectors, useDisconnect, useReadContract, useSwitchChain } from "wagmi";
import { type Status, USDC, errorText, short, usd, usdcAbi } from "@/lib/escrow";
import { NETWORKS, type NetworkId, explorer } from "@/lib/networks";
import { setNetwork, useNetwork } from "./network";

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

  if (!isConnected)
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex flex-wrap justify-end gap-2">
          {choices.map((c) => (
            <button
              key={c.uid}
              className={btn}
              disabled={connect.isPending}
              onClick={async () => {
                setError("");
                try {
                  // always show the wallet's account picker, even if this site was approved before
                  const p = (await c.getProvider()) as Provider;
                  await p.request({ method: "wallet_requestPermissions", params: perms });
                } catch (e) {
                  if ((e as { code?: number }).code === 4001) return; // user closed the picker
                }
                connect.mutate({ connector: c }, { onError: (e) => setError(errorText(e)) });
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- wallet icons are tiny data: URIs */}
              {c.icon && <img src={c.icon} alt="" className="size-5" />}
              {connect.isPending ? "Connecting…" : choices.length > 1 ? c.name : "Connect wallet"}
            </button>
          ))}
        </div>
        {error && <p className="text-xs text-red">{error}</p>}
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
  const net = useNetwork();
  return (
    <Link href={explorer(net, `tx/${hash}`)} target="_blank" className="link inline-flex items-center gap-0.5 font-mono text-xs">
      {short(hash)} <ArrowUpRight className="size-3" aria-hidden />
    </Link>
  );
}

export function NotDeployed() {
  return (
    <div className="flex flex-col items-start gap-4 py-10">
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
          className={`flex h-8 items-center gap-1.5 rounded-full px-3 transition ${net.id === id ? (id === "mainnet" ? "bg-red text-red-ink" : "bg-ink text-paper") : "text-muted hover:text-ink"}`}
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
