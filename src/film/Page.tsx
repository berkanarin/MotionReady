import React from 'react';
import { Img } from 'remotion';
import { clamp01, E, prog } from '../engine/anim';
import type { Block } from '../engine/plan';
import { scrollAt } from '../engine/timing';
import { BLUE, MONO, RED, useFilm } from './context';

// ---------------------------------------------------------------------------------------------
// The page as it is being built. Every block is a window into one of the three captures at its own box, so a
// finished block is pixel-identical to the real page:
//   ground → the empty page · bare → a card's empty surface · page → text and pictures
// ---------------------------------------------------------------------------------------------
type Src = 'page' | 'bare' | 'ground';

const Cut: React.FC<{ src: Src; x: number; y: number; w: number; h: number; radius?: number; style?: React.CSSProperties }> = ({ src, x, y, w, h, radius = 0, style }) => {
  const { src: S, cap } = useFilm();
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, overflow: 'hidden', borderRadius: radius, ...style }}>
      <Img src={S[src]} style={{ position: 'absolute', left: -x, top: -y, width: cap.W, height: cap.H, maxWidth: 'none' }} />
    </div>
  );
};

const Handles: React.FC<{ x: number; y: number; w: number; h: number; a: number }> = ({ x, y, w, h, a }) => (
  <>
    {[
      [x, y],
      [x + w, y],
      [x, y + h],
      [x + w, y + h],
    ].map(([hx, hy], j) => (
      <div key={j} style={{ position: 'absolute', left: hx - 3.5, top: hy - 3.5, width: 7, height: 7, background: '#fff', border: `1.5px solid ${BLUE}`, opacity: a }} />
    ))}
  </>
);

const Chip: React.FC<{ x: number; y: number; a: number; color?: string; center?: boolean; children: React.ReactNode }> = ({ x, y, a, color = BLUE, center, children }) =>
  a > 0.01 ? (
    <div style={{ position: 'absolute', left: x, top: y, transform: center ? 'translate(-50%, -50%)' : 'translateX(-50%)', padding: '2px 5px', borderRadius: 3, background: color, color: '#fff', font: `500 9px ${MONO}`, whiteSpace: 'nowrap', opacity: a }}>
      {children}
    </div>
  ) : null;

// ---------------------------------------------------------------------------------------------
// frames: crosshair drag with a live W × H badge, then the empty surface lands
// ---------------------------------------------------------------------------------------------
const FrameBlock: React.FC<{ b: Block; f: number }> = ({ b, f }) => {
  if (b.src) return <CopyBlock b={b} f={f} />;
  const t = f - b.t0;
  const u = E.smooth(clamp01(t / b.dur));
  const surf = prog(t, b.dur - 2, b.dur + 6, E.out);
  const sel = t < b.dur + 30 ? 1 - prog(t, b.dur + 16, b.dur + 30) : 0;
  const w = b.w * u;
  const h = b.h * u;
  return (
    <>
      {surf > 0 && <Cut src="bare" x={b.x} y={b.y} w={b.w} h={b.h} radius={b.radius} style={{ opacity: surf, transform: `scale(${0.985 + 0.015 * surf})` }} />}
      {sel > 0.01 && (
        <>
          <div style={{ position: 'absolute', left: b.x, top: b.y, width: w, height: h, border: `1.5px solid ${BLUE}`, background: `rgba(59,130,246,${0.1 * (1 - surf)})`, borderRadius: Math.min(b.radius, 4), opacity: sel }} />
          <Handles x={b.x} y={b.y} w={w} h={h} a={sel * prog(t, 2, 6)} />
          <Chip x={b.x + w / 2} y={b.y + h + 7} a={sel * prog(t, 0, 4)}>
            {Math.round(w)} × {Math.round(h)}
          </Chip>
        </>
      )}
    </>
  );
};

/** Red distance between a master and its copy along the axis they share. */
const Spacing: React.FC<{ a: Block; c: { x: number; y: number; w: number; h: number }; op: number }> = ({ a, c, op }) => {
  const row = Math.abs(c.y - a.y) < Math.abs(c.x - a.x);
  const [p0, p1] = row ? (c.x > a.x ? [a.x + a.w, c.x] : [c.x + c.w, a.x]) : c.y > a.y ? [a.y + a.h, c.y] : [c.y + c.h, a.y];
  const gap = Math.round(p1 - p0);
  if (gap <= 2) return null;
  const mid = row ? Math.max(a.y, c.y) + Math.min(a.h, c.h) / 2 : Math.max(a.x, c.x) + Math.min(a.w, c.w) / 2;
  return (
    <>
      <svg style={{ position: 'absolute', left: 0, top: 0, width: 1, height: 1, overflow: 'visible', opacity: op }}>
        {row ? <line x1={p0} y1={mid} x2={p1} y2={mid} stroke={RED} strokeWidth={1.5} /> : <line x1={mid} y1={p0} x2={mid} y2={p1} stroke={RED} strokeWidth={1.5} />}
      </svg>
      <Chip x={row ? (p0 + p1) / 2 : mid} y={row ? mid : (p0 + p1) / 2} a={op} color={RED} center>
        {gap}
      </Chip>
    </>
  );
};

