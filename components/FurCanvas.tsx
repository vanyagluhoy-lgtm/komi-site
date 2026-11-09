"use client";

import { useEffect, useRef, type RefObject } from "react";

export type FurColor = { fur: string; bg: string };
type Rgb = [number, number, number];

type Props = {
  color: FurColor;
  panelRef: RefObject<HTMLElement | null>;
  floodFrom: RefObject<{ x: number; y: number } | null>;
  onFail: () => void;
  onFirstTouch: () => void;
};

const VS = `#version 300 es
precision highp float;
layout(location=0) in vec2 aPos;
uniform float uLayers, uAspect, uTile;
out vec2 vUv; out float vH;
void main() {
  float h = 1. - float(gl_InstanceID) / (uLayers - 1.);
  vH = h;
  vec2 p = aPos * (1. + h * .03);
  gl_Position = vec4(p, .9 - h * 1.8, 1.);
  vUv = aPos * vec2(uAspect, 1.) * uTile;
}`;

const FS = `#version 300 es
precision highp float;
in vec2 vUv; in float vH;
uniform sampler2D uTileTex, uFlow, uMask;
uniform vec2 uRes, uFloodO;
uniform float uFlood, uAspect;
uniform vec3 uFurA, uFurB;
out vec4 o;
void main() {
  vec2 sc = gl_FragCoord.xy / uRes;
  vec4 fl = texture(uFlow, sc);
  vec2 comb = (fl.rg - 128. / 255.) * 2.;
  float h = vH;
  float prof = (1. - texture(uMask, sc).r * .7) * (1. - fl.b * .26);

  vec2 curl = vec2(sin(vUv.x * 5.1 + vUv.y * 2.3), cos(vUv.y * 4.7 - vUv.x * 1.9));
  vec4 s = texture(uTileTex, vUv - comb * h * h * .13 + curl * h * .035);
  if (h > 0. && s.r * prof < h) discard;

  vec2 e = vec2(4.) / uRes;
  float edge = texture(uMask, sc - e * vec2(1., -1.)).r - texture(uMask, sc + e * vec2(1., -1.)).r;
  vec2 a = vec2(uAspect, 1.);
  vec3 fur = mix(uFurB, uFurA, smoothstep(uFlood - .14, uFlood, distance(sc * a, uFloodO * a)));
  float lum = dot(fur, vec3(.3, .59, .11));
  float ao = mix(.26 + lum * .42, 1.38 - lum * .22, pow(h, .85));
  vec3 c = fur * ao * (.9 + .2 * s.g);
  c *= 1. + length(comb) * .1 + clamp(dot(comb, vec2(-.62, .78)), -.5, 1.) * .16;
  c *= 1. + edge * .55;
  o = vec4(c, 1.);
}`;

const FLOW_W = 128;
const FLOW_H = 72;

