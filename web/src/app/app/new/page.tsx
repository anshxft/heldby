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
type Field = "freelancer" | "amount" | "deadline" | "terms";
const errField = "border-red focus:border-red";

function FieldError({ id, msg }: { id: Field; msg?: string }) {
  return msg ? (
    <span id={`err-${id}`} role="alert" data-reveal="pop" className="text-xs font-medium text-red">
      {msg}
    </span>
  ) : null;
}

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
  const [error, setError] = useState(""); // chain / wallet errors, shown in the summary card
  const [bad, setBad] = useState<Partial<Record<Field, string>>>({}); // input errors, shown under each field

  const now = useNow();
  const tomorrow = now ? new Date((now + 86400) * 1000).toISOString().slice(0, 10) : undefined;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = e.currentTarget;
    const f = new FormData(form);
    const freelancer = String(f.get("freelancer")).trim();
    const terms = String(f.get("terms")).trim();

    // validate at the trust boundary before asking the wallet to sign anything; report every field at once
    const errs: Partial<Record<Field, string>> = {};
    if (!isAddress(freelancer)) errs.freelancer = "Enter a valid wallet address (0x followed by 40 characters).";
    else if (freelancer.toLowerCase() === address!.toLowerCase()) errs.freelancer = "That's your own wallet — use the freelancer's address.";
    let value = 0n;
    try {
      value = parseUnits(amount, 6);
    } catch {
      errs.amount = "Enter an amount like 25 or 25.50.";
    }
    if (!errs.amount && value <= 0n) errs.amount = "Amount must be more than 0.";
    const deadline = Math.floor(new Date(`${date}T23:59:59`).getTime() / 1000);
    if (!date || deadline <= now) errs.deadline = "Pick a date from tomorrow onwards.";
    if (!terms) errs.terms = "Describe what must be delivered — the AI agent judges against it.";
    setBad(errs);
    const first = (Object.keys(errs) as Field[])[0];
    if (first) return void form.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();

    try {
      const owner = address as Address;
      const balance = await readContract(config, { address: USDC, abi: usdcAbi, functionName: "balanceOf", args: [owner], chainId });
      if (balance < value) {
        setBad({ amount: `Not enough USDC: you have ${usd(balance)}. Bridge some in on the Wallet page.` });
        return void form.querySelector<HTMLElement>('[name="amount"]')?.focus();
      }

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
        args: [freelancer as Address, value, deadline, terms], // validated with isAddress above
      });
      const receipt = await confirm(hash);
      const [created] = parseEventLogs({ abi: escrowAbi, logs: receipt.logs, eventName: "DealCreated" });
      router.push(`/app/deal/${created.args.id}?created=1`); // the deal page shows a "created" confirmation
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
  const invalid = (k: Field) => ({ "aria-invalid": !!bad[k], "aria-describedby": bad[k] ? `err-${k}` : undefined });
  const clear = (k: Field) => bad[k] && setBad((b) => ({ ...b, [k]: undefined }));

  return (
    <form onSubmit={submit} noValidate className="grid gap-12 lg:grid-cols-[1fr_340px]">
      <fieldset disabled={busy} className="grid gap-8">
        <label className="grid gap-2" data-reveal style={{ "--i": 0 } as React.CSSProperties}>
          <span className={label}>01 · Freelancer wallet</span>
          <input name="freelancer" {...invalid("freelancer")} onChange={() => clear("freelancer")} className={`${field} font-mono ${bad.freelancer ? errField : ""}`} placeholder="0x…" autoComplete="off" spellCheck={false} />
          <FieldError id="freelancer" msg={bad.freelancer} />
        </label>
        <div className="grid gap-8 sm:grid-cols-2">
          <label className="grid gap-2" data-reveal style={{ "--i": 1 } as React.CSSProperties}>
            <span className={label}>02 · Amount (USDC)</span>
            <input
              name="amount"
              {...invalid("amount")}
              className={`${field} font-mono ${bad.amount ? errField : ""}`}
              inputMode="decimal"
              placeholder="250.00"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value.replace(/[^\d.]/g, ""));
                clear("amount");
              }}
            />
            <FieldError id="amount" msg={bad.amount} />
          </label>
          <label className="grid gap-2" data-reveal style={{ "--i": 2 } as React.CSSProperties}>
            <span className={label}>03 · Deadline</span>
            <input
              name="deadline"
              type="date"
              min={tomorrow}
              {...invalid("deadline")}
              className={`${field} ${bad.deadline ? errField : ""}`}
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                clear("deadline");
              }}
            />
            <FieldError id="deadline" msg={bad.deadline} />
          </label>
        </div>
        <label className="grid gap-2" data-reveal style={{ "--i": 3 } as React.CSSProperties}>
          <span className={label}>04 · Brief</span>
          <textarea
            name="terms"
            rows={5}
            maxLength={500}
            {...invalid("terms")}
            onChange={() => clear("terms")}
            className={`${field} ${bad.terms ? errField : ""}`}
            placeholder="3 logo variants, SVG + PNG, dark & light versions. Delivered as a GitHub PR."
          />
          <FieldError id="terms" msg={bad.terms} />
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