/** A repeated card: the finished master is alt-dragged to the copy's place, then the copy's own content is retyped. */
const CopyBlock: React.FC<{ b: Block; f: number }> = ({ b, f }) => {
  const m = b.src!;
  const t = f - b.t0;
  const u = E.smooth(clamp01(t / b.dur));
  const x = m.x + (b.x - m.x) * u;
  const y = m.y + (b.y - m.y) * u;
  const land = prog(t, b.dur - 1, b.dur + 8, E.out);
  const chrome = t < b.dur + 20 ? prog(t, -4, 0) * (1 - prog(t, b.dur + 6, b.dur + 20)) : 0;
  return (
    <>
      {land > 0 && <Cut src="bare" x={b.x} y={b.y} w={b.w} h={b.h} radius={b.radius} style={{ opacity: land }} />}
      {land < 1 && t >= 0 && (
        <div style={{ position: 'absolute', left: x - m.x, top: y - m.y, width: 0, height: 0, opacity: (1 - land) * 0.92 }}>
          <Cut src="page" x={m.x} y={m.y} w={m.w} h={m.h} radius={m.radius} style={{ boxShadow: '0 14px 30px rgba(15,18,30,0.18)' }} />
        </div>
      )}
      {chrome > 0.01 && (
        <>
          <div style={{ position: 'absolute', left: m.x, top: m.y, width: m.w, height: m.h, border: `1.5px solid ${RED}`, borderRadius: Math.min(m.radius, 4), opacity: chrome }} />
          <div style={{ position: 'absolute', left: x, top: y, width: b.w, height: b.h, border: `1.5px solid ${RED}`, borderRadius: Math.min(b.radius, 4), opacity: chrome }} />
          <Spacing a={m} c={{ x, y, w: b.w, h: b.h }} op={chrome} />
        </>
      )}
    </>
  );
};

// ---------------------------------------------------------------------------------------------
// text: typed with a caret; a headline is typed small in a fresh text box, then stepped up by its corner handle
// ---------------------------------------------------------------------------------------------
const TextBlock: React.FC<{ b: Block; f: number }> = ({ b, f }) => {
  const { plan } = useFilm();
  const t = f - b.t0;
  const u = clamp01(t / b.dur);
  const lh = b.h / b.lines;
  const end = b.dur + b.grow;
  const sel = t < end + 24 ? prog(t, -2, 2) * (1 - prog(t, end + 10, end + 24)) : 0;
  const sc = b.grow ? (t <= b.dur ? plan.growFrom(b) : plan.growAt(b, f)) : 1;
  const line = Math.min(b.lines - 1, Math.floor(u * b.lines));
  const caretX = b.x + b.w * sc * clamp01(u * b.lines - line);
  const pad = 2;
  const sw = b.w * sc;
  const sh = b.h * sc;
  return (
    <>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, transform: sc < 1 ? `translate(${b.x}px, ${b.y}px) scale(${sc}) translate(${-b.x}px, ${-b.y}px)` : undefined, transformOrigin: '0 0' }}>
        {Array.from({ length: b.lines }, (_, j) => {
          const lf = clamp01(u * b.lines - j);
          if (lf <= 0) return null;
          const y = b.y + j * lh - (j === 0 ? pad : 0);
          const h = lh + (j === 0 ? pad : 0) + (j === b.lines - 1 ? pad : 0);
          return <Cut key={j} src="page" x={b.x - pad} y={y} w={(b.w + 2 * pad) * (lf >= 1 ? 1 : lf)} h={h} />;
        })}
      </div>
      {sel > 0.01 && (
        <>
          <div style={{ position: 'absolute', left: b.x - 3, top: b.y - 3, width: sw + 6, height: sh + 6, border: `1.5px solid ${BLUE}`, opacity: sel }} />
          {b.grow > 0 && (
            <>
              <Handles x={b.x - 3} y={b.y - 3} w={sw + 6} h={sh + 6} a={sel} />
              <div style={{ position: 'absolute', left: b.x - 3, top: b.y + sh + 9, padding: '2px 5px', borderRadius: 3, background: BLUE, color: '#fff', font: `500 10px ${MONO}`, whiteSpace: 'nowrap', opacity: sel }}>{Math.round(b.size * sc)} px</div>
            </>
          )}
        </>
      )}
      {t >= 0 && u < 1 && <div style={{ position: 'absolute', left: caretX, top: b.y + (line * lh + lh * 0.1) * sc, width: Math.max(1.5, (b.size * sc) / 22), height: lh * 0.8 * sc, background: BLUE }} />}
    </>
  );
};

