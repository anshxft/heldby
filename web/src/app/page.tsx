import { ArrowDown, ArrowRight, ArrowUpRight, Zap } from "lucide-react";
import Link from "next/link";
import { Motion } from "@/components/motion";
import { LogoMark } from "@/components/logo";
import { CONTACT_URL, REPO_URL, SITE_DESCRIPTION, SITE_URL } from "@/lib/site";

// structured data: tells search engines this is a free web app (rich results)
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Heldby",
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  codeRepository: REPO_URL,
};

const heroLines = [
  { text: "Money held", indent: "ml-[12%]", speed: -0.08 },
  { text: "in trust,", indent: "ml-[30%]", speed: 0.06 },
  { text: "released", indent: "ml-0", speed: -0.05 },
  { text: "when work", indent: "ml-[34%]", speed: 0.09 },
  { text: "is done.", indent: "ml-[22%]", speed: -0.07 },
];

const how = [
  { title: "Create a deal", text: "Set the amount, milestones and a deadline. Share one link." },
  { title: "Lock USDC", text: "The client funds the escrow. The contract holds it — not us, not them." },
  { title: "Deliver & verify", text: "The freelancer submits a PR, file or link. The AI agent checks it against the brief." },
  { title: "Get paid", text: "USDC is released in under a second. Missed deadline? Automatic refund." },
];

const features = [
  { title: "Funds held by code", text: "Open-source escrow contract on Arc. Nobody can move your money — including us." },
  { title: "AI verification", text: "An agent reviews every delivery and explains its decision in plain words." },
  { title: "Milestone payments", text: "Split large jobs into smaller, safer releases." },
  { title: "Automatic refunds", text: "Deadline passed with no delivery? Funds return to the client." },
  { title: "Fair disputes", text: "Both sides submit evidence. The agent proposes a split you can appeal." },
  { title: "USDC as gas", text: "No ETH, no extra token. Fees are paid in the same dollars you send." },
];

const uses = [
  { title: "Freelancers", text: "Designers, devs and writers paid the moment work is approved." },
  { title: "Sellers", text: "Instagram & WhatsApp shops add a “Pay via escrow” link." },
  { title: "P2P", text: "Trade with strangers without a scammy middleman." },
  { title: "Deposits", text: "Rent deposits returned by rule, not by mood." },
];

const terminal = [
  { t: "$ agent verify escrow#1042", c: "text-paper" },
  { t: "› fetching github.com/rahul/logo-kit/pull/7", c: "text-paper/45" },
  { t: "› brief: “3 logo variants, SVG + PNG, dark & light”", c: "text-paper/45" },
  { t: "✓ 3 variants found", c: "text-paper/80" },
  { t: "✓ SVG + PNG exports present", c: "text-paper/80" },
  { t: "✓ dark & light versions present", c: "text-paper/80" },
  { t: "→ verdict: APPROVE · confidence 0.94", c: "text-red" },
  { t: "→ release(1042) · tx 0x8f3a…c21 confirmed", c: "text-red" },
];

