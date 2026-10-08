"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { WagmiProvider, createConfig, http, injected } from "wagmi";
import { ALL_CHAINS } from "@/lib/networks";

// Both Arc networks plus every bridge source, so the wallet can be switched to any of them.
const config = createConfig({
  chains: ALL_CHAINS,
  connectors: [injected()],
  transports: Object.fromEntries(ALL_CHAINS.map((c) => [c.id, http()])),
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