// ---------------------------------------------------------------------------------------------
// media: drag a placeholder, then sweep the picture in from the top
// ---------------------------------------------------------------------------------------------
const MediaBlock: React.FC<{ b: Block; f: number }> = ({ b, f }) => {
  const t = f - b.t0;
  if (b.instant) return <Cut src="page" x={b.x} y={b.y} w={b.w} h={b.h} style={{ opacity: prog(t, 0, 3) }} />;
  const d = b.drag ? E.smooth(clamp01(t / b.drag)) : 1;
  const sweep = E.inOut(clamp01((t - b.drag) / Math.max(1, b.dur - b.drag)));
  const ph = t < b.dur + 10 ? prog(t, -1, 1) * (1 - prog(t, b.dur, b.dur + 10)) : 0;
  const w = b.w * d;
  const h = b.h * d;
  return (
    <>
      {ph > 0.01 && (
        <>
          <div style={{ position: 'absolute', left: b.x, top: b.y, width: w, height: h, background: b.bgDark ? 'rgba(255,255,255,0.09)' : 'rgba(24,24,27,0.07)', border: `1.5px solid ${BLUE}`, opacity: ph }} />
          {b.drag > 0 && b.w > 40 && (
            <Chip x={b.x + w / 2} y={b.y + h + 7} a={ph * (1 - sweep)}>
              {Math.round(w)} × {Math.round(h)}
            </Chip>
          )}
        </>
      )}
      {sweep > 0 && (
        <>
          <Cut src="page" x={b.x} y={b.y} w={b.w} h={Math.max(1, b.h * sweep)} />
          {sweep < 1 && <div style={{ position: 'absolute', left: b.x, top: b.y + b.h * sweep - 1, width: b.w, height: 2, background: BLUE, boxShadow: `0 0 10px ${BLUE}` }} />}
        </>
      )}
    </>
  );
};

const Landing: React.FC<{ b: Block; f: number }> = ({ b, f }) => <Cut src="bare" x={b.x} y={b.y} w={b.w} h={b.h} radius={b.radius} style={{ opacity: prog(f - b.t0, 0, 3) }} />;

const BlockView: React.FC<{ b: Block; f: number }> = ({ b, f }) =>
  b.kind === 'frame' ? b.instant ? <Landing b={b} f={f} /> : <FrameBlock b={b} f={f} /> : b.kind === 'text' ? <TextBlock b={b} f={f} /> : <MediaBlock b={b} f={f} />;

const CLEAN = 12;

/** Scrolled page content, in page CSS px. */
export const PageLayer: React.FC<{ f: number }> = ({ f }) => {
  const { T, cap, plan } = useFilm();
  const sy = scrollAt(T, f);
  const vis = (y0: number, y1: number) => y1 > sy - 60 && y0 < sy + T.VIEW_H + 60;
  // bands of the page never seen being built are simply finished
  const bands: { y0: number; y1: number; si: number }[] = [];
  let y = 0;
  T.scenes.forEach((s, si) => {
    if (s.y0 > y) bands.push({ y0: y, y1: s.y0, si: -1 });
    if (s.y1 > s.y0) bands.push({ y0: s.y0, y1: s.y1, si });
    y = Math.max(y, s.y1);
  });
  if (y < cap.H) bands.push({ y0: y, y1: cap.H, si: -1 });
  const nav = cap.nav?.r;
  return (
    <>
      <Cut src="ground" x={0} y={Math.max(0, sy - 60)} w={cap.W} h={T.VIEW_H + 120} />
      {bands.map((band, j) => {
        if (!vis(band.y0, band.y1)) return null;
        const done = band.si < 0 ? -1 : T.scenes[band.si].doneAt;
        const a = band.si < 0 ? 1 : prog(f, done, done + CLEAN);
        const live = band.si >= 0 && f < done + CLEAN;
        const top = Math.max(band.y0, sy - 60);
        const bottom = Math.min(band.y1, sy + T.VIEW_H + 60);
        return (
          <React.Fragment key={j}>
            {live && plan.blocks.filter((b) => b.scene === band.si && !b.fixed && f >= b.t0 - 2 && vis(b.y, b.y + b.h)).map((b) => <BlockView key={b.i} b={b} f={f} />)}
            {a > 0 && bottom > top && <Cut src="page" x={0} y={top} w={cap.W} h={bottom - top} style={{ opacity: a }} />}
          </React.Fragment>
        );
      })}
      {/* the sticky nav lives in viewport space: keep its pixels out of the scrolled page */}
      {nav && sy < nav[1] + nav[3] + 40 && <Cut src="ground" x={Math.max(0, nav[0] - 30)} y={0} w={Math.min(cap.W, nav[2] + 60)} h={nav[1] + nav[3] + 30} />}
    </>
  );
};

/** The sticky nav, in viewport CSS px. */
export const NavLayer: React.FC<{ f: number }> = ({ f }) => {
  const { T, cap, plan } = useFilm();
  if (!cap.nav) return null;
  const done = T.scenes[0].doneAt;
  const a = prog(f, done, done + CLEAN);
  const [x, y, w, h] = cap.nav.r;
  return (
    <>
      {f < done + CLEAN && plan.blocks.filter((b) => b.fixed && f >= b.t0 - 2).map((b) => <BlockView key={b.i} b={b} f={f} />)}
      {a > 0 && <Cut src="page" x={x} y={y} w={w} h={h} radius={cap.nav.radius} style={{ opacity: a, boxShadow: '0 10px 30px rgba(15,18,30,0.08)' }} />}
    </>
  );
};
