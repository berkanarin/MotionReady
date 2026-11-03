// The build plan: which block is built when, by which cursor, and where every cursor is on every frame.
// Computed once per project, deterministically, from the capture and the timing.
import { E, prog, rand } from './anim';
import { scrollAt, Timing } from './timing';
import type { Capture, ProjectConfig } from './types';

export type Block = {
  i: number;
  kind: 'frame' | 'media' | 'text';
  x: number;
  y: number;
  w: number;
  h: number;
  radius: number;
  size: number;
  lines: number;
  text: string;
  dark: boolean; // frame with a dark fill
  bgDark: boolean; // sits on a dark background
  fixed: boolean; // inside the sticky nav: drawn in viewport space
  scene: number; // index into timing.scenes, -1 = never seen being built (shown finished)
  t0: number;
  dur: number; // drag / typing / sweep length
  grow: number; // headlines: frames of the step-up after typing
  drag: number; // media: frames of the placeholder drag before the picture sweeps in
  src: Block | null; // repeated card: the master it is alt-dragged from
  instant: boolean; // arrives without a build of its own
  worker: number;
};

type Task = { b: Block; t0: number; t1: number; assist?: number };

export type Plan = {
  blocks: Block[];
  copies: Block[];
  logo: Block | null; // the nav's first picture: the hook's logo tile lands on it
  cta: Block | null;
  workers: { color: string; tag: string }[];
  pos: { x: Float32Array; y: Float32Array; tilt: Float32Array }[];
  busyWith: (k: number, f: number) => Task | null;
  presses: number[][];
  growAt: (b: Block, f: number) => number;
  growFrom: (b: Block) => number;
  endOf: (b: Block) => number;
  toScreen: (px: number, py: number, f: number, fixed?: boolean) => { x: number; y: number };
};

export const GROW_STEPS = 8;
export const GROW_STEP = 3;
const HEADLINE = 30;

