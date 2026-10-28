"use client";

import { useEffect, useRef } from "react";
import { THEME_EVENT } from "./theme";

/**
 * A fixed, full-screen field of topographic contour lines behind the page, drawn by one WebGL2
 * fragment shader. The terrain drifts slowly, the cursor bends it like a lens (and warms the lines
 * near it to the accent), and scrolling stirs it. Capped at 30 fps and at reduced resolution,
 * paused while the tab is hidden, a single still frame for reduced motion, and nothing at all
 * without WebGL2.
 */
const FRAGMENT = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;   // px, origin top-left; far off-screen when there's no pointer
uniform float uScroll; // page scroll in px
uniform vec3 uInk;
uniform vec3 uAccent;
uniform float uDark;
out vec4 color;

vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 a0 = x - floor(x + 0.5);
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
  vec2 frag = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  float scale = 1.0 / 520.0;
  vec2 p = (frag + vec2(0.0, uScroll * 0.35)) * scale;

  // Cursor lens: the terrain swells away from the pointer.
  vec2 toMouse = frag - uMouse;
  float lens = exp(-dot(toMouse, toMouse) / (2.0 * 170.0 * 170.0));
  p -= toMouse * scale * lens * 0.45;

  float t = uTime * 0.035;
  vec2 warp = vec2(snoise(p * 0.9 + t), snoise(p * 0.9 - t + 7.3));
  float h = snoise(p * 1.25 + warp * 0.55) * 0.6 + snoise(p * 2.6 - warp * 0.3 + t * 1.7) * 0.25;

  // Contour lines of constant width, with every fifth line a little stronger (an index contour).
  float levels = 7.0;
  float v = h * levels;
  // Distance to the nearest contour level, in screen pixels: a crisp ~1px line anywhere.
  float d = abs(fract(v + 0.5) - 0.5) / max(fwidth(v), 1e-4);
  float line = 1.0 - smoothstep(0.4, 1.4, d);
  float index = mod(floor(v + 0.5), 5.0) < 0.5 ? 1.7 : 1.0;

  // Quiet by default so text reads cleanly over it; the pointer's lens is where it comes alive.
  float alpha = line * (uDark > 0.5 ? 0.05 : 0.055) * index;
  vec3 col = mix(uInk, uAccent, smoothstep(0.1, 0.8, lens));
  alpha *= 1.0 + lens * 3.2;
  color = vec4(col * alpha, alpha);
}`;

const VERTEX = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

function rgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** Sets up WebGL and the frame loop; returns its teardown, or nothing if WebGL2 isn't available. */
function startTopo(el: HTMLCanvasElement | null): (() => void) | undefined {
  const gl = el?.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: "low-power" });
  if (!el || !gl) return;

  const compile = (type: number, src: string) => {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    return sh;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAGMENT));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u = (n: string) => gl.getUniformLocation(prog, n);
  const [uRes, uTime, uMouse, uScroll, uInk, uAccent, uDark] = ["uRes", "uTime", "uMouse", "uScroll", "uInk", "uAccent", "uDark"].map(u);

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  // Lines are thin and soft, so a fraction of the device resolution looks the same at a fraction of the cost.
  const quality = coarse ? 0.4 : 0.75;
  const interval = coarse ? 50 : 33; // ms per frame: 20 fps on phones, 30 elsewhere
  let scale = 1;
  const resize = () => {
    scale = Math.min(window.devicePixelRatio || 1, 2) * quality;
    el.width = Math.round(window.innerWidth * scale);
    el.height = Math.round(window.innerHeight * scale);
    gl.viewport(0, 0, el.width, el.height);
    gl.uniform2f(uRes, el.width, el.height);
  };
  const colors = () => {
    const css = getComputedStyle(document.documentElement);
    gl.uniform3fv(uInk, rgb(css.getPropertyValue("--ink")));
    gl.uniform3fv(uAccent, rgb(css.getPropertyValue("--accent")));
    gl.uniform1f(uDark, css.colorScheme === "dark" || document.documentElement.dataset.theme === "dark" ? 1 : 0);
  };
  resize();
  colors();

  const mouse = { x: -1e5, y: -1e5, tx: -1e5, ty: -1e5 };
  const onMove = (e: PointerEvent) => {
    mouse.tx = e.clientX;
    mouse.ty = e.clientY;
    if (mouse.x < -1e4) {
      mouse.x = mouse.tx;
      mouse.y = mouse.ty;
    }
  };
  const onLeave = () => {
    mouse.tx = mouse.ty = -1e5;
    mouse.x = mouse.y = -1e5;
  };

  // Time advances faster while you scroll, then settles back.
  let time = Math.random() * 100;
  let last = performance.now();
  let lastY = window.scrollY;
  let stir = 0;
  let frame = 0;
  let previous = 0;
  const draw = (now: number) => {
    frame = requestAnimationFrame(draw);
    if (now - previous < interval) return; // slow drift doesn't need more
    previous = now;
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    const y = window.scrollY;
    stir = stir * 0.9 + Math.min(Math.abs(y - lastY), 400) * 0.02;
    lastY = y;
    time += dt * (1 + stir);
    mouse.x += (mouse.tx - mouse.x) * 0.15;
    mouse.y += (mouse.ty - mouse.y) * 0.15;
    gl.uniform1f(uTime, time);
    gl.uniform1f(uScroll, y * scale);
    gl.uniform2f(uMouse, mouse.x * scale, mouse.y * scale);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  const still = () => {
    gl.uniform1f(uTime, time);
    gl.uniform1f(uScroll, window.scrollY * scale);
    gl.uniform2f(uMouse, -1e5, -1e5);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  const onVisibility = () => {
    cancelAnimationFrame(frame);
    if (!document.hidden && !reduced) frame = requestAnimationFrame(draw);
  };
  const onResize = () => {
    resize();
    if (reduced) still();
  };
  const onTheme = () => {
    colors();
    if (reduced) still();
  };

  window.addEventListener("resize", onResize);
  window.addEventListener(THEME_EVENT, onTheme);
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", onTheme);
  document.addEventListener("visibilitychange", onVisibility);
  if (reduced) still();
  else {
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    frame = requestAnimationFrame(draw);
  }
  // Fade in once there's a first frame, so it never flashes.
  requestAnimationFrame(() => el.classList.add("opacity-100"));

  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", onResize);
    window.removeEventListener(THEME_EVENT, onTheme);
    window.matchMedia("(prefers-color-scheme: dark)").removeEventListener("change", onTheme);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pointermove", onMove);
    document.documentElement.removeEventListener("pointerleave", onLeave);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  };
}

export function TopoBackground() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Start after the page has loaded and gone idle: the shader compile and first frames would
    // otherwise compete with loading (measured: ~400 ms of extra blocking time on an emulated phone started eagerly, ~140 ms deferred).
    let cleanup = () => {};
    let idle = 0;
    const begin = () => {
      idle = window.requestIdleCallback ? window.requestIdleCallback(() => (cleanup = startTopo(canvas.current) ?? cleanup), { timeout: 4000 }) : window.setTimeout(() => (cleanup = startTopo(canvas.current) ?? cleanup), 1500);
    };
    if (document.readyState === "complete") begin();
    else window.addEventListener("load", begin, { once: true });
    return () => {
      window.removeEventListener("load", begin);
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      cleanup();
    };
  }, []);

  return <canvas ref={canvas} aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 h-full w-full opacity-0 transition-opacity duration-1000 print:hidden" />;
}
