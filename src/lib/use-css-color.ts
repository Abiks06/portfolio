"use client";

import { useEffect, useState } from "react";
import { THEME_EVENT } from "@/components/theme";

/** Reads a CSS custom property and follows light/dark switches (system or the theme toggle). */
export function useCssColor(name: string, fallback: string) {
  const [color, setColor] = useState(fallback);
  useEffect(() => {
    const read = () => setColor(getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback);
    read();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", read);
    window.addEventListener(THEME_EVENT, read);
    return () => {
      media.removeEventListener("change", read);
      window.removeEventListener(THEME_EVENT, read);
    };
  }, [name, fallback]);
  return color;
}