export const DEFAULT_PALETTE = ['#3B82F6', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1', '#14B8A6'];
export const DEFAULT_TAGS = ['Düzen', 'Metin', 'Renk', 'Görsel', 'Izgara', 'Boşluk', 'İkon', 'Buton', 'Kart', 'Başlık', 'Hizalama', 'Gölge', 'Tipografi', 'Bileşen'];

const cache = new Map<string, Plan>();

export const getPlan = (key: string, cfg: ProjectConfig, cap: Capture, T: Timing): Plan => {
  const hit = cache.get(key);
  if (hit) return hit;
  const p = makePlan(cfg, cap, T);
  cache.set(key, p);
  return p;
};

const makePlan = (cfg: ProjectConfig, cap: Capture, T: Timing): Plan => {
  const toScreen = (px: number, py: number, f: number, fixed = false) => ({
    x: T.win.x + px * T.K,
    y: T.win.y + T.win.bar + (py - (fixed ? 0 : scrollAt(T, f))) * T.K,
  });

  // ------------------------------------------------------------------------------------------- blocks
  const nav = cap.nav?.r;
  const inNav = (r: number[]) => !!nav && r[1] >= nav[1] - 2 && r[1] + r[3] <= nav[1] + nav[3] + 2 && r[0] >= nav[0] - 2 && r[0] + r[2] <= nav[0] + nav[2] + 2;
  // i is the block's index in capture/blocks.json (timing refers to blocks by it, e.g. the CTA)
  const blocks: Block[] = cap.blocks
    .map((b, i) => ({ b, i }))
    .filter(({ b }) => b.r[2] >= 6 && b.r[3] >= 6 && b.r[0] >= 0 && b.r[0] + b.r[2] <= cap.W + 1)
    .map(({ b, i }) => {
      const kind = b.kind === 'text' && !(b.text ?? '').trim() ? 'media' : b.kind;
      const fixed = inNav(b.r);
      const cy = b.r[1] + b.r[3] / 2;
      const scene = fixed ? 0 : T.scenes.findIndex((s) => cy >= s.y0 && cy < s.y1);
      return {
        i,
        kind,
        x: b.r[0],
        y: b.r[1],
        w: b.r[2],
        h: b.r[3],
        radius: b.radius ?? 0,
        size: b.size ?? 14,
        lines: Math.max(1, b.lines ?? 1),
        text: b.text ?? '',
        dark: !!b.dark,
        bgDark: !!b.bgDark,
        fixed,
        scene,
        t0: -1e5,
        dur: 0,
        grow: 0,
        drag: 0,
        src: null as Block | null,
        instant: false,
        worker: -1,
      };
    });
  const inside = (b: Block, c: Block) => b !== c && b.x + b.w / 2 >= c.x && b.x + b.w / 2 <= c.x + c.w && b.y + b.h / 2 >= c.y && b.y + b.h / 2 <= c.y + c.h;

  // the hook's logo tile flies into the nav's first picture on the drop (no nav: the captured top-band mark)
  const lr = cap.logo?.r;
  const logo =
    blocks.filter((b) => b.fixed && b.kind === 'media').sort((a, b) => a.x - b.x)[0] ??
    (lr ? blocks.find((b) => b.kind === 'media' && b.scene === 0 && b.x === lr[0] && b.y === lr[1] && b.w === lr[2] && b.h === lr[3]) : undefined) ??
    null;
  if (logo) {
    logo.instant = true;
    logo.t0 = T.DROP + 12;
    logo.dur = 2;
  }
  const cta = T.ctaBlock != null ? blocks.find((b) => b.i === T.ctaBlock) ?? null : null;

  // repeated cards (same size and fill, sharing a row or a column): the first is built, the rest are alt-dragged copies
  {
    const cards = blocks.filter((b) => b.kind === 'frame' && b.scene >= 0 && !b.fixed && b.w * b.h >= 5000 && b.w >= 60 && b.h >= 30);
    const used = new Set<Block>();
    for (const m of cards.sort((a, b) => a.y - b.y || a.x - b.x)) {
      if (used.has(m)) continue;
      const twins = cards.filter(
        (c) => c !== m && !used.has(c) && c.scene === m.scene && c.dark === m.dark && Math.abs(c.w - m.w) <= 3 && Math.abs(c.h - m.h) <= 3 && (Math.abs(c.y - m.y) <= 3 || Math.abs(c.x - m.x) <= 3) && !inside(c, m) && !inside(m, c),
      );
      if (!twins.length) continue;
      used.add(m);
      for (const c of twins) {
        c.src = m;
        used.add(c);
      }
    }
    // cards inside a copy arrive with it
    for (const c of blocks.filter((b) => b.src))
      for (const x of blocks)
        if (x.kind === 'frame' && inside(x, c)) {
          x.src = null;
          x.instant = true;
        }
  }

  // ------------------------------------------------------------------------------------------- workers
  const N = Math.max(8, Math.min(80, cfg.cursors ?? 44));
  const palette = cfg.palette?.length ? cfg.palette : DEFAULT_PALETTE;
  const tags = cfg.tags?.length ? cfg.tags : DEFAULT_TAGS;
  const workers = Array.from({ length: N }, (_, i) => ({ color: palette[i % palette.length], tag: tags[i % tags.length] }));
  const tasks: Task[][] = Array.from({ length: N }, () => []);

  const growFrom = (b: Block) => Math.max(0.26, 22 / b.size);
  const endOf = (b: Block) => b.t0 + b.dur + b.grow;
  const typeDur = (b: Block) => {
    const chars = Math.max(b.text.length, (b.w / (b.size * 0.52)) * b.lines);
    return b.size >= HEADLINE ? Math.round(Math.min(30, Math.max(18, chars * 0.9))) : Math.round(Math.min(34, Math.max(8, chars * 0.45)));
  };
  const dragDur = (b: Block) => Math.round(Math.min(30, Math.max(12, 12 + Math.sqrt(b.w * b.h) / 30)));
  const containerOf = (b: Block, frames: Block[]) => {
    let best: Block | null = null;
    for (const c of frames) if (inside(b, c) && (!best || c.w * c.h < best.w * best.h)) best = c;
    return best;
  };

  const free = Array.from({ length: N }, () => ({ at: T.DROP - 2, x: cap.W / 2, y: 400 }));
  T.scenes.forEach((s, si) => {
    const bs = s.from + (si === 0 ? 2 : 20);
    const be = si === T.scenes.length - 1 && T.press != null ? T.gather - 20 : s.to - 20;
    const span = Math.max(30, be - bs);
    const mine = blocks.filter((b) => b.scene === si && !b.instant);
    const landing = blocks.filter((b) => b.scene === si && b.instant && b !== logo);
    const frames = mine.filter((b) => b.kind === 'frame').sort((a, b) => a.y - b.y || b.w * b.h - a.w * a.h);
    const contents = mine.filter((b) => b.kind !== 'frame').sort((a, b) => a.y - b.y || a.x - b.x);
    const all = [...frames, ...contents];
    const want = new Map<Block, number>();
    frames.forEach((b, j) => {
      b.dur = b.src ? Math.round(Math.min(24, Math.max(14, 14 + Math.hypot(b.x - b.src.x, b.y - b.src.y) / 60))) : dragDur(b);
      want.set(b, bs + span * 0.45 * (j / Math.max(1, frames.length)) + rand(b.i * 7) * 4);
    });
    contents.forEach((b, j) => {
      if (b.kind === 'text') {
        b.dur = typeDur(b);
        b.grow = b.size >= HEADLINE ? GROW_STEPS * GROW_STEP : 0;
      } else {
        b.drag = Math.round(Math.min(18, Math.max(6, 6 + Math.sqrt(b.w * b.h) / 40)));
        b.dur = b.drag + Math.round(Math.min(22, Math.max(8, 8 + b.h / 30)));
      }
      // the section's headline is written first, right on the arrival
      want.set(b, b.kind === 'text' && b.size >= HEADLINE ? bs + 6 : bs + span * (0.12 + 0.8 * (j / Math.max(1, contents.length))) + rand(b.i * 11) * 6);
    });
    // a master and its contents are built early so the copies have time to be dragged off it
    const masters = frames.filter((m) => frames.some((c) => c.src === m));
    for (const x of all) if (masters.some((m) => m === x || inside(x, m))) want.set(x, bs + (want.get(x)! - bs) * 0.35);
    const inCopy = (b: Block) => !!b.src || frames.some((c) => c.src && inside(b, c));
    for (const b of contents) {
      if (!inCopy(b)) continue;
      if (b.kind === 'text') b.dur = Math.max(6, Math.round(b.dur * 0.6)); // retyped quickly
      else {
        b.drag = 0; // a copied picture is swapped in place
        b.dur = 12;
      }
    }
    const byWant = (a: Block, b: Block) => want.get(a)! - want.get(b)!;
    const order = [...all.filter((b) => !inCopy(b)).sort(byWant), ...all.filter(inCopy).sort(byWant)];
    for (const b of order) {
      let ds = want.get(b)!;
      const c = containerOf(b, frames);
      if (c && c.t0 > -1e4) ds = Math.max(ds, c.t0 + c.dur + 2);
      if (b.src) {
        const m = b.src;
        ds = Math.max(ds, Math.max(endOf(m), ...mine.filter((x) => inside(x, m) && x.t0 > -1e4).map(endOf)) + 4);
      }
      const gx = b.src ? b.src.x : b.x;
      const gy = b.src ? b.src.y : b.y;
      let best = 0;
      let bestCost = Infinity;
      for (let k = 0; k < N; k++) {
        const d = Math.hypot(free[k].x - gx, free[k].y - gy);
        const cost = Math.max(0, free[k].at + 10 + d / 70 - ds) * 3 + d / 60 + tasks[k].length * 2.2 + rand(k * 13 + b.i) * 2;
        if (cost < bestCost) {
          bestCost = cost;
          best = k;
        }
      }
      const d = Math.hypot(free[best].x - gx, free[best].y - gy);
      b.t0 = Math.round(Math.max(ds, free[best].at + 10 + d / 70));
      b.worker = best;
      tasks[best].push({ b, t0: b.t0, t1: endOf(b) });
      free[best] = { at: endOf(b) + 4, x: b.x + b.w, y: b.y + b.h };
      // big pieces get helpers on their edges
      const helpers = (b.kind === 'text' && b.size >= HEADLINE) || (b.kind === 'frame' && !b.src && b.w * b.h > 90000) ? 2 : 0;
      for (let hN = 0, k = 0; hN < helpers && k < N; k++) {
        const q = (best + 1 + k * 7) % N;
        if (q === best || free[q].at > b.t0 - 8) continue;
        tasks[q].push({ b, t0: b.t0, t1: endOf(b) + 10, assist: hN + 1 });
        free[q] = { at: endOf(b) + 14, x: b.x + b.w, y: b.y };
        hN++;
      }
    }
    for (const x of landing) {
      const c = frames.find((m) => m.src && inside(x, m));
      x.t0 = c ? c.t0 + c.dur : s.from;
      x.dur = 2;
    }
  });
  tasks.forEach((l) => l.sort((a, b) => a.t0 - b.t0));

  const growAt = (b: Block, f: number) => {
    const s0 = growFrom(b);
    const t = f - b.t0 - b.dur;
    if (t <= 0) return s0;
    const k = Math.min(GROW_STEPS, Math.floor(t / GROW_STEP) + 1);
    const within = Math.min(1, (t - (k - 1) * GROW_STEP) / 2);
    const prev = s0 + ((1 - s0) * (k - 1)) / GROW_STEPS;
    const next = s0 + ((1 - s0) * k) / GROW_STEPS;
    return prev + (next - prev) * E.out(within);
  };

  // ------------------------------------------------------------------------------------------- motion
  const W = T.win;
  const home = (_f: number) => ({ x: W.x + W.w / 2, y: W.y + W.bar + (W.h - W.bar) / 2 });
  const clampIn = (x: number, y: number) => ({ x: Math.max(W.x + 24, Math.min(W.x + W.w - 40, x)), y: Math.max(W.y + W.bar + 30, Math.min(W.y + W.h - 44, y)) });
  const CLICKER = 0;

  const targetAt = (k: number, f: number): { x: number; y: number; stiff: boolean } => {
    const ang0 = rand(k * 17 + 3) * Math.PI * 2;
    // finale: gather on the CTA, one press, then everyone leaves
    if (f >= T.leave && f >= T.scenes[T.scenes.length - 1].to && cfg.end) {
      // with an end card the swarm does not leave: it closes in on the middle, where the end card spins it up
      const t = f - T.leave;
      const rr = (60 + rand(k * 5 + 1) * 220) * (1 - 0.5 * prog(t, 0, T.endFrom - T.leave + 20, E.smooth));
      const a = ang0 + f * 0.06 * (k % 2 ? 1 : -1);
      return { x: T.W / 2 + Math.cos(a) * rr * 1.3, y: T.H * 0.45 + Math.sin(a) * rr * 0.5, stiff: false };
    }
    if (f >= T.leave && f >= T.scenes[T.scenes.length - 1].to) {
      const c = cta ? toScreen(cta.x + cta.w / 2, cta.y + cta.h / 2, f) : home(f);
      const t = Math.max(0, f - T.leave - k * 0.9);
      const out = t > 0 ? 1500 * (T.W / 1920) + 300 : 0;
      return { x: c.x + Math.cos(ang0) * (60 + out), y: c.y + Math.sin(ang0) * (40 + out) - (t > 0 ? 200 : 0), stiff: false };
    }
    if (cta && T.press != null && f >= T.gather - 10) {
      const c = toScreen(cta.x + cta.w / 2, cta.y + cta.h / 2, f);
      if (k === CLICKER && f >= T.press - 34) return { x: c.x + 6, y: c.y + 4, stiff: true };
      const rr = 50 + rand(k * 5 + 1) * 120;
      const a = ang0 + f * 0.035 * (k % 2 ? 1 : -1);
      return { ...clampIn(c.x + Math.cos(a) * rr * 1.5, c.y + Math.sin(a) * rr * 0.7), stiff: false };
    }
    for (const t of tasks[k]) {
      if (f > t.t1) continue;
      if (f < t.t0 - 48) break;
      const b = t.b;
      const s = (px: number, py: number) => toScreen(px, py, f, b.fixed);
      if (t.assist) {
        const u = Math.max(0, Math.min(1, (f - t.t0) / Math.max(1, t.t1 - t.t0)));
        return { ...(t.assist === 1 ? s(b.x + b.w + 14, b.y + b.h * (0.2 + 0.6 * u)) : s(b.x + b.w * (0.15 + 0.7 * u), b.y + b.h + 16)), stiff: false };
      }
      const u = Math.max(0, Math.min(1, (f - t.t0) / Math.max(1, b.dur)));
      if (b.src) {
        const g = { x: b.src.x + Math.min(b.src.w * 0.4, 70), y: b.src.y + Math.min(b.src.h * 0.4, 30) };
        const e = E.smooth(u);
        return { ...s(g.x + (b.x - b.src.x) * e, g.y + (b.y - b.src.y) * e), stiff: true };
      }
      if (f < t.t0) {
        // arrived early: hover over the start point like a hand on a mouse, never frozen
        const w = (t.t0 - f) / 48;
        return { ...s(b.x + Math.cos(f * 0.21 + k) * 9 * w, b.y + Math.sin(f * 0.17 + k * 2) * 6 * w), stiff: true };
      }
      if (b.kind === 'frame') return { ...s(b.x + b.w * E.smooth(u), b.y + b.h * E.smooth(u)), stiff: true };
      if (b.kind === 'media') {
        const d = E.smooth(Math.min(1, (f - t.t0) / Math.max(1, b.drag)));
        return { ...s(b.x + b.w * d, b.y + b.h * d), stiff: true };
      }
      if (b.grow && f > t.t0 + b.dur) {
        const g = growAt(b, f);
        return { ...s(b.x + b.w * g, b.y + b.h * g), stiff: true };
      }
      const sc = b.grow ? growFrom(b) : 1;
      const line = Math.min(b.lines - 1, Math.floor(u * b.lines));
      const lu = u * b.lines - line;
      return { ...s(b.x + b.w * sc * Math.min(1, lu) + 4, b.y + ((b.h * sc) / b.lines) * (line + 0.8)), stiff: true };
    }
    // nothing to do soon: after the hook a cursor never idles in the picture. It leaves by the nearest side and comes
    // back for its next task (the loop above brings it in from there).
    if (f >= T.DROP) {
      let lx = k % 2 ? W.x : W.x + W.w; // no task yet: alternate sides
      let ly = W.y + W.h / 2;
      for (const t of tasks[k]) {
        if (t.t1 >= f) break;
        const p = toScreen(t.b.x + t.b.w / 2, t.b.y + t.b.h / 2, t.t1, t.b.fixed);
        lx = p.x;
        ly = p.y;
      }
      const left = lx < W.x + W.w / 2;
      return { x: left ? W.x - 140 : W.x + W.w + 140, y: W.y + 60 + (W.h - 120) * (0.5 * rand(k * 7) + 0.5 * Math.max(0, Math.min(1, (ly - W.y) / W.h))), stiff: false };
    }
    // the hook: orbit the logo
    const hm = home(f);
    const hook = f < T.DROP ? 1 - 0.6 * prog(f, T.DROP - 42, T.DROP - 4, E.in) : 1;
    const rr = (40 + rand(k * 5 + 1) * 150) * hook;
    const a = ang0 + f * (0.022 + rand(k * 3) * 0.03) * (k % 2 ? 1 : -1);
    return { ...clampIn(hm.x + Math.cos(a) * rr * 1.15, hm.y + Math.sin(a) * rr * 0.75), stiff: false };
  };

  const F_N = T.total + 1;
  const BUSY = tasks.map((l) => {
    const a = new Uint8Array(F_N);
    for (const t of l) for (let f = Math.max(0, t.t0 - 4); f <= Math.min(F_N - 1, t.t1 + 6); f++) a[f] = 1;
    return a;
  });
  const pos = Array.from({ length: N }, () => ({ x: new Float32Array(F_N), y: new Float32Array(F_N), tilt: new Float32Array(F_N) }));
  const st = Array.from({ length: N }, (_, k) => {
    const t = targetAt(k, 0);
    return { x: t.x, y: t.y, vx: 0, vy: 0, svx: 0, tilt: 0 };
  });
  for (let f = 0; f < F_N; f++) {
    for (let k = 0; k < N; k++) {
      const t = targetAt(k, f);
      const w = t.stiff ? 0.34 : 0.17; // critically damped spring toward the target
      const s = st[k];
      s.vx += (t.x - s.x) * w * w - s.vx * 2 * w;
      s.vy += (t.y - s.y) * w * w - s.vy * 2 * w;
      s.x += s.vx;
      s.y += s.vy;
    }
    for (let a = 0; a < N; a++) {
      if (BUSY[a][f]) continue;
      for (let b = a + 1; b < N; b++) {
        const dx = st[b].x - st[a].x;
        const dy = st[b].y - st[a].y;
        const d = Math.hypot(dx, dy);
        if (d > 0.01 && d < 30) {
          const p = ((30 - d) / 30) * 1.2;
          st[a].x -= (dx / d) * p;
          st[a].y -= (dy / d) * p;
          st[b].x += (dx / d) * p;
          st[b].y += (dy / d) * p;
        }
      }
    }
    for (let k = 0; k < N; k++) {
      const s = st[k];
      s.svx += (s.vx - s.svx) * 0.08;
      s.tilt += (Math.max(-9, Math.min(9, s.svx * 0.45)) - s.tilt) * 0.12; // lean into travel, at most 9°
      pos[k].x[f] = s.x;
      pos[k].y[f] = s.y;
      pos[k].tilt[f] = s.tilt;
    }
  }
  const presses = tasks.map((l, k) => {
    const p = l.filter((t) => !t.assist && (t.b.kind === 'frame' || t.b.kind === 'media')).map((t) => t.t0);
    if (k === CLICKER && T.press != null) p.push(T.press);
    return p;
  });
  const busyWith = (k: number, f: number) => tasks[k].find((t) => f >= t.t0 - 4 && f <= t.t1 + 6) ?? null;
  return { blocks, copies: blocks.filter((b) => b.src), logo, cta, workers, pos, busyWith, presses, growAt, growFrom, endOf, toScreen };
};
