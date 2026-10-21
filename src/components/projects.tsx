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
import { formatDate } from "@/lib/resume";
import { useMediaQuery } from "@/lib/use-media-query";

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
  return (
    <Tilt>
      <m.button
        layoutId={`card-${project.slug}`}
        onClick={onOpen}
        style={{ borderRadius: 20, visibility: hidden ? "hidden" : "visible" }}
        className="group flex h-full w-full flex-col bg-paper-2 p-6 text-left transition-colors duration-300 hover:bg-[color-mix(in_oklab,var(--paper-2),var(--accent)_6%)] sm:p-8"
      >
        <div className="flex items-start justify-between">
          <span className="font-display text-5xl leading-none text-ink-3">{pad(index)}</span>
          {project.featured && (
            <span className="rounded-full bg-accent px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-on-accent">
              Featured
            </span>
          )}
        </div>
        <h3 className="mt-10 font-display text-3xl leading-tight sm:text-4xl">{project.name}</h3>
        {project.description && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-2">{project.description}</p>}
        <div className="mt-auto flex items-end justify-between gap-4 pt-8">
          <LanguageChips project={project} />
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-full border border-line transition-all duration-300 ease-out-expo group-hover:rotate-45 group-hover:border-accent group-hover:bg-accent group-hover:text-on-accent"
          >
            ↗
          </span>
        </div>
      </m.button>
    </Tilt>
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

          {total > 0 && (
            <div className="mt-10">
              <p className="font-mono text-xs uppercase tracking-wider text-ink-3">Languages</p>
              <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-line">
                {project.languages.map((l, i) => (
                  <m.span
                    key={l.name}
                    className="h-full"
                    style={{ background: i === 0 ? "var(--accent)" : `color-mix(in oklab, var(--ink) ${70 - i * 20}%, transparent)` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(l.bytes / total) * 100}%` }}
                    transition={{ duration: 0.9, delay: 0.3 + i * 0.08, ease }}
                  />
                ))}
              </div>
              <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-2">
                {project.languages.map((l) => (
                  <li key={l.name}>
                    {l.name} <span className="text-ink-3">{Math.round((l.bytes / total) * 100)}%</span>
                  </li>
                ))}
              </ul>
            </div>
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

  const filters = useMemo(() => {
    const primary = projects.map((p) => p.languages[0]?.name).filter(Boolean) as string[];
    return ["All", ...Array.from(new Set(primary))];
  }, [projects]);

  const visible = filter === "All" ? projects : projects.filter((p) => p.languages[0]?.name === filter);
  const openIndex = projects.findIndex((p) => p.slug === openSlug);
  const open = openIndex >= 0 ? projects[openIndex] : null;

  // Freeze page scroll behind the detail view.
  useEffect(() => {
    if (open) lenis?.stop();
    else lenis?.start();
    document.documentElement.style.overflow = open ? "hidden" : "";
  }, [open, lenis]);

  return (
    <LayoutGroup>
      <div className="mb-8 flex flex-wrap gap-2" role="group" aria-label="Filter projects by language">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`relative rounded-full px-4 py-1.5 text-sm transition-colors duration-200 ${filter === f ? "text-paper" : "text-ink-2 hover:text-ink"}`}
          >
            {filter === f && (
              <m.span layoutId="filter-pill" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 380, damping: 32 }} />
            )}
            <span className="relative">{f}</span>
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
