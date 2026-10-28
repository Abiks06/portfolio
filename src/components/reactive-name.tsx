"use client";

import { useEffect, useRef } from "react";

const RADIUS = 160; // px around the pointer that letters react within
const PUSH = 18; // max px a letter moves away
const LIFT = 6; // max degrees a letter tilts

/**
 * Display type whose letters lean away from the pointer and settle back when it leaves, like
 * type set loose on the page. Mouse and trackpad only; still for reduced motion.
 * Letters are spans in the server HTML, so the first paint and the CSS intro are unchanged.
 */
export function ReactiveName({ text }: { text: string }) {
  const root = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const letters = Array.from(el.querySelectorAll<HTMLSpanElement>("[data-letter]"));
    const state = letters.map(() => ({ x: 0, y: 0, r: 0, tx: 0, ty: 0, tr: 0 }));
    let pointer: { x: number; y: number } | null = null;
    let frame = 0;

    const tick = () => {
      let moving = false;
      letters.forEach((letter, i) => {
        const s = state[i];
        if (pointer) {
          const box = letter.getBoundingClientRect();
          const cx = box.left + box.width / 2 - s.x;
          const cy = box.top + box.height / 2 - s.y;
          const dx = cx - pointer.x;
          const dy = cy - pointer.y;
          const dist = Math.hypot(dx, dy) || 1;
          const force = Math.max(0, 1 - dist / RADIUS) ** 2;
          s.tx = (dx / dist) * PUSH * force;
          s.ty = (dy / dist) * PUSH * force;
          s.tr = (dx / dist) * LIFT * force;
        } else {
          s.tx = s.ty = s.tr = 0;
        }
        // Critically damped-ish easing toward the target: quick to react, no wobble.
        s.x += (s.tx - s.x) * 0.18;
        s.y += (s.ty - s.y) * 0.18;
        s.r += (s.tr - s.r) * 0.18;
        if (Math.abs(s.tx - s.x) + Math.abs(s.ty - s.y) > 0.05 || Math.abs(s.x) + Math.abs(s.y) > 0.05) moving = true;
        letter.style.transform = `translate3d(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px, 0) rotate(${s.r.toFixed(2)}deg)`;
      });
      frame = moving || pointer ? requestAnimationFrame(tick) : 0;
    };
    const start = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const onMove = (e: PointerEvent) => {
      const box = el.getBoundingClientRect();
      const near = e.clientX > box.left - RADIUS && e.clientX < box.right + RADIUS && e.clientY > box.top - RADIUS && e.clientY < box.bottom + RADIUS;
      pointer = near ? { x: e.clientX, y: e.clientY } : null;
      start();
    };
    const onLeave = () => {
      pointer = null;
      start();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <span ref={root}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {[...text].map((ch, i) => (
          <span key={i} data-letter className="inline-block will-change-transform">
            {ch === " " ? " " : ch}
          </span>
        ))}
      </span>
    </span>
  );
}
