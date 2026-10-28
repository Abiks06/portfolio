"use client";

import { AnimatePresence, m } from "motion/react";
import { useEffect, useState } from "react";
import { BURST_EVENT } from "@/lib/events";

const CODE = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];

/** Accent confetti from a point, with WAAPI: no library, nothing left behind. */
function confetti(x: number, y: number) {
  const colors = ["var(--accent)", "var(--ink)", "var(--ink-3)"];
  for (let i = 0; i < 70; i++) {
    const piece = document.createElement("span");
    const size = 5 + Math.random() * 7;
    piece.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:${size}px;height:${size * 0.45}px;background:${colors[i % 3]};border-radius:1px;pointer-events:none;z-index:120`;
    document.body.appendChild(piece);
    const angle = Math.random() * Math.PI * 2;
    const speed = 180 + Math.random() * 420;
    const dx = Math.cos(angle) * speed;
    const dy = Math.sin(angle) * speed - 220;
    piece
      .animate(
        [
          { transform: "translate(-50%, -50%) rotate(0deg)", opacity: 1 },
          { transform: `translate(${dx}px, ${dy + 520}px) rotate(${(Math.random() - 0.5) * 1080}deg)`, opacity: 0 },
        ],
        { duration: 1400 + Math.random() * 900, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
      )
      .finished.then(() => piece.remove());
  }
}

/** ↑↑↓↓←→←→BA: shatters the sculpture, throws confetti and says hello. */
export function EasterEgg() {
  const [found, setFound] = useState(false);
  useEffect(() => {
    let at = 0;
    const onKey = (e: KeyboardEvent) => {
      at = e.key.toLowerCase() === CODE[at].toLowerCase() ? at + 1 : e.key === CODE[0] ? 1 : 0;
      if (at < CODE.length) return;
      at = 0;
      window.dispatchEvent(new Event(BURST_EVENT));
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) confetti(window.innerWidth / 2, window.innerHeight / 2);
      setFound(true);
      window.setTimeout(() => setFound(false), 4200);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <AnimatePresence>
      {found && (
        <m.div
          role="status"
          className="fixed inset-x-0 bottom-6 z-[110] mx-auto w-fit rounded-full bg-ink px-5 py-2.5 text-sm text-paper shadow-xl shadow-black/20"
          initial={{ opacity: 0, transform: "translateY(16px)" }}
          animate={{ opacity: 1, transform: "translateY(0px)" }}
          exit={{ opacity: 0, transform: "translateY(16px)" }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          You found the cheat code. <span className="text-accent">+30 lives.</span> Now hire me?
        </m.div>
      )}
    </AnimatePresence>
  );
}
