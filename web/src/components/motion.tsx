"use client";

import { useEffect } from "react";
import { animate, createScope, createTimeline, stagger, utils } from "animejs";

const ease = "out(4)";

// All page animations live here so page.tsx stays a plain server component.
export function Motion() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    document.documentElement.classList.add("motion");

    const scope = createScope().add(() => {
      utils.set(".grow", { scaleX: 0 });

      // Hero intro: lines rise out of their masks, red card opens from the centre
      createTimeline({ defaults: { ease } })
        .add(".hero-line > span", { opacity: [0, 1], y: ["105%", "0%"], duration: 1100, delay: stagger(90) })
        .add(".red-card", {
          opacity: [0, 1],
          clipPath: ["inset(50% 50% 50% 50%)", "inset(0% 0% 0% 0%)"],
          duration: 900,
          ease: "inOut(4)",
        }, "-=700")
        .add(".pop", { opacity: [0, 1], y: [10, 0], duration: 600, delay: stagger(80) }, "-=500")
        .call(cardLoop);

      // Hero lines drift sideways at different speeds while scrolling
      const lines = [...document.querySelectorAll<HTMLElement>(".hero-line")];
      const onScroll = () => {
        const y = window.scrollY;
        for (const l of lines) utils.set(l, { x: y * Number(l.dataset.speed) });
      };
      window.addEventListener("scroll", onScroll, { passive: true });

      // Scroll reveals: each .reveal-group animates its children once
      const io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (!e.isIntersecting) continue;
            const g = e.target as HTMLElement;
            io.unobserve(g);
            const lineSpans = g.querySelectorAll(".line > span");
            if (lineSpans.length)
              animate(lineSpans, { opacity: [0, 1], y: ["105%", "0%"], duration: 1000, ease, delay: stagger(90) });
            const items = g.querySelectorAll(".reveal");
            if (items.length)
              animate(items, { opacity: [0, 1], y: [24, 0], duration: 800, ease, delay: stagger(Number(g.dataset.stagger ?? 90)) });
            const grows = g.querySelectorAll(".grow");
            if (grows.length) animate(grows, { scaleX: [0, 1], duration: 1400, ease: "inOut(4)", delay: 200 });
          }
        },
        { threshold: 0.15 },
      );
      document.querySelectorAll(".reveal-group").forEach((g) => io.observe(g));

      return () => {
        io.disconnect();
        window.removeEventListener("scroll", onScroll);
      };
    });

    return () => {
      scope.revert();
      document.documentElement.classList.remove("motion");
    };
  }, []);

  return null;
}

// Red card demo: escrow moves Funded → Submitted → AI verified → Released, on loop.
function cardLoop() {
  const status = document.querySelector<HTMLElement>(".status");
  const amount = document.querySelector<HTMLElement>(".amount");
  const say = (t: string) => () => {
    if (status) status.textContent = t;
  };
  const counter = { v: 0 };
  const hold = "+=900";

  createTimeline({ loop: true, defaults: { ease: "inOut(3)", duration: 700 } })
    .set(".seg", { scaleX: 0 })
    .call(say("Funding…"))
    .add(counter, {
      v: [0, 250],
      duration: 1000,
      ease: "out(3)",
      onUpdate: () => {
        if (amount) amount.textContent = counter.v.toFixed(2);
      },
    })
    .add(".seg-0", { scaleX: 1 }, "<<")
    .call(say("Funded"))
    .call(say("Work submitted"), hold)
    .add(".seg-1", { scaleX: 1 }, "<<")
    .call(say("AI verifying…"), hold)
    .add(".seg-2", { scaleX: 1, duration: 1400 }, "<<")
    .call(say("AI verified ✓"))
    .call(say("Released to freelancer"), hold)
    .add(".seg-3", { scaleX: 1 }, "<<")
    .add(".red-card", { scale: [1, 1.03, 1], duration: 600 }, "<<")
    .call(() => {}, "+=2200");
}
