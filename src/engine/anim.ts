// Small, dependency-free motion helpers. Every function is pure: same frame in, same value out.

export type Ease = (t: number) => number;

const bezier = (x1: number, y1: number, x2: number, y2: number): Ease => {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const d = sx(t) - x;
      const dx = (3 * ax * t + 2 * bx) * t + cx;
      if (Math.abs(d) < 1e-5 || Math.abs(dx) < 1e-6) break;
      t -= d / dx;
    }
    return sy(Math.max(0, Math.min(1, t)));
  };
};

export const E = {
  out: bezier(0.16, 1, 0.3, 1), // arrivals, reveals
  in: bezier(0.7, 0, 0.84, 0), // departures
  inOut: bezier(0.87, 0, 0.13, 1), // camera whips
  smooth: bezier(0.65, 0, 0.35, 1), // drifts, drags
  cam: bezier(0.48, 0.1, 0, 0.9), // slow start, long settle
  linear: (t: number) => t,
};

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** 0..1 progress between two frames, eased. */
export const prog = (f: number, from: number, to: number, ease: Ease = E.out) => (to <= from ? (f >= to ? 1 : 0) : ease(clamp01((f - from) / (to - from))));

export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Attack-decay envelope for hits (presses, landings): peaks `attack` frames after t = 0. */
export const hitPulse = (t: number, attack = 2, tau = 5) => (t <= 0 || t > attack + 6 * tau ? 0 : t < attack ? Math.sin((t / attack) * (Math.PI / 2)) : Math.exp(-(t - attack) / tau));

/** Deterministic pseudo-random in [0, 1) from an integer seed. */
export const rand = (seed: number) => {
  let h = Math.imul(seed | 0, 2654435761);
  h ^= h >>> 16;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};
