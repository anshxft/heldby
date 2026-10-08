import Link from "next/link";
import { Providers } from "./providers";
import { Wallet } from "./ui";

export default function AppLayout({ children }: LayoutProps<"/app">) {
  return (
    <Providers>
      <div className="flex min-h-screen flex-col gap-2 p-2 sm:gap-3 sm:p-3">
        <header className="flex items-center justify-between rounded-[22px] bg-paper px-5 py-3 sm:rounded-[28px] sm:px-8">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-1.5 text-sm font-semibold tracking-tight">
              <span className="size-3 bg-red" aria-hidden /> TrustPay
            </Link>
            <nav className="hidden gap-5 text-[13px] font-medium sm:flex">
              <Link href="/app" className="link">Escrows</Link>
              <Link href="/app/new" className="link">New escrow</Link>
              <Link href="/app/wallet" className="link">Wallet</Link>
            </nav>
          </div>
          <Wallet />
        </header>
        <main className="flex-1 rounded-[22px] bg-paper px-5 py-10 sm:rounded-[28px] sm:px-8 sm:py-14">{children}</main>
        <footer className="flex justify-between px-3 py-1 text-[11px] text-paper/40">
          <span>TrustPay · Arc Testnet</span>
          <span>Test funds only</span>
        </footer>
      </div>
    </Providers>
  );
}
