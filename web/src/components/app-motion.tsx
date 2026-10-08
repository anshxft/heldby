"use client";

import { animate, stagger } from "animejs";
import { useEffect } from "react";

type Revealable = HTMLElement | SVGElement;

/**
 * Animates anything marked `data-reveal` as it appears — on first load, on route change, and when
 * chain data arrives later. A MutationObserver callback runs before paint, so new nodes never flash.
 *
 *   data-reveal            fade + rise (staggered with its batch)
 *   data-reveal="title"    each `.line > span` rises out of its mask (landing-page headline style)
 *   data-reveal="card"     red cards open top-down
 *   data-reveal="bar"      progress bars grow left to right
 *   data-reveal="pop"      badges and checkmarks pop in
 */

export function AppMotion() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const seen = new WeakSet<Element>();
    let queue: Revealable[] = [];
    let scheduled = false;

    const play = (batch: Revealable[]) => {
      const by = (kind: string) => batch.filter((el) => (el.dataset.reveal || "up") === kind);
      const ease = "out(4)";

      for (const el of by("title")) {
        el.style.opacity = "1";
        animate(el.querySelectorAll(".line > span"), { y: ["105%", "0%"], duration: 900, ease, delay: stagger(90) });
      }
      const ups = by("up");
      if (ups.length) animate(ups, { opacity: [0, 1], y: [18, 0], duration: 650, ease, delay: stagger(45, { start: 120 }) });
      const cards = by("card");
      if (cards.length)
        animate(cards, { opacity: [0, 1], clipPath: ["inset(0 0 100% 0)", "inset(0 0 0% 0)"], duration: 850, ease: "inOut(4)", delay: 150 });
      const bars = by("bar");
      if (bars.length) animate(bars, { opacity: [0, 1], scaleX: [0, 1], duration: 900, ease: "inOut(3)", delay: stagger(120, { start: 200 }) });
      const pops = by("pop");
      if (pops.length) animate(pops, { opacity: [0, 1], scale: [0.6, 1], duration: 450, ease: "out(3)", delay: stagger(40) });
    };

    const enqueue = (el: Element) => {
      // SVG icons (e.g. lucide checkmarks) can be marked too, not just HTML elements
      if (seen.has(el) || !(el instanceof HTMLElement || el instanceof SVGElement)) return;
      // Server-rendered nodes must be hydrated before we touch their styles, or React reports a mismatch.
      // React tags every node it owns with a __reactFiber$ key; the sweep below retries until it appears.
      if (!Object.keys(el).some((k) => k.startsWith("__reactFiber$"))) return;
      seen.add(el);
      queue.push(el);
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(() => {
        scheduled = false;
        const batch = queue;
        queue = [];
        play(batch);
      });
    };
    const scan = (node: Node) => {
      if (!(node instanceof Element)) return;
      if (node.hasAttribute("data-reveal")) enqueue(node);
      node.querySelectorAll("[data-reveal]").forEach(enqueue);
    };

    scan(document.body);
    const mo = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === "attributes") scan(r.target);
        r.addedNodes.forEach(scan);
      }
    });
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-reveal"] });

    // picks up server-rendered nodes once hydrated, and anything the observer missed — nothing stays hidden
    const sweep = setInterval(() => document.querySelectorAll("[data-reveal]").forEach(enqueue), 120);

    return () => {
      mo.disconnect();
      clearInterval(sweep);
    };
  }, []);

  return null;
}
