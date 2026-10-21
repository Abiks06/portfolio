"use client";

import { useInView } from "motion/react";
import { useEffect, useRef } from "react";
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
