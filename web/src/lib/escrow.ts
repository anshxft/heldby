import { formatUnits, parseAbi } from "viem";
import { arcTestnet } from "viem/chains";

export const chain = arcTestnet;
export const ESCROW = "0x1Ff5f68f159Ef3Ede6f4d05D58A20D700fbb4BE8" as const;
export const DEPLOY_BLOCK = 65975895n;
// USDC ERC-20 view (6 decimals). Same predeploy on Arc mainnet and testnet.
export const USDC = "0x3600000000000000000000000000000000000000" as const;

export const escrowAbi = parseAbi([
  "function createDeal(address freelancer, uint96 amount, uint40 deadline, string terms) returns (uint256)",
  "function submitWork(uint256 id, string deliverable)",
  "function release(uint256 id)",
  "function refund(uint256 id)",
  "function dispute(uint256 id, string reason)",
  "function resolve(uint256 id, uint16 freelancerBps, string reason)", // arbiter only (server agent)
  "function dealCount() view returns (uint256)",
  "function deals(uint256) view returns (address client, address freelancer, uint96 amount, uint40 deadline, uint8 status)",
  "event DealCreated(uint256 indexed id, address indexed client, address indexed freelancer, uint256 amount, uint256 deadline, string terms)",
  "event WorkSubmitted(uint256 indexed id, string deliverable)",
  "event Disputed(uint256 indexed id, address indexed by, string reason)",
  "event Resolved(uint256 indexed id, uint256 toFreelancer, uint256 toClient, string reason)",
  "error InvalidParams()",
  "error NotAllowed()",
  "error WrongStatus()",
  "error TooEarly()",
  "error TooLate()",
]);

export const usdcAbi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
]);

// Mirrors TrustPayEscrow.Status
export const STATUS = ["None", "Funded", "Submitted", "Disputed", "Released", "Refunded", "Resolved"] as const;
export type Status = (typeof STATUS)[number];

export const usd = (v: bigint) => Number(formatUnits(v, 6)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
export const explorer = (path: string) => `${chain.blockExplorers.default.url}/${path}`;

export function errorText(e: unknown) {
  const err = e as { shortMessage?: string; message?: string };
  return err.shortMessage ?? err.message ?? "Something went wrong";
}
