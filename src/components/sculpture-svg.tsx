// Flat SVG version of the hero sculpture: an icosahedron seen face-on, with a
// wireframe shell and an orbit. Shown on phones, for reduced motion, and while
// the WebGL scene loads, so the swap is seamless.

const C = 200;
const R = 120;
const point = (deg: number, r: number) =>
  [C + r * Math.cos((deg * Math.PI) / 180), C + r * Math.sin((deg * Math.PI) / 180)] as const;

const V = [-90, -30, 30, 90, 150, 210].map((d) => point(d, R));
const T = [-30, 90, 210].map((d) => point(d, R * 0.5));
const SHELL = [-90, -30, 30, 90, 150, 210].map((d) => point(d, R * 1.32));

// Each face with a brightness, lit from the top right.
const FACES: [readonly (readonly [number, number])[], number][] = [
  [[V[0], V[1], T[0]], 0.95],
  [[V[1], V[2], T[0]], 0.75],
  [[V[2], V[3], T[1]], 0.55],
  [[V[3], V[4], T[1]], 0.45],
  [[V[4], V[5], T[2]], 0.6],
  [[V[5], V[0], T[2]], 0.85],
  [[V[0], T[0], T[2]], 1],
  [[V[2], T[0], T[1]], 0.68],
  [[V[4], T[1], T[2]], 0.52],
  [[T[0], T[1], T[2]], 0.8],
];

const pts = (p: readonly (readonly [number, number])[]) => p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

export function SculptureSvg() {
  return (
    <svg viewBox="0 0 400 400" className="h-full w-full" aria-hidden="true">
      <polygon points={pts(SHELL)} fill="none" stroke="var(--ink)" strokeOpacity={0.18} />
      {FACES.map(([face, light], i) => (
        <polygon key={i} points={pts(face)} fill="var(--accent)" fillOpacity={light} stroke="var(--paper)" strokeOpacity={0.35} />
      ))}
      <g transform={`rotate(-18 ${C} ${C})`}>
        <ellipse cx={C} cy={C} rx={190} ry={50} fill="none" stroke="var(--ink)" strokeOpacity={0.35} />
        <circle cx={C + 190} cy={C} r={6} fill="var(--accent)" />
      </g>
    </svg>
  );
}
