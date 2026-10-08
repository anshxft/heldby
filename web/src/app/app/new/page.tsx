"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { type Address, isAddress, parseEventLogs, parseUnits } from "viem";
import { useConfig, useConnection } from "wagmi";
import { readContract, waitForTransactionReceipt, writeContract } from "wagmi/actions";
import { USDC, errorText, escrowAbi, usd, usdcAbi } from "@/lib/escrow";
import { useNetwork } from "../network";
import { NeedsWallet, Title, btn, field, label, useNow } from "../ui";

export default function NewEscrow() {
  return (
    <>
      <Title lines={["New", "escrow."]} />
      <div className="mt-14">
        <NeedsWallet>
          <CreateForm />
        </NeedsWallet>
      </div>
    </>
  );
}

type Step = "idle" | "approve" | "create";

function CreateForm() {
  const router = useRouter();
  const config = useConfig();
  const net = useNetwork();
  const ESCROW = net.escrow!; // NeedsWallet only renders this form when the escrow exists
  const chainId = net.chain.id; // pin every read/write to the selected network
  const { address } = useConnection();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState("");

  const now = useNow();
  const tomorrow = now ? new Date((now + 86400) * 1000).toISOString().slice(0, 10) : undefined;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const f = new FormData(e.currentTarget);
    const freelancer = String(f.get("freelancer")).trim();
    const terms = String(f.get("terms")).trim();

    // validate at the trust boundary before asking the wallet to sign anything
    if (!isAddress(freelancer)) return setError("Freelancer address isn’t a valid 0x… address.");
    if (freelancer.toLowerCase() === address!.toLowerCase()) return setError("You can’t create an escrow with yourself.");
    let value: bigint;
    try {
      value = parseUnits(amount, 6);
    } catch {
      return setError("Enter an amount like 25 or 25.50.");
    }
    if (value <= 0n) return setError("Amount must be more than 0.");
    const deadline = Math.floor(new Date(`${date}T23:59:59`).getTime() / 1000);
    if (!date || deadline <= now) return setError("Pick a deadline in the future.");
    if (!terms) return setError("Describe what must be delivered — the AI agent judges against it.");

    try {
      const owner = address as Address;
      const balance = await readContract(config, { address: USDC, abi: usdcAbi, functionName: "balanceOf", args: [owner], chainId });
      if (balance < value) return setError(`Not enough USDC. You have ${usd(balance)} — bridge some in on the Wallet page.`);

      const allowance = await readContract(config, { address: USDC, abi: usdcAbi, functionName: "allowance", args: [owner, ESCROW], chainId });
      if (allowance < value) {
        setStep("approve");
        const hash = await writeContract(config, { address: USDC, abi: usdcAbi, functionName: "approve", args: [ESCROW, value], chainId });
        await confirm(hash);
      }

      setStep("create");
      const hash = await writeContract(config, {
        address: ESCROW,
        chainId,
        abi: escrowAbi,
        functionName: "createDeal",
        args: [freelancer, value, deadline, terms],
      });
      const receipt = await confirm(hash);
      const [created] = parseEventLogs({ abi: escrowAbi, logs: receipt.logs, eventName: "DealCreated" });
      router.push(`/app/deal/${created.args.id}`);
    } catch (err) {
      setError(errorText(err));
      setStep("idle");
    }
  }

  async function confirm(hash: `0x${string}`) {
    const receipt = await waitForTransactionReceipt(config, { hash, chainId });
    if (receipt.status !== "success") throw new Error("Transaction reverted on-chain.");
    return receipt;
  }

  const busy = step !== "idle";

  return (
    <form onSubmit={submit} className="grid gap-12 lg:grid-cols-[1fr_340px]">
      <fieldset disabled={busy} className="grid gap-8">
        <label className="grid gap-2" data-reveal style={{ "--i": 0 } as React.CSSProperties}>
          <span className={label}>01 · Freelancer wallet</span>
          <input name="freelancer" className={`${field} font-mono`} placeholder="0x…" autoComplete="off" spellCheck={false} required />
        </label>
        <div className="grid gap-8 sm:grid-cols-2">
          <label className="grid gap-2" data-reveal style={{ "--i": 1 } as React.CSSProperties}>
            <span className={label}>02 · Amount (USDC)</span>
            <input
              name="amount"
              className={`${field} font-mono`}
              inputMode="decimal"
              placeholder="250.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
              required
            />
          </label>
          <label className="grid gap-2" data-reveal style={{ "--i": 2 } as React.CSSProperties}>
            <span className={label}>03 · Deadline</span>
            <input name="deadline" type="date" min={tomorrow} className={field} value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
        </div>
        <label className="grid gap-2" data-reveal style={{ "--i": 3 } as React.CSSProperties}>
          <span className={label}>04 · Brief</span>
          <textarea
            name="terms"
            rows={5}
            maxLength={500}
            className={field}
            placeholder="3 logo variants, SVG + PNG, dark & light versions. Delivered as a GitHub PR."
            required
          />
          <span className="text-xs text-muted">Be specific. The AI agent checks the delivery against exactly this text.</span>
        </label>
      </fieldset>

      <aside data-reveal="card" className="flex flex-col justify-between gap-8 self-start bg-red p-6 text-red-ink lg:sticky lg:top-6 lg:aspect-square">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider">Summary</p>
          <p className="mt-4 text-[52px] font-semibold leading-none tracking-[-0.06em]">{amount || "0.00"}</p>
          <p className="mt-1 text-[11px] font-medium">USDC locked on Arc</p>
        </div>
        <p className="text-sm leading-snug">
          Paid to the freelancer when you release it or the AI agent approves the work.
          {date && ` No delivery by ${new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}? You can reclaim it.`}
        </p>
        <div className="grid gap-3">
          <button type="submit" className={`${btn} w-full`} disabled={busy}>
            {step === "approve" ? "1/2 · Approving USDC…" : step === "create" ? "2/2 · Locking funds…" : "Lock funds"}
          </button>
          {error && (
            <p role="alert" className="text-sm font-medium">
              {error}
            </p>
          )}
        </div>
      </aside>
    </form>
  );
}
