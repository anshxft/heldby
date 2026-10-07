# TrustPay — USDC escrow on Arc with an AI arbiter

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
| `contracts/` | Foundry project: `TrustPayEscrow.sol`, 18 tests incl. a fuzz test that funds are always conserved |
| `web/` | Next.js app: Swiss-style landing page, escrow app (wagmi/viem), AI agent API, Pip the mascot |
| `web/src/lib/agent.ts` | The arbiter: fetches the delivery (GitHub PR files or page text), asks an open-source model, calls `resolve` |

AI runs on [Groq](https://groq.com) with the open-source `openai/gpt-oss-120b` model. Delivery content is treated
as untrusted data; malformed or uncertain verdicts never move funds.

## Deployments
| Network | Escrow contract |
|---|---|
| Arc Testnet (5042002) | `0x1Ff5f68f159Ef3Ede6f4d05D58A20D700fbb4BE8` |
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

Built for [Arc Microgrants](https://dorahacks.io/hackathon/arc-microgrants/detail).
