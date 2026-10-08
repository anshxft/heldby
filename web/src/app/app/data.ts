"use client";

import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
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

// ponytail: reads logs from the deploy block on every load; add an indexer if deal count grows large.
/** Public client + escrow address for the selected network. Only used under NeedsWallet / when escrow exists. */
function useEscrow() {
  const net = useNetwork();
  const client = usePublicClient({ chainId: net.chain.id });
  if (!client) throw new Error("wagmi public client missing");
  const address = net.escrow ?? "0x0000000000000000000000000000000000000000";
  return { net, client, address, base: { address, abi: escrowAbi, fromBlock: net.deployBlock } as const };
}

/** Deals where the connected wallet is client or freelancer, newest first. */
export function useMyDeals() {
  const { address: me } = useConnection();
  const { net, client, address: ESCROW, base } = useEscrow();
  const address = me;
  return useQuery({
    queryKey: ["deals", net.id, address],
    enabled: !!address && !!net.escrow,
    refetchInterval: 15_000,
    queryFn: async (): Promise<Deal[]> => {
      const [mine, forMe] = await Promise.all([
        client.getContractEvents({ ...base, eventName: "DealCreated", args: { client: address } }),
        client.getContractEvents({ ...base, eventName: "DealCreated", args: { freelancer: address } }),
      ]);
      const created = [...mine, ...forMe].sort((a, b) => Number(b.args.id! - a.args.id!));
      const rows = await client.multicall({
        allowFailure: false,
        contracts: created.map((e) => ({ address: ESCROW, abi: escrowAbi, functionName: "deals", args: [e.args.id!] }) as const),
      });
      return created.map((e, i) => toDeal(e.args.id!, rows[i], e.args.terms!));
    },
  });
}

export type DealDetail = Deal & { deliverable?: string; submittedAt?: number; dispute?: { by: Address; reason: string }; resolution?: { toFreelancer: bigint; toClient: bigint; reason: string } };

export function useDeal(id: bigint) {
  const { net, client, address: ESCROW, base } = useEscrow();
  return useQuery({
    queryKey: ["deal", net.id, id.toString()],
    enabled: !!net.escrow,
    refetchInterval: 10_000,
    queryFn: async (): Promise<DealDetail | null> => {
      const args = { id };
      const [row, created, submitted, disputed, resolved] = await Promise.all([
        client.readContract({ address: ESCROW, abi: escrowAbi, functionName: "deals", args: [id] }),
        client.getContractEvents({ ...base, eventName: "DealCreated", args }),
        client.getContractEvents({ ...base, eventName: "WorkSubmitted", args }),
        client.getContractEvents({ ...base, eventName: "Disputed", args }),
        client.getContractEvents({ ...base, eventName: "Resolved", args }),
      ]);
      if (row[4] === 0) return null; // no such deal
      const d = disputed[0]?.args;
      const r = resolved[0]?.args;
      return {
        ...toDeal(id, row, created[0]?.args.terms ?? ""),
        deliverable: submitted[0]?.args.deliverable,
        submittedAt: submitted[0] ? Number((await client.getBlock({ blockNumber: submitted[0].blockNumber })).timestamp) : undefined,
        dispute: d && { by: d.by!, reason: d.reason! },
        resolution: r && { toFreelancer: r.toFreelancer!, toClient: r.toClient!, reason: r.reason! },
      };
    },
  });
}

function toDeal(id: bigint, row: readonly [Address, Address, bigint, number, number], terms: string): Deal {
  const [client, freelancer, amount, deadline, status] = row;
  return { id, client, freelancer, amount, deadline, status: STATUS[status], terms };
}
