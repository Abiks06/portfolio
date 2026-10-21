"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { Color, type Group, MathUtils } from "three";
import { useMediaQuery } from "@/lib/use-media-query";

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

function Sculpture({ animate }: { animate: boolean }) {
  const group = useRef<Group>(null);
  const ring = useRef<Group>(null);
  const accent = useCssColor("--accent", "#e3572b");
  const ink = useCssColor("--ink", "#1b1a17");
  const pointer = useRef({ x: 0, y: 0 });

  // Track the pointer across the whole window, not only over the canvas.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame((_, delta) => {
    if (!animate || !group.current || !ring.current) return;
    const g = group.current;
    g.rotation.y += delta * 0.18;
    g.rotation.x = MathUtils.damp(g.rotation.x, pointer.current.y * 0.35, 3, delta);
    g.rotation.z = MathUtils.damp(g.rotation.z, -pointer.current.x * 0.2, 3, delta);
    ring.current.rotation.z += delta * 0.08;
  });

  return (
    <>
      <group ref={group}>
        <mesh>
          <icosahedronGeometry args={[1.15, 1]} />
          <meshStandardMaterial color={new Color(accent)} flatShading roughness={0.55} metalness={0.05} />
        </mesh>
        <mesh scale={1.32}>
          <icosahedronGeometry args={[1.15, 1]} />
          <meshBasicMaterial color={new Color(ink)} wireframe transparent opacity={0.18} />
        </mesh>
      </group>
      <group ref={ring} rotation={[1.2, 0.3, 0]}>
        <mesh>
          <torusGeometry args={[2.05, 0.006, 8, 160]} />
          <meshBasicMaterial color={new Color(ink)} transparent opacity={0.35} />
        </mesh>
        <mesh position={[2.05, 0, 0]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshBasicMaterial color={new Color(accent)} />
        </mesh>
      </group>
    </>
  );
}

export default function HeroScene() {
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
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, 5.2], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
        // Render continuously only while visible and motion is allowed.
        frameloop={animate ? "always" : "demand"}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[3, 4, 5]} intensity={2.2} />
        <directionalLight position={[-4, -2, -3]} intensity={0.6} />
        <Sculpture animate={animate} />
      </Canvas>
    </div>
  );
}
