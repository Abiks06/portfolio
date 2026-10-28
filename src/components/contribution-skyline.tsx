"use client";

import { Canvas, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { Color, type Group, type InstancedMesh, MathUtils, Object3D } from "three";
import type { ContributionDay } from "@/lib/github";
import { useCssColor } from "@/lib/use-css-color";
import { useMediaQuery } from "@/lib/use-media-query";

const CELL = 1; // grid pitch
const SIZE = 0.82; // bar footprint, leaving gaps between days
const MAX_H = 9; // tallest day
const LEVEL_MIX = [0, 0.28, 0.5, 0.74, 1];

type Hover = { day: ContributionDay; x: number; y: number } | null;

function Bars({ days, offset, onHover, instant }: { days: ContributionDay[]; offset: number; onHover: (h: Hover) => void; instant: boolean }) {
  const mesh = useRef<InstancedMesh>(null);
  const accent = useCssColor("--accent", "#cc4a1f");
  const paper = useCssColor("--paper-2", "#ede7dc");
  const line = useCssColor("--line", "#d9d1c4");
  const weeks = Math.ceil((days.length + offset) / 7);
  const peak = Math.max(1, ...days.map((d) => d.count));
  const grow = useRef(0); // 0 → 1: the city rises out of the ground on load
  const done = useRef(false);

  // Square-root heights: a few very busy days shouldn't flatten everything else.
  const heights = useMemo(() => days.map((d) => (d.count ? 0.25 + Math.sqrt(d.count / peak) * MAX_H : 0.08)), [days, peak]);

  useEffect(() => {
    if (!mesh.current) return;
    const c = new Color();
    const a = new Color(accent);
    const p = new Color(paper);
    days.forEach((d, i) => {
      if (d.level === 0) c.set(line);
      else c.copy(p).lerp(a, LEVEL_MIX[d.level]);
      mesh.current!.setColorAt(i, c);
    });
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  }, [days, accent, paper, line]);

  const dummy = useMemo(() => new Object3D(), []);
  useFrame((_, delta) => {
    if (!mesh.current || done.current) return;
    grow.current = instant ? 1 : Math.min(1, grow.current + delta / 1.4);
    days.forEach((_, i) => {
      const slot = i + offset;
      const week = Math.floor(slot / 7);
      const day = slot % 7;
      // Older weeks rise first, so the year sweeps in from left to right.
      const t = MathUtils.smootherstep(grow.current * 1.6 - (week / weeks) * 0.6, 0, 1);
      const h = Math.max(0.001, heights[i] * t);
      dummy.position.set((week - weeks / 2) * CELL, h / 2, (day - 3) * CELL);
      dummy.scale.set(SIZE, h, SIZE);
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    // Bounds for pointer picking, once the bars have reached full height.
    if (grow.current >= 1) {
      mesh.current.computeBoundingSphere();
      done.current = true;
    }
  });

  const hover = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.instanceId === undefined) return;
    onHover({ day: days[e.instanceId], x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });
  };

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, days.length]} onPointerMove={hover} onPointerOut={() => onHover(null)}>
      <boxGeometry />
      <meshStandardMaterial roughness={0.85} metalness={0} />
    </instancedMesh>
  );
}

/** Turntable: auto-rotates slowly; drag sideways to turn it, and it coasts. */
function Turntable({ children, auto }: { children: React.ReactNode; auto: boolean }) {
  const group = useRef<Group>(null);
  const { gl } = useThree();
  const state = useRef({ velocity: 0, dragging: false, x: 0 });
  useEffect(() => {
    const el = gl.domElement;
    const down = (e: PointerEvent) => {
      state.current = { ...state.current, dragging: true, x: e.clientX };
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!state.current.dragging) return;
      state.current.velocity = (e.clientX - state.current.x) * 0.25;
      state.current.x = e.clientX;
      if (group.current) group.current.rotation.y += (state.current.velocity * Math.PI) / 180;
    };
    const up = () => (state.current.dragging = false);
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [gl]);
  useFrame((_, delta) => {
    if (!group.current || state.current.dragging) return;
    state.current.velocity = MathUtils.damp(state.current.velocity, 0, 3, delta);
    group.current.rotation.y += (state.current.velocity * Math.PI) / 180 + (auto ? delta * 0.12 : 0);
  });
  return (
    <group ref={group} rotation-y={-0.5} position-y={-3}>
      {children}
    </group>
  );
}

/** The contribution calendar as a small city: one bar per day, height by contributions. */
export default function ContributionSkyline({ days }: { days: ContributionDay[] }) {
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [hover, setHover] = useState<Hover>(null);
  const offset = days.length ? new Date(days[0].date).getUTCDay() : 0;

  return (
    <div className="relative h-[340px] w-full cursor-grab touch-pan-y active:cursor-grabbing sm:h-[420px]">
      {/* legacy: colour management is a global three.js switch, and the hero sculpture needs it off;
          a second canvas turning it on would darken the sculpture's colours on the next theme change. */}
      <Canvas legacy orthographic camera={{ position: [40, 30, 40], zoom: 17, near: 0.1, far: 500 }} dpr={[1, 1.75]} gl={{ antialias: true, alpha: true }}>
        {/* Soft, mostly ambient light: without colour management, strong lights wash the accent out. */}
        <ambientLight intensity={0.55} />
        <directionalLight position={[20, 40, 10]} intensity={0.75} />
        <directionalLight position={[-30, 20, -20]} intensity={0.25} />
        <Turntable auto={!reduced}>
          <Bars days={days} offset={offset} onHover={setHover} instant={reduced} />
        </Turntable>
      </Canvas>
      {hover && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[130%] whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 font-mono text-[11px] text-paper"
          style={{ left: hover.x, top: hover.y }}
        >
          {hover.day.count} contribution{hover.day.count === 1 ? "" : "s"} ·{" "}
          {new Date(hover.day.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}
        </div>
      )}
      <p className="pointer-events-none absolute bottom-2 left-0 font-mono text-[11px] text-ink-3">Drag to turn · point at a day</p>
    </div>
  );
}