export default function Home() {
  return (
    <div className="flex flex-col gap-2 p-2 sm:gap-3 sm:p-3">
      <Motion />
      {/* phones: the hero's "Create escrow" button is hidden, so keep one way in pinned to the bottom (Pip has the right corner) */}
      <Link
        href="/app"
        className="fixed bottom-5 left-4 z-40 inline-flex h-12 items-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-paper shadow-2xl transition active:scale-[0.97] sm:hidden"
      >
        Launch app <ArrowRight className="size-4" aria-hidden />
      </Link>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* 01 — Hero */}
      <section className="relative flex min-h-[calc(100svh-16px)] flex-col overflow-hidden rounded-[22px] bg-paper px-5 py-5 sm:min-h-[calc(100svh-24px)] sm:rounded-[28px] sm:px-8 sm:py-7">
        <header className="flex items-start justify-between">
          <a href="#" className="pop flex flex-col gap-1 text-[11px] leading-tight">
            <span className="flex items-center gap-1.5 text-sm font-semibold tracking-tight">
              <LogoMark className="size-5" /> Heldby
            </span>
            <span className="text-muted">USDC escrow / Arc</span>
          </a>
          <nav className="pop flex flex-col items-end gap-0.5 text-[12px] font-medium leading-tight">
            <a href="#how" className="link">How it works</a>
            <a href="#agent" className="link">AI agent</a>
            <a href="#use" className="link">Use cases</a>
            <a href="/app" className="link mt-1 inline-flex items-center gap-0.5 text-red">
              Launch app <ArrowUpRight className="size-3" aria-hidden />
            </a>
          </nav>
        </header>

        <div className="relative flex flex-1 flex-col justify-center py-10 lg:py-0">
          <h1 className="display text-[clamp(52px,11vw,176px)]">
            {heroLines.map((l) => (
              <span key={l.text} className={`line hero-line ${l.indent}`} data-speed={l.speed}>
                <span>{l.text}</span>
              </span>
            ))}
          </h1>

          <RedCard />
        </div>

        <footer className="flex items-end justify-between text-[11px] leading-tight">
          <div className="pop flex items-end gap-6">
            <p>
              <span className="block text-muted">Est.</span>
              <span className="text-3xl font-medium tracking-tighter">2026</span>
            </p>
            <p className="hidden text-muted sm:block">
              Built on Arc
              <br />
              Settled in USDC
            </p>
          </div>
          <a href="#problem" className="pop flex items-center gap-1 font-medium">
            Scroll <ArrowDown className="size-3" aria-hidden />
          </a>
        </footer>
      </section>

      {/* 02 — Problem */}
      <Sheet id="problem" index="02" label="The problem">
        <div className="reveal-group">
          <p className="reveal text-[clamp(28px,4.4vw,64px)] font-medium leading-[1.02] tracking-[-0.04em]">
            Online work runs on blind trust. Freelancers <span className="text-red">don’t get paid.</span> Clients{" "}
            <span className="text-red">don’t get the work.</span> Everyone loses.
          </p>
          <div className="mt-14 grid gap-8 border-t border-line pt-6 sm:grid-cols-2">
            <p className="reveal max-w-md text-muted">
              <span className="font-medium text-ink">Freelancers</span> deliver the work, then the client goes silent.
              No contract, no payment, no recourse.
            </p>
            <p className="reveal max-w-md text-muted">
              <span className="font-medium text-ink">Clients</span> pay an advance, then the work never arrives — or
              arrives half done.
            </p>
          </div>
        </div>
      </Sheet>

      {/* 03 — How it works */}
      <Sheet id="how" index="03" label="How it works">
        <h2 className="reveal-group display text-[clamp(44px,7.5vw,120px)]">
          <span className="line"><span>Four steps.</span></span>
          <span className="line ml-[18%]"><span>Zero trust.</span></span>
        </h2>
        <div className="reveal-group relative mt-16" data-stagger="120">
          <div className="grow h-px origin-left bg-red" aria-hidden />
          <ol className="grid sm:grid-cols-2 lg:grid-cols-4">
            {how.map((s, i) => (
              <li key={s.title} className="reveal border-line py-6 sm:pr-6 lg:border-l lg:px-6 lg:first:border-l-0 lg:first:pl-0">
                <span className="block text-[72px] font-medium leading-none tracking-[-0.06em]">0{i + 1}</span>
                <h3 className="mt-6 text-lg font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </Sheet>

      {/* 04 — AI agent (inverted) */}
      <section id="agent" className="scroll-mt-3 rounded-[22px] bg-[#161616] px-5 py-16 text-paper sm:rounded-[28px] sm:px-8 sm:py-24">
        <Label index="04" text="The AI agent" dark />
        <div className="mt-10 grid gap-14 lg:grid-cols-[1.1fr_1fr] lg:items-end">
          <div>
            <h2 className="reveal-group display text-[clamp(44px,7.5vw,120px)]">
              <span className="line"><span>A referee</span></span>
              <span className="line ml-[12%]"><span>that never</span></span>
              <span className="line ml-[4%]"><span className="text-red">sleeps.</span></span>
            </h2>
            <div className="reveal-group">
              <p className="reveal mt-10 max-w-md text-paper/60">
                The agent reads the brief, inspects the delivery and explains its verdict. It holds the arbiter key — it
                can release or refund, but never send funds anywhere else.
              </p>
              <div className="reveal mt-10 max-w-md">
                <p className="flex justify-between text-[11px] uppercase tracking-wider text-paper/50">
                  <span>Dispute → proposed split</span>
                  <span>70 / 30</span>
                </p>
                <div className="mt-3 flex h-2" role="img" aria-label="70% to freelancer, 30% refunded to client">
                  <div className="grow w-[70%] origin-left bg-red" />
                  <div className="w-[30%] bg-paper/15" />
                </div>
                <p className="mt-2 flex justify-between font-mono text-[11px] text-paper/50">
                  <span>Freelancer</span>
                  <span>Client refund</span>
                </p>
              </div>
            </div>
          </div>

          <div className="reveal-group rounded-2xl border border-paper/10 bg-black/40 p-5 font-mono text-[13px] leading-relaxed" data-stagger="300">
            <p className="mb-4 flex items-center gap-2 text-[11px] text-paper/40">
              <span className="size-2 rounded-full bg-red" aria-hidden /> heldby-agent · live
            </p>
            {terminal.map((l) => (
              <p key={l.t} className={`reveal ${l.c}`}>{l.t}</p>
            ))}
          </div>
        </div>
      </section>

      {/* 05 — Features */}
      <Sheet index="05" label="Why Heldby">
        <ul className="reveal-group border-b border-line" data-stagger="70">
          {features.map((f, i) => (
            <li key={f.title} className="reveal group grid grid-cols-[2.5rem_1fr_auto] items-baseline gap-x-4 border-t border-line py-6 transition-colors duration-200 hover:text-red sm:grid-cols-[4rem_1.2fr_1fr_auto]">
              <span className="font-mono text-xs text-muted">0{i + 1}</span>
              <h3 className="text-2xl font-medium tracking-[-0.03em] sm:text-4xl">{f.title}</h3>
              <p className="col-start-2 row-start-2 mt-2 max-w-sm text-sm text-muted sm:col-start-3 sm:row-start-1 sm:mt-0">{f.text}</p>
              <ArrowUpRight className="col-start-3 row-start-1 size-5 justify-self-end transition-transform duration-200 group-hover:rotate-45 sm:col-start-4" aria-hidden />
            </li>
          ))}
        </ul>
      </Sheet>

      {/* 06 — Use cases */}
      <Sheet id="use" index="06" label="Use cases">
        <div className="reveal-group grid gap-px overflow-hidden rounded-2xl bg-line sm:grid-cols-2 lg:grid-cols-4">
          {uses.map((u) => (
            <div key={u.title} className="reveal group flex min-h-64 flex-col justify-between bg-paper-2 p-6 transition-colors duration-300 hover:bg-red">
              <h3 className="text-[clamp(32px,3.2vw,48px)] font-semibold leading-none tracking-[-0.05em]">{u.title}</h3>
              <p className="max-w-[16rem] text-sm text-muted transition-colors group-hover:text-red-ink">{u.text}</p>
            </div>
          ))}
        </div>
      </Sheet>

      {/* 07 — CTA */}
      <section className="flex min-h-[80svh] flex-col justify-between rounded-[22px] bg-red px-5 py-6 text-red-ink sm:rounded-[28px] sm:px-8 sm:py-8">
        <Label index="07" text="Get started" />
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <h2 className="reveal-group display text-[clamp(52px,10vw,160px)]">
            <span className="line"><span>Stop trusting.</span></span>
            <span className="line ml-[10%]"><span>Start escrowing.</span></span>
          </h2>
          <a href="/app/new" className="group flex shrink-0 items-center gap-4 self-start lg:self-auto">
            <span className="grid size-20 place-items-center rounded-full bg-ink text-paper transition-transform duration-300 group-hover:scale-110">
              <ArrowRight className="size-7 transition-transform duration-300 group-hover:-rotate-45" aria-hidden />
            </span>
            <span className="link text-sm font-medium">Create an escrow</span>
          </a>
        </div>
        <footer className="flex flex-wrap justify-between gap-2 border-t border-red-ink/20 pt-4 text-[11px]">
          <span>Heldby © 2026 · Built for Arc Microgrants</span>
          <nav aria-label="Footer" className="flex flex-wrap gap-4">
            <Link href="/app" className="link">Escrows</Link>
            <Link href="/app/new" className="link">New escrow</Link>
            <Link href="/app/wallet" className="link">Swap &amp; bridge</Link>
            <a href={REPO_URL} target="_blank" rel="noreferrer" className="link">GitHub ↗</a>
            <Link href="/privacy" className="link">Privacy</Link>
            <Link href="/terms" className="link">Terms</Link>
            <a href={CONTACT_URL} target="_blank" rel="noreferrer" className="link">Contact ↗</a>
          </nav>
        </footer>
      </section>
    </div>
  );
}

function RedCard() {
  return (
    <div className="mt-12 flex items-center gap-4 self-center lg:absolute lg:left-[40%] lg:top-1/2 lg:mt-0 lg:-translate-y-1/2">
      <div className="red-card relative z-10 flex aspect-square w-[min(78vw,300px)] flex-col justify-between bg-red p-5 text-red-ink shadow-[0_30px_60px_-20px_rgb(255_61_46/0.45)]">
        <div className="flex items-center justify-between text-[11px] font-medium">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-5 bg-red-ink" aria-hidden /> Escrow #1042
          </span>
          <span>Logo design</span>
        </div>

        <div>
          <p className="text-[56px] font-semibold leading-none tracking-[-0.06em]">
            <span className="amount">250.00</span>
          </p>
          <p className="mt-1 text-[11px] font-medium">USDC · locked on Arc</p>
        </div>

        <div>
          <div className="grid grid-cols-4 gap-1" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="h-1 bg-red-ink/20">
                <span className={`seg seg-${i} block h-full origin-left bg-red-ink`} />
              </span>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] font-medium">
            <span className="status">Released</span>
            <a href="#how" className="link inline-flex items-center gap-0.5">
              Details <ArrowUpRight className="size-3" aria-hidden />
            </a>
          </div>
        </div>
      </div>

      <a href="/app/new" className="pop group relative z-10 hidden items-center gap-3 sm:flex">
        <span className="grid size-11 place-items-center rounded-full bg-ink text-paper ring-4 ring-paper transition-transform duration-300 group-hover:scale-110">
          <Zap className="size-4" aria-hidden />
        </span>
        <span className="link text-[12px] font-medium">Create escrow</span>
      </a>
    </div>
  );
}

function Sheet({ id, index, label, children }: { id?: string; index: string; label: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-3 rounded-[22px] bg-paper px-5 py-16 sm:rounded-[28px] sm:px-8 sm:py-24">
      <Label index={index} text={label} />
      <div className="mt-10">{children}</div>
    </section>
  );
}

function Label({ index, text, dark }: { index: string; text: string; dark?: boolean }) {
  return (
    <p className={`flex items-center gap-3 text-[11px] font-medium uppercase tracking-wider ${dark ? "text-paper/50" : "text-muted"}`}>
      <span className={dark ? "text-paper" : "text-ink"}>({index})</span>
      <span className="h-px w-8 bg-current" aria-hidden />
      {text}
    </p>
  );
}
