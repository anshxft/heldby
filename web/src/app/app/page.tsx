"use client";

import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { useConnection } from "wagmi";
import { short, usd } from "@/lib/escrow";
import { useMyDeals } from "./data";
import { NeedsWallet, StatusPill, btn, label } from "./ui";

export default function Dashboard() {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <h1 className="display text-[clamp(44px,7vw,104px)]">
          Your
          <br />
          <span className="ml-[0.6em]">escrows.</span>
        </h1>
        <Link href="/app/new" className={btn}>
          <Plus className="size-4" aria-hidden /> New escrow
        </Link>
      </div>
      <div className="mt-14">
        <NeedsWallet>
          <DealList />
        </NeedsWallet>
      </div>
    </>
  );
}

function DealList() {
  const { address } = useConnection();
  const { data, isPending, error } = useMyDeals();

  if (isPending) return <p className="text-muted">Loading escrows…</p>;
  if (error) return <p className="text-red">Couldn’t load escrows: {error.message}</p>;
  if (!data.length)
    return (
      <div className="border-t border-line py-10">
        <p className="text-2xl font-medium tracking-tight">No escrows yet.</p>
        <p className="mt-2 text-muted">Create one, or ask a client to send you a Heldby link.</p>
      </div>
    );

  return (
    <ul className="border-b border-line">
      <li className={`hidden grid-cols-[3rem_1fr_7rem_8rem_8rem_1.5rem] gap-4 pb-3 sm:grid ${label}`}>
        <span>#</span>
        <span>Brief</span>
        <span>Role</span>
        <span className="text-right">Amount</span>
        <span>Status</span>
        <span />
      </li>
      {data.map((d) => {
        const role = d.client === address ? "Client" : "Freelancer";
        const other = role === "Client" ? d.freelancer : d.client;
        return (
          <li key={d.id.toString()}>
            <Link
              href={`/app/deal/${d.id}`}
              className="group grid grid-cols-[3rem_1fr_auto] items-center gap-x-4 gap-y-1 border-t border-line py-5 transition-colors hover:text-red sm:grid-cols-[3rem_1fr_7rem_8rem_8rem_1.5rem]"
            >
              <span className="font-mono text-xs text-muted">{d.id.toString().padStart(2, "0")}</span>
              <span className="min-w-0">
                <span className="block truncate text-lg font-medium tracking-tight">{d.terms || "Untitled"}</span>
                <span className="font-mono text-xs text-muted">with {short(other)}</span>
              </span>
              <span className="hidden text-sm sm:block">{role}</span>
              <span className="text-right font-mono text-sm">{usd(d.amount)}</span>
              <span className="col-start-2 sm:col-start-auto">
                <StatusPill status={d.status} />
              </span>
              <ArrowUpRight className="hidden size-4 transition-transform group-hover:rotate-45 sm:block" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
