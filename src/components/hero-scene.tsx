"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  type Group,
  MathUtils,
  type Mesh,
  Quaternion,
  Vector3,
} from "three";
import {
  CAMERA_FOV,
  CAMERA_Z,
  DOT_RADIUS,
  EDGES,
  FACES,
  REST,
  RING_RADIUS,
  RING_ROLL_Z,
  RING_TILT_X,
  SHELL_SCALE,
  VERTICES,
  shade,
  shadeMix,
  type Vec3,
} from "@/lib/sculpture";
import { useMediaQuery } from "@/lib/use-media-query";

/** Seconds after the first frame before the sculpture starts moving: the crossfade runs first. */
const SETTLE = 0.9;
/** Seconds for the spin and tilt to ease up to full strength. */
const EASE_IN = 1.6;

/** Reads a CSS custom property and follows light/dark switches. */
function useCssColor(name: string, fallback: string) {
  const [color, setColor] = useState(fallback);
  useEffect(() => {
    const read = () => setColor(getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback);
    read();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", read);
    return () => media.removeEventListener("change", read);
  }, [name, fallback]);
  return color;
}

const WHITE = new Color(1, 1, 1);
const BLACK = new Color(0, 0, 0);

function Sculpture({ animate, onReady }: { animate: boolean; onReady: () => void }) {
  const tilt = useRef<Group>(null);
  const spin = useRef<Group>(null);
  const body = useRef<Mesh>(null);
  const orbit = useRef<Group>(null);
  const accent = useCssColor("--accent", "#cc4a1f");
  const ink = useCssColor("--ink", "#1b1a17");
  const pointer = useRef({ x: 0, y: 0 });
  const clock = useRef({ frames: 0, since: 0 });

  // Non-indexed geometry: three vertices per face so each face gets one flat colour.
  const { geometry, normals } = useMemo(() => {
    const g = new BufferGeometry();
    const positions = new Float32Array(FACES.length * 9);
    const faceNormals: Vector3[] = [];
    FACES.forEach((f, i) => {
      const [a, b, c] = f.map((v) => new Vector3(...VERTICES[v]));
      [a, b, c].forEach((p, j) => p.toArray(positions, i * 9 + j * 3));
      faceNormals.push(new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a)).normalize());
    });
    g.setAttribute("position", new BufferAttribute(positions, 3));
    g.setAttribute("color", new BufferAttribute(new Float32Array(FACES.length * 9), 3));
    return { geometry: g, normals: faceNormals };
  }, []);

  const shellGeometry = useMemo(() => {
    const g = new BufferGeometry();
    const positions = new Float32Array(EDGES.length * 6);
    EDGES.forEach(([a, b], i) => {
      VERTICES[a].forEach((c, k) => (positions[i * 6 + k] = c * SHELL_SCALE));
      VERTICES[b].forEach((c, k) => (positions[i * 6 + 3 + k] = c * SHELL_SCALE));
    });
    g.setAttribute("position", new BufferAttribute(positions, 3));
    return g;
  }, []);

  const ringGeometry = useMemo(() => {
    const steps = 192;
    const positions = new Float32Array(steps * 3);
    for (let i = 0; i < steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      positions[i * 3] = RING_RADIUS * Math.cos(t);
      positions[i * 3 + 1] = RING_RADIUS * Math.sin(t);
    }
    return new BufferGeometry().setAttribute("position", new BufferAttribute(positions, 3));
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  const scratch = useMemo(() => ({ q: new Quaternion(), n: new Vector3(), c: new Color(), base: new Color() }), []);

  useFrame((state, delta) => {
    const c = clock.current;
    c.frames += 1;
    // After the first frame is on screen, start the crossfade from the SVG.
    if (c.frames === 1) {
      c.since = state.clock.elapsedTime;
      requestAnimationFrame(onReady);
    }

    if (animate && c.frames > 1 && tilt.current && spin.current && orbit.current) {
      const t = state.clock.elapsedTime - c.since - SETTLE;
      const strength = MathUtils.smootherstep(t, 0, EASE_IN);
      spin.current.rotation.y += delta * 0.18 * strength;
      tilt.current.rotation.x = MathUtils.damp(tilt.current.rotation.x, pointer.current.y * 0.35 * strength, 3, delta);
      tilt.current.rotation.z = MathUtils.damp(tilt.current.rotation.z, -pointer.current.x * 0.2 * strength, 3, delta);
      orbit.current.rotation.z += delta * 0.08 * strength;
    }

    // Re-shade every face from its current world-space normal, using the SVG's formula.
    if (!body.current) return;
    body.current.getWorldQuaternion(scratch.q);
    scratch.base.set(accent);
    const colors = geometry.getAttribute("color") as BufferAttribute;
    normals.forEach((n, i) => {
      scratch.n.copy(n).applyQuaternion(scratch.q);
      const { toward, amount } = shadeMix(shade(scratch.n.toArray() as Vec3));
      scratch.c.copy(scratch.base).lerp(toward === "white" ? WHITE : BLACK, amount);
      for (let v = 0; v < 3; v++) colors.setXYZ(i * 3 + v, scratch.c.r, scratch.c.g, scratch.c.b);
    });
    colors.needsUpdate = true;
  });

  return (
    <>
      <group ref={tilt}>
        <group ref={spin}>
          <group quaternion={REST}>
            <mesh ref={body} geometry={geometry}>
              <meshBasicMaterial vertexColors />
            </mesh>
            <lineSegments geometry={shellGeometry}>
              <lineBasicMaterial color={new Color(ink)} transparent opacity={0.18} />
            </lineSegments>
          </group>
        </group>
      </group>
      {/* Same nesting as ringPoint(): Rz(roll) · Rx(tilt) · Rz(phase). */}
      <group rotation-z={RING_ROLL_Z}>
        <group rotation-x={RING_TILT_X}>
          <group ref={orbit}>
            <lineLoop geometry={ringGeometry}>
              <lineBasicMaterial color={new Color(ink)} transparent opacity={0.35} />
            </lineLoop>
            <mesh position={[RING_RADIUS, 0, 0]}>
              <sphereGeometry args={[DOT_RADIUS, 16, 16]} />
              <meshBasicMaterial color={new Color(accent)} />
            </mesh>
          </group>
        </group>
      </group>
    </>
  );
}

export default function HeroScene({ onReady }: { onReady: () => void }) {
  const wrapper = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    if (wrapper.current) observer.observe(wrapper.current);
    return () => observer.disconnect();
  }, []);

  const animate = visible && !reduced;

  return (
    <div ref={wrapper} className="h-full w-full" aria-hidden="true">
      {/* Colours pass through untouched so the canvas matches the SVG exactly:
          legacy = no colour management, flat = no tone mapping, linear = no output encoding. */}
      <Canvas
        legacy
        flat
        linear
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, CAMERA_Z], fov: CAMERA_FOV }}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
        // Render continuously only while visible and motion is allowed.
        frameloop={animate ? "always" : "demand"}
      >
        <Sculpture animate={animate} onReady={onReady} />
      </Canvas>
    </div>
  );
}
