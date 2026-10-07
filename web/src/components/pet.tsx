"use client";

import { animate, utils } from "animejs";
import { ArrowUp, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };
type Mood = "idle" | "happy" | "talk";

const SIZE = 76;
const GREETING: Msg = { role: "assistant", content: "Hi, I’m Pip! Ask me anything about TrustPay — English ya Hinglish, dono chalega." };
const rand = (a: number, b: number) => a + Math.random() * (b - a);
// viewport without the scrollbar (innerWidth includes it)
const vw = () => document.documentElement.clientWidth;
const vh = () => document.documentElement.clientHeight;

/** Pip: a small red mascot that wanders the page, watches the cursor, and opens a chat when clicked. */
export function Pet() {
  const wrap = useRef<HTMLDivElement>(null);
  const body = useRef<SVGGElement>(null);
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState(false);
  const [mood, setMood] = useState<Mood>("idle");
  const [thinking, setThinking] = useState(false);
  const openRef = useRef(false);
  const moveTo = useRef<(x: number, y: number) => void>(() => {});

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    const el = wrap.current!;
    const bodyEl = body.current!;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const corner = () => ({ x: vw() - SIZE - 20, y: vh() - SIZE - 20 });
    utils.set(el, corner());

    let move: ReturnType<typeof animate> | undefined;
    let hop: ReturnType<typeof animate> | undefined;
    moveTo.current = (x, y) => {
      const r = el.getBoundingClientRect();
      const duration = Math.min(3200, 500 + Math.hypot(x - r.left, y - r.top) * 4);
      move?.pause();
      hop?.pause();
      if (reduce) return void utils.set(el, { x, y });
      move = animate(el, { x, y, duration, ease: "inOut(2)" });
      hop = animate(bodyEl, { y: [0, -7, 0], duration: 280, loop: Math.max(1, Math.round(duration / 280) - 1), ease: "out(2)" });
    };

    // wander every few seconds unless chatting or the tab is hidden
    let wanderTimer: ReturnType<typeof setTimeout>;
    const wander = () => {
      wanderTimer = setTimeout(() => {
        if (!openRef.current && !reduce && !document.hidden)
          moveTo.current(rand(16, vw() - SIZE - 16), rand(vh() * 0.3, vh() - SIZE - 16));
        wander();
      }, rand(3500, 7000));
    };
    wander();

    // eyes follow the pointer; getting close makes Pip happy (and hop once)
    const mouse = { x: vw() / 2, y: vh() / 2 };
    const onPointer = (e: PointerEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    addEventListener("pointermove", onPointer, { passive: true });
    const pupils = el.querySelectorAll(".pupil");
    let near = false;
    let raf = 0;
    const tick = () => {
      const r = el.getBoundingClientRect();
      const dx = mouse.x - (r.left + SIZE / 2);
      const dy = mouse.y - (r.top + SIZE / 2);
      const d = Math.hypot(dx, dy) || 1;
      const k = Math.min(4, d / 25);
      utils.set(pupils, { x: (dx / d) * k, y: (dy / d) * k });
      const isNear = d < 140;
      if (isNear !== near) {
        near = isNear;
        setMood((m) => (m === "talk" ? m : isNear ? "happy" : "idle"));
        if (isNear && !reduce) animate(bodyEl, { y: [0, -12, 0], duration: 420, ease: "out(3)" });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // blink at random intervals
    let blinkTimer: ReturnType<typeof setTimeout>;
    const blink = () => {
      blinkTimer = setTimeout(() => {
        animate(el.querySelectorAll(".lid"), { scaleY: [0, 1, 0], duration: 220, ease: "inOut(2)" });
        blink();
      }, rand(2200, 5000));
    };
    blink();

    const onResize = () => {
      const r = el.getBoundingClientRect();
      if (r.right > vw() || r.bottom > vh()) utils.set(el, corner());
    };
    addEventListener("resize", onResize);

    const hintOn = setTimeout(() => setHint(true), 2500);
    const hintOff = setTimeout(() => setHint(false), 9000);

    return () => {
      clearTimeout(wanderTimer);
      clearTimeout(blinkTimer);
      clearTimeout(hintOn);
      clearTimeout(hintOff);
      cancelAnimationFrame(raf);
      move?.pause();
      hop?.pause();
      removeEventListener("pointermove", onPointer);
      removeEventListener("resize", onResize);
    };
  }, []);

  function toggle() {
    setHint(false);
    const next = !open;
    setOpen(next);
    if (next) moveTo.current(vw() - SIZE - 20, vh() - SIZE - 20);
  }

  const face: Mood = thinking ? "talk" : mood;

  return (
    <>
      <div ref={wrap} className="pointer-events-none fixed left-0 top-0 z-50" style={{ width: SIZE, height: SIZE }}>
        {hint && !open && (
          <span className="absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-paper">
            Psst… click me!
          </span>
        )}
        <button
          onClick={toggle}
          aria-label={open ? "Close chat with Pip" : "Chat with Pip, the TrustPay helper"}
          aria-expanded={open}
          className="pointer-events-auto block size-full cursor-pointer rounded-full transition-transform duration-200 hover:scale-105 active:scale-95"
        >
          <PipSvg bodyRef={body} mood={face} />
        </button>
      </div>
      {open && <Chat onClose={toggle} onThinking={setThinking} />}
    </>
  );
}

function PipSvg({ bodyRef, mood }: { bodyRef: React.RefObject<SVGGElement | null>; mood: Mood }) {
  const eyes = [29, 51];
  return (
    <svg viewBox="0 0 80 84" className="size-full overflow-visible drop-shadow-[0_8px_14px_rgb(0_0_0/0.18)]" aria-hidden>
      <ellipse cx="40" cy="80" rx="20" ry="3.5" fill="var(--color-ink)" opacity="0.15" />
      <g ref={bodyRef}>
        <path d="M40 13 V6" stroke="var(--color-ink)" strokeWidth="3" strokeLinecap="round" />
        <circle cx="40" cy="5" r="4" fill="var(--color-ink)" />
        <ellipse cx="27" cy="72" rx="8" ry="4.5" fill="var(--color-ink)" />
        <ellipse cx="53" cy="72" rx="8" ry="4.5" fill="var(--color-ink)" />
        <rect x="8" y="12" width="64" height="60" rx="30" fill="var(--color-red)" />
        {eyes.map((cx) => (
          <g key={cx} transform={`translate(${cx} 38)`}>
            <circle r="9" fill="#fff" />
            <g className="pupil">
              <circle r="5" fill="var(--color-ink)" />
              <circle cx="-1.6" cy="-2" r="1.7" fill="#fff" />
            </g>
            {/* eyelid: body-coloured square, invisible except over the white of the eye */}
            <rect className="lid" x="-10" y="-10" width="20" height="20" fill="var(--color-red)" style={{ transformBox: "fill-box", transformOrigin: "top", transform: "scaleY(0)" }} />
          </g>
        ))}
        <circle cx="20" cy="51" r="4" fill="#ffc2b8" opacity={mood === "idle" ? 0 : 0.8} style={{ transition: "opacity .2s" }} />
        <circle cx="60" cy="51" r="4" fill="#ffc2b8" opacity={mood === "idle" ? 0 : 0.8} style={{ transition: "opacity .2s" }} />
        {mood === "idle" && <path d="M35 52 Q40 56.5 45 52" stroke="var(--color-ink)" strokeWidth="2.6" fill="none" strokeLinecap="round" />}
        {mood === "happy" && <path d="M33.5 50.5 Q40 61 46.5 50.5 Z" fill="var(--color-ink)" strokeLinejoin="round" />}
        {mood === "talk" && <ellipse cx="40" cy="53" rx="3.2" ry="3.2" fill="var(--color-ink)" className="animate-pulse" />}
      </g>
    </svg>
  );
}

function Chat({ onClose, onThinking }: { onClose: () => void; onThinking: (t: boolean) => void }) {
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => field.current?.focus(), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    onThinking(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(1) }), // greeting is UI-only
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      setMessages((m) => [...m, { role: "assistant", content: data.reply ?? data.error ?? "Hmm, something went wrong." }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "I couldn’t reach my brain. Check your connection?" }]);
    } finally {
      setBusy(false);
      onThinking(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Chat with Pip"
      className="fixed bottom-[112px] right-4 z-50 flex h-[min(480px,calc(100svh-140px))] w-[min(360px,calc(100vw-32px))] flex-col overflow-hidden rounded-3xl bg-paper text-ink shadow-[0_30px_80px_-20px_rgb(0_0_0/0.45)] ring-1 ring-ink/10"
    >
      <header className="flex items-center justify-between border-b border-line px-5 py-4">
        <p className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span className="size-2.5 rounded-full bg-red" aria-hidden /> Pip <span className="font-normal text-muted">· TrustPay helper</span>
        </p>
        <button onClick={onClose} aria-label="Close chat" className="grid size-8 place-items-center rounded-full hover:bg-paper-2">
          <X className="size-4" aria-hidden />
        </button>
      </header>

      <div ref={list} className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-4 text-sm leading-snug" aria-live="polite">
        {messages.map((m, i) => (
          <p
            key={i}
            className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 ${
              m.role === "user" ? "self-end rounded-br-md bg-ink text-paper" : "self-start rounded-bl-md bg-paper-2"
            }`}
          >
            {m.content}
          </p>
        ))}
        {busy && <p className="self-start rounded-2xl rounded-bl-md bg-paper-2 px-3.5 py-2.5 text-muted">Pip is thinking…</p>}
      </div>

      <form onSubmit={send} className="flex items-center gap-2 border-t border-line p-3">
        <label htmlFor="pip-input" className="sr-only">
          Message Pip
        </label>
        <input
          id="pip-input"
          ref={field}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={600}
          placeholder="Ask about escrow, AI agent, fees…"
          className="h-11 flex-1 rounded-full bg-paper-2 px-4 text-sm outline-none focus:ring-2 focus:ring-ink/20"
        />
        <button type="submit" disabled={busy || !input.trim()} aria-label="Send" className="grid size-11 place-items-center rounded-full bg-red text-red-ink transition hover:bg-ink hover:text-paper disabled:opacity-40">
          <ArrowUp className="size-5" aria-hidden />
        </button>
      </form>
    </div>
  );
}
