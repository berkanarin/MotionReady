// Soundtrack for a project: interface SFX synthesised on the build's own sync points (no sample files needed), plus
// your music (optional, projects/<name>/audio/) placed so its drop lands on the film's drop and ducked under accents.
// Mastered by ffmpeg's loudnorm to -14 LUFS / -1.5 dBTP. Writes projects/<name>/out/soundtrack.wav + cues.json.
// Usage: npx tsx scripts/audio.ts <project>
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { END } from '../src/engine/endTiming';
import { GROW_STEP, GROW_STEPS, getPlan } from '../src/engine/plan';
import { computeTiming } from '../src/engine/timing';
import type { Capture, ProjectConfig } from '../src/engine/types';

const SR = 48000;
const name = process.argv[2];
if (!name) throw new Error('usage: npx tsx scripts/audio.ts <project>');
const dir = join(process.cwd(), 'projects', name);
const cfg: ProjectConfig = { name, ...JSON.parse(readFileSync(join(dir, 'project.json'), 'utf8')) };
const cap: Capture = JSON.parse(readFileSync(join(dir, 'capture', 'blocks.json'), 'utf8'));
const T = computeTiming(cfg, cap);
const plan = getPlan(name, cfg, cap, T);
const out = join(dir, 'out');
mkdirSync(out, { recursive: true });

// ------------------------------------------------------------------------------------------- cues
type Cue = { f: number; kind: string; pan: number; i?: number };
const cues: Cue[] = [];
const panOf = (x: number) => Math.max(-0.8, Math.min(0.8, (x - T.W / 2) / (T.W / 2)));
const pushThin = (list: Cue[], gap: number) => {
  let last = -1e9;
  for (const c of list.sort((a, b) => a.f - b.f))
    if (c.f - last >= gap) {
      cues.push(c);
      last = c.f;
    }
};
const built = plan.blocks.filter((b) => b.scene >= 0);
const sx = (b: (typeof built)[number], f: number) => panOf(plan.toScreen(b.x + b.w / 2, b.y, f, b.fixed).x);
for (let j = 0; j < 7; j++) cues.push({ f: Math.round(6 + (j * (T.DROP - 20)) / 7), kind: 'blip', pan: ((j % 3) - 1) * 0.3, i: j });
cues.push({ f: T.DROP - 6, kind: 'whoosh', pan: -0.3 });
cues.push({ f: T.DROP, kind: 'drop', pan: 0 });
if (plan.logo) cues.push({ f: plan.logo.t0, kind: 'pop', pan: -0.6, i: 6 });
pushThin(built.filter((b) => b.kind === 'frame' && !b.src && b.w * b.h > 6000).map((b) => ({ f: b.t0 + b.dur, kind: 'pop', pan: sx(b, b.t0), i: b.i })), 7);
pushThin(built.filter((b) => b.kind === 'text' && !b.grow).map((b) => ({ f: b.t0, kind: 'key', pan: sx(b, b.t0) })), 5);
for (const b of built.filter((x) => x.grow > 0)) for (let k = 0; k < GROW_STEPS; k++) cues.push({ f: b.t0 + b.dur + k * GROW_STEP, kind: 'step', pan: sx(b, b.t0), i: k });
for (const b of plan.copies) cues.push({ f: b.t0 + b.dur, kind: 'land', pan: sx(b, b.t0 + b.dur) });
pushThin(built.filter((b) => b.kind === 'media' && b.drag > 0 && b.w * b.h > 20000).map((b) => ({ f: b.t0 + b.drag, kind: 'sweep', pan: sx(b, b.t0) })), 10);
for (const k of T.scroll.filter((s) => s.whip)) cues.push({ f: k.f - 14, kind: 'whoosh', pan: 0 });
if (T.press != null) {
  cues.push({ f: T.press, kind: 'click', pan: 0.2 });
  cues.push({ f: T.press + 4, kind: 'chime', pan: 0.2 });
}
if (cfg.end) {
  const at = (sec: number) => Math.round(T.endFrom + sec * T.fps);
  cues.push({ f: at(END.vortex + 0.1), kind: 'swirl', pan: 0 });
  for (let k = 0; k < 8; k++) cues.push({ f: at(END.form + 0.15 + k * 0.07), kind: 'step', pan: ((k % 3) - 1) * 0.3, i: k });
  cues.push({ f: at(END.reveal), kind: 'hit', pan: 0 });
  cues.push({ f: at(END.lock + 0.3), kind: 'shine', pan: 0 });
}
cues.sort((a, b) => a.f - b.f);
writeFileSync(join(out, 'cues.json'), JSON.stringify({ fps: T.fps, bpm: T.bpm, drop: T.DROP, total: T.total, cues }, null, 1));

