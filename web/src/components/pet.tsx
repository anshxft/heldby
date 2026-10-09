"use client";

import { animate, utils } from "animejs";
import { ArrowUp, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };
type Mood = "idle" | "glad" | "happy" | "shy" | "talk" | "surprised" | "dizzy" | "cry" | "angry" | "sad" | "love" | "sleepy";

const SIZE = 76;
const GREETING: Msg = { role: "assistant", content: "Hi, I’m Pip! Ask me anything about Heldby — English ya Hinglish, dono chalega." };
const rand = (a: number, b: number) => a + Math.random() * (b - a);
// viewport without the scrollbar (innerWidth includes it)
const vw = () => document.documentElement.clientWidth;
const vh = () => document.documentElement.clientHeight;
// on phones inside the app a nav bar is pinned to the bottom, so Pip's home corner sits above it
const homeY = () => vh() - SIZE - (vw() < 640 && location.pathname.startsWith("/app") ? 92 : 20);

/**
 * Pip: a red mascot that wanders the landing page, watches the cursor, can be dragged and thrown
 * (with feelings about it), and opens a chat when clicked.
 */
export function Pet() {
  const wrap = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const body = useRef<SVGGElement>(null);
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [near, setNear] = useState(false);
  const [hover, setHover] = useState(false);
  const [held, setHeld] = useState(false); // being dragged or flying
  const [sleepy, setSleepy] = useState(false);
  const [flash, setFlash] = useState<Mood | null>(null); // short-lived reaction
  const openRef = useRef(false);
  const faceRef = useRef<Mood>("idle");
  const moveTo = useRef<(x: number, y: number) => void>(() => {});
  const react = useRef<(m: Mood, ms: number) => void>(() => {});
  const dragged = useRef(false);
  const pathname = usePathname();
  const pathRef = useRef(pathname);

  const face: Mood = held ? "surprised" : (flash ?? (thinking ? "talk" : hover ? "shy" : near ? "glad" : sleepy ? "sleepy" : "idle"));

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  // inside the app Pip keeps to the bottom edge so it never sits on a form; entering it, go home to the corner
  useEffect(() => {
    const enteringApp = pathname.startsWith("/app") && !pathRef.current.startsWith("/app");
    pathRef.current = pathname;
    if (enteringApp) moveTo.current(vw() - SIZE - 20, homeY());
  }, [pathname]);

  // body language that goes with a new face
  useEffect(() => {
    faceRef.current = face;
    const b = body.current;
    if (!b || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (face === "angry") animate(b, { x: [0, -3, 3, -3, 3, 0], duration: 450 });
    if (face === "cry") animate(b, { y: [0, 2, 0], duration: 300, loop: 5 });
    if (face === "happy" || face === "love") animate(b, { y: [0, -10, 0], duration: 380, loop: 1, ease: "out(2)" });
  }, [face]);

  useEffect(() => {
    const el = wrap.current!;
    const btn = el.querySelector("button")!;
    const svgEl = svg.current!;
    const bodyEl = body.current!;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const corner = () => ({ x: vw() - SIZE - 20, y: homeY() });
    const clamp = (v: number, max: number) => Math.min(Math.max(v, 0), max);
    utils.set(el, corner());

    let mode: "free" | "drag" | "fly" = "free";
    let move: ReturnType<typeof animate> | undefined;
    let hop: ReturnType<typeof animate> | undefined;
    let flyRaf = 0;
    const stop = () => {
      move?.pause();
      hop?.pause();
      cancelAnimationFrame(flyRaf);
    };

    let flashTimer: ReturnType<typeof setTimeout>;
    react.current = (m, ms) => {
      clearTimeout(flashTimer);
      setFlash(m);
      flashTimer = setTimeout(() => setFlash(null), ms);
    };

    moveTo.current = (x, y) => {
      if (mode !== "free") return;
      const r = el.getBoundingClientRect();
      const duration = Math.min(3200, 500 + Math.hypot(x - r.left, y - r.top) * 4);
      stop();
      if (reduce) return void utils.set(el, { x, y });
      move = animate(el, { x, y, duration, ease: "inOut(2)" });
      hop = animate(bodyEl, { y: [0, -7, 0], duration: 280, loop: Math.max(1, Math.round(duration / 280) - 1), ease: "out(2)" });
    };

    // wander every few seconds unless chatting, held, or the tab is hidden
    let wanderTimer: ReturnType<typeof setTimeout>;
    const wander = () => {
      const inApp = pathRef.current.startsWith("/app");
      wanderTimer = setTimeout(() => {
        // app pages: walk along the bottom edge only, and stay put on phones where it would cover buttons
        const canWander = !openRef.current && !reduce && !document.hidden && mode === "free" && !(inApp && vw() < 640);
        if (canWander) moveTo.current(rand(16, vw() - SIZE - 16), inApp ? vh() - SIZE - 16 : rand(vh() * 0.3, vh() - SIZE - 16));
        wander();
      }, inApp ? rand(7000, 12_000) : rand(3500, 7000));
    };
    wander();

    // ---- pointer: eyes follow it, closeness makes Pip glad, stillness makes Pip sleepy ----
    const mouse = { x: vw() / 2, y: vh() / 2 };
    let lastMove = performance.now();
    let isSleepy = false;
    const onPointer = (e: PointerEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      lastMove = performance.now();
      if (isSleepy) setSleepy((isSleepy = false));
    };
    addEventListener("pointermove", onPointer, { passive: true });

    let isNear = false;
    let raf = 0;
    const tick = () => {
      const r = el.getBoundingClientRect();
      const dx = mouse.x - (r.left + SIZE / 2);
      const dy = mouse.y - (r.top + SIZE / 2);
      const d = Math.hypot(dx, dy) || 1;
      const k = Math.min(4, d / 25);
      const pupils = el.querySelectorAll(".pupil");
      // closed-eye faces (sleepy, happy, cry…) have no pupils; animating nothing makes anime.js warn every frame
      if (pupils.length) utils.set(pupils, faceRef.current === "shy" ? { x: -2.5, y: 3 } : { x: (dx / d) * k, y: (dy / d) * k });

      const nowNear = mode === "free" && d < 140;
      if (nowNear !== isNear) {
        isNear = nowNear;
        setNear(nowNear);
        if (nowNear && !reduce) animate(bodyEl, { y: [0, -12, 0], duration: 420, ease: "out(3)" });
      }
      if (!isSleepy && !openRef.current && performance.now() - lastMove > 25_000) setSleepy((isSleepy = true));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    let blinkTimer: ReturnType<typeof setTimeout>;
    const blink = () => {
      blinkTimer = setTimeout(() => {
        const lids = el.querySelectorAll(".lid");
        if (lids.length) animate(lids, { scaleY: [0, 1, 0], duration: 220, ease: "inOut(2)" });
        blink();
      }, rand(2200, 5000));
    };
    blink();

    // ---- drag & throw ----
    let drag: { dx: number; dy: number; sx: number; sy: number; started: boolean; samples: { x: number; y: number; t: number }[] } | null = null;
    let throws: number[] = [];

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      dragged.current = false;
      const r = el.getBoundingClientRect();
      drag = { dx: e.clientX - r.left, dy: e.clientY - r.top, sx: e.clientX, sy: e.clientY, started: false, samples: [] };
      btn.setPointerCapture(e.pointerId);
    };
    const onDragMove = (e: PointerEvent) => {
      if (!drag) return;
      if (!drag.started) {
        if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 6) return; // still a click
        drag.started = dragged.current = true;
        stop();
        mode = "drag";
        setHeld(true);
        setHint(false);
      }
      const x = clamp(e.clientX - drag.dx, vw() - SIZE);
      const y = clamp(e.clientY - drag.dy, vh() - SIZE);
      utils.set(el, { x, y });
      const t = performance.now();
      drag.samples = [...drag.samples.filter((s) => t - s.t < 100), { x, y, t }];
    };
    const onUp = () => {
      const d = drag;
      drag = null;
      if (!d?.started) return;
      const [a, b] = [d.samples[0], d.samples.at(-1)];
      const dt = a && b ? (b.t - a.t) / 1000 : 0;
      const vx = dt > 0 ? (b!.x - a!.x) / dt : 0;
      const vy = dt > 0 ? (b!.y - a!.y) / dt : 0;
      const speed = Math.hypot(vx, vy);
      if (speed < 450 || reduce) {
        // gently put down
        mode = "free";
        setHeld(false);
        if (!reduce) animate(bodyEl, { y: [-8, 0], duration: 420, ease: "outBounce" });
        react.current("happy", 1200);
        return;
      }
      fly(vx, vy, speed);
    };
    btn.addEventListener("pointerdown", onDown);
    btn.addEventListener("pointermove", onDragMove);
    btn.addEventListener("pointerup", onUp);
    btn.addEventListener("pointercancel", onUp);

    // simple physics: gravity, bouncy walls, friction on the floor
    const fly = (vx: number, vy: number, launch: number) => {
      mode = "fly";
      const r = el.getBoundingClientRect();
      let x = r.left;
      let y = r.top;
      let rot = 0;
      let hardestHit = 0;
      let last = performance.now();
      const G = 2400;
      const BOUNCE = 0.55;
      const step = (now: number) => {
        const dt = Math.min(0.032, (now - last) / 1000);
        last = now;
        vy += G * dt;
        x += vx * dt;
        y += vy * dt;
        rot += vx * dt * 0.9;
        const maxX = vw() - SIZE;
        const floor = vh() - SIZE - 8;
        if (x < 0 || x > maxX) {
          x = clamp(x, maxX);
          hardestHit = Math.max(hardestHit, Math.abs(vx));
          vx = -vx * BOUNCE;
        }
        if (y < 0) {
          y = 0;
          hardestHit = Math.max(hardestHit, Math.abs(vy));
          vy = -vy * BOUNCE;
        }
        if (y > floor) {
          y = floor;
          hardestHit = Math.max(hardestHit, Math.abs(vy));
          vy = Math.abs(vy) < 140 ? 0 : -vy * BOUNCE;
          vx *= 0.8;
        }
        utils.set(el, { x, y });
        utils.set(svgEl, { rotate: rot % 360 });

        if (!(y >= floor && vy === 0 && Math.abs(vx) < 15)) {
          flyRaf = requestAnimationFrame(step);
          return;
        }
        // landed: settle, then feel something about it
        mode = "free";
        setHeld(false);
        animate(svgEl, { rotate: 0, duration: 400, ease: "out(3)" });
        throws = [...throws.filter((t) => now - t < 15_000), now];
        const hard = launch > 2600 || hardestHit > 2000;
        if (hard && throws.length >= 3) react.current("angry", 3500);
        else if (hard) react.current("cry", 4500);
        else if (launch > 1300 || hardestHit > 1000) react.current("dizzy", 2500);
        else react.current("happy", 1500);
      };
      flyRaf = requestAnimationFrame(step);
    };

    const onEnter = () => setHover(true);
    const onLeave = () => setHover(false);
    btn.addEventListener("pointerenter", onEnter);
    btn.addEventListener("pointerleave", onLeave);

    const onResize = () => {
      const r = el.getBoundingClientRect();
      if (r.right > vw() || r.bottom > vh()) utils.set(el, corner());
    };
    addEventListener("resize", onResize);

    const hintOn = setTimeout(() => setHint(true), 2500);
    const hintOff = setTimeout(() => setHint(false), 10_000);

    return () => {
      stop();
      cancelAnimationFrame(raf);
      [wanderTimer, blinkTimer, flashTimer, hintOn, hintOff].forEach(clearTimeout);
      removeEventListener("pointermove", onPointer);
      removeEventListener("resize", onResize);
      btn.removeEventListener("pointerdown", onDown);
      btn.removeEventListener("pointermove", onDragMove);
      btn.removeEventListener("pointerup", onUp);
      btn.removeEventListener("pointercancel", onUp);
      btn.removeEventListener("pointerenter", onEnter);
      btn.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  function toggle() {
    if (dragged.current) return void (dragged.current = false); // that was a drag, not a click
    setHint(false);
    const next = !open;
    setOpen(next);
    if (next) moveTo.current(vw() - SIZE - 20, homeY());
  }

  return (
    <>
      <div ref={wrap} className="pointer-events-none fixed left-0 top-0 z-50 touch-none select-none" style={{ width: SIZE, height: SIZE }}>
        {hint && !open && (
          <span className="absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-paper">
            Click to chat · drag to throw me
          </span>
        )}
        <button
          onClick={toggle}
          aria-label={open ? "Close chat with Pip" : "Chat with Pip, the Heldby helper"}
          aria-expanded={open}
          className={`pointer-events-auto block size-full rounded-full transition-transform duration-200 hover:scale-105 ${held ? "cursor-grabbing" : "cursor-grab"}`}
        >
          <svg ref={svg} viewBox="0 0 80 84" className="size-full overflow-visible drop-shadow-[0_8px_14px_rgb(0_0_0/0.18)]" aria-hidden>
            <ellipse cx="40" cy="80" rx="20" ry="3.5" fill="var(--color-ink)" opacity="0.15" />
            <g ref={body}>
              <Face mood={face} />
            </g>
          </svg>
        </button>
      </div>
      {open && <Chat page={pathname} onClose={toggle} onThinking={setThinking} onMood={(m) => react.current(m, 4000)} />}
    </>
  );
}

// ---------- face ----------

const INK = "var(--color-ink)";
const stroke = { stroke: INK, strokeWidth: 2.6, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

type EyeKind = "open" | "wide" | "smile" | "squeeze" | "spiral" | "closed" | "heart";
const EYES: Record<Mood, EyeKind> = {
  idle: "open", glad: "open", talk: "open", shy: "open", sad: "open", angry: "open",
  happy: "smile", surprised: "wide", dizzy: "spiral", cry: "squeeze", sleepy: "closed", love: "heart",
};
const MOUTHS: Record<Mood, React.ReactNode> = {
  idle: <path d="M35 52 Q40 56.5 45 52" {...stroke} />,
  glad: <path d="M34.5 51 Q40 59 45.5 51 Z" fill={INK} />,
  happy: <path d="M32.5 50 Q40 63 47.5 50 Z" fill={INK} />,
  love: <path d="M32.5 50 Q40 63 47.5 50 Z" fill={INK} />,
  talk: <ellipse cx="40" cy="53" rx="3.2" ry="3.2" fill={INK} className="animate-pulse" />,
  surprised: <ellipse cx="40" cy="54" rx="4" ry="5" fill={INK} />,
  sleepy: <ellipse cx="40" cy="54" rx="2.2" ry="2.2" fill={INK} />,
  shy: <path d="M35 54 q1.25 -2 2.5 0 t2.5 0 t2.5 0 t2.5 0" {...stroke} />,
  dizzy: <path d="M34 54 q1.5 -2.5 3 0 t3 0 t3 0 t3 0" {...stroke} />,
  sad: <path d="M35 56 Q40 51.5 45 56" {...stroke} />,
  angry: <path d="M34.5 55.5 Q40 51 45.5 55.5" {...stroke} strokeWidth={3} />,
  cry: <path d="M33 58 Q40 46 47 58 Z" fill={INK} />,
};
const BLUSH: Mood[] = ["glad", "happy", "shy", "love", "cry"];

export function Face({ mood }: { mood: Mood }) {
  return (
    <>
      <path d="M40 13 V6" {...stroke} strokeWidth={3} />
      <circle cx="40" cy="5" r="4" fill={INK} />
      <ellipse cx="27" cy="72" rx="8" ry="4.5" fill={INK} />
      <ellipse cx="53" cy="72" rx="8" ry="4.5" fill={INK} />
      <rect x="8" y="12" width="64" height="60" rx="30" fill="var(--color-red)" />

      <Eye cx={29} kind={EYES[mood]} side="left" />
      <Eye cx={51} kind={EYES[mood]} side="right" />

      {mood === "angry" && (
        <>
          <path d="M21 26 L34 31" {...stroke} strokeWidth={3} />
          <path d="M59 26 L46 31" {...stroke} strokeWidth={3} />
          {/* anger mark */}
          <path d="M60 15 l3 3 m4 -3 l-3 3 m-4 4 l3 -3 m4 3 l-3 -3" {...stroke} strokeWidth={2} />
        </>
      )}
      {(mood === "sad" || mood === "cry") && (
        <>
          <path d="M22 30 L33 26" {...stroke} />
          <path d="M58 30 L47 26" {...stroke} />
        </>
      )}

      {BLUSH.includes(mood) && (
        <>
          <ellipse cx="19.5" cy="50" rx="4.5" ry="3" fill="#ffc2b8" opacity="0.85" />
          <ellipse cx="60.5" cy="50" rx="4.5" ry="3" fill="#ffc2b8" opacity="0.85" />
        </>
      )}

      {MOUTHS[mood]}

      {mood === "cry" && (
        <>
          <path className="pip-tear" d="M24 44 c-2 3 -3 5 0 6 c3 -1 2 -3 0 -6z" fill="#8fd3ff" />
          <path className="pip-tear pip-tear-late" d="M56 44 c-2 3 -3 5 0 6 c3 -1 2 -3 0 -6z" fill="#8fd3ff" />
        </>
      )}
      {mood === "surprised" && <path d="M66 20 c-2 3 -3 5 0 6 c3 -1 2 -3 0 -6z" fill="#8fd3ff" />}
      {mood === "sleepy" && (
        <>
          <text x="62" y="14" fontSize="9" fontWeight="700" fill={INK} className="pip-float">z</text>
          <text x="68" y="8" fontSize="7" fontWeight="700" fill={INK} className="pip-float pip-float-late">z</text>
        </>
      )}
    </>
  );
}

function Eye({ cx, kind, side }: { cx: number; kind: EyeKind; side: "left" | "right" }) {
  const flip = side === "right" ? -1 : 1;
  return (
    <g transform={`translate(${cx} 38)`}>
      {kind === "open" && (
        <>
          <circle r="9" fill="#fff" />
          <g className="pupil">
            <circle r="5" fill={INK} />
            <circle cx="-1.6" cy="-2" r="1.7" fill="#fff" />
          </g>
          {/* eyelid: body-coloured square, invisible except over the white of the eye */}
          <rect className="lid" x="-10" y="-10" width="20" height="20" fill="var(--color-red)" style={{ transformBox: "fill-box", transformOrigin: "top", transform: "scaleY(0)" }} />
        </>
      )}
      {kind === "wide" && (
        <>
          <circle r="10.5" fill="#fff" />
          <g className="pupil">
            <circle r="3.2" fill={INK} />
          </g>
        </>
      )}
      {kind === "smile" && <path d="M-6 2 Q0 -6 6 2" {...stroke} strokeWidth={3} />}
      {kind === "closed" && <path d="M-6 0 Q0 4 6 0" {...stroke} strokeWidth={3} />}
      {kind === "squeeze" && <path d={`M${-6 * flip} -4 L${4 * flip} 0 L${-6 * flip} 4`} {...stroke} strokeWidth={3} />}
      {kind === "spiral" && <path d="M0 0 a1.5 1.5 0 1 1 3 0 a3 3 0 1 1 -6 0 a4.5 4.5 0 1 1 9 0 a6 6 0 1 1 -12 0" {...stroke} strokeWidth={2} />}
      {kind === "heart" && <path className="pip-beat" d="M0 6 C-9 0 -8 -9 0 -4 C8 -9 9 0 0 6 Z" fill="#fff" />}
    </g>
  );
}

// ---------- chat ----------

function Chat({ page, onClose, onThinking, onMood }: { page: string; onClose: () => void; onThinking: (t: boolean) => void; onMood: (m: Mood) => void }) {
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
        body: JSON.stringify({ messages: next.slice(1), page }), // greeting is UI-only
      });
      const data = (await res.json()) as { reply?: string; mood?: Mood; error?: string };
      setMessages((m) => [...m, { role: "assistant", content: data.reply ?? data.error ?? "Hmm, something went wrong." }]);
      onMood(data.error ? "sad" : data.mood && data.mood !== "idle" ? data.mood : "happy");
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "I couldn’t reach my brain. Check your connection?" }]);
      onMood("sad");
    } finally {
      setBusy(false);
      onThinking(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Chat with Pip"
      style={{ bottom: vh() - homeY() + 16 }}
      className="fixed right-4 z-50 flex h-[min(480px,calc(100svh-140px))] w-[min(360px,calc(100vw-32px))] flex-col overflow-hidden rounded-3xl bg-paper text-ink shadow-[0_30px_80px_-20px_rgb(0_0_0/0.45)] ring-1 ring-ink/10"
    >
      <header className="flex items-center justify-between border-b border-line px-5 py-4">
        <p className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span className="size-2.5 rounded-full bg-red" aria-hidden /> Pip <span className="font-normal text-muted">· Heldby helper</span>
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
