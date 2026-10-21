"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { SculptureSvg } from "./sculpture-svg";

// three.js is ~240 KB gzipped, so it's only fetched once this component decides to use it.
const HeroScene = dynamic(() => import("./hero-scene"), { ssr: false, loading: () => <SculptureSvg /> });

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

/** Static SVG sculpture that upgrades to the live WebGL one once the page has finished loading and gone idle. */
export function Hero3D() {
  const [live, setLive] = useState(false);

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

  return live ? <HeroScene /> : <SculptureSvg />;
}
