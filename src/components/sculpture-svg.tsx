// SVG render of the hero sculpture's first WebGL frame, projected from the
// shared numbers in lib/sculpture. Shown on phones, for reduced motion, and
// under the WebGL canvas while it loads, so the crossfade between them is invisible.

import {
  DOT_RADIUS,
  EDGES,
  FACES,
  REST,
  SHELL_SCALE,
  VERTICES,
  project,
  restNormal,
  ringPoint,
  rotate,
  shade,
  shadeMix,
  CAMERA_FOV,
  CAMERA_Z,
  type Vec3,
} from "@/lib/sculpture";

const fmt = (n: number) => n.toFixed(1);
const at = (v: Vec3) => project(v).map(fmt).join(",");

const body = VERTICES.map((v) => rotate(v, REST));
const shell = VERTICES.map((v) => rotate([v[0] * SHELL_SCALE, v[1] * SHELL_SCALE, v[2] * SHELL_SCALE], REST));

const faces = FACES.filter((f) => restNormal(f)[2] > 0).map((f) => {
  const { toward, amount } = shadeMix(shade(restNormal(f)));
  return {
    points: f.map((i) => at(body[i])).join(" "),
    fill: `color-mix(in srgb, var(--accent), ${toward} ${(amount * 100).toFixed(1)}%)`,
  };
});

// Split edges and ring segments into behind/in front of the body, so the body occludes them as in WebGL.
const edges = EDGES.map(([a, b]) => ({ a: project(shell[a]), b: project(shell[b]), back: shell[a][2] + shell[b][2] < 0 }));

const RING_STEPS = 96;
const ring = Array.from({ length: RING_STEPS }, (_, i) => {
  const p0 = ringPoint((i / RING_STEPS) * 2 * Math.PI);
  const p1 = ringPoint(((i + 1) / RING_STEPS) * 2 * Math.PI);
  return { a: project(p0), b: project(p1), back: p0[2] + p1[2] < 0 };
});

const dotCenter = ringPoint(0);
const dotPx = (() => {
  const f = 1 / Math.tan(((CAMERA_FOV / 2) * Math.PI) / 180);
  return (200 * f * DOT_RADIUS) / (CAMERA_Z - dotCenter[2]);
})();

type Seg = { a: [number, number]; b: [number, number] };
const path = (segs: Seg[]) => segs.map((s) => `M${fmt(s.a[0])} ${fmt(s.a[1])}L${fmt(s.b[0])} ${fmt(s.b[1])}`).join("");

const line = { fill: "none", stroke: "var(--ink)", vectorEffect: "non-scaling-stroke" as const };

export function SculptureSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 400" className={className ?? "h-full w-full"} aria-hidden="true">
      <path d={path(edges.filter((e) => e.back))} {...line} strokeOpacity={0.18} />
      <path d={path(ring.filter((s) => s.back))} {...line} strokeOpacity={0.35} />
      {faces.map((f, i) => (
        // Stroke in the face's own colour closes the anti-aliasing seams between neighbouring faces.
        <polygon key={i} points={f.points} fill={f.fill} stroke={f.fill} strokeWidth={0.75} strokeLinejoin="round" />
      ))}
      <path d={path(edges.filter((e) => !e.back))} {...line} strokeOpacity={0.18} />
      <path d={path(ring.filter((s) => !s.back))} {...line} strokeOpacity={0.35} />
      <circle cx={fmt(project(dotCenter)[0])} cy={fmt(project(dotCenter)[1])} r={fmt(dotPx)} fill="var(--accent)" />
    </svg>
  );
}
