// Remotion rendering for a project: one bundle, then stills, a contact sheet or the full film.
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { projectDir, ROOT } from './lib/project.mjs';

let served = null;
const serve = async () => (served ??= await bundle({ entryPoint: join(ROOT, 'src', 'index.ts'), publicDir: join(ROOT, 'projects') }));

export const composition = async (project, soundtrack = false) => {
  const serveUrl = await serve();
  const inputProps = { project, soundtrack };
  const comp = await selectComposition({ serveUrl, id: 'MotionReady', inputProps });
  return { serveUrl, comp, inputProps };
};

export const outDir = (project) => {
  const d = join(projectDir(project), 'out');
  mkdirSync(d, { recursive: true });
  return d;
};

/** Frames as numbers, or seconds with an "s" suffix ("1.5s"). */
const toFrames = (list, fps) => list.map((v) => (String(v).endsWith('s') ? Math.round(parseFloat(v) * fps) : Number(v)));

export const stills = async (project, frames, { scale = 0.5, dir } = {}) => {
  const { serveUrl, comp, inputProps } = await composition(project);
  const out = dir ?? join(outDir(project), 'stills');
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const files = [];
  for (const f of toFrames(frames, comp.fps)) {
    const file = join(out, `f${String(f).padStart(5, '0')}.png`);
    await renderStill({ composition: comp, serveUrl, inputProps, frame: Math.min(comp.durationInFrames - 1, f), output: file, scale });
    files.push(file);
    process.stdout.write(`${f} `);
  }
  process.stdout.write('\n');
  return files;
};

/** n evenly spaced frames tiled into out/sheet.png. */
export const sheet = async (project, n = 20) => {
  const { comp } = await composition(project);
  const frames = Array.from({ length: n }, (_, i) => Math.round(((i + 0.5) * comp.durationInFrames) / n));
  const dir = join(outDir(project), 'sheet');
  const files = await stills(project, frames, { scale: 0.25, dir });
  files.forEach((f, i) => execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', f, join(dir, `s${i}.png`)]));
  const cols = comp.width >= comp.height ? 5 : 8;
  const file = join(outDir(project), 'sheet.png');
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', join(dir, 's%d.png'), '-frames:v', '1', '-vf', `tile=${cols}x${Math.ceil(n / cols)}:padding=4`, file]);
  console.log(`sheet → ${file}`);
  return file;
};

export const film = async (project) => {
  const out = outDir(project);
  const sound = existsSync(join(out, 'soundtrack.wav'));
  const { serveUrl, comp, inputProps } = await composition(project, sound);
  const file = join(out, `${project}.mp4`);
  let last = -1;
  await renderMedia({
    composition: comp,
    serveUrl,
    inputProps,
    codec: 'h264',
    crf: 16,
    x264Preset: 'slow',
    outputLocation: file,
    onProgress: ({ progress }) => {
      const p = Math.floor(progress * 20);
      if (p !== last) {
        last = p;
        process.stdout.write(`\r  render ${Math.round(progress * 100)}%`);
      }
    },
  });
  process.stdout.write('\n');
  // share copy: small enough for chat apps and project folders
  const share = join(out, `${project}-share.mp4`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', file, '-c:v', 'libx264', '-preset', 'slow', '-b:v', '1800k', '-maxrate', '2600k', '-bufsize', '5200k', '-pix_fmt', 'yuv420p', ...(sound ? ['-c:a', 'aac', '-b:a', '192k'] : ['-an']), '-movflags', '+faststart', share]);
  console.log(`film → ${file}${sound ? ' (with soundtrack)' : ' (silent: run `node mr.mjs audio` first for sound)'}\nshare → ${share}`);
  return file;
};

/** GIF from the rendered film (or a part of it): two-pass palette, 15 fps. */
export const gif = async (project, { from = 0, to, width = 960, fps = 15, out } = {}) => {
  const src = join(outDir(project), `${project}.mp4`);
  if (!existsSync(src)) throw new Error(`No ${src}. Render first: node mr.mjs render ${project}`);
  const file = out ?? join(outDir(project), `${project}.gif`);
  const span = to != null ? ['-t', String(to - from)] : [];
  const vf = `fps=${fps},scale=${width}:-1:flags=lanczos`;
  const pal = join(outDir(project), 'palette.png');
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(from), ...span, '-i', src, '-vf', `${vf},palettegen=stats_mode=diff`, pal]);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(from), ...span, '-i', src, '-i', pal, '-lavfi', `${vf}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle`, '-loop', '0', file]);
  rmSync(pal, { force: true });
  console.log(`gif → ${file}`);
  return file;
};
