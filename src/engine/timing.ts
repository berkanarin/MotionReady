// Single source of timing and geometry for a project: film size, browser window, tempo grid, which page bands are
// built in which scene, the camera's scroll keys, the finale and the end card. Pure function of (config, capture);
// imported by the composition, the plan and the CLI (cues, checks).
import { endBeats } from './endTiming';
import type { Capture, Format, ProjectConfig } from './types';

export const SIZE: Record<Format, { W: number; H: number; mx: number; my: number }> = {
  landscape: { W: 1920, H: 1080, mx: 96, my: 36 },
  square: { W: 1080, H: 1080, mx: 60, my: 70 },
  portrait: { W: 1080, H: 1920, mx: 40, my: 120 },
};

export type Scene = { id: string; from: number; to: number; y0: number; y1: number; rest: number; restEnd: number; doneAt: number };
export type SKey = { f: number; y: number; whip?: boolean };

export type Timing = {
  fps: number;
  W: number;
  H: number;
  bpm: number;
  BAR: number;
  BEAT: number;
  DROP: number;
  bar: (k: number) => number;
  win: { x: number; y: number; w: number; h: number; bar: number };
  K: number;
  VIEW_H: number;
  MAX_SCROLL: number;
  navBottom: number;
  scenes: Scene[];
  scroll: SKey[];
  /** Frame the swarm presses the CTA (null without one). */
  press: number | null;
  ctaBlock: number | null;
  /** Gathering on the CTA starts here; after the last scene the swarm leaves the picture by `leave`. */
  gather: number;
  leave: number;
  endFrom: number;
  total: number;
};

const HEADLINE = 30; // px: text at least this big is treated as a section headline

