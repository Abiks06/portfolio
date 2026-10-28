"use client";

import { m, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";
import { useMediaQuery } from "@/lib/use-media-query";
import { OPEN_PROJECT_EVENT } from "./command-menu";

type ProjectInput = { slug: string; name: string; tech: string[] };
type Node = { id: string; kind: "project" | "tech"; label: string; x: number; y: number; links: string[]; w: number; h: number };

const PROJECT_FONT = 21;
const TECH_FONT = 13.5;
/** Pill size for a label: Instrument Serif runs ~0.43em per character, JetBrains Mono 0.6em. */
const shortName = (name: string) => name.split(":")[0];
const pill = (kind: Node["kind"], label: string) =>
  kind === "project" ? { w: shortName(label).length * PROJECT_FONT * 0.43 + 40, h: 40 } : { w: label.length * TECH_FONT * 0.6 + 24, h: 28 };

/** Languages that say little about what a project is. */
const NOISE = new Set(["css", "html", "dockerfile", "plpgsql", "shell", "makefile"]);
const key = (t: string) => t.toLowerCase().replace(/[^a-z0-9+#]/g, "");

/**
 * Projects on an outer ring, each technology placed between the projects that use it (shared
 * tools drift toward the middle), then nudged apart so labels don't collide. Deterministic, so
 * the server and the browser draw the same map.
 */
function layout(projects: ProjectInput[], w: number, h: number): Node[] {
  const cx = w / 2;
  const cy = h / 2;
  const rx = w * 0.36;
  const ry = h * 0.38;
  const nodes: Node[] = [];
  const angle = (i: number) => -Math.PI / 2 + (i / projects.length) * Math.PI * 2;
  projects.forEach((p, i) => nodes.push({ id: `p:${p.slug}`, kind: "project", label: p.name, x: cx + rx * Math.cos(angle(i)), y: cy + ry * Math.sin(angle(i)), links: [], ...pill("project", p.name) }));

  const techs = new Map<string, { label: string; owners: number[] }>();
  projects.forEach((p, i) =>
    p.tech.forEach((t) => {
      const k = key(t);
      if (!k || NOISE.has(k)) return;
      const entry = techs.get(k) ?? { label: t, owners: [] };
      if (!entry.owners.includes(i)) entry.owners.push(i);
      techs.set(k, entry);
    }),
  );
  let n = 0;
  for (const [k, t] of techs) {
    const vx = t.owners.reduce((s, i) => s + Math.cos(angle(i)), 0) / t.owners.length;
    const vy = t.owners.reduce((s, i) => s + Math.sin(angle(i)), 0) / t.owners.length;
    const pull = t.owners.length === 1 ? 0.62 : Math.max(0.12, 0.5 - 0.12 * t.owners.length);
    // Spread single-project tools around their project with a golden-angle offset.
    const spin = n++ * 2.39996;
    const jitter = t.owners.length === 1 ? 0.16 : 0.06;
    nodes.push({
      id: `t:${k}`,
      kind: "tech",
      label: t.label,
      x: cx + rx * (vx * pull + Math.cos(spin) * jitter),
      y: cy + ry * (vy * pull + Math.sin(spin) * jitter),
      links: t.owners.map((i) => `p:${projects[i].slug}`),
      ...pill("tech", t.label),
    });
  }
  // Keep wide project pills inside the frame on narrow layouts.
  nodes.forEach((nd) => {
    if (nd.kind === "project") nd.x = Math.min(w - nd.w / 2 - 8, Math.max(nd.w / 2 + 8, nd.x));
  });
  nodes.forEach((node) => {
    if (node.kind === "tech") node.links.forEach((id) => nodes.find((p) => p.id === id)!.links.push(node.id));
  });

  // Relax: wherever two pills overlap (with a margin), push the tool along the shorter overlap.
  // Projects stay put; a few dozen passes settle it.
  const tech = nodes.filter((nd) => nd.kind === "tech");
  const gap = 10;
  for (let pass = 0; pass < 80; pass++) {
    for (const a of tech) {
      for (const b of nodes) {
        if (a === b) continue;
        const ox = (a.w + b.w) / 2 + gap - Math.abs(a.x - b.x);
        const oy = (a.h + b.h) / 2 + gap - Math.abs(a.y - b.y);
        if (ox <= 0 || oy <= 0) continue;
        const share = b.kind === "project" ? 1 : 0.5;
        if (ox < oy * 2.5) a.x += Math.sign(a.x - b.x || 1) * ox * share;
        else a.y += Math.sign(a.y - b.y || 1) * oy * share;
      }
      a.x = Math.min(w - a.w / 2 - 8, Math.max(a.w / 2 + 8, a.x));
      a.y = Math.min(h - a.h / 2 - 8, Math.max(a.h / 2 + 8, a.y));
    }
  }
  return nodes;
}

/** An interactive map of which technologies each project is built with. */
export function Constellation({ projects }: { projects: ProjectInput[] }) {
  const narrow = useMediaQuery("(max-width: 640px)");
  const reduced = useReducedMotion();
  // Phones get a narrow, tall canvas so the type stays readable when scaled down.
  const [w, h] = narrow ? [440, 860] : [1100, 640];
  const nodes = useMemo(() => layout(projects, w, h), [projects, w, h]);
  const byId = useMemo(() => new Map(nodes.map((nd) => [nd.id, nd])), [nodes]);
  const [active, setActive] = useState<string | null>(null);
  const lit = useMemo(() => (active ? new Set([active, ...(byId.get(active)?.links ?? [])]) : null), [active, byId]);
  const edges = nodes.filter((nd) => nd.kind === "tech").flatMap((t) => t.links.map((p) => [t.id, p] as const));

  return (
    <figure>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full select-none" role="group" aria-label="Map of the technologies each project uses">
        <g aria-hidden="true">
          {edges.map(([a, b], i) => {
            const from = byId.get(a)!;
            const to = byId.get(b)!;
            const on = lit ? lit.has(a) && lit.has(b) : false;
            const mx = (from.x + to.x) / 2;
            const my = (from.y + to.y) / 2 - 18;
            return (
              <m.path
                key={`${a}-${b}`}
                d={`M${from.x} ${from.y} Q${mx} ${my} ${to.x} ${to.y}`}
                fill="none"
                stroke={on ? "var(--accent)" : "var(--ink)"}
                strokeWidth={on ? 1.6 : 1}
                strokeOpacity={lit ? (on ? 0.9 : 0.05) : 0.14}
                style={{ transition: "stroke-opacity 250ms ease, stroke 250ms ease" }}
                initial={reduced ? false : { pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true, margin: "0px 0px -10% 0px" }}
                transition={{ duration: 1.2, delay: 0.2 + (i % 12) * 0.04, ease: [0.16, 1, 0.3, 1] }}
              />
            );
          })}
        </g>
        {nodes.map((nd, i) => {
          const dim = lit && !lit.has(nd.id);
          const project = nd.kind === "project";
          const label = project ? shortName(nd.label) : nd.label;
          const width = nd.w;
          return (
            <g
              key={nd.id}
              transform={`translate(${nd.x} ${nd.y})`}
              tabIndex={0}
              role={project ? "button" : "img"}
              aria-label={project ? `${nd.label}: uses ${nd.links.map((id) => byId.get(id)!.label).join(", ")}. Open project.` : `${nd.label}: used in ${nd.links.map((id) => byId.get(id)!.label).join(", ")}`}
              onPointerEnter={() => setActive(nd.id)}
              onPointerLeave={() => setActive(null)}
              onFocus={() => setActive(nd.id)}
              onBlur={() => setActive(null)}
              onClick={() => project && window.dispatchEvent(new CustomEvent(OPEN_PROJECT_EVENT, { detail: nd.id.slice(2) }))}
              onKeyDown={(e) => project && (e.key === "Enter" || e.key === " ") && (e.preventDefault(), window.dispatchEvent(new CustomEvent(OPEN_PROJECT_EVENT, { detail: nd.id.slice(2) })))}
              className={`outline-none ${project ? "cursor-pointer" : "cursor-default"}`}
              style={{ opacity: dim ? 0.25 : 1, transition: "opacity 250ms ease" }}
            >
              {/* A slow, offset bob so the map breathes; off for reduced motion. */}
              <g className={reduced ? undefined : "constellation-float"} style={{ animationDelay: `${(i % 7) * -0.9}s` }}>
                <rect
                  x={-width / 2}
                  y={-nd.h / 2}
                  width={width}
                  height={nd.h}
                  rx={nd.h / 2}
                  fill={project ? (lit?.has(nd.id) && active ? "var(--accent)" : "var(--ink)") : "var(--paper)"}
                  stroke={project ? "none" : lit?.has(nd.id) && active ? "var(--accent)" : "var(--line)"}
                  strokeWidth={1.2}
                  style={{ transition: "fill 250ms ease, stroke 250ms ease" }}
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={project ? PROJECT_FONT : TECH_FONT}
                  fontFamily={project ? "var(--font-instrument), serif" : "var(--font-jetbrains), monospace"}
                  fill={project ? (lit?.has(nd.id) && active ? "var(--on-accent)" : "var(--paper)") : "var(--ink-2)"}
                  style={{ transition: "fill 250ms ease" }}
                >
                  {label}
                </text>
              </g>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-3 font-mono text-[11px] text-ink-3">Point at a project or a tool to trace its connections · click a project to open it</figcaption>
    </figure>
  );
}
