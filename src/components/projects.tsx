"use client";

import { useLenis } from "lenis/react";
import {
  AnimatePresence,
  LayoutGroup,
  m,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Project } from "@/lib/github";
import { formatDate, TRACKS } from "@/lib/resume";
import { useMediaQuery } from "@/lib/use-media-query";
import { OPEN_PROJECT_EVENT } from "./command-menu";

const ease = [0.16, 1, 0.3, 1] as const;

function pad(n: number) {
  return String(n + 1).padStart(2, "0");
}

function updated(p: Project) {
  if (p.pushedAt) return `Updated ${formatDate(p.pushedAt.slice(0, 7))}`;
  if (p.endDate) return formatDate(p.endDate);
  return null;
}

/** Card surface that tilts toward the pointer in 3D. Flat on touch screens and for reduced motion. */
function Tilt({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const fine = useMediaQuery("(hover: hover) and (pointer: fine)");
  const rx = useSpring(useMotionValue(0), { stiffness: 220, damping: 20 });
  const ry = useSpring(useMotionValue(0), { stiffness: 220, damping: 20 });
  const enabled = fine && !reduced;

  return (
    <m.div
      className="h-full"
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      onPointerMove={(e) => {
        if (!enabled) return;
        const r = e.currentTarget.getBoundingClientRect();
        ry.set(((e.clientX - r.left) / r.width - 0.5) * 8);
        rx.set(-((e.clientY - r.top) / r.height - 0.5) * 8);
      }}
      onPointerLeave={() => {
        rx.set(0);
        ry.set(0);
      }}
      // Flatten instantly on click so the expand animation measures an untilted card.
      onClickCapture={() => {
        rx.jump(0);
        ry.jump(0);
      }}
    >
      {children}
    </m.div>
  );
}

/** The live demo's screenshot in a minimal browser frame, labelled with its domain. */
/**
 * The live demo's screenshot in a minimal browser frame. A shimmer holds the space until the
 * image arrives, then it fades and settles in, so a card never pops in half-drawn.
 */
function Screenshot({ project, className = "", zoom = false, caption = false }: { project: Project; className?: string; zoom?: boolean; caption?: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  // A cached image can finish before React attaches onLoad.
  useEffect(() => {
    if (img.current?.complete && img.current.naturalWidth) setLoaded(true);
  }, []);
  if (!project.image) return null;
  const host = project.homepage ? new URL(project.homepage).host : null;
  const frame = (
    <figure className={`overflow-hidden rounded-xl border border-line bg-paper ${className}`}>
      <div className="flex items-center gap-1.5 border-b border-line px-3 py-2" aria-hidden="true">
        <span className="size-2 rounded-full bg-line" />
        <span className="size-2 rounded-full bg-line" />
        <span className="size-2 rounded-full bg-line" />
        {host && <span className="ml-2 truncate font-mono text-[10px] text-ink-3">{host}</span>}
      </div>
      <div className="relative aspect-[16/10] overflow-hidden bg-paper-2">
        <span
          aria-hidden="true"
          className={`shimmer absolute inset-0 transition-opacity duration-500 ${loaded ? "opacity-0" : "opacity-100"}`}
        />
        {/* eslint-disable-next-line @next/next/no-img-element -- remote screenshot from jsDelivr, already sized and compressed */}
        <img
          ref={img}
          src={project.image}
          alt={`Screenshot of ${project.name}${host ? ` at ${host}` : ""}`}
          loading="lazy"
          decoding="async"
          width={2560}
          height={1600}
          onLoad={() => setLoaded(true)}
          className={`relative h-full w-full object-cover object-top transition-[opacity,transform] duration-700 ease-out-expo ${loaded ? "opacity-100" : "scale-[1.03] opacity-0"} ${zoom && loaded ? "group-hover:scale-[1.04]" : ""}`}
        />
      </div>
    </figure>
  );
  if (!caption) return frame;
  return (
    <div className="mt-8">
      {project.homepage ? (
        <a href={project.homepage} target="_blank" rel="noreferrer" className="group/shot block" aria-label={`Open the ${project.name} live demo`}>
          {frame}
        </a>
      ) : (
        frame
      )}
      <p className="mt-2 font-mono text-[11px] text-ink-3">
        {project.imageCapturedAt ? `Live demo, captured ${formatDate(project.imageCapturedAt.slice(0, 7))}` : "Live demo"}
        {project.homepage && " · click to open it"}
      </p>
    </div>
  );
}

function LanguageChips({ project, limit = 3 }: { project: Project; limit?: number }) {
  const names = project.languages.length ? project.languages.map((l) => l.name) : project.keywords;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {names.slice(0, limit).map((name) => (
        <li key={name} className="rounded-full border border-line px-2.5 py-0.5 font-mono text-[11px] text-ink-2">
          {name}
        </li>
      ))}
    </ul>
  );
}

function ProjectCard({ project, index, onOpen, hidden }: { project: Project; index: number; onOpen: () => void; hidden: boolean }) {
  const glow = useRef<HTMLSpanElement>(null);
  return (
    <Tilt>
      <m.button
        layoutId={`card-${project.slug}`}
        onClick={onOpen}
        // A soft light that follows the pointer, painted on the glow layer itself so nothing else restyles.
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          if (glow.current) {
            glow.current.style.background = `radial-gradient(420px circle at ${e.clientX - r.left}px ${e.clientY - r.top}px, color-mix(in oklab, var(--accent) 16%, transparent), transparent 65%)`;
          }
        }}
        style={{ borderRadius: 20, visibility: hidden ? "hidden" : "visible" }}
        className="group relative flex h-full w-full flex-col overflow-hidden bg-paper-2 p-6 text-left transition-colors duration-300 hover:bg-[color-mix(in_oklab,var(--paper-2),var(--accent)_6%)] sm:p-8"
      >
        <span
          ref={glow}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 pointer-fine:group-hover:opacity-100"
        />
        <div className="relative flex items-start justify-between">
          <span className="font-display text-5xl leading-none text-ink-3">{pad(index)}</span>
          {project.featured && (
            <span className="rounded-full bg-accent px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-on-accent">
              Featured
            </span>
          )}
        </div>
        <Screenshot project={project} zoom className="relative mt-6" />
        <h3 className={`relative font-display text-3xl leading-tight sm:text-4xl ${project.image ? "mt-6" : "mt-10"}`}>{project.name}</h3>
        {project.description && <p className="relative mt-3 line-clamp-3 text-sm leading-relaxed text-ink-2">{project.description}</p>}
        {project.metrics[0] && (
          <p className="relative mt-5 flex items-baseline gap-3 border-t border-line pt-4">
            <span className="shrink-0 font-display text-3xl leading-none text-accent">{project.metrics[0].value}</span>
            <span className="text-xs leading-snug text-ink-2">{project.metrics[0].label}</span>
          </p>
        )}
        <div className="relative mt-auto flex items-end justify-between gap-4 pt-8">
          <LanguageChips project={project} />
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-full border border-line transition-[transform,background-color,border-color,color] duration-300 ease-out-expo group-hover:rotate-45 group-hover:border-accent group-hover:bg-accent group-hover:text-on-accent"
          >
            ↗
          </span>
        </div>
      </m.button>
    </Tilt>
  );
}

