"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { SculptureSvg } from "./sculpture-svg";

// three.js is ~240 KB gzipped, so it's only fetched once this component decides to use it.
const HeroScene = dynamic(() => import("./hero-scene"), { ssr: false });

type NetworkInformation = { saveData?: boolean; effectiveType?: string };

/** WebGL only pays off on large screens with motion allowed and a decent connection. */
function shouldUseWebGL() {
  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  return (
    window.matchMedia("(min-width: 1024px)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
    !connection?.saveData &&
    !/(^|-)2g$/.test(connection?.effectiveType ?? "")
  );
}

/**
 * Static SVG sculpture that upgrades to the live WebGL one once the page has
 * loaded and gone idle. The SVG is the scene's first frame, so the two crossfade
 * without a visible jump; the scene only starts moving after the fade.
 */
export function Hero3D() {
  const [live, setLive] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!shouldUseWebGL()) return;
    let idle = 0;
    const start = () => {
      idle = window.requestIdleCallback
        ? window.requestIdleCallback(() => setLive(true), { timeout: 2500 })
        : window.setTimeout(() => setLive(true), 1200);
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => {
      window.removeEventListener("load", start);
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
    };
  }, []);

  const fade = "absolute inset-0 transition-opacity duration-700 ease-out";

  return (
    <div className="relative h-full w-full">
      <SculptureSvg className={`${fade} h-full w-full ${ready ? "opacity-0" : "opacity-100"}`} />
      {live && (
        <div className={`${fade} ${ready ? "opacity-100" : "opacity-0"}`}>
          <HeroScene onReady={() => setReady(true)} />
        </div>
      )}
    </div>
  );
}
