"use client";

import { m, useScroll, useSpring } from "motion/react";
import { useRef } from "react";
import { formatRange, type Work } from "@/lib/resume";
import { Reveal } from "./reveal";

/** Experience list with a rail that draws itself as the section scrolls past. */
export function Timeline({ work }: { work: Work[] }) {
  const ref = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 60%"] });
  const scaleY = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });

  return (
    <ol ref={ref} className="relative space-y-14 pl-8 sm:pl-12">
      <span className="absolute left-[5px] top-2 bottom-2 w-px bg-line sm:left-[7px]" aria-hidden="true" />
      <m.span
        className="absolute left-[5px] top-2 bottom-2 w-px origin-top bg-accent sm:left-[7px]"
        style={{ scaleY }}
        aria-hidden="true"
      />
      {work.map((job) => (
        <li key={`${job.name}-${job.startDate}`} className="relative">
          <span className="absolute -left-8 top-2 grid size-[11px] place-items-center rounded-full border-2 border-accent bg-paper sm:-left-12 sm:size-[15px]" aria-hidden="true">
            {/* Fills in as the job reaches the middle of the screen, in step with the rail. */}
            <m.span
              className="size-full rounded-full bg-accent"
              initial={{ transform: "scale(0.4)", opacity: 0 }}
              whileInView={{ transform: "scale(1)", opacity: 1 }}
              viewport={{ once: true, margin: "0px 0px -45% 0px" }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
            />
          </span>
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-wider text-ink-3">
              {formatRange(job.startDate, job.endDate)}
              {job.location && <span className="hidden sm:inline"> · {job.location}</span>}
            </p>
            <h3 className="mt-2 font-display text-3xl leading-tight sm:text-4xl">{job.name}</h3>
            <p className="mt-1 font-medium text-ink-2">{job.position}</p>
            {job.summary && <p className="mt-4 max-w-2xl leading-relaxed text-ink-2">{job.summary}</p>}
            <ul className="mt-4 max-w-2xl space-y-2.5">
              {job.highlights.map((h) => (
                <li key={h} className="flex gap-3 leading-relaxed">
                  <span className="mt-2.5 size-1 shrink-0 rounded-full bg-ink-3" />
                  {h}
                </li>
              ))}
            </ul>
            {job.keywords && (
              <ul className="mt-5 flex flex-wrap gap-1.5">
                {job.keywords.map((k) => (
                  <li key={k} className="rounded-full border border-line px-2.5 py-0.5 font-mono text-[11px] text-ink-2">
                    {k}
                  </li>
                ))}
              </ul>
            )}
          </Reveal>
        </li>
      ))}
    </ol>
  );
}
