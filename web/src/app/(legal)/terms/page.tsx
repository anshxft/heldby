import type { Metadata } from "next";
import { CONTACT_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms",
  description: "The terms for using Heldby, an open-source USDC escrow on Arc with an AI arbiter.",
  alternates: { canonical: "/terms" },
};

export default function Terms() {
  return (
    <>
      <p className="font-mono text-sm text-muted">Last updated 9 October 2026</p>
      <h1>Terms</h1>
      <p>By using Heldby you agree to these terms. If you don’t agree, please don’t use it.</p>

      <h2>What Heldby is</h2>
      <p>
        Heldby is open-source software: a website and a smart contract on the Arc blockchain that hold USDC between a client
        and a freelancer. We don’t hold your money — the contract does — and we never have your private keys. Every action
        is a transaction you sign in your own wallet.
      </p>

      <h2>Beta software</h2>
      <p>
        Heldby is an early project built for a hackathon. The contract is tested but has not had a professional audit, and
        smart contracts and blockchains can fail. Only lock amounts you can afford to lose. The service is provided “as is”,
        without warranties of any kind.
      </p>

      <h2>The AI agent decides disputes</h2>
      <p>
        When you create or accept an escrow, you agree that Heldby’s AI agent may settle it if the work is disputed, or if the
        client doesn’t review it within 24 hours of submission. The agent compares the delivery with the brief and splits the
        funds between client and freelancer. Its verdict is final and executed on-chain; it can pay only the two parties,
        never anyone else. AI can make mistakes, so write a specific brief.
      </p>

      <h2>Your responsibilities</h2>
      <ul>
        <li>Keep your wallet and seed phrase safe. Lost keys can’t be recovered.</li>
        <li>Check addresses and amounts before you sign. Blockchain transactions can’t be reversed.</li>
        <li>Don’t use Heldby for anything illegal, or to pay for illegal goods or services.</li>
        <li>You are responsible for any taxes on payments you send or receive.</li>
      </ul>

      <h2>Not financial advice</h2>
      <p>Nothing on Heldby, including anything Pip says, is financial, legal or investment advice.</p>

      <h2>Third parties</h2>
      <p>
        Arc, Circle (USDC, App Kit, CCTP), your wallet provider and Groq are independent services with their own terms. We
        aren’t responsible for them.
      </p>

      <h2>Liability</h2>
      <p>
        To the extent the law allows, the Heldby builders aren’t liable for any loss of funds, data or profit arising from
        using the website or the contract.
      </p>

      <h2>Changes and contact</h2>
      <p>
        We may update these terms; the date above shows the latest version. Questions?{" "}
        <a href={CONTACT_URL} target="_blank" rel="noreferrer">
          Open an issue on GitHub
        </a>
        .
      </p>
    </>
  );
}
