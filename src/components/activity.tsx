"use client";

import { m, useInView } from "motion/react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { ContributionDay } from "@/lib/github";

const LEVEL_MIX = [0, 28, 50, 74, 100];

/** Contribution calendar whose cells fill in column by column, oldest to newest, when scrolled into view. */
export function Heatmap({ days, total }: { days: ContributionDay[]; total: number }) {
  const scroller = useRef<HTMLDivElement>(null);
  const inView = useInView(scroller, { once: true, margin: "0px 0px -15% 0px" });

  // On narrow screens start scrolled to the most recent weeks.
  useEffect(() => {
    if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth;
  }, []);

  // GitHub weeks start on Sunday; pad so the first day lands on its weekday row.
  const offset = days.length ? new Date(days[0].date).getUTCDay() : 0;

  return (
    <figure>
      <div ref={scroller} data-lenis-prevent className="overflow-x-auto pb-2">
        <div
          className="grid w-max grid-flow-col gap-[3px]"
          style={{ gridTemplateRows: "repeat(7, 11px)", gridAutoColumns: "11px" }}
          role="img"
          aria-label={`${total} GitHub contributions in the last year`}
        >
          {Array.from({ length: offset }, (_, i) => (
            <span key={`pad-${i}`} />
          ))}
          {days.map((d, i) => {
            const week = Math.floor((i + offset) / 7);
            return (
              <span
                key={d.date}
                title={`${d.count} contribution${d.count === 1 ? "" : "s"} on ${d.date}`}
                className="rounded-[2px] transition-[opacity,transform] duration-500 ease-out-expo motion-reduce:transition-none"
                style={{
                  background:
                    d.level === 0
                      ? "var(--line)"
                      : `color-mix(in oklab, var(--accent) ${LEVEL_MIX[d.level]}%, var(--paper-2))`,
                  opacity: inView ? 1 : 0,
                  transform: inView ? "scale(1)" : "scale(0.4)",
                  transitionDelay: `${week * 14}ms`,
                }}
              />
            );
          })}
        </div>
      </div>
      <figcaption className="mt-3 flex items-center justify-end gap-2 font-mono text-[11px] text-ink-3">
        Less
        {LEVEL_MIX.map((mix, i) => (
          <span
            key={mix}
            className="size-[11px] rounded-[2px]"
            style={{ background: i === 0 ? "var(--line)" : `color-mix(in oklab, var(--accent) ${mix}%, var(--paper-2))` }}
          />
        ))}
        More
      </figcaption>
    </figure>
  );
}

// three.js is shared with the hero scene; this view's code only loads when someone picks 3D.
const Skyline = dynamic(() => import("./contribution-skyline"), {
  ssr: false,
  loading: () => <div className="grid h-[340px] place-items-center font-mono text-xs text-ink-3 sm:h-[420px]">Building the skyline…</div>,
});

/** The calendar with a 2D/3D switch: the flat grid, or the same year as a city you can turn. */
export function ActivityViews({ days, total }: { days: ContributionDay[]; total: number }) {
  const [view, setView] = useState<"2d" | "3d">("2d");
  return (
    <div>
      <div className="mb-5 flex gap-1" role="group" aria-label="Calendar view">
        {(["2d", "3d"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            aria-pressed={view === v}
            className={`relative rounded-full px-3.5 py-1 font-mono text-xs uppercase transition-colors duration-200 ${view === v ? "text-paper" : "text-ink-2 hover:text-ink"}`}
          >
            {view === v && <m.span layoutId="calendar-view" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
            <span className="relative">{v === "2d" ? "Grid" : "3D city"}</span>
          </button>
        ))}
      </div>
      {view === "2d" ? <Heatmap days={days} total={total} /> : <Skyline days={days} />}
    </div>
  );
}
