"use client";

import { useEffect, useRef } from "react";
import { THEME_EVENT } from "./theme";

type P = { hx: number; hy: number; hz: number; x: number; y: number; z: number; vx: number; vy: number; vz: number; accent: boolean };

const FOCAL = 520; // perspective focal length, px
const REPEL = 90; // px radius the pointer clears
const MAX_POINTS = 2600;

/**
 * The initials as a cloud of ~2,500 points with depth. It tilts toward the pointer in
 * perspective, the pointer pushes points aside (they spring home), and a click scatters
 * them in 3D before they reassemble. 2D canvas with a hand-rolled projection, so it needs no
 * WebGL context; paused off-screen and a single still frame for reduced motion.
 */
export function ParticleInitials({ text }: { text: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let points: P[] = [];
    let w = 0;
    let h = 0;
    let dpr = 1;
    let ink = "#1b1a17";
    let accent = "#cc4a1f";

    const readColors = () => {
      const css = getComputedStyle(document.documentElement);
      ink = css.getPropertyValue("--ink").trim() || ink;
      accent = css.getPropertyValue("--accent").trim() || accent;
    };

    /** Rasterise the text off-screen and keep a point for every filled pixel on a grid. */
    const build = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const box = el.getBoundingClientRect();
      w = box.width;
      h = box.height;
      el.width = Math.round(w * dpr);
      el.height = Math.round(h * dpr);
      const off = document.createElement("canvas");
      off.width = Math.round(w);
      off.height = Math.round(h);
      const o = off.getContext("2d")!;
      const family = getComputedStyle(document.body).getPropertyValue("--font-instrument").trim() || "serif";
      let size = h * 1.12;
      o.font = `italic ${size}px ${family}`;
      const fit = o.measureText(text).width;
      if (fit > w * 0.9) size *= (w * 0.9) / fit;
      o.font = `italic ${size}px ${family}`;
      o.textAlign = "center";
      o.textBaseline = "middle";
      o.fillStyle = "#000";
      o.fillText(text, w / 2, h / 2 + size * 0.04);
      // Thicken the hairline serif so its strokes hold enough points to read as letters.
      o.lineWidth = Math.max(2, size * 0.035);
      o.lineJoin = "round";
      o.strokeStyle = "#000";
      o.strokeText(text, w / 2, h / 2 + size * 0.04);
      const data = o.getImageData(0, 0, off.width, off.height).data;
      const filled: [number, number][] = [];
      const step = 3;
      for (let y = 0; y < off.height; y += step) for (let x = 0; x < off.width; x += step) if (data[(y * off.width + x) * 4 + 3] > 128) filled.push([x, y]);
      // Thin evenly if the text is large.
      const keep = Math.min(1, MAX_POINTS / filled.length);
      points = filled
        .filter((_, i) => (i * 0.61803398875) % 1 < keep)
        .map(([x, y], i) => {
          const hx = x - w / 2;
          const hy = y - h / 2;
          const hz = (((i * 7919) % 101) / 101 - 0.5) * 70; // depth: an extruded, slightly ragged slab
          return { hx, hy, hz, x: hx, y: hy, z: hz, vx: 0, vy: 0, vz: 0, accent: (i * 2654435761) % 7 === 0 };
        });
    };

    const pointer = { x: -1e4, y: -1e4, inside: false };
    const tilt = { x: 0, y: 0 };
    let t = 0;
    let frame = 0;
    let visible = false;

    const render = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const cx = Math.cos(tilt.x);
      const sx = Math.sin(tilt.x);
      const cy = Math.cos(tilt.y);
      const sy = Math.sin(tilt.y);
      for (const p of points) {
        // Rotate about Y, then X, then project.
        const x1 = p.x * cy + p.z * sy;
        const z1 = -p.x * sy + p.z * cy;
        const y2 = p.y * cx - z1 * sx;
        const z2 = p.y * sx + z1 * cx;
        const s = FOCAL / (FOCAL + z2);
        const px = w / 2 + x1 * s;
        const py = h / 2 + y2 * s;
        const r = 1.45 * s;
        ctx.globalAlpha = Math.max(0.25, Math.min(1, 0.55 + (-z2 / 140)));
        ctx.fillStyle = p.accent ? accent : ink;
        ctx.fillRect(px - r, py - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
    };

    const step = () => {
      frame = requestAnimationFrame(step);
      if (!visible) return;
      t += 1 / 60;
      // Tilt eases toward the pointer; with no pointer it sways gently on its own.
      const targetY = pointer.inside ? ((pointer.x - w / 2) / w) * 0.9 : Math.sin(t * 0.4) * 0.25;
      const targetX = pointer.inside ? (-(pointer.y - h / 2) / h) * 0.6 : Math.cos(t * 0.3) * 0.12;
      tilt.y += (targetY - tilt.y) * 0.06;
      tilt.x += (targetX - tilt.x) * 0.06;
      for (const p of points) {
        // Springs home, with a slow breathing in depth.
        const hz = p.hz + Math.sin(t * 1.2 + p.hx * 0.02) * 6;
        p.vx += (p.hx - p.x) * 0.055;
        p.vy += (p.hy - p.y) * 0.055;
        p.vz += (hz - p.z) * 0.055;
        if (pointer.inside) {
          const dx = p.x + w / 2 - pointer.x;
          const dy = p.y + h / 2 - pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < REPEL * REPEL) {
            const d = Math.sqrt(d2) || 1;
            const f = (1 - d / REPEL) * 4.5;
            p.vx += (dx / d) * f;
            p.vy += (dy / d) * f;
            p.vz -= f * 1.5;
          }
        }
        p.vx *= 0.84;
        p.vy *= 0.84;
        p.vz *= 0.84;
        p.x += p.vx;
        p.y += p.vy;
        p.z += p.vz;
      }
      render();
    };

    const scatter = () => {
      for (const p of points) {
        const a = Math.random() * Math.PI * 2;
        const b = Math.acos(Math.random() * 2 - 1);
        const speed = 14 + Math.random() * 26;
        p.vx += Math.sin(b) * Math.cos(a) * speed;
        p.vy += Math.sin(b) * Math.sin(a) * speed;
        p.vz += Math.cos(b) * speed;
      }
    };

    const onMove = (e: PointerEvent) => {
      const box = el.getBoundingClientRect();
      pointer.x = e.clientX - box.left;
      pointer.y = e.clientY - box.top;
      pointer.inside = pointer.x >= -40 && pointer.y >= -40 && pointer.x <= w + 40 && pointer.y <= h + 40;
    };
    const onLeave = () => (pointer.inside = false);

    readColors();
    // Wait for the display font, or the points would trace the fallback serif.
    document.fonts.ready.then(() => {
      build();
      render();
      if (reduced) return;
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerleave", onLeave);
      el.addEventListener("click", scatter);
      frame = requestAnimationFrame(step);
    });

    const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
    io.observe(el);
    const onResize = () => {
      build();
      render();
    };
    const onTheme = () => {
      readColors();
      render();
    };
    window.addEventListener("resize", onResize);
    window.addEventListener(THEME_EVENT, onTheme);
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", onTheme);
    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener(THEME_EVENT, onTheme);
      window.matchMedia("(prefers-color-scheme: dark)").removeEventListener("change", onTheme);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("click", scatter);
    };
  }, [text]);

  return (
    <figure className="select-none">
      <canvas ref={canvas} aria-hidden="true" className="h-[220px] w-full cursor-crosshair touch-pan-y sm:h-[300px]" />
      <figcaption className="mt-2 text-center font-mono text-[11px] text-ink-3">Move through it · click to scatter</figcaption>
    </figure>
  );
}
