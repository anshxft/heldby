import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Providers } from "./providers";
import { LogoMark } from "@/components/logo";
import { MobileNav, NetworkNote, NetworkSwitch, Wallet } from "./ui";

export const metadata: Metadata = {
  // root template suffixes "Your escrows"; this template re-applies it for /app child pages
  title: { default: "Your escrows", template: "%s · Heldby" },
  description: "See every USDC escrow where you are the client or the freelancer, with live status on Arc.",
  alternates: { canonical: "/app" },
};

export default function AppLayout({ children }: LayoutProps<"/app">) {
  return (
    <Providers>
      <div className="flex min-h-screen flex-col gap-2 p-2 sm:gap-3 sm:p-3">
        <header className="flex items-center justify-between rounded-[22px] bg-paper px-5 py-3 sm:rounded-[28px] sm:px-8">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-1.5 text-sm font-semibold tracking-tight">
              <LogoMark className="size-5" /> <span className="hidden sm:inline">Heldby</span>
            </Link>
            <nav className="hidden gap-5 text-[13px] font-medium sm:flex">
              <Link href="/app" className="link">Escrows</Link>
              <Link href="/app/new" className="link">New escrow</Link>
              <Link href="/app/wallet" className="link">Wallet</Link>
            </nav>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <NetworkSwitch />
            <Wallet />
          </div>
        </header>
        {/* extra bottom room on phones for the pinned nav bar */}
        <main className="flex-1 rounded-[22px] bg-paper px-5 pb-28 pt-10 sm:rounded-[28px] sm:px-8 sm:py-14">{children}</main>
        <footer className="flex flex-wrap gap-x-4 sm:justify-between gap-y-1 px-3 pb-24 pt-1 text-[11px] text-paper/40 sm:pb-1">
          <NetworkNote />
          <nav aria-label="Legal" className="order-first flex gap-3 sm:order-none">
            <Link href="/privacy" className="hover:text-paper">Privacy</Link>
            <Link href="/terms" className="hover:text-paper">Terms</Link>
          </nav>
        </footer>
        {/* reads the URL for the active tab; Suspense keeps dynamic routes prerenderable */}
        <Suspense fallback={null}>
          <MobileNav />
        </Suspense>
      </div>
    </Providers>
  );
}
