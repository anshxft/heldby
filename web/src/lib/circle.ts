import type { BridgeChain } from "@circle-fin/app-kit";
import type { Chain } from "viem";
import { arbitrum, arbitrumSepolia, avalanche, avalancheFuji, base, baseSepolia, mainnet, optimism, optimismSepolia, polygon, polygonAmoy, sepolia } from "viem/chains";
import { chain } from "./escrow";

// Everything below follows `chain` (Arc Testnet today), so moving to mainnet is one switch in escrow.ts.
export const IS_TESTNET = !!chain.testnet;

/** App Kit's name for the Arc network we run on. */
export const ARC_KIT: "Arc_Testnet" | "Arc" = IS_TESTNET ? "Arc_Testnet" : "Arc";

/** EURC ERC-20 on Arc (6 decimals). */
export const EURC = IS_TESTNET ? "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a" : "0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1";

/** Tokens offered for same-chain swaps on Arc. USDC↔NATIVE is deliberately absent: on Arc they are the same asset. */
export const SWAP_TOKENS = ["USDC", "EURC"] as const;
export type SwapToken = (typeof SWAP_TOKENS)[number];

/** EVM chains users can bridge USDC from into Arc (CCTP). `kit` is App Kit's chain name, `viem` the wallet chain. */
export const BRIDGE_SOURCES: { kit: `${BridgeChain}`; viem: Chain }[] = IS_TESTNET
  ? [
      { kit: "Ethereum_Sepolia", viem: sepolia },
      { kit: "Base_Sepolia", viem: baseSepolia },
      { kit: "Arbitrum_Sepolia", viem: arbitrumSepolia },
      { kit: "Optimism_Sepolia", viem: optimismSepolia },
      { kit: "Avalanche_Fuji", viem: avalancheFuji },
      { kit: "Polygon_Amoy_Testnet", viem: polygonAmoy },
    ]
  : [
      { kit: "Ethereum", viem: mainnet },
      { kit: "Base", viem: base },
      { kit: "Arbitrum", viem: arbitrum },
      { kit: "Optimism", viem: optimism },
      { kit: "Avalanche", viem: avalanche },
      { kit: "Polygon", viem: polygon },
    ];

/** "12", "12.5", "0.000001" — at most 6 decimals, like USDC/EURC. */
export const isAmount = (v: string) => /^\d+(\.\d{1,6})?$/.test(v) && Number(v) > 0;
