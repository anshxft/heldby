"use client";

import { useQuery } from "@tanstack/react-query";
import { type Address, zeroAddress } from "viem";
import { useConnection, usePublicClient } from "wagmi";
import { STATUS, type Status, escrowAbi } from "@/lib/escrow";
import { useNetwork } from "./network";

export type Deal = {
  id: bigint;
  client: Address;
  freelancer: Address;
  amount: bigint;
  deadline: number; // unix seconds
  status: Status;
  terms: string;
};

export type DealDetail = Deal & {
  deliverable?: string;
  submittedAt?: number;
  dispute?: { by: Address; reason: string };
  resolution?: { toFreelancer: bigint; toClient: bigint; reason: string };
};

/** Public client + escrow address for the selected network. Only used under NeedsWallet / when escrow exists. */
function useEscrow() {
  const net = useNetwork();
  const client = usePublicClient({ chainId: net.chain.id });
  if (!client) throw new Error("wagmi public client missing");
  return { net, client, address: net.escrow ?? zeroAddress };
}

// Everything comes from contract state (dealsOf + getDeal), never from log scans: RPCs cap eth_getLogs
// ranges, and Arc's fast blocks would blow past that within a day.

/** Deals where the connected wallet is client or freelancer, newest first. */
export function useMyDeals() {
  const { address: me } = useConnection();
  const { net, client, address } = useEscrow();
  return useQuery({
    queryKey: ["deals", net.id, me],
    enabled: !!me && !!net.escrow,
    refetchInterval: 15_000,
    queryFn: async (): Promise<Deal[]> => {
      const ids = await client.readContract({ address, abi: escrowAbi, functionName: "dealsOf", args: [me!] });
      const newest = [...ids].reverse();
      const rows = await client.multicall({
        allowFailure: false,
        contracts: newest.map((id) => ({ address, abi: escrowAbi, functionName: "getDeal", args: [id] }) as const),
      });
      return newest.map((id, i) => toDetail(id, rows[i]));
    },
  });
}

export function useDeal(id: bigint) {
  const { net, client, address } = useEscrow();
  return useQuery({
    queryKey: ["deal", net.id, id.toString()],
    enabled: !!net.escrow,
    refetchInterval: 10_000,
    queryFn: async (): Promise<DealDetail | null> => {
      const row = await client.readContract({ address, abi: escrowAbi, functionName: "getDeal", args: [id] });
      return row[0].status === 0 ? null : toDetail(id, row); // status None = no such deal
    },
  });
}

type Row = readonly [
  { client: Address; freelancer: Address; amount: bigint; deadline: number; submittedAt: number; freelancerBps: number; status: number },
  { terms: string; deliverable: string; disputedBy: Address; disputeReason: string; verdict: string },
];

function toDetail(id: bigint, [d, n]: Row): DealDetail {
  const status = STATUS[d.status];
  const toFreelancer = (d.amount * BigInt(d.freelancerBps)) / 10_000n;
  return {
    id,
    client: d.client,
    freelancer: d.freelancer,
    amount: d.amount,
    deadline: d.deadline,
    status,
    terms: n.terms,
    deliverable: n.deliverable || undefined,
    submittedAt: d.submittedAt || undefined,
    dispute: n.disputedBy !== zeroAddress ? { by: n.disputedBy, reason: n.disputeReason } : undefined,
    resolution: status === "Resolved" ? { toFreelancer, toClient: d.amount - toFreelancer, reason: n.verdict } : undefined,
  };
}
