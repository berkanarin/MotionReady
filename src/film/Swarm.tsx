import React from 'react';
import { hitPulse, prog } from '../engine/anim';
import { SANS, useFilm } from './context';

// The worker cursors: classic arrows in the swarm's colours, leaning at most 9° into their travel. A worker shows its
// tag only while it is working on a block; with nothing to do it leaves the browser window (see engine/plan.ts).

const Arrow: React.FC<{ color: string }> = ({ color }) => (
  <svg width={24} height={32} viewBox="0 0 30 42" style={{ position: 'absolute', left: -2.4, top: -1.6, overflow: 'visible' }}>
    <path d="M3 2 L3 33 L10.2 26.4 L15 38 L20.2 35.8 L15.4 24.4 L25 24.4 Z" fill={color} stroke="#fff" strokeWidth={2.6} strokeLinejoin="round" />
  </svg>
);

export const Swarm: React.FC<{ f: number }> = ({ f }) => {
  const { T, plan, cfg } = useFilm();
  const i = Math.max(0, Math.min(T.total, Math.round(f)));
  const scale = Math.min(T.W, T.H) / 1080;
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {plan.workers.map((w, k) => {
        const p = plan.pos[k];
        const x = p.x[i];
        const y = p.y[i];
        // outside the browser window a cursor fades out: it has left the page (the gathering before the end card is free)
        const out = f >= T.leave && f >= T.scenes[T.scenes.length - 1].to && cfg.end ? 0 : Math.max(T.win.x - x, x - (T.win.x + T.win.w), T.win.y - y, y - (T.win.y + T.win.h), 0);
        const inWin = Math.max(0, 1 - out / 50);
        if (inWin <= 0.01) return null;
        const busy = plan.busyWith(k, f);
        const tagA = busy && !busy.assist ? Math.min(prog(f, busy.t0 - 6, busy.t0 + 2), 1 - prog(f, busy.t1 + 2, busy.t1 + 8)) : 0;
        const press = Math.max(0, ...plan.presses[k].map((c) => hitPulse(f - c + 3, 3, 4)));
        const appear = prog(f, k * 0.6, k * 0.6 + 14);
        return (
          <div key={k} style={{ position: 'absolute', left: x, top: y, width: 0, height: 0, opacity: appear * inWin, transform: `rotate(${p.tilt[i]}deg) scale(${scale * (0.7 + 0.3 * appear) * (1 - 0.14 * press)})`, transformOrigin: '0 0', filter: 'drop-shadow(0 3px 5px rgba(8,10,20,0.35))' }}>
            <Arrow color={w.color} />
            {tagA > 0.01 && (
              <div style={{ position: 'absolute', left: 17, top: 26, padding: '3px 8px', borderRadius: 6, background: w.color, color: '#fff', font: `600 13px ${SANS}`, whiteSpace: 'nowrap', opacity: tagA, transform: `scale(${0.85 + 0.15 * tagA})`, transformOrigin: '0 0' }}>
                {w.tag}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