export const computeTiming = (cfg: ProjectConfig, cap: Capture): Timing => {
  const format = cfg.format ?? 'landscape';
  const sz = SIZE[format];
  const fps = cfg.fps ?? 60;
  const bpm = cfg.bpm ?? 120;
  const BEAT = (60 / bpm) * fps;
  const BAR = BEAT * 4;
  const hookBeats = Math.max(2, Math.round(((cfg.hook ?? 2) * bpm) / 60));
  const DROP = Math.round(hookBeats * BEAT);
  const bar = (k: number) => Math.round(DROP + k * BAR);

  const barH = 48;
  const win = { x: sz.mx, y: sz.my, w: sz.W - 2 * sz.mx, h: sz.H - 2 * sz.my, bar: barH };
  const K = win.w / cap.W;
  const VIEW_H = (win.h - barH) / K;
  const MAX_SCROLL = Math.max(0, cap.H - VIEW_H);
  const navBottom = cap.nav ? cap.nav.r[1] + cap.nav.r[3] : 0;
  const clampY = (y: number) => Math.max(0, Math.min(MAX_SCROLL, Math.round(y)));

  // the CTA button (by its visible text)
  const ctaText = cfg.cta?.trim().toLocaleLowerCase('tr');
  // the same label often appears in the nav, the hero and the footer too: prefer a real button (text inside a small
  // framed surface), and of those the lowest one on the page
  const inButton = (r: number[]) => cap.blocks.some((f) => f.kind === 'frame' && f.r[2] * f.r[3] < 60000 && r[0] >= f.r[0] - 2 && r[1] >= f.r[1] - 2 && r[0] + r[2] <= f.r[0] + f.r[2] + 2 && r[1] + r[3] <= f.r[1] + f.r[3] + 2);
  const matches = ctaText ? cap.blocks.map((b, i) => ({ b, i })).filter(({ b }) => b.kind === 'text' && (b.text ?? '').trim().toLocaleLowerCase('tr') === ctaText) : [];
  const pool = matches.some(({ b }) => inButton(b.r)) ? matches.filter(({ b }) => inButton(b.r)) : matches;
  const ctaIdx = pool.length ? pool.reduce((best, m) => (m.b.r[1] > best.b.r[1] ? m : best)).i : -1;
  const ctaY = ctaIdx >= 0 ? cap.blocks[ctaIdx].r[1] : null;

  // which sections become scenes
  const big = cap.sections.filter((s) => s.r[3] >= 220);
  let picked: { id: string; r: number[]; bars: number }[];
  const per = cfg.barsPerScene ?? 1.5;
  if (Array.isArray(cfg.scenes) && cfg.scenes.length) {
    picked = cfg.scenes.map((s) => {
      const sec = cap.sections.find((x) => x.id === s.section);
      if (!sec) throw new Error(`Section "${s.section}" is not in the capture. Known: ${cap.sections.map((x) => x.id).join(', ')}`);
      return { id: sec.id, r: sec.r, bars: s.bars ?? per };
    });
  } else {
    const max = cfg.maxScenes ?? 6;
    let list = big.slice();
    // the first scene is always the top of the page
    if (!list.length || list[0].r[1] > VIEW_H * 0.6) list.unshift({ id: 'top', r: [0, 0, cap.W, Math.min(cap.H, VIEW_H)], dark: false });
    if (list.length > max) {
      const keep = new Set([list[0]]);
      const ctaSec = ctaY != null ? list.find((s) => ctaY >= s.r[1] && ctaY < s.r[1] + s.r[3]) : undefined;
      if (ctaSec) keep.add(ctaSec);
      const rest = list.filter((s) => !keep.has(s));
      const need = max - keep.size;
      for (let i = 0; i < need; i++) keep.add(rest[Math.floor((i * rest.length) / need)]);
      list = list.filter((s) => keep.has(s));
    }
    picked = list.map((s, i) => ({ id: s.id, r: s.r, bars: i === 0 ? Math.max(2, per) : per }));
  }

  const scenes: Scene[] = [];
  const scroll: SKey[] = [{ f: 0, y: 0 }];
  let cum = 0;
  let prevY1 = 0;
  picked.forEach((p, i) => {
    const [, sy, , sh] = p.r;
    const heads = cap.blocks.filter((b) => b.kind === 'text' && (b.size ?? 0) >= HEADLINE && b.r[1] >= sy && b.r[1] < sy + sh).sort((a, b) => a.r[1] - b.r[1]);
    const hy = heads.length ? heads[0].r[1] : sy + navBottom + 40;
    // rest so the headline sits clear of the sticky nav, then a slow drift that never pushes it under the nav
    const limit = hy - navBottom - 40;
    let rest = i === 0 ? 0 : clampY(Math.min(sy - 10, limit));
    // at the bottom of the page the camera cannot go lower: if that leaves another headline half under the sticky nav,
    // back up until it is clear, as long as this scene's own headline stays well inside the view
    if (i > 0) {
      const ownBottom = heads.length ? heads[0].r[1] + heads[0].r[3] : sy + 120;
      for (const h of cap.blocks.filter((b) => b.kind === 'text' && (b.size ?? 0) >= HEADLINE)) {
        const hit = h.r[1] < rest + navBottom + 20 && h.r[1] + h.r[3] > rest;
        const up = h.r[1] - navBottom - 40;
        if (hit && up < rest && ownBottom < up + VIEW_H - 20) rest = clampY(up);
      }
    }
    const restEnd = i === 0 ? 0 : clampY(rest + Math.max(0, Math.min(36, limit - rest)));
    const from = bar(cum);
    const to = bar(cum + p.bars);
    const y0 = i === 0 ? 0 : Math.max(prevY1, Math.max(sy, rest));
    // the band runs on to the next picked section, so loose rows between sections that this view shows get built too
    const nextY = i + 1 < picked.length ? picked[i + 1].r[1] : sy + sh;
    const y1 = Math.min(Math.max(sy + sh, nextY), restEnd + VIEW_H);
    scenes.push({ id: p.id, from, to, y0, y1: Math.max(y0, y1), rest, restEnd, doneAt: to - 8 });
    prevY1 = Math.max(prevY1, y1);
    if (i > 0) {
      scroll.push({ f: from - 8, y: scenes[i - 1].restEnd });
      scroll.push({ f: from + 24, y: rest, whip: true });
    }
    scroll.push({ f: to - 10, y: restEnd });
    cum += p.bars;
  });

  // finale: gather on the CTA (if it is in the last scene's view), press on a beat, leave; else just leave
  const last = scenes[scenes.length - 1];
  const ctaVisible = ctaY != null && ctaY >= last.restEnd + navBottom && ctaY < last.restEnd + VIEW_H - 20;
  let press: number | null = null;
  let gather: number;
  let leave: number;
  if (ctaVisible) {
    gather = last.to;
    press = Math.round(gather + BAR * 0.5);
    leave = press + 16;
    last.doneAt = press + 14;
    cum += 1;
  } else {
    gather = last.to;
    leave = last.to;
    cum += 0.5;
  }
  const endFrom = bar(cum);
  const total = endFrom + (cfg.end ? Math.round(endBeats(cfg.end.duration).dur * fps) : Math.round(0.5 * fps));
  scroll.push({ f: total, y: last.restEnd });
  return { fps, W: sz.W, H: sz.H, bpm, BAR, BEAT, DROP, bar, win, K, VIEW_H, MAX_SCROLL, navBottom, scenes, scroll, press, ctaBlock: ctaVisible ? ctaIdx : null, gather, leave, endFrom, total };
};

/** Camera scroll (page CSS px at the top of the viewport): whips between scenes, slow drifts inside them. */
export const scrollAt = (t: Timing, f: number) => {
  const S = t.scroll;
  if (f <= S[0].f) return S[0].y;
  for (let i = 1; i < S.length; i++) {
    const a = S[i - 1];
    const b = S[i];
    if (f > b.f) continue;
    const u = Math.max(0, Math.min(1, (f - a.f) / Math.max(1, b.f - a.f)));
    const e = b.whip ? (u < 0.5 ? 16 * u ** 5 : 1 - (-2 * u + 2) ** 5 / 2) : u < 0.5 ? 4 * u ** 3 : 1 - (-2 * u + 2) ** 3 / 2;
    return a.y + (b.y - a.y) * e;
  }
  return S[S.length - 1].y;
};
