import React, { useEffect, useState } from 'react';
import { continueRender, delayRender, Img, staticFile } from 'remotion';
import { clamp01, E, hitPulse, prog, rand } from '../engine/anim';
import { endBeats, END_EXTRA } from '../engine/endTiming';
import { SANS, useFilm } from './context';

// ---------------------------------------------------------------------------------------------
// End card: the swarm (plus extra cursors joining from the edges) spins up into a tornado in the middle of the
// picture, the tornado unwinds and every cursor flies to a point of the product's logo, drawing it; then the sharp
// logo lands where they drew it and the lockup follows (title, subtitle, button, address).
// The logo's points are sampled from capture/logo.png (the nav's mark, captured sharp); without one, from the
// title's first letter.
// ---------------------------------------------------------------------------------------------

type Pts = { u: Float32Array; v: Float32Array; aspect: number };
const cache = new Map<string, Pts>();

/** n points spread over the dark / coloured pixels of an image (or a letter), in 0..1 box coordinates. */
const samplePoints = async (src: string | null, letter: string, n: number): Promise<Pts> => {
  const G = 120;
  const cv = document.createElement('canvas');
  const cx = cv.getContext('2d', { willReadFrequently: true })!;
  let aspect = 1;
  if (src) {
    const img = new Image();
    img.src = src;
    await img.decode();
    aspect = img.naturalWidth / img.naturalHeight;
    cv.width = aspect >= 1 ? G : Math.round(G * aspect);
    cv.height = aspect >= 1 ? Math.round(G / aspect) : G;
    cx.drawImage(img, 0, 0, cv.width, cv.height);
  } else {
    cv.width = cv.height = G;
    cx.fillStyle = '#fff';
    cx.fillRect(0, 0, G, G);
    cx.fillStyle = '#000';
    cx.font = `800 ${G * 0.9}px "Geist Variable", system-ui, sans-serif`;
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillText(letter, G / 2, G * 0.54);
  }
  const { width: w, height: h } = cv;
  const d = cx.getImageData(0, 0, w, h).data;
  const px = (x: number, y: number) => [d[(y * w + x) * 4], d[(y * w + x) * 4 + 1], d[(y * w + x) * 4 + 2], d[(y * w + x) * 4 + 3]];
  const corners = [px(0, 0), px(w - 1, 0), px(0, h - 1), px(w - 1, h - 1)];
  const bg = [0, 1, 2].map((c) => corners.reduce((s, k) => s + k[c], 0) / 4);
  // ink: pixels that differ from the background; edges: pixels that differ from a neighbour (outlines of the mark and
  // of any shape inside it). Mostly edges, so a logo on a solid plate reads as its shapes, not as a filled square.
  const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const ink: [number, number][] = [];
  const edge: [number, number][] = [];
  for (let y = 1; y < h - 1; y += 1)
    for (let x = 1; x < w - 1; x += 1) {
      const p = px(x, y);
      const on = p[3] > 128 && dist(p, bg) > 70;
      if (on && x % 3 === 0 && y % 3 === 0) ink.push([x / w, y / h]);
      if ((x + y) % 2) continue;
      const nb = [px(x + 1, y), px(x - 1, y), px(x, y + 1), px(x, y - 1)];
      if (nb.some((q) => dist(q, p) > 90 || Math.abs(q[3] - p[3]) > 128)) edge.push([x / w, y / h]);
    }
  if (!ink.length && !edge.length) for (let i = 0; i < 64; i++) ink.push([0.5 + 0.4 * Math.cos(i), 0.5 + 0.4 * Math.sin(i)]);
  const shuffle = (l: [number, number][], seed: number) => l.map((_, i) => i).sort((a, b) => rand(a * 7 + seed) - rand(b * 7 + seed)).map((i) => l[i]);
  const E1 = shuffle(edge.length ? edge : ink, 1);
  const I1 = shuffle(ink.length ? ink : edge, 2);
  const u = new Float32Array(n);
  const v = new Float32Array(n);
  const nEdge = Math.round(n * 0.75);
  for (let i = 0; i < n; i++) {
    const p = i < nEdge ? E1[i % E1.length] : I1[(i - nEdge) % I1.length];
    u[i] = p[0];
    v[i] = p[1];
  }
  return { u, v, aspect };
};