function rgb(hex: string): Rgb {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

// Сід фіксований: шерпа виглядає однаково при кожному завантаженні
function sherpaTile() {
  const size = 512;
  const heights = new Float32Array(size * size);
  const pixels = new Uint8Array(size * size * 4);
  let seed = 7;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  for (let n = 0; n < 3600; n++) {
    const cx = Math.round(random() * size);
    const cy = Math.round(random() * size);
    const radius = 7 + random() * 11;
    const amplitude = 0.66 + random() * 0.34;
    const phase = random() * 6.28;
    const tone = random() * 255;
    const turn = random() < 0.5 ? 1 : -1;
    const reach = Math.ceil(radius);
    for (let y = -reach; y <= reach; y++) {
      for (let x = -reach; x <= reach; x++) {
        const d = Math.hypot(x, y) / radius;
        if (d >= 1) continue;
        const curl = 0.7 + 0.3 * (Math.sin(Math.atan2(y, x) * 2 * turn + d * 13 + phase) * 0.5 + 0.5);
        const value = amplitude * Math.sqrt(1 - d * d) * curl;
        const index = (((cy + y) % size) + size) % size * size + (((cx + x) % size) + size) % size;
        if (value > heights[index]) {
          heights[index] = value;
          pixels.set([value * 255, tone, 128, 128], index * 4);
        }
      }
    }
  }
  for (let i = 0; i < size * size; i++) {
    if (heights[i] < 0.34) pixels.set([87 + random() * 18, random() * 255, 128, 128], i * 4);
  }
  return { size, pixels };
}

export default function FurCanvas({ color, panelRef, floodFrom, onFail, onFirstTouch }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const setColorRef = useRef<((next: FurColor) => void) | null>(null);
  const initialColor = useRef(color);
  const callbacks = useRef({ onFail, onFirstTouch });

  useEffect(() => {
    callbacks.current = { onFail, onFirstTouch };
  }, [onFail, onFirstTouch]);

  useEffect(() => {
    setColorRef.current?.(color);
  }, [color]);

  useEffect(() => {
    const element = canvasRef.current;
    if (!element) return;
    const canvas: HTMLCanvasElement = element;
    const context = canvas.getContext("webgl2", { antialias: false, alpha: false, depth: true, powerPreference: "high-performance" });
    if (!context) {
      callbacks.current.onFail();
      return;
    }
    const gl: WebGL2RenderingContext = context;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const small = Math.min(window.innerWidth, window.innerHeight) < 700;

    const program = gl.createProgram()!;
    const shaders = ([[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, FS]] as const).map(([type, source]) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      gl.attachShader(program, shader);
      return shader;
    });
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      callbacks.current.onFail();
      return;
    }
    const uniform = (name: string) => gl.getUniformLocation(program, name);
    gl.useProgram(program);
    gl.uniform1i(uniform("uTileTex"), 0);
    gl.uniform1i(uniform("uFlow"), 1);
    gl.uniform1i(uniform("uMask"), 2);

    const quad = gl.createVertexArray();
    const quadBuffer = gl.createBuffer();
    gl.bindVertexArray(quad);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const clampFilter = () => {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    };

    const tile = sherpaTile();
    const tileTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tileTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, tile.size, tile.size, 0, gl.RGBA, gl.UNSIGNED_BYTE, tile.pixels);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const aniso = gl.getExtension("EXT_texture_filter_anisotropic");
    if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, 8);

    const flow = new Float32Array(FLOW_W * FLOW_H * 3);
    const flowPixels = new Uint8Array(FLOW_W * FLOW_H * 4).fill(128);
    const flowTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, flowTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, FLOW_W, FLOW_H, 0, gl.RGBA, gl.UNSIGNED_BYTE, flowPixels);
    clampFilter();

    const maskTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, maskTexture);
    clampFilter();

    const maskCanvas = document.createElement("canvas");
    const mask = maskCanvas.getContext("2d")!;

    // Низька роздільність дає м'який край літер у всіх браузерах, зокрема в Safari
    function drawMask() {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const width = Math.min(720, Math.round(rect.width * 0.5));
      const height = Math.round((width * rect.height) / rect.width);
      const scale = width / rect.width;
      maskCanvas.width = width;
      maskCanvas.height = height;

      const panel = panelRef.current?.getBoundingClientRect();
      const top = 96 * scale;
      const bottom = (panel ? panel.top - rect.top - 16 : rect.height * 0.8) * scale;
      const free = Math.max(bottom - top, height * 0.25);
      const lines = width / height < 0.8 ? ["КО", "МІ"] : ["КОМІ"];

      const family = getComputedStyle(document.body).fontFamily;
      mask.fillStyle = "#000";
      mask.fillRect(0, 0, width, height);
      mask.textAlign = "center";
      mask.textBaseline = "alphabetic";
      mask.font = `700 100px ${family}`;
      const widest = Math.max(...lines.map((line) => mask.measureText(line).width));
      const capRatio = 0.73;
      const lineRatio = 0.86;
      const fitHeight = (free * 0.92) / (capRatio + lineRatio * (lines.length - 1));
      const fontSize = Math.min((100 * width * 0.9) / widest, fitHeight);
      mask.font = `700 ${fontSize}px ${family}`;
      mask.fillStyle = "#fff";
      const block = fontSize * (capRatio + lineRatio * (lines.length - 1));
      const start = top + (free - block) / 2 + fontSize * capRatio;
      lines.forEach((line, index) => mask.fillText(line, width / 2, start + fontSize * lineRatio * index));

      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, maskTexture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, gl.RED, gl.UNSIGNED_BYTE, maskCanvas);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    }

    let quality = 1;
    function resize() {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.max(0.75, Math.min(window.devicePixelRatio || 1, small ? 1.25 : 1.5) * Math.sqrt(quality));
      canvas.width = Math.max(1, Math.round(rect.width * ratio));
      canvas.height = Math.max(1, Math.round(rect.height * ratio));
      drawMask();
    }

    function stamp(x: number, y: number, dx: number, dy: number) {
      const rect = canvas.getBoundingClientRect();
      const aspect = rect.width / rect.height;
      const radius = 0.08;
      const cx = x * FLOW_W;
      const cy = y * FLOW_H;
      const rx = Math.ceil((radius * 2.2 * FLOW_W) / aspect);
      const ry = Math.ceil(radius * 2.2 * FLOW_H);
      for (let j = Math.max(0, Math.floor(cy - ry)); j < Math.min(FLOW_H, cy + ry); j++) {
        for (let i = Math.max(0, Math.floor(cx - rx)); i < Math.min(FLOW_W, cx + rx); i++) {
          const ux = (i / FLOW_W - x) * aspect;
          const uy = j / FLOW_H - y;
          const g = Math.exp(-(ux * ux + uy * uy) / (radius * radius));
          const k = (j * FLOW_W + i) * 3;
          flow[k] = Math.max(-1, Math.min(1, flow[k] + dx * g * 16));
          flow[k + 1] = Math.max(-1, Math.min(1, flow[k + 1] + dy * g * 16));
          flow[k + 2] = Math.min(1, Math.max(flow[k + 2], g));
        }
      }
    }

    function stepFlow(dt: number) {
      const push = Math.exp(-dt / 1.7);
      const press = Math.exp(-dt / 0.9);
      for (let i = 0, k = 0, p = 0; i < FLOW_W * FLOW_H; i++, k += 3, p += 4) {
        flow[k] *= push;
        flow[k + 1] *= push;
        flow[k + 2] *= press;
        flowPixels[p] = 128 + flow[k] * 127;
        flowPixels[p + 1] = 128 + flow[k + 1] * 127;
        flowPixels[p + 2] = flow[k + 2] * 255;
      }
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, flowTexture);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, FLOW_W, FLOW_H, gl.RGBA, gl.UNSIGNED_BYTE, flowPixels);
    }

    // Заливка кольором
    let from = rgb(initialColor.current.fur);
    let to = from;
    let floodT = 1;
    let floodOrigin: [number, number] = [0.5, 0.5];
    let visible = true;

    setColorRef.current = (next) => {
      const target = rgb(next.fur);
      if (target.every((value, index) => value === to[index])) return;
      const rect = canvas.getBoundingClientRect();
      const click = floodFrom.current;
      floodOrigin = click
        ? [(click.x - rect.left) / rect.width, 1 - (click.y - rect.top) / rect.height]
        : [0.5, 0.5];
      floodFrom.current = null;
      from = to;
      to = target;
      floodT = reduced || !visible ? 1 : 0;
      if (floodT === 1) from = to;
    };

    // Курсор і палець
    let touched = false;
    let last: [number, number] | null = null;

    function move(event: PointerEvent) {
      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = 1 - (event.clientY - rect.top) / rect.height;
      if (!touched) {
        touched = true;
        callbacks.current.onFirstTouch();
      }
      if (last) {
        const aspect = rect.width / rect.height;
        const dx = (x - last[0]) * aspect;
        const dy = y - last[1];
        const steps = Math.min(12, Math.ceil(Math.hypot(dx, dy) / 0.025) || 1);
        for (let i = 1; i <= steps; i++) {
          stamp(last[0] + ((x - last[0]) * i) / steps, last[1] + ((y - last[1]) * i) / steps, dx / steps, dy / steps);
        }
      }
      last = [x, y];
    }
    const forget = () => {
      last = null;
    };
    const down = (event: PointerEvent) => {
      forget();
      move(event);
    };

    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointerleave", forget);
    canvas.addEventListener("pointerup", forget);
    canvas.addEventListener("pointercancel", forget);

    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    let raf = 0;
    let prev = performance.now();
    let startedAt = prev;
    let ghost: [number, number] | null = null;
    let spent = 0;
    let frames = 0;

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      const raw = (now - prev) / 1000;
      const dt = Math.min(0.05, raw);
      prev = now;

      if (raw < 0.6) {
        spent += raw;
        frames++;
      }
      if (frames >= 12) {
        const average = spent / frames;
        if (now - startedAt > 1500 && average > 0.04 && quality > 0.45) {
          quality = average > 0.12 ? 0.45 : Math.max(0.45, quality * 0.82);
          resize();
        }
        spent = 0;
        frames = 0;
      }

      const t = now / 1000;
      if (!touched && !reduced) {
        const gx = 0.5 + 0.38 * Math.sin(t * 0.9);
        const gy = 0.55 + 0.26 * Math.sin(t * 1.7);
        const rect = canvas.getBoundingClientRect();
        if (ghost) stamp(gx, gy, ((gx - ghost[0]) * rect.width) / rect.height, gy - ghost[1]);
        ghost = [gx, gy];
      }
      stepFlow(dt);

      if (floodT < 1) {
        floodT = Math.min(1, floodT + Math.min(0.2, raw) / 1.2);
        if (floodT === 1) from = to;
      }
      const aspect = canvas.width / canvas.height;
      const maxDistance = Math.hypot(aspect, 1) + 0.2;
      const flood = floodT >= 1 ? maxDistance + 1 : ease(floodT) * maxDistance;

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LESS);

      const layers = Math.max(10, Math.round((small ? 18 : 34) * (0.45 + 0.55 * quality)));
      const height = canvas.getBoundingClientRect().height;
      gl.uniform2f(uniform("uRes"), canvas.width, canvas.height);
      gl.uniform2f(uniform("uFloodO"), floodOrigin[0], floodOrigin[1]);
      gl.uniform1f(uniform("uFlood"), flood);
      gl.uniform1f(uniform("uAspect"), aspect);
      gl.uniform1f(uniform("uLayers"), layers);
      gl.uniform1f(uniform("uTile"), height / (2 * (small ? 300 : 430)));
      gl.uniform3fv(uniform("uFurA"), from);
      gl.uniform3fv(uniform("uFurB"), to);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, layers);
    }

    function run() {
      cancelAnimationFrame(raf);
      prev = performance.now();
      raf = requestAnimationFrame(frame);
    }

    // Коли перший екран прокручено, хутро не малюється і не гріє телефон
    const seen = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) {
        run();
      } else {
        cancelAnimationFrame(raf);
      }
    });

    const resizer = new ResizeObserver(resize);
    let cancelled = false;
    const family = getComputedStyle(document.body).fontFamily;
    document.fonts.load(`700 100px ${family}`, "КОМІ").catch(() => undefined).then(() => {
      if (cancelled) return;
      startedAt = performance.now();
      resize();
      seen.observe(canvas);
      resizer.observe(canvas);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      seen.disconnect();
      resizer.disconnect();
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointerleave", forget);
      canvas.removeEventListener("pointerup", forget);
      canvas.removeEventListener("pointercancel", forget);
      setColorRef.current = null;
      shaders.forEach((shader) => gl.deleteShader(shader));
      gl.deleteProgram(program);
      gl.deleteBuffer(quadBuffer);
      gl.deleteVertexArray(quad);
      [tileTexture, flowTexture, maskTexture].forEach((texture) => gl.deleteTexture(texture));
    };
  }, [panelRef, floodFrom]);

  return <canvas ref={canvasRef} className="fur-canvas" aria-hidden="true" />;
}
