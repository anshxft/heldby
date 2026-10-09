import type { Metadata } from "next";
import { CONTACT_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Heldby collects (very little), where it goes, and what is public on the blockchain.",
  alternates: { canonical: "/privacy" },
};

export default function Privacy() {
  return (
    <>
      <p className="font-mono text-sm text-muted">Last updated 9 October 2026</p>
      <h1>Privacy</h1>
      <p>Heldby has no accounts, no sign-up and no database. Here is everything that touches your data.</p>

      <h2>On the blockchain (public)</h2>
      <p>
        When you create or act on an escrow, your wallet address, the amount, the deadline, the brief, the delivery link,
        any dispute reason and the AI verdict are written to the Arc blockchain. Blockchain data is public and permanent:
        anyone can read it and nobody, including us, can delete it. Don’t put personal information in a brief or delivery.
      </p>

      <h2>In your browser</h2>
      <p>
        We set <strong>no cookies</strong>. Your browser’s local storage remembers your network choice (testnet or mainnet)
        and which wallet you connected, so you don’t have to pick them again. You can clear it any time in your browser settings.
      </p>

      <h2>Pip, the chat mascot</h2>
      <p>
        Messages you send to Pip, plus the page you are on, go to our server and on to Groq, which runs the open-source AI
        model that writes the reply. We don’t store chat messages. Don’t share private keys or personal details with Pip.
      </p>

      <h2>The AI agent</h2>
      <p>
        When someone asks the agent to settle an escrow, our server reads the escrow from the blockchain, opens the
        delivery link to check the work and sends that content to Groq for a verdict. The verdict is then recorded on-chain.
      </p>

      <h2>Hosting and analytics</h2>
      <p>
        Heldby is hosted on Vercel, which keeps standard server logs (such as IP address and requests) to run and protect
        the service. We use Vercel Web Analytics to count page views; it works without cookies and doesn’t track you across
        sites. IP addresses are briefly held in memory to rate-limit abuse of the chat and agent.
      </p>

      <h2>Swaps and bridges</h2>
      <p>
        The Wallet page uses Circle App Kit. Swap quotes and bridge transfers are handled by Circle and its providers, under
        their own privacy terms. Your wallet signs every transaction; we never hold your keys or funds.
      </p>

      <h2>Contact</h2>
      <p>
        Questions or a privacy request?{" "}
        <a href={CONTACT_URL} target="_blank" rel="noreferrer">
          Open an issue on GitHub
        </a>
        .
      </p>
    </>
  );
}