const useLogoPoints = (key: string, src: string | null, letter: string, n: number) => {
  const [pts, setPts] = useState<Pts | null>(() => cache.get(key) ?? null);
  const [handle] = useState(() => (cache.has(key) ? null : delayRender('logo points')));
  useEffect(() => {
    if (pts) return;
    samplePoints(src, letter, n).then((p) => {
      cache.set(key, p);
      setPts(p);
      if (handle != null) continueRender(handle);
    });
  }, [key, src, letter, n, pts, handle]);
  return pts;
};

const Arrow: React.FC<{ color: string }> = ({ color }) => (
  <svg width={24} height={32} viewBox="0 0 30 42" style={{ position: 'absolute', left: -2.4, top: -1.6, overflow: 'visible' }}>
    <path d="M3 2 L3 33 L10.2 26.4 L15 38 L20.2 35.8 L15.4 24.4 L25 24.4 Z" fill={color} stroke="#fff" strokeWidth={2.6} strokeLinejoin="round" />
  </svg>
);

export const EndCard: React.FC<{ f: number }> = ({ f }) => {
  const { T, cap, cfg, plan, project } = useFilm();
  const end = cfg.end!;
  const END = endBeats(end.duration);
  const N = plan.workers.length + END_EXTRA;
  const logoSrc = cap.logo ? staticFile(`${project}/capture/${cap.logo.file}`) : null;
  const letter = (end.title || cap.title || cfg.name).trim().charAt(0).toLocaleUpperCase('tr');
  const pts = useLogoPoints(`${project}:${N}`, logoSrc, letter, N);
  if (!pts) return null;

  const fps = T.fps;
  const t = (f - T.endFrom) / fps; // seconds into the end card
  const S = Math.min(T.W, T.H);
  const bg = prog(f, T.endFrom - 8, T.endFrom + 18);

  // logo box: big in the middle while the cursors draw it, then up and smaller for the lockup
  const lock = prog(t, END.lock, END.lock + 0.5, E.inOut);
  const big = S * 0.36;
  const small = S * 0.2;
  const size = big + (small - big) * lock;
  const lw = pts.aspect >= 1 ? size : size * pts.aspect;
  const lh = pts.aspect >= 1 ? size / pts.aspect : size;
  const lcx = T.W / 2;
  const lcy = T.H * 0.45 + (T.H * 0.3 - T.H * 0.45) * lock;

  // the tornado: a funnel, wide on top, spinning faster and faster
  const funnel = (j: number, ts: number) => {
    const spin = 2.2 * ts + 1.6 * ts * ts;
    const th = rand(j * 13 + 2) * Math.PI * 2 + spin * (0.8 + 0.4 * rand(j * 3));
    const hgt = (rand(j * 17 + 5) + ts * 0.22) % 1; // cursors climb the funnel
    const R = S * 0.33 * (0.12 + 0.88 * hgt ** 1.3);
    const sway = Math.sin(ts * 1.7) * S * 0.02 * (1 - hgt);
    const depth = Math.sin(th);
    return { x: T.W / 2 + sway + Math.cos(th) * R, y: T.H * 0.47 + (0.5 - hgt) * S * 0.62, depth, lean: Math.cos(th) > 0 ? -9 : 9 };
  };

  const cursors: { x: number; y: number; s: number; o: number; tilt: number; c: string; z: number }[] = [];
  const reveal = prog(t, END.reveal, END.reveal + 0.25, E.out);
  const iEnd = Math.max(0, Math.min(T.total, T.endFrom));
  for (let j = 0; j < N; j++) {
    const color = plan.workers[j % plan.workers.length].color;
    // where it comes from: a swarm cursor where the film left it, an extra one from beyond the edges
    let sx: number;
    let sy: number;
    if (j < plan.workers.length) {
      sx = plan.pos[j].x[iEnd];
      sy = plan.pos[j].y[iEnd];
    } else {
      const a = rand(j * 29 + 7) * Math.PI * 2;
      sx = T.W / 2 + Math.cos(a) * T.W * 0.75;
      sy = T.H / 2 + Math.sin(a) * T.H * 0.75;
    }
    const join = E.inOut(clamp01((t - (j < plan.workers.length ? 0 : rand(j) * 0.5)) / 0.7));
    const fn = funnel(j, Math.min(t, END.form + 0.8));
    let x = sx + (fn.x - sx) * join;
    let y = sy + (fn.y - sy) * join;
    let s = 0.72 + 0.32 * (fn.depth + 1) * 0.5;
    // depth shading only once a cursor is in the funnel; swarm cursors arrive fully visible, extras fade in as they enter
    const depthA = 0.45 + 0.55 * (fn.depth + 1) * 0.5;
    let o = (j < plan.workers.length ? 1 + (depthA - 1) * join : depthA * Math.min(1, join * 2.5));
    let tilt = fn.lean;
    let z = fn.depth;
    // unwind: fly to its point of the logo
    const form = E.inOut(clamp01((t - END.form - rand(j * 11) * 0.3) / 0.55));
    if (form > 0) {
      const px = lcx - lw / 2 + pts.u[j] * lw;
      const py = lcy - lh / 2 + pts.v[j] * lh;
      x += (px - x) * form;
      y += (py - y) * form;
      s += (0.62 - s) * form;
      o += (1 - o) * form;
      tilt *= 1 - form;
      z = form > 0.5 ? 1 : z;
    }
    // the sharp logo takes over
    o *= 1 - reveal;
    s *= 1 - 0.5 * reveal;
    if (o > 0.01) cursors.push({ x, y, s: s * (S / 1080), o, tilt, c: color, z });
  }
  cursors.sort((a, b) => a.z - b.z);

  const flash = hitPulse((t - END.reveal) * fps, 2, 7);
  const word = prog(t, END.lock + 0.3, END.lock + 0.7);
  const sub = prog(t, END.lock + 0.5, END.lock + 0.9);
  const btn = prog(t, END.lock + 0.75, END.lock + 1.1);
  return (
    <div style={{ position: 'absolute', inset: 0, background: `rgba(255,255,255,${bg})` }}>
      {reveal > 0 && (
        <div style={{ position: 'absolute', left: lcx - lw / 2, top: lcy - lh / 2, width: lw, height: lh, opacity: reveal, transform: `scale(${1.05 - 0.05 * reveal + 0.03 * flash})` }}>
          {logoSrc ? (
            <Img src={logoSrc} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', font: `800 ${lh * 0.9}px ${SANS}`, color: '#18181B' }}>{letter}</div>
          )}
        </div>
      )}
      {flash > 0.01 && <div style={{ position: 'absolute', left: lcx - lw * 0.75, top: lcy - lw * 0.75, width: lw * 1.5, height: lw * 1.5, borderRadius: '50%', border: `${6 * flash}px solid rgba(59,130,246,${0.35 * flash})`, transform: `scale(${1.25 - 0.25 * flash})` }} />}
      {cursors.map((c, i) => (
        <div key={i} style={{ position: 'absolute', left: c.x, top: c.y, width: 0, height: 0, opacity: c.o, transform: `rotate(${c.tilt}deg) scale(${c.s})`, transformOrigin: '0 0', filter: 'drop-shadow(0 2px 4px rgba(8,10,20,0.28))' }}>
          <Arrow color={c.c} />
        </div>
      ))}
      <div style={{ position: 'absolute', left: 0, width: T.W, top: T.H * 0.45, textAlign: 'center', font: `700 ${Math.round(S * 0.1)}px ${SANS}`, letterSpacing: '-0.03em', color: '#18181B', opacity: word, transform: `translateY(${(1 - word) * 20}px)` }}>{end.title}</div>
      {end.subtitle && <div style={{ position: 'absolute', left: 0, width: T.W, top: T.H * 0.45 + S * 0.13, textAlign: 'center', font: `500 ${Math.round(S * 0.032)}px ${SANS}`, color: '#52525B', opacity: sub }}>{end.subtitle}</div>}
      <div style={{ position: 'absolute', left: 0, width: T.W, top: T.H * 0.45 + S * 0.21, display: 'flex', justifyContent: 'center', gap: 18, opacity: btn, transform: `scale(${0.9 + 0.1 * btn})` }}>
        {end.button && <div style={{ padding: '14px 28px', borderRadius: 999, background: '#18181B', color: '#fff', font: `600 ${Math.round(S * 0.026)}px ${SANS}` }}>{end.button}</div>}
        {end.url && <div style={{ padding: '14px 28px', borderRadius: 999, background: '#fff', color: '#18181B', boxShadow: '0 4px 14px rgba(15,18,30,0.12)', font: `600 ${Math.round(S * 0.026)}px ${SANS}` }}>{end.url}</div>}
      </div>
    </div>
  );
};
