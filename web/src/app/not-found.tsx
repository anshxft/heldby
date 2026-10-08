import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LogoMark } from "@/components/logo";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col p-2 sm:p-3">
      <section className="flex flex-1 flex-col justify-between rounded-[22px] bg-paper px-5 py-6 sm:rounded-[28px] sm:px-8 sm:py-8">
        <Link href="/" className="flex items-center gap-1.5 text-sm font-semibold tracking-tight">
          <LogoMark className="size-5" /> TrustPay
        </Link>
        <div>
          <p className="font-mono text-sm text-muted">Error 404</p>
          <h1 className="display mt-4 text-[clamp(64px,14vw,220px)]">
            Nothing
            <br />
            <span className="ml-[0.5em] text-red">held here.</span>
          </h1>
          <p className="mt-8 max-w-md text-muted">This page doesn’t exist — but your funds are safe. Pip can help if you’re lost.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/" className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-paper transition hover:bg-red hover:text-red-ink">
            Back home <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link href="/app" className="inline-flex h-11 items-center rounded-full border border-ink/20 px-5 text-sm font-medium transition hover:border-ink">
            Your escrows
          </Link>
        </div>
      </section>
    </main>
  );
}
