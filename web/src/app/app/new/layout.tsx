import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New escrow",
  description: "Lock USDC for a freelancer on Arc: set the amount, a deadline and the brief the AI agent will judge against.",
  alternates: { canonical: "/app/new" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
