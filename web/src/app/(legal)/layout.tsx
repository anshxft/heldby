import Link from "next/link";
import { LogoMark } from "@/components/logo";
import { CONTACT_URL } from "@/lib/site";

export default function LegalLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="min-h-screen p-2 sm:p-3">
      <section className="rounded-[22px] bg-paper px-5 py-6 sm:rounded-[28px] sm:px-8 sm:py-8">
        <Link href="/" className="flex items-center gap-1.5 text-sm font-semibold tracking-tight">
          <LogoMark className="size-5" /> Heldby
        </Link>
        <article className="legal mx-auto mt-16 max-w-2xl pb-16">{children}</article>
        <footer className="flex flex-wrap justify-between gap-2 border-t border-line pt-4 text-[11px] text-muted">
          <span>Heldby © 2026</span>
          <nav aria-label="Legal" className="flex gap-4">
            <Link href="/privacy" className="link">Privacy</Link>
            <Link href="/terms" className="link">Terms</Link>
            <a href={CONTACT_URL} target="_blank" rel="noreferrer" className="link">Contact ↗</a>
          </nav>
        </footer>
      </section>
    </main>
  );
}
