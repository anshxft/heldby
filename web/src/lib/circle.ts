/** Tokens offered for same-chain swaps on Arc. USDC↔NATIVE is deliberately absent: on Arc they are the same asset. */
export const SWAP_TOKENS = ["USDC", "EURC"] as const;
export type SwapToken = (typeof SWAP_TOKENS)[number];

/** "12", "12.5", "0.000001" — at most 6 decimals, like USDC/EURC. */
export const isAmount = (v: string) => /^\d+(\.\d{1,6})?$/.test(v) && Number(v) > 0;
