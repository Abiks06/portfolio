"use client";

import { useCallback, useSyncExternalStore } from "react";

export type Theme = "light" | "dark";
const KEY = "theme";
export const THEME_EVENT = "portfolio:theme-change";

/**
 * Runs in <head> before first paint: applies a saved choice so a returning visitor never sees
 * the other theme flash. Without one, the CSS follows the system setting.
 */
export const themeScript = `try{var t=localStorage.getItem("${KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

function resolved(): Theme {
  const chosen = document.documentElement.dataset.theme;
  if (chosen === "light" || chosen === "dark") return chosen;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function subscribe(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  window.addEventListener(THEME_EVENT, onChange);
  return () => {
    media.removeEventListener("change", onChange);
    window.removeEventListener(THEME_EVENT, onChange);
  };
}

/** The theme in effect, following both the toggle and the system. */
export function useTheme() {
  return useSyncExternalStore(subscribe, resolved, () => "light" as Theme);
}

function apply(theme: Theme | null) {
  const root = document.documentElement;
  if (theme) root.dataset.theme = theme;
  else delete root.dataset.theme;
  try {
    if (theme) localStorage.setItem(KEY, theme);
    else localStorage.removeItem(KEY);
  } catch {
    // storage blocked: the choice lasts for this visit
  }
  window.dispatchEvent(new Event(THEME_EVENT));
}

type ViewTransitionDoc = Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };

/**
 * Switches theme. With View Transitions (and motion allowed) the new theme spreads out in a
 * circle from `origin`; otherwise it switches instantly.
 */
export function setTheme(theme: Theme | null, origin?: { x: number; y: number }) {
  const doc = document as ViewTransitionDoc;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!doc.startViewTransition || reduced) return apply(theme);
  const x = origin?.x ?? window.innerWidth / 2;
  const y = origin?.y ?? 0;
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  const transition = doc.startViewTransition(() => apply(theme));
  transition.ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 650, easing: "cubic-bezier(0.16, 1, 0.3, 1)", pseudoElement: "::view-transition-new(root)" },
    );
  });
}

/** Sun/moon button: flips between light and dark from wherever you are now. */
export function ThemeToggle() {
  const theme = useTheme();
  const next: Theme = theme === "dark" ? "light" : "dark";
  const onClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      setTheme(next, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
    },
    [next],
  );
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Switch to ${next} theme`}
      className="grid size-8 place-items-center rounded-full border border-line text-ink-2 transition-[border-color,color,transform] duration-150 hover:border-ink hover:text-ink active:scale-[0.94]"
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
        {/* One drawing for both: the moon's bite slides in over the sun as the theme darkens. */}
        <mask id="moon-bite">
          <rect width="24" height="24" fill="white" />
          <circle
            cx="17"
            cy="7"
            r="6"
            fill="black"
            className="transition-transform duration-500 ease-out-expo"
            style={{ transform: theme === "dark" ? "translate(0, 0)" : "translate(13px, -13px)" }}
          />
        </mask>
        <circle
          cx="12"
          cy="12"
          r="8"
          fill="currentColor"
          stroke="none"
          mask="url(#moon-bite)"
          className="transition-transform duration-500 ease-out-expo [transform-box:fill-box] [transform-origin:center]"
          style={{ transform: theme === "dark" ? "scale(1)" : "scale(0.56)" }}
        />
        <g className={`origin-center transition-[opacity,transform] [transform-box:fill-box] duration-500 ease-out-expo ${theme === "dark" ? "scale-50 opacity-0" : "opacity-100"}`}>
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <line key={a} x1="12" y1="2.5" x2="12" y2="4.5" transform={`rotate(${a} 12 12)`} />
          ))}
        </g>
      </svg>
    </button>
  );
}
