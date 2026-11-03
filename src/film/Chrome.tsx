import React from 'react';
import { hitPulse, prog, E } from '../engine/anim';
import { scrollAt } from '../engine/timing';
import { BLUE, MONO, SANS, useFilm } from './context';
import { NavLayer, PageLayer } from './Page';

// Design-tool chrome over the page (guides, red content edges, top ruler) and the browser window around it.

const sceneEnv = (f: number, s: { from: number; doneAt: number }, first: boolean) => prog(f, s.from + (first ? 0 : 14), s.from + (first ? 10 : 26)) * (1 - prog(f, s.doneAt - 6, s.doneAt + 6));

const Guides: React.FC<{ f: number }> = ({ f }) => {
  const { T, cap, plan } = useFilm();
  const si = T.scenes.findIndex((s) => f >= s.from && f < s.doneAt + 12);
  if (si < 0) return null;
  const env = sceneEnv(f, T.scenes[si], si === 0);
  if (env <= 0.01) return null;
  const sy = scrollAt(T, f);
  const live = plan.blocks
    .filter((b) => b.scene === si && !b.fixed && f >= b.t0 - 2 && f <= b.t0 + b.dur + 26 && (b.kind === 'frame' || b.size >= 20))
    .sort((a, b) => b.t0 - a.t0)
    .slice(0, 6);
  // the page's content edges: the most common left and right edge of its text
  const texts = plan.blocks.filter((b) => b.kind === 'text' && b.size >= 14);
  const mode = (xs: number[]) => {
    const m = new Map<number, number>();
    for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  };
  const left = mode(texts.map((b) => b.x)) ?? 0;
  const right = cap.W - left;
  const top = sy - 20;
  const hgt = T.VIEW_H + 40;
  return (
    <svg style={{ position: 'absolute', left: 0, top: 0, width: cap.W, height: cap.H, overflow: 'visible', opacity: env }}>
      <line x1={left} y1={top} x2={left} y2={top + hgt} stroke="#EF4444" strokeWidth={1.6} />
      <line x1={right} y1={top} x2={right} y2={top + hgt} stroke="#EF4444" strokeOpacity={0.5} strokeWidth={1} />
      {live.map((b) => {
        const a = prog(f, b.t0 - 2, b.t0 + 4) * (1 - prog(f, b.t0 + b.dur + 12, b.t0 + b.dur + 26));
        return (
          <g key={b.i} opacity={a * 0.8}>
            <line x1={b.x} y1={top} x2={b.x} y2={top + hgt} stroke={BLUE} strokeWidth={1} />
            <line x1={b.x + b.w} y1={top} x2={b.x + b.w} y2={top + hgt} stroke={BLUE} strokeWidth={1} />
            <line x1={0} y1={b.y} x2={cap.W} y2={b.y} stroke={BLUE} strokeWidth={1} strokeDasharray="4 4" />
          </g>
        );
      })}
    </svg>
  );
};

/** Ruler along the top of the viewport with the live selection marked. */
const Ruler: React.FC<{ f: number }> = ({ f }) => {
  const { T, cap, plan } = useFilm();
  const si = T.scenes.findIndex((s) => f >= s.from && f < s.doneAt + 12);
  if (si < 0) return null;
  const env = sceneEnv(f, T.scenes[si], si === 0);
  if (env <= 0.01) return null;
  const cur = plan.blocks.filter((b) => b.scene === si && f >= b.t0 && f <= b.t0 + b.dur + 10).sort((a, b) => b.t0 - a.t0)[0];
  const step = cap.W > 900 ? 100 : 50;
  const ticks: React.ReactNode[] = [];
  for (let x = 0; x <= cap.W; x += 10) {
    const big = x % step === 0;
    ticks.push(<line key={x} x1={x} y1={big ? 4 : x % 50 === 0 ? 10 : 13} x2={x} y2={18} stroke="#A1A1AA" strokeWidth={1} />);
    if (big && x > 0)
      ticks.push(
        <text key={`t${x}`} x={x + 3} y={10} fill="#71717A" fontSize={8} fontFamily={MONO}>
          {x}
        </text>,
      );
  }
  return (
    <svg style={{ position: 'absolute', left: 0, top: 0, width: cap.W, height: 18, opacity: env }}>
      <rect x={0} y={0} width={cap.W} height={18} fill="rgba(250,250,251,0.94)" />
      {cur && <rect x={cur.x} y={0} width={cur.w} height={18} fill="rgba(59,130,246,0.18)" />}
      {ticks}
      <line x1={0} y1={17.5} x2={cap.W} y2={17.5} stroke="#E4E4E7" />
    </svg>
  );
};