// ------------------------------------------------------------------------------------------- synthesis
let seed = 12345;
const noise = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2147483648 - 1;
};
const len = (s: number) => Math.round(s * SR);
const tone = (f0: number, f1: number, dur: number, dec: number, shape: 'sine' | 'tri' = 'sine') => {
  const n = len(dur);
  const x = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = f1 + (f0 - f1) * Math.exp(-t / (dur * 0.25));
    ph += (2 * Math.PI * f) / SR;
    const s = shape === 'sine' ? Math.sin(ph) : (2 / Math.PI) * Math.asin(Math.sin(ph));
    x[i] = s * Math.exp(-t / dec) * Math.min(1, i / 40);
  }
  return x;
};
const click = (dur = 0.012, hp = 0.85) => {
  const n = len(dur);
  const x = new Float32Array(n);
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const w = noise();
    x[i] = (w - prev * hp) * Math.exp(-i / (n * 0.25));
    prev = w;
  }
  return x;
};
const whooshSig = (dur: number) => {
  const n = len(dur);
  const x = new Float32Array(n);
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const u = i / n;
    const a = 0.02 + 0.25 * Math.sin(Math.PI * u) ** 2; // the filter opens and closes
    lp += (noise() - lp) * a;
    x[i] = lp * Math.sin(Math.PI * u) ** 1.5 * 2.2;
  }
  return x;
};
const add = (...parts: Float32Array[]) => {
  const n = Math.max(...parts.map((p) => p.length));
  const x = new Float32Array(n);
  for (const p of parts) for (let i = 0; i < p.length; i++) x[i] += p[i];
  return x;
};
const gain = (x: Float32Array, g: number) => x.map((v) => v * g) as Float32Array;
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16];
const note = (base: number, step: number) => base * 2 ** (PENTA[step % PENTA.length] / 12);

const voice = (c: Cue): Float32Array => {
  switch (c.kind) {
    case 'blip':
      return gain(tone(note(880, c.i ?? 0), note(880, c.i ?? 0), 0.12, 0.05), 0.18);
    case 'pop':
      return gain(tone(note(620, (c.i ?? 0) % 5) * 1.6, note(620, (c.i ?? 0) % 5), 0.09, 0.03), 0.22);
    case 'key':
      return gain(add(click(0.01, 0.7), gain(tone(2400, 1800, 0.02, 0.006), 0.3)), 0.12);
    case 'step':
      return gain(tone(note(520, c.i ?? 0) * 2, note(520, c.i ?? 0) * 2, 0.06, 0.02, 'tri'), 0.14);
    case 'land':
      return gain(add(tone(180, 90, 0.16, 0.06), gain(tone(900, 700, 0.08, 0.025), 0.5)), 0.3);
    case 'sweep':
      return gain(whooshSig(0.35), 0.07);
    case 'whoosh':
      return gain(whooshSig(0.5), 0.16);
    case 'swirl':
      return gain(whooshSig(1.6), 0.13); // the tornado spinning up
    case 'drop':
      return gain(add(tone(120, 42, 0.5, 0.18), gain(whooshSig(0.3), 0.4)), 0.55);
    case 'click':
      return gain(add(click(0.008, 0.6), gain(click(0.02, 0.95), 0.4)), 0.5);
    case 'chime':
      return gain(add(tone(note(660, 4), note(660, 4), 0.6, 0.25), tone(note(660, 7), note(660, 7), 0.6, 0.22)), 0.16);
    case 'hit':
      return gain(add(tone(note(330, 0), note(330, 0), 1.6, 0.5), tone(note(330, 4), note(330, 4), 1.6, 0.45), tone(note(330, 7), note(330, 7), 1.6, 0.4), tone(90, 45, 0.5, 0.2)), 0.3);
    case 'shine': {
      const parts = [0, 2, 4, 5].map((s, j) => {
        const p = tone(note(990, s), note(990, s), 0.5, 0.18);
        const d = new Float32Array(len(0.07 * j) + p.length);
        d.set(p, len(0.07 * j));
        return d;
      });
      return gain(add(...parts), 0.12);
    }
  }
  return new Float32Array(1);
};

