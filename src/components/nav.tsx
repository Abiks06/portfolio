"use client";

import { m, useMotionValueEvent, useScroll } from "motion/react";
import { useState } from "react";

const LINKS = [
  { href: "#work", label: "Work" },
  { href: "#experience", label: "Experience" },
  { href: "#about", label: "About" },
  { href: "#contact", label: "Contact" },
];

/** Sticky header that tucks away while scrolling down and returns on scroll up. */
export function Nav({ initials }: { initials: string }) {
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (y) => {
    const previous = scrollY.getPrevious() ?? 0;
    setHidden(y > previous && y > 160);
    setScrolled(y > 8);
  });

  return (
    <m.header
      className={`sticky top-0 z-40 transition-[background-color,border-color] duration-300 ${scrolled ? "border-b border-line bg-paper/80 backdrop-blur-md" : "border-b border-transparent"}`}
      animate={{ y: hidden ? "-100%" : "0%" }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-8">
        <a href="#top" className="font-display text-2xl italic">
          {initials}
          <span className="text-accent">.</span>
          <span className="sr-only"> Back to top</span>
        </a>
        <ul className="flex gap-5 text-sm text-ink-2 sm:gap-8">
          {LINKS.map((l) => (
            <li key={l.href} className={l.href === "#about" ? "hidden sm:block" : undefined}>
              <a href={l.href} className="transition-colors duration-200 hover:text-ink">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </m.header>
  );
}
