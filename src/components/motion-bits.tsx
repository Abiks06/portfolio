"use client";

import { AnimatePresence, m, type MotionValue, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef, useState } from "react";
import { copyText } from "@/lib/copy-text";
import { useCssColor } from "@/lib/use-css-color";
import { useMediaQuery } from "@/lib/use-media-query";

const ease = [0.16, 1, 0.3, 1] as const;

/** Mouse and trackpad only: touch fires hovers on tap, and reduced motion opts out. */
function usePointerMotion() {
  const reduced = useReducedMotion();
  const fine = useMediaQuery("(hover: hover) and (pointer: fine)");
  return fine && !reduced;
}

/**
 * A heading whose words rise out of a mask, one after another, the first time it scrolls into
 * view: the same move as the hero name, so every section opens the same way.
 */
export function KineticText({ text, className }: { text: string; className?: string }) {
  const words = text.split(" ");
  return (
    <m.span
      className={className}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, margin: "0px 0px -15% 0px" }}
      transition={{ staggerChildren: 0.06 }}
    >
      <span className="sr-only">{text}</span>
      {words.map((word, i) => (
        <span key={i} aria-hidden="true" className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <m.span
            className="inline-block"
            variants={{ hidden: { transform: "translateY(105%)" }, shown: { transform: "translateY(0%)" } }}
            transition={{ duration: 0.9, ease }}
          >
            {word}
            {i < words.length - 1 && " "}
          </m.span>
        </span>
      ))}
    </m.span>
  );
}

/**
 * Scroll-linked depth for the hero: as the page scrolls away, the text drifts up and fades a
 * little faster than the page while the sculpture lags and shrinks, so the hero reads as a layer
 * the content slides over. Static for reduced motion.
 */
export function HeroDepth({ layer, children, className }: { layer: "text" | "art"; children: React.ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  const { scrollY } = useScroll();
  const transform = useTransform(scrollY, (y) => {
    const p = Math.min(Math.max(y / 700, 0), 1);
    return layer === "text"
      ? `translate3d(0, ${-p * 90}px, 0)`
      : `translate3d(0, ${p * 120}px, 0) scale(${1 - p * 0.12}) rotate(${p * -8}deg)`;
  });
  // Gentle: a strongly faded button reads as disabled.
  const opacity = useTransform(scrollY, [0, 700], layer === "text" ? [1, 0.6] : [1, 0.45]);
  return (
    <m.div className={className} style={reduced ? undefined : { transform, opacity }}>
      {children}
    </m.div>
  );
}

/** Leans toward the pointer while it's over the element, and springs back when it leaves. */
export function Magnetic({ children, strength = 0.25, className }: { children: React.ReactNode; strength?: number; className?: string }) {
  const enabled = usePointerMotion();
  const x = useSpring(useMotionValue(0), { stiffness: 260, damping: 18, mass: 0.6 });
  const y = useSpring(useMotionValue(0), { stiffness: 260, damping: 18, mass: 0.6 });
  const transform = useTransform([x, y], ([a, b]) => `translate3d(${a}px, ${b}px, 0)`);
  return (
    <m.div
      className={`inline-block ${className ?? ""}`}
      style={enabled ? { transform } : undefined}
      onPointerMove={(e) => {
        if (!enabled) return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </m.div>
  );
}

/** Copies the address and confirms it in place: the label slides out and "Copied" slides in. */
export function CopyEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number>(0);
  const copy = async () => {
    if (!(await copyText(email))) return; // copying blocked: the mailto link next to it still works
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="relative inline-flex h-11 items-center overflow-hidden rounded-full border border-line px-5 text-sm font-medium transition-[border-color,transform] duration-150 hover:border-ink active:scale-[0.97]"
      aria-live="polite"
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <m.span
          key={copied ? "copied" : "copy"}
          className={`inline-flex items-center gap-2 ${copied ? "text-accent" : ""}`}
          initial={{ transform: "translateY(110%)", opacity: 0 }}
          animate={{ transform: "translateY(0%)", opacity: 1 }}
          exit={{ transform: "translateY(-110%)", opacity: 0 }}
          transition={{ duration: 0.2, ease }}
        >
          {copied ? "Copied to clipboard ✓" : "Copy email"}
        </m.span>
      </AnimatePresence>
    </button>
  );
}

function ScrubWord({ word, index, total, progress, dim, lit }: { word: string; index: number; total: number; progress: MotionValue<number>; dim: string; lit: string }) {
  // Each word lights up over its own slice of the scroll, with a little overlap so it reads as a sweep.
  // It goes from ink-3 (which passes contrast on its own) to full ink, so it's always readable.
  const start = index / total;
  const color = useTransform(progress, [start - 0.04, start + 1.5 / total], [dim, lit]);
  return <m.span style={{ color }}>{word} </m.span>;
}

/**
 * A statement whose words light up one after another as it scrolls through the screen, so it's
 * read at the pace you scroll. Fully lit for reduced motion.
 */
export function ScrubText({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "end 50%"] });
  // Real colour values (not var()s) so Motion can interpolate them; they follow the theme.
  const dim = useCssColor("--ink-3", "#6a645a");
  const lit = useCssColor("--ink", "#1b1a17");
  const words = text.split(" ");
  return (
    <p ref={ref} className={className}>
      {reduced
        ? text
        : words.map((w, i) => <ScrubWord key={`${i}-${dim}-${lit}`} word={w} index={i} total={words.length} progress={scrollYProgress} dim={dim} lit={lit} />)}
    </p>
  );
}