const N = len(T.total / T.fps) + SR;
const L = new Float32Array(N);
const R = new Float32Array(N);
if (cfg.audio?.sfx !== false)
  for (const c of cues) {
    const v = voice(c);
    const at = len(c.f / T.fps);
    const gl = Math.cos(((c.pan + 1) * Math.PI) / 4);
    const gr = Math.sin(((c.pan + 1) * Math.PI) / 4);
    for (let i = 0; i < v.length && at + i < N; i++) {
      L[at + i] += v[i] * gl;
      R[at + i] += v[i] * gr;
    }
  }

// ------------------------------------------------------------------------------------------- music (optional)
const music = cfg.audio?.music ? join(dir, 'audio', cfg.audio.music) : null;
if (music && existsSync(music)) {
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', music, '-f', 'f32le', '-ac', '2', '-ar', String(SR), '-'], { maxBuffer: 1 << 30 });
  const m = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
  const offset = len((cfg.audio?.musicDrop ?? 0) - T.DROP / T.fps); // music sample at film t = 0
  const g = 10 ** ((cfg.audio?.musicGainDb ?? -6) / 20);
  const accents = cues.filter((c) => ['land', 'drop', 'click', 'hit', 'whoosh'].includes(c.kind)).map((c) => c.f / T.fps);
  const duck = (t: number) => {
    let d = 0;
    for (const a of accents) if (t > a - 0.03 && t < a + 0.45) d = Math.max(d, t < a + 0.28 ? 1 : 1 - (t - a - 0.28) / 0.17);
    return 10 ** ((-3 * d) / 20); // ~3 dB under accents, never a gap
  };
  const fadeOut = len(1.2);
  for (let i = 0; i < N; i++) {
    const j = i + offset;
    if (j < 0 || 2 * j + 1 >= m.length) continue;
    const t = i / SR;
    const tail = i > N - fadeOut ? (N - i) / fadeOut : 1;
    const k = g * duck(t) * tail * Math.min(1, i / len(0.05));
    L[i] += m[2 * j] * k;
    R[i] += m[2 * j + 1] * k;
  }
  console.log(`music: ${cfg.audio!.music} (drop at ${cfg.audio?.musicDrop ?? 0}s → film ${(T.DROP / T.fps).toFixed(2)}s)`);
} else if (music) console.warn(`music file not found: ${music} (continuing with SFX only)`);

// ------------------------------------------------------------------------------------------- write + master
const pcm = new Float32Array(N * 2);
for (let i = 0; i < N; i++) {
  pcm[2 * i] = L[i];
  pcm[2 * i + 1] = R[i];
}
const rawFile = join(out, 'soundtrack.raw.f32');
writeFileSync(rawFile, Buffer.from(pcm.buffer));
const wav = join(out, 'soundtrack.wav');
// a soft limiter tames the click transients first, so the linear gain is not held back by the true-peak ceiling
const LIMIT = 'alimiter=limit=0.5:attack=1:release=40:level=false';
// two-pass loudnorm: measure, then apply one linear gain so the mix keeps its dynamics and lands on -14 LUFS
const input = ['-f', 'f32le', '-ar', String(SR), '-ac', '2', '-i', rawFile, '-t', String(T.total / T.fps)];
const probe = spawnSync('ffmpeg', ['-hide_banner', '-nostats', ...input, '-af', `${LIMIT},loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json`, '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
const m = JSON.parse(probe.slice(probe.lastIndexOf('{'), probe.lastIndexOf('}') + 1));
const ln = `${LIMIT},loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
execFileSync('ffmpeg', ['-v', 'error', '-y', ...input, '-af', ln, '-ar', String(SR), '-c:a', 'pcm_s16le', wav]);
rmSync(rawFile, { force: true });
// measure what was written (integrated loudness and true peak)
const meter = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', wav, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
const lufs = meter.match(/I:\s+(-?[\d.]+) LUFS/g)?.pop()?.match(/-?[\d.]+/)?.[0];
const peak = meter.match(/Peak:\s+(-?[\d.]+) dBFS/g)?.pop()?.match(/-?[\d.]+/)?.[0];
console.log(`soundtrack → ${wav}
  ${cues.length} cues, ${lufs ?? '?'} LUFS, true peak ${peak ?? '?'} dBTP`);
