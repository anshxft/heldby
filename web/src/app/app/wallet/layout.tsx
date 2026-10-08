import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Swap & bridge",
  description: "Swap USDC and EURC on Arc, or bridge USDC to Arc from Ethereum, Base, Arbitrum and more with Circle CCTP.",
  alternates: { canonical: "/app/wallet" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
