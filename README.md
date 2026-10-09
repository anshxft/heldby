# Heldby — USDC escrow on Arc with an AI arbiter

Freelancers get paid for finished work, clients only pay for work that matches the brief.
A client locks USDC in an escrow contract on [Arc](https://arc.io); the freelancer submits a link;
the client releases payment — or an AI agent checks the delivery against the brief and settles it on-chain.

## Why Arc
- **USDC is the gas token** — users hold one asset, no ETH needed to pay fees.
- **Sub-second finality and cents-level fees** make small freelance payments practical.
- Escrow amounts, fees and payouts are all in the same dollars.

## How it works
1. **Create** — client sets freelancer wallet, amount, deadline and a written brief, then locks USDC (`createDeal`).
2. **Deliver** — freelancer submits a link to the work (`submitWork`).
3. **Settle** — the client releases (`release`), or either side asks the AI agent, which reads the brief, the delivery
   and any dispute, then splits funds with `resolve(id, freelancerBps, reason)`.
4. **Safety nets** — no delivery by the deadline → client refund (`refund`); either side can `dispute`.

The arbiter can only split a deal between its client and freelancer — it can never send funds anywhere else.

## Repo
| Path | What |
|---|---|
| `contracts/` | Foundry project: `HeldbyEscrow.sol`, 22 tests incl. a fuzz test that funds are always conserved |
| `web/` | Next.js app: Swiss-style landing page, escrow app (wagmi/viem), AI agent API, Pip the mascot |
| `web/src/lib/agent.ts` | The arbiter: fetches the delivery (GitHub PR files or page text), asks an open-source model, calls `resolve` |

AI runs on [Groq](https://groq.com) with the open-source `openai/gpt-oss-120b` model. Delivery content is treated
as untrusted data; malformed or uncertain verdicts never move funds.

## Security
- **Contract**: OpenZeppelin `SafeERC20` + `ReentrancyGuard`; the arbiter can only split a deal between its two parties;
  late work can't block a refund. 22 Foundry tests incl. a fuzz test that funds are always conserved; Slither clean
  apart from expected timestamp notes. All deal data lives in contract state (`getDeal`, `dealsOf`), so the
  app never depends on log scans.
- **Review window**: after work is submitted the client has 24h to release or dispute; a dispute lets the agent act at
  once, and after 24h of silence the freelancer can ask the agent. Enforced in the contract.
- **Agent**: delivery content is untrusted data (prompt-injection tested); malformed or uncertain verdicts never move
  funds; link fetching blocks private/local hosts on every redirect hop and caps downloads at 200 KB.
- **APIs**: per-IP rate limits, cross-site requests refused, internal errors logged server-side only.
- **Web**: no secrets in client code (`ARBITER_PRIVATE_KEY` / `GROQ_API_KEY` are server-only env vars); clickjacking
  blocked (`frame-ancestors 'none'`), `nosniff`, HSTS, strict referrer and permissions policies.

## Deployments
| Network | Escrow contract |
|---|---|
| Arc Testnet (5042002) | `0xB5a9223B73721b7835a1EFd571B5C01b23e834B3` |
| Arc Mainnet (5042) | _coming soon_ |

## Run locally
```bash
# contracts
cd contracts && forge test

# web app
cd web && npm install
cp ../.env.example .env.local   # then fill GROQ_API_KEY and ARBITER_PRIVATE_KEY
npm run dev
```

## Team
- [@anshxft](https://github.com/anshxft) — creator: smart contract, web app, AI agent
- [@Snatcher27](https://github.com/Snatcher27) — team member

Built for [Arc Microgrants](https://dorahacks.io/hackathon/arc-microgrants/detail).