/** Measured results, how the system fits together, and the choices behind it, from the repo's card file. */
function CaseStudy({ project }: { project: Project }) {
  const { metrics, pipeline, decisions } = project;
  return (
    <>
      {metrics.length > 0 && (
        <dl className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
          {metrics.map((m) => (
            <div key={m.label} className="bg-paper p-5">
              <dt className="sr-only">{m.label}</dt>
              <dd className="font-display text-4xl leading-none text-accent">{m.value}</dd>
              <dd className="mt-2 text-sm leading-snug text-ink-2">{m.label}</dd>
            </div>
          ))}
        </dl>
      )}

      {pipeline.length > 0 && (
        <div className="mt-10">
          <p className="font-mono text-xs uppercase tracking-wider text-ink-3">How it fits together</p>
          <ol className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            {pipeline.map((stage, i) => (
              <m.li
                key={stage}
                className="flex items-center gap-2"
                initial={{ opacity: 0, transform: "translateY(6px)" }}
                animate={{ opacity: 1, transform: "translateY(0px)" }}
                transition={{ duration: 0.4, delay: 0.25 + i * 0.07, ease }}
              >
                {i > 0 && (
                  <span aria-hidden="true" className="text-ink-3 max-sm:hidden">
                    →
                  </span>
                )}
                <span className="rounded-lg border border-line bg-paper px-3 py-1.5 text-sm">
                  <span className="mr-2 font-mono text-[10px] text-ink-3">{pad(i)}</span>
                  {stage}
                </span>
              </m.li>
            ))}
          </ol>
        </div>
      )}

      {decisions.length > 0 && (
        <div className="mt-10">
          <p className="font-mono text-xs uppercase tracking-wider text-ink-3">Decisions</p>
          <ul className="mt-4 space-y-3">
            {decisions.map((d) => (
              <li key={d.choice} className="rounded-2xl border border-line p-5">
                <p className="font-medium">{d.choice}</p>
                <p className="mt-1 text-sm text-ink-3">
                  over <span className="line-through decoration-ink-3/60">{d.over}</span>
                </p>
                <p className="mt-3 text-sm leading-relaxed text-ink-2">{d.because}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function ProjectDetail({ project, index, onClose }: { project: Project; index: number; onClose: () => void }) {
  const total = project.languages.reduce((sum, l) => sum + l.bytes, 0);
  const closeButton = useRef<HTMLButtonElement>(null);

  // Move focus into the dialog, keep Tab inside it, and hand focus back to the card on close.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeButton.current?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab") return;
      const dialog = closeButton.current?.closest("[role=dialog]");
      const focusable = dialog?.querySelectorAll<HTMLElement>("a[href], button");
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      opener?.focus({ preventScroll: true });
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={project.name}>
      <m.div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={onClose}
      />
      <m.article
        layoutId={`card-${project.slug}`}
        style={{ borderRadius: 24 }}
        className="relative max-h-[90svh] w-full max-w-3xl overflow-hidden bg-paper-2"
      >
        <m.div
          data-lenis-prevent
          className="max-h-[90svh] overflow-y-auto overscroll-contain p-6 sm:p-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: 0.15, duration: 0.3 } }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
        >
          <div className="flex items-start justify-between gap-4">
            <span className="font-display text-5xl leading-none text-ink-3">{pad(index)}</span>
            <button
              ref={closeButton}
              onClick={onClose}
              aria-label="Close"
              className="grid size-10 place-items-center rounded-full border border-line text-lg transition-colors hover:border-ink active:scale-95"
            >
              ×
            </button>
          </div>
          <Screenshot project={project} caption />
          <h3 className="mt-8 font-display text-4xl leading-tight sm:text-5xl">{project.name}</h3>
          {(project.startDate || project.pushedAt) && (
            <p className="mt-2 font-mono text-xs uppercase tracking-wider text-ink-3">
              {project.startDate ? `${formatDate(project.startDate)} – ${formatDate(project.endDate)}` : updated(project)}
            </p>
          )}
          {project.description && <p className="mt-6 text-lg leading-relaxed text-ink-2">{project.description}</p>}

          {project.highlights.length > 0 && (
            <ul className="mt-8 space-y-3">
              {project.highlights.map((h) => (
                <li key={h} className="flex gap-3 leading-relaxed">
                  <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-accent" />
                  {h}
                </li>
              ))}
            </ul>
          )}

          <CaseStudy project={project} />

          {total > 0 && (
            <p className="mt-10 font-mono text-[11px] text-ink-3">
              {project.languages
                .slice(0, 4)
                .map((l) => `${l.name} ${Math.round((l.bytes / total) * 100)}%`)
                .join(" · ")}
            </p>
          )}

          {project.keywords.length > 0 && (
            <ul className="mt-8 flex flex-wrap gap-1.5">
              {project.keywords.map((k) => (
                <li key={k} className="rounded-full border border-line px-3 py-1 text-xs text-ink-2">
                  {k}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-10 flex flex-wrap gap-3">
            {project.homepage && (
              <a href={project.homepage} target="_blank" rel="noreferrer" className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper active:scale-[0.97]">
                Live demo ↗
              </a>
            )}
            {project.url && (
              <a href={project.url} target="_blank" rel="noreferrer" className="rounded-full border border-line px-5 py-2.5 text-sm font-medium transition-colors hover:border-ink active:scale-[0.97]">
                View code ↗
              </a>
            )}
          </div>
        </m.div>
      </m.article>
    </div>
  );
}

export function Projects({ projects }: { projects: Project[] }) {
  const [filter, setFilter] = useState("All");
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const lenis = useLenis();

  // Filter by role focus when the cards declare one, else by main language.
  const byTrack = projects.some((p) => p.tracks.length);
  const filters = useMemo(() => {
    if (byTrack) return [{ id: "All", label: "All" }, ...TRACKS.filter((t) => projects.some((p) => p.tracks.includes(t.id)))];
    const primary = projects.map((p) => p.languages[0]?.name).filter(Boolean) as string[];
    return ["All", ...new Set(primary)].map((f) => ({ id: f, label: f }));
  }, [projects, byTrack]);

  const visible =
    filter === "All" ? projects : projects.filter((p) => (byTrack ? p.tracks.includes(filter as (typeof p.tracks)[number]) : p.languages[0]?.name === filter));
  const openIndex = projects.findIndex((p) => p.slug === openSlug);
  const open = openIndex >= 0 ? projects[openIndex] : null;

  // Freeze page scroll behind the detail view.
  useEffect(() => {
    if (open) lenis?.stop();
    else lenis?.start();
    document.documentElement.style.overflow = open ? "hidden" : "";
  }, [open, lenis]);

  // "Open project" from the command menu: bring the card into view first, so the detail view
  // visibly grows out of it, then open.
  useEffect(() => {
    const onOpen = (e: Event) => {
      const slug = (e as CustomEvent<string>).detail;
      if (!projects.some((p) => p.slug === slug)) return;
      setFilter("All");
      requestAnimationFrame(() => {
        const card = document.getElementById(`project-${slug}`);
        if (!card) return setOpenSlug(slug);
        if (lenis) lenis.scrollTo(card, { offset: -140, duration: 0.9, onComplete: () => setOpenSlug(slug) });
        else {
          card.scrollIntoView({ block: "center" });
          setOpenSlug(slug);
        }
      });
    };
    window.addEventListener(OPEN_PROJECT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_PROJECT_EVENT, onOpen);
  }, [projects, lenis]);

  return (
    <LayoutGroup>
      <div className="mb-8 flex flex-wrap gap-2" role="group" aria-label={byTrack ? "Filter projects by focus" : "Filter projects by language"}>
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            aria-pressed={filter === f.id}
            className={`relative rounded-full px-4 py-1.5 text-sm transition-colors duration-200 ${filter === f.id ? "text-paper" : "text-ink-2 hover:text-ink"}`}
          >
            {filter === f.id && (
              <m.span layoutId="filter-pill" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 380, damping: 32 }} />
            )}
            <span className="relative">{f.label}</span>
          </button>
        ))}
      </div>

      <m.ul layout className="grid gap-4 sm:grid-cols-2">
        <AnimatePresence mode="popLayout" initial={false}>
          {visible.map((p) => {
            const index = projects.indexOf(p);
            return (
              <m.li
                key={p.slug}
                id={`project-${p.slug}`}
                className="scroll-mt-32"
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.45, ease }}
              >
                <ProjectCard project={p} index={index} onOpen={() => setOpenSlug(p.slug)} hidden={p.slug === openSlug} />
              </m.li>
            );
          })}
        </AnimatePresence>
      </m.ul>

      <AnimatePresence>
        {open && <ProjectDetail key={open.slug} project={open} index={openIndex} onClose={() => setOpenSlug(null)} />}
      </AnimatePresence>
    </LayoutGroup>
  );
}
