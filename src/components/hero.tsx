"use client";

import { motion } from "motion/react";
import dynamic from "next/dynamic";

// three.js is ~150 KB; load it after the page is interactive and never on the server.
const HeroScene = dynamic(() => import("./hero-scene"), {
  ssr: false,
  loading: () => <div className="m-auto aspect-square w-3/5 rounded-full bg-paper-2" />,
});

const ease = [0.16, 1, 0.3, 1] as const;

/** A line of display type that slides up out of a mask. */
function MaskLine({ children, delay, className }: { children: React.ReactNode; delay: number; className?: string }) {
  return (
    <span className="block overflow-hidden pb-[0.08em]">
      <motion.span
        className={`block ${className ?? ""}`}
        initial={{ y: "105%" }}
        animate={{ y: 0 }}
        transition={{ duration: 1.1, delay, ease }}
      >
        {children}
      </motion.span>
    </span>
  );
}

export function Hero({
  firstName,
  lastName,
  eyebrow,
  label,
  summary,
  email,
}: {
  firstName: string;
  lastName: string;
  eyebrow: string;
  label: string;
  summary: string;
  email: string;
}) {
  const fadeUp = (delay: number) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.9, delay, ease },
  });

  return (
    <section className="relative grid min-h-[calc(100svh-4rem)] items-center gap-8 py-12 lg:grid-cols-[1.25fr_1fr] lg:py-0">
      <div className="relative z-10">
        <motion.p {...fadeUp(0.1)} className="font-mono text-xs uppercase tracking-[0.18em] text-ink-3">
          {eyebrow}
        </motion.p>
        <h1 className="mt-6 font-display text-[clamp(3.5rem,11vw,8.5rem)] leading-[0.9] tracking-[-0.02em]">
          <MaskLine delay={0.2}>{firstName}</MaskLine>
          <MaskLine delay={0.32} className="italic text-accent">
            {lastName}
          </MaskLine>
        </h1>
        <motion.p {...fadeUp(0.6)} className="mt-8 text-lg font-medium text-ink sm:text-xl">
          {label}
        </motion.p>
        <motion.p {...fadeUp(0.7)} className="mt-4 max-w-xl leading-relaxed text-ink-2">
          {summary}
        </motion.p>
        <motion.div {...fadeUp(0.8)} className="mt-10 flex flex-wrap gap-3">
          <a
            href="#work"
            className="group inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper transition-transform duration-200 active:scale-[0.97]"
          >
            See my work
            <span className="transition-transform duration-300 ease-out-expo group-hover:translate-x-1">→</span>
          </a>
          <a
            href={`mailto:${email}`}
            className="inline-flex items-center rounded-full border border-line px-6 py-3 text-sm font-medium transition-colors duration-200 hover:border-ink active:scale-[0.97]"
          >
            Get in touch
          </a>
        </motion.div>
      </div>

      <motion.div
        className="pointer-events-none absolute -right-28 -top-10 -z-0 aspect-square w-[17rem] sm:-right-16 sm:top-0 sm:w-[26rem] lg:pointer-events-auto lg:relative lg:right-0 lg:top-0 lg:w-full"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.4, delay: 0.3, ease }}
      >
        {/* Behind the text on small screens, so it's faded there. */}
        <div className="h-full w-full opacity-25 sm:opacity-35 lg:opacity-100">
          <HeroScene />
        </div>
      </motion.div>
    </section>
  );
}
