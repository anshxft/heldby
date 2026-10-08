"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import type { Chain } from "viem";
import { WagmiProvider, createConfig, http, injected } from "wagmi";
import { BRIDGE_SOURCES } from "@/lib/circle";
import { chain } from "@/lib/escrow";

// Arc first; bridge source chains are listed so the wallet can be switched to them before a bridge.
const chains = [chain, ...BRIDGE_SOURCES.map((s) => s.viem)] as [Chain, ...Chain[]];

const config = createConfig({
  chains,
  connectors: [injected()],
  transports: Object.fromEntries(chains.map((c) => [c.id, http()])),
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
