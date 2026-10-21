// Shared description of the hero sculpture: geometry, resting pose, camera and
// shading. The WebGL scene renders from these numbers and the SVG fallback is
// projected from the very same ones, so the SVG is the scene's first frame and
// the handoff between them is invisible. Deliberately free of three.js so the
// SVG path doesn't pull it into the main bundle.

export type Vec3 = [number, number, number];
export type Quat = [number, number, number, number]; // x, y, z, w

const PHI = (1 + Math.sqrt(5)) / 2;

/** Same vertex order and faces as three's IcosahedronGeometry (detail 0). */
const RAW_VERTICES: Vec3[] = [
  [-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0],
  [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI],
  [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1],
];
export const FACES: [number, number, number][] = [
  [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
  [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
  [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
  [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
];

// Scene constants (world units) shared by both renderers.
export const RADIUS = 1.25;
export const SHELL_SCALE = 1.32;
export const RING_RADIUS = 1.95;
export const RING_TILT_X = 1.3; // ≈74°, so the ring reads as a flat ellipse
export const RING_ROLL_Z = 0.31; // ≈18°, right end raised
export const DOT_RADIUS = 0.06;
export const CAMERA_Z = 6.4;
export const CAMERA_FOV = 45;
export const LIGHT_KEY: Vec3 = normalize([3, 4, 5]);
export const LIGHT_FILL: Vec3 = normalize([-4, -2, -3]);

export function normalize([x, y, z]: Vec3): Vec3 {
  const l = Math.hypot(x, y, z);
  return [x / l, y / l, z / l];
}
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

function quatMul(a: Quat, b: Quat): Quat {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

export function rotate(v: Vec3, q: Quat): Vec3 {
  const u: Vec3 = [q[0], q[1], q[2]];
  const t = cross(u, v).map((c) => 2 * c) as Vec3;
  const c2 = cross(u, t);
  return [v[0] + q[3] * t[0] + c2[0], v[1] + q[3] * t[1] + c2[1], v[2] + q[3] * t[2] + c2[2]];
}

const axisAngle = (axis: Vec3, angle: number): Quat => {
  const s = Math.sin(angle / 2);
  return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(angle / 2)];
};

export const VERTICES: Vec3[] = RAW_VERTICES.map((v) => {
  const n = normalize(v);
  return [n[0] * RADIUS, n[1] * RADIUS, n[2] * RADIUS];
});

const centroid = (f: [number, number, number]): Vec3 =>
  normalize([0, 1, 2].map((i) => VERTICES[f[0]][i] + VERTICES[f[1]][i] + VERTICES[f[2]][i]) as Vec3);

/**
 * Resting pose: one face square to the camera, its triangle pointing down, so the
 * outline reads as a hexagon with a triangle at its heart.
 */
export const REST: Quat = (() => {
  const from = centroid(FACES[0]);
  const to: Vec3 = [0, 0, 1];
  const c = cross(from, to);
  const align = normalizeQuat([c[0], c[1], c[2], 1 + dot(from, to)]);
  const v = rotate(VERTICES[FACES[0][0]], align);
  const roll = axisAngle([0, 0, 1], -Math.PI / 2 - Math.atan2(v[1], v[0]));
  return quatMul(roll, align);
})();

function normalizeQuat(q: Quat): Quat {
  const l = Math.hypot(...q);
  return q.map((c) => c / l) as Quat;
}

/** Ring point at angle `phi` in world space: Rz(roll) · Rx(tilt) · (cos, sin, 0). */
export function ringPoint(phi: number, radius = RING_RADIUS): Vec3 {
  const p: Vec3 = [radius * Math.cos(phi), radius * Math.sin(phi), 0];
  const x = rotate(p, axisAngle([1, 0, 0], RING_TILT_X));
  return rotate(x, axisAngle([0, 0, 1], RING_ROLL_Z));
}

/**
 * Face brightness in [0, 1] from a world-space normal: one key light from the
 * top right plus a soft fill. Both renderers turn it into a colour with `shadeMix`.
 */
export function shade(normal: Vec3) {
  const s = 0.3 + 0.62 * Math.max(0, dot(normal, LIGHT_KEY)) + 0.18 * Math.max(0, dot(normal, LIGHT_FILL));
  return Math.min(1, s);
}

/**
 * sRGB mix applied to the accent: shadows lean toward black, highlights toward
 * white. Mirrors CSS `color-mix(in srgb, ...)`, so SVG and WebGL agree exactly.
 */
export function shadeMix(s: number): { toward: "black" | "white"; amount: number } {
  return s < 0.55 ? { toward: "black", amount: (0.55 - s) * 0.75 } : { toward: "white", amount: (s - 0.55) * 0.8 };
}

/** Perspective projection matching the three.js camera, into a 0–`size` square. */
export function project([x, y, z]: Vec3, size = 400): [number, number] {
  const f = 1 / Math.tan(((CAMERA_FOV / 2) * Math.PI) / 180);
  const w = CAMERA_Z - z;
  return [size / 2 + (size / 2) * ((f * x) / w), size / 2 - (size / 2) * ((f * y) / w)];
}

/** World-space normal of a face in the resting pose. */
export function restNormal(face: [number, number, number]): Vec3 {
  const [a, b, c] = face.map((i) => rotate(VERTICES[i], REST));
  return normalize(cross(sub(b, a), sub(c, a)));
}

/** Unique edges of the icosahedron, for the wireframe shell. */
export const EDGES: [number, number][] = (() => {
  const seen = new Set<string>();
  const edges: [number, number][] = [];
  for (const f of FACES) {
    for (const [a, b] of [[f[0], f[1]], [f[1], f[2]], [f[2], f[0]]]) {
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (!seen.has(key)) {
        seen.add(key);
        edges.push([a, b]);
      }
    }
  }
  return edges;
})();