const Toolbar: React.FC<{ address: string }> = ({ address }) => {
  const { T } = useFilm();
  const w = Math.min(600, T.win.w * 0.6);
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: T.win.w, height: T.win.bar, background: '#202124', display: 'flex', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: 8, marginLeft: 18 }}>
        {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => (
          <div key={c} style={{ width: 12, height: 12, borderRadius: 6, background: c }} />
        ))}
      </div>
      <div style={{ position: 'absolute', left: T.win.w / 2 - w / 2, top: 9, width: w, height: 30, borderRadius: 15, background: '#2E3034', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#E8EAED', font: `500 15px ${SANS}` }}>
        <svg width={12} height={14} viewBox="0 0 12 14">
          <rect x={1} y={6} width={10} height={7.5} rx={1.6} fill="#9AA0A6" />
          <path d="M3.2 6 V4.2 a2.8 2.8 0 0 1 5.6 0 V6" fill="none" stroke="#9AA0A6" strokeWidth={1.6} />
        </svg>
        {address}
      </div>
    </div>
  );
};

/** The browser window: always whole; only the page inside it scrolls (with vertical motion blur on whips). */
export const Browser: React.FC<{ f: number }> = ({ f }) => {
  const { T, cap, cfg } = useFilm();
  const sy = scrollAt(T, f);
  const vb = Math.min(16, (Math.abs(scrollAt(T, f + 1) - scrollAt(T, f - 1)) / 2) * 0.09);
  const kick = hitPulse(f - T.DROP, 2, 7);
  const drift = (f / T.fps) * 0.9;
  const settle = 1.035 - 0.035 * prog(f, 0, T.DROP + 40, E.cam);
  let address = cfg.address;
  if (!address) {
    try {
      address = /^https?:/.test(cap.url) ? new URL(cap.url).host.replace(/^www\./, '') : cfg.name;
    } catch {
      address = cfg.name;
    }
  }
  const fid = `mr-vblur-${cfg.name}`;
  return (
    <div
      style={{
        position: 'absolute',
        left: T.win.x,
        top: T.win.y,
        width: T.win.w,
        height: T.win.h,
        borderRadius: 14,
        overflow: 'hidden',
        background: '#F9FAFB',
        boxShadow: '0 40px 90px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08)',
        transform: `perspective(2600px) rotateX(${0.8 * Math.sin(drift)}deg) rotateY(${1.1 * Math.sin(drift * 0.7 + 1)}deg) scale(${settle * (1 + 0.012 * kick)})`,
      }}
    >
      <div style={{ position: 'absolute', left: 0, top: T.win.bar, width: T.win.w, height: T.win.h - T.win.bar, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: cap.W, height: cap.H, transform: `scale(${T.K}) translateY(${-sy}px)`, transformOrigin: '0 0', filter: vb > 0.3 ? `url(#${fid})` : undefined }}>
          <PageLayer f={f} />
          <Guides f={f} />
        </div>
        <div style={{ position: 'absolute', left: 0, top: 0, width: cap.W, height: T.VIEW_H, transform: `scale(${T.K})`, transformOrigin: '0 0' }}>
          <NavLayer f={f} />
          <Ruler f={f} />
        </div>
      </div>
      <Toolbar address={address} />
      <svg width={0} height={0} style={{ position: 'absolute' }}>
        <filter id={fid} x="0" y="-5%" width="100%" height="110%">
          <feGaussianBlur stdDeviation={`0 ${vb}`} />
        </filter>
      </svg>
    </div>
  );
};
