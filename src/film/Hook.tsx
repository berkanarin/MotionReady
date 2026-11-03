import React from 'react';
import { Img } from 'remotion';
import { E, prog } from '../engine/anim';
import { SANS, useFilm } from './context';

/**
 * The hook: the swarm circles the product's mark on the empty page. On the drop the tile arcs into the nav, where
 * the same mark lands as the first finished block. The mark is cut from the capture itself (the nav's first picture);
 * pages without one get the title's first letter.
 */
export const Hook: React.FC<{ f: number }> = ({ f }) => {
  const { T, cap, cfg, plan, src } = useFilm();
  const logo = plan.logo;
  const land = logo ? logo.t0 : T.DROP + 8;
  if (f > land + 2) return null;
  const c0 = { x: T.win.x + T.win.w / 2, y: T.win.y + T.win.bar + (T.win.h - T.win.bar) / 2 };
  const c1 = logo ? plan.toScreen(logo.x + logo.w / 2, logo.y + logo.h / 2, f, true) : c0;
  const fly = prog(f, T.DROP - 6, land, E.inOut);
  const lift = Math.sin(Math.PI * fly) * 70;
  const x = c0.x + (c1.x - c0.x) * fly;
  const y = c0.y + (c1.y - c0.y) * fly - lift;
  const breathe = 1 + 0.03 * Math.sin(f / 9) * (1 - fly);
  const tile = 104 * (1 - fly) * breathe;
  const endSize = logo ? Math.max(logo.w, logo.h) * T.K : 0;
  const mark = (62 + (endSize - 62) * fly) * breathe;
  const enter = prog(f, 0, 14, E.out);
  const fade = logo ? 1 : 1 - fly;
  const letter = (cfg.end?.title ?? cap.title ?? cfg.name).trim().charAt(0).toLocaleUpperCase('tr');
  return (
    <>
      {tile > 1 && <div style={{ position: 'absolute', left: x - tile / 2, top: y - tile / 2, width: tile, height: tile, borderRadius: tile * 0.24, background: '#fff', boxShadow: `0 18px 40px rgba(15,18,30,${0.16 * (1 - fly)}), 0 0 0 1px rgba(15,18,30,0.06)`, opacity: enter * fade, transform: `scale(${0.8 + 0.2 * enter})` }} />}
      {logo ? (
        <div style={{ position: 'absolute', left: x - mark / 2, top: y - (mark * logo.h) / logo.w / 2, width: mark, height: (mark * logo.h) / logo.w, overflow: 'hidden', opacity: enter }}>
          <Img src={src.page} style={{ position: 'absolute', width: (cap.W * mark) / logo.w, height: (cap.H * mark) / logo.w, left: (-logo.x * mark) / logo.w, top: (-logo.y * mark) / logo.w, maxWidth: 'none' }} />
        </div>
      ) : (
        <div style={{ position: 'absolute', left: x - 40, top: y - 40, width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', font: `700 52px ${SANS}`, color: '#18181B', opacity: enter * fade }}>{letter}</div>
      )}
    </>
  );
};
