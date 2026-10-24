"use client";

import { m, useAnimationFrame, useInView, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, useVelocity } from "motion/react";
import { useRef } from "react";

/** Wraps v into [min, max). */
const wrap = (min: number, max: number, v: number) => ((((v - min) % (max - min)) + (max - min)) % (max - min)) + min;

/**
 * One row that drifts forever and reacts to scrolling: scroll faster and it speeds up, scroll
 * up and it reverses. Linear, because constant motion shouldn't ease.
 */
function Row({ items, baseSpeed, active }: { items: string[]; baseSpeed: number; active: boolean }) {
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const { scrollY } = useScroll();
  const velocity = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 400 });
  const boost = useTransform(velocity, [-1500, 0, 1500], [-4, 0, 4], { clamp: false });
  const direction = useRef(1);
  const transform = useTransform(x, (v) => `translate3d(${wrap(-50, 0, v)}%, 0, 0)`);

  useAnimationFrame((_, delta) => {
    if (reduced || !active) return;
    const b = boost.get();
    if (b < 0) direction.current = -1;
    else if (b > 0) direction.current = 1;
    // baseSpeed is % of one copy per second; the strip holds two copies, so -50% loops seamlessly.
    x.set(x.get() + direction.current * baseSpeed * (delta / 1000) * (1 + Math.abs(b)));
  });

  const copy = (key: string) => (
    <span key={key} className="flex shrink-0 items-center">
      {items.map((item, i) => (
        <span key={i} className="flex items-center">
          <span className="px-6 sm:px-8">{item}</span>
          <span className="size-2 rounded-full bg-accent sm:size-2.5" />
        </span>
      ))}
    </span>
  );

  return (
    <m.div className="flex w-max whitespace-nowrap" style={{ transform }}>
      {copy("a")}
      {copy("b")}
    </m.div>
  );
}

/** Two counter-moving rows of the skills, as a band between sections. Decorative: the skills are listed properly below. */
export function SkillsMarquee({ skills }: { skills: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const active = useInView(ref, { margin: "100px 0px" });
  const half = Math.ceil(skills.length / 2);
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="relative left-1/2 mt-28 w-screen -translate-x-1/2 select-none overflow-hidden border-y border-line py-6 font-display text-4xl leading-tight sm:mt-40 sm:py-8 sm:text-6xl [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]"
    >
      <Row items={skills.slice(0, half)} baseSpeed={-1.6} active={active} />
      <div className="italic text-ink-3">
        <Row items={skills.slice(half)} baseSpeed={1.2} active={active} />
      </div>
    </div>
  );
}
