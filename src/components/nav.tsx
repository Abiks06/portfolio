"use client";

import { m, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { openCommandMenu } from "./command-menu";

const LINKS = [
  { href: "#work", label: "Work" },
  { href: "#experience", label: "Experience" },
  { href: "#about", label: "About" },
  { href: "#contact", label: "Contact" },
];

/** The last section whose top has passed the upper third of the screen, for the nav indicator. */
function useActiveSection() {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const sections = LINKS.map((l) => document.querySelector<HTMLElement>(l.href)).filter((s): s is HTMLElement => !!s);
    const onScroll = () => {
      const line = window.innerHeight * 0.35;
      const current = sections.filter((s) => s.getBoundingClientRect().top <= line).at(-1);
      setActive(current ? `#${current.id}` : null);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return active;
}

/** Sticky header that tucks away while scrolling down and returns on scroll up, showing where you are. */
export function Nav({ initials }: { initials: string }) {
  const { scrollY, scrollYProgress } = useScroll();
  const reduced = useReducedMotion();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // ⌘ on Apple devices, Ctrl elsewhere; the server renders ⌘.
  const mac = useSyncExternalStore(
    () => () => {},
    () => /Mac|iPhone|iPad/.test(navigator.platform),
    () => true,
  );
  const active = useActiveSection();
  const smooth = useSpring(scrollYProgress, { stiffness: 200, damping: 40, restDelta: 0.001 });
  const bar = useTransform(reduced ? scrollYProgress : smooth, (p) => `scaleX(${p})`);

  useMotionValueEvent(scrollY, "change", (y) => {
    const previous = scrollY.getPrevious() ?? 0;
    setHidden(y > previous && y > 160);
    setScrolled(y > 8);
  });

  return (
    <m.header
      className={`sticky top-0 z-40 transition-[background-color,border-color] duration-300 ${scrolled ? "border-b border-line bg-paper/80 backdrop-blur-md" : "border-b border-transparent"}`}
      animate={{ transform: hidden ? "translateY(-100%)" : "translateY(0%)" }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-8">
        <a href="#top" className="font-display text-2xl italic">
          {initials}
          <span className="text-accent">.</span>
          <span className="sr-only"> Back to top</span>
        </a>
        <div className="flex items-center gap-3 sm:gap-6">
          <ul className="flex gap-0.5 text-sm text-ink-2 sm:gap-1">
            {LINKS.map((l) => (
              <li key={l.href} className={l.href === "#about" ? "hidden sm:block" : undefined}>
                <a
                  href={l.href}
                  aria-current={active === l.href ? "location" : undefined}
                  className={`relative block rounded-full px-2.5 py-1.5 transition-colors duration-200 sm:px-3 ${active === l.href ? "text-ink" : "hover:text-ink"}`}
                >
                  {active === l.href && (
                    <m.span
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-full bg-paper-2"
                      transition={{ type: "spring", duration: 0.45, bounce: 0.15 }}
                    />
                  )}
                  <span className="relative">{l.label}</span>
                </a>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={openCommandMenu}
            className="hidden items-center gap-1 rounded-full border border-line px-3 py-1.5 font-mono text-[11px] text-ink-2 transition-[border-color,color,transform] duration-150 hover:border-ink hover:text-ink active:scale-[0.97] sm:inline-flex"
            aria-label="Open command menu"
          >
            <kbd className="font-mono">{mac ? "⌘" : "Ctrl"}</kbd>
            <kbd className="font-mono">K</kbd>
          </button>
        </div>
      </nav>
      {/* Reading progress: how far down the page you are. */}
      <m.span aria-hidden="true" className="absolute inset-x-0 -bottom-px h-px origin-left bg-accent" style={{ transform: bar }} />
    </m.header>
  );
}
