"use client";

import { m } from "motion/react";
import { useEffect, useState } from "react";
import type { Activity } from "@/lib/github";

const ICON: Record<Activity["kind"], string> = { push: "↑", pr: "⇄", repo: "+", release: "◆", star: "★" };
const LABEL: Record<Activity["kind"], string> = { push: "Commit", pr: "Pull request", repo: "New repo", release: "Release", star: "Star" };

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
function ago(iso: string, now: number) {
  const s = Math.round((new Date(iso).getTime() - now) / 1000);
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]];
  for (const [unit, size] of steps) if (Math.abs(s) >= size) return rtf.format(Math.round(s / size), unit);
  return "just now";
}

/**
 * "What I'm building right now": the latest public GitHub events. Times are worked out in the
 * browser, since the page itself is cached and "3 hours ago" would otherwise go stale.
 */
export function LiveActivity({ items }: { items: Activity[] }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 60_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);

  if (!items.length) return null;
  return (
    <ol className="divide-y divide-line">
      {items.map((it, i) => (
        <m.li
          key={it.id}
          initial={{ opacity: 0, transform: "translateY(10px)" }}
          whileInView={{ opacity: 1, transform: "translateY(0px)" }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
        >
          <a href={it.url} target="_blank" rel="noreferrer" className="group grid grid-cols-[2rem_1fr_auto] items-baseline gap-3 py-3.5 sm:grid-cols-[2rem_9rem_1fr_auto]">
            <span className="relative grid size-7 place-items-center rounded-full border border-line font-mono text-xs text-ink-2 transition-colors duration-200 group-hover:border-accent group-hover:text-accent" aria-hidden="true">
              {ICON[it.kind]}
              {i === 0 && <span className="absolute -right-0.5 -top-0.5 size-2 animate-ping rounded-full bg-accent motion-reduce:animate-none" />}
            </span>
            <span className="hidden truncate font-mono text-xs text-ink-3 sm:block">{it.repo}</span>
            <span className="min-w-0">
              <span className="sr-only">{LABEL[it.kind]} in {it.repo}: </span>
              <span className="line-clamp-1 transition-colors duration-200 group-hover:text-accent">{it.title}</span>
              <span className="block truncate font-mono text-[11px] text-ink-3 sm:hidden">{it.repo}</span>
            </span>
            <time dateTime={it.at} className="shrink-0 font-mono text-[11px] text-ink-3" suppressHydrationWarning>
              {now ? ago(it.at, now) : it.at.slice(0, 10)}
            </time>
          </a>
        </m.li>
      ))}
    </ol>
  );
}
