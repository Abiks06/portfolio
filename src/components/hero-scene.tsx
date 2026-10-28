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
import { BURST_EVENT } from "@/lib/events";
import { useCssColor } from "@/lib/use-css-color";

/** Seconds after the first frame before the sculpture starts moving: the crossfade runs first. */
const SETTLE = 0.9;
/** Seconds for the spin and tilt to ease up to full strength. */
const EASE_IN = 1.6;
/** Idle spin in radians per second; a drag overrides it and the spin coasts back. */
const IDLE_SPIN = 0.18;

/**
 * Pointer input → physics, shared by the canvas wrapper and the scene. A module-level object
 * because there is only ever one hero sculpture, and the frame loop mutates it 60 times a second.
 */
const interaction = { velocity: IDLE_SPIN, dragging: false, burst: { x: 0, v: 0 } };


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
  const { geometry, normals, base, spread } = useMemo(() => {
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
    // Each face flies a slightly different distance when shattered, so it doesn't read as a uniform scale.
    const spread = FACES.map((_, i) => 0.7 + ((i * 7919) % 13) / 20);
    return { geometry: g, normals: faceNormals, base: positions.slice(), spread };
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
      const io = interaction;
      // A flick keeps spinning and coasts back to the idle speed.
      if (!io.dragging) io.velocity = MathUtils.damp(io.velocity, IDLE_SPIN, 1.4, delta);
      spin.current.rotation.y += delta * io.velocity * strength;
      tilt.current.rotation.x = MathUtils.damp(tilt.current.rotation.x, pointer.current.y * 0.35 * strength, 3, delta);
      tilt.current.rotation.z = MathUtils.damp(tilt.current.rotation.z, -pointer.current.x * 0.2 * strength, 3, delta);
      orbit.current.rotation.z += delta * 0.08 * strength;
    }

    // Shatter: a damped spring pushes each face out along its normal and pulls it back.
    const b = interaction.burst;
    if (b.v !== 0 || b.x !== 0) {
      const dt = Math.min(delta, 1 / 30);
      b.v += (-60 * b.x - 9 * b.v) * dt;
      b.x += b.v * dt;
      if (Math.abs(b.x) < 1e-4 && Math.abs(b.v) < 1e-3) b.x = b.v = 0;
      const pos = geometry.getAttribute("position") as BufferAttribute;
      normals.forEach((n, i) => {
        const d = b.x * spread[i];
        for (let v = 0; v < 3; v++) {
          const k = i * 9 + v * 3;
          pos.setXYZ(i * 3 + v, base[k] + n.x * d, base[k + 1] + n.y * d, base[k + 2] + n.z * d);
        }
      });
      pos.needsUpdate = true;
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
  const drag = useRef({ x: 0, moved: 0, t: 0 });

  const shatter = () => {
    interaction.burst.v += 5.5;
  };

  useEffect(() => {
    window.addEventListener(BURST_EVENT, shatter);
    return () => window.removeEventListener(BURST_EVENT, shatter);
  }, []);

  // Drag sideways to spin (the speed you let go at carries on); a press that barely moves is a click, which shatters it.
  const onPointerDown = (e: React.PointerEvent) => {
    if (reduced) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, moved: 0, t: performance.now() };
    interaction.dragging = true;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!interaction.dragging) return;
    const now = performance.now();
    const dx = e.clientX - drag.current.x;
    const dt = Math.max(now - drag.current.t, 8) / 1000;
    drag.current = { x: e.clientX, moved: drag.current.moved + Math.abs(dx), t: now };
    interaction.velocity = MathUtils.clamp((dx / dt) * 0.012, -14, 14);
  };
  const onPointerUp = () => {
    if (!interaction.dragging) return;
    interaction.dragging = false;
    if (drag.current.moved < 6) shatter();
  };

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    if (wrapper.current) observer.observe(wrapper.current);
    return () => observer.disconnect();
  }, []);

  const animate = visible && !reduced;

  return (
    <div
      ref={wrapper}
      className={`h-full w-full touch-pan-y ${reduced ? "" : "cursor-grab active:cursor-grabbing"}`}
      aria-hidden="true"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
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
