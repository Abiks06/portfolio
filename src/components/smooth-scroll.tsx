"use client";

import { ReactLenis } from "lenis/react";
import { MotionConfig, useReducedMotion } from "motion/react";

/** Lenis smooth scrolling (skipped for reduced motion) plus app-wide Motion defaults. */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();

  return (
    // "user" makes every Motion animation honour the visitor's reduced-motion setting.
    <MotionConfig reducedMotion="user" transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
      {reduced ? (
        children
      ) : (
        <ReactLenis root options={{ lerp: 0.1, anchors: { offset: -72 } }}>
          {children}
        </ReactLenis>
      )}
    </MotionConfig>
  );
}
