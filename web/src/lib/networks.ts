import type { BridgeChain } from "@circle-fin/app-kit";
import type { Chain } from "viem";
import {
  arbitrum,
  arbitrumSepolia,
  arc,
  arcTestnet,
  avalanche,
  avalancheFuji,
  base,
  baseSepolia,
  mainnet,
  optimism,
  optimismSepolia,
  polygon,
  polygonAmoy,
  sepolia,
} from "viem/chains";

export type NetworkId = "testnet" | "mainnet";

export type Network = {
  id: NetworkId;
  label: string;
  testnet: boolean;
  chain: Chain;
  /** Heldby escrow contract, or null until it's deployed on this network. */
  escrow: `0x${string}` | null;
  /** EURC ERC-20 on Arc (6 decimals). USDC is the same predeploy on both networks. */
  eurc: `0x${string}`;
  /** App Kit's name for this Arc network. */
  kit: "Arc_Testnet" | "Arc";
  /** EVM chains users can bridge USDC from into Arc (CCTP). */
  bridgeSources: { kit: `${BridgeChain}`; viem: Chain }[];
};

export const NETWORKS: Record<NetworkId, Network> = {
  testnet: {
    id: "testnet",
    label: "Testnet",
    testnet: true,
    chain: arcTestnet,
    escrow: "0xB5a9223B73721b7835a1EFd571B5C01b23e834B3", // v2
    eurc: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a",
    kit: "Arc_Testnet",
    bridgeSources: [
      { kit: "Ethereum_Sepolia", viem: sepolia },
      { kit: "Base_Sepolia", viem: baseSepolia },
      { kit: "Arbitrum_Sepolia", viem: arbitrumSepolia },
      { kit: "Optimism_Sepolia", viem: optimismSepolia },
      { kit: "Avalanche_Fuji", viem: avalancheFuji },
      { kit: "Polygon_Amoy_Testnet", viem: polygonAmoy },
    ],
  },
  mainnet: {
    id: "mainnet",
    label: "Mainnet",
    testnet: false,
    chain: arc,
    escrow: null, // set after `forge script ... --rpc-url arc` deploys it
    eurc: "0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1",
    kit: "Arc",
    bridgeSources: [
      { kit: "Ethereum", viem: mainnet },
      { kit: "Base", viem: base },
      { kit: "Arbitrum", viem: arbitrum },
      { kit: "Optimism", viem: optimism },
      { kit: "Avalanche", viem: avalanche },
      { kit: "Polygon", viem: polygon },
    ],
  },
};

export const DEFAULT_NETWORK: NetworkId = "testnet";

export const isNetworkId = (v: unknown): v is NetworkId => v === "testnet" || v === "mainnet";

export const explorer = (net: Network, path: string) => `${net.chain.blockExplorers!.default.url}/${path}`;

/** Every chain the wallet may need to switch to, across both networks. */
export const ALL_CHAINS = [arcTestnet, arc, ...NETWORKS.testnet.bridgeSources.map((s) => s.viem), ...NETWORKS.mainnet.bridgeSources.map((s) => s.viem)] as [
  Chain,
  ...Chain[],
];
