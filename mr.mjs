#!/usr/bin/env node
// MotionReady CLI. Every command takes a project name (a folder in projects/).
//
//   node mr.mjs new <project> <url>        create projects/<project>/project.json
//   node mr.mjs capture <project>          capture the page (page / bare / ground images + blocks.json)
//   node mr.mjs plan <project>             print the build plan (scenes, late blocks, finale)
//   node mr.mjs stills <project> 1s,4.5s   render frames (numbers or seconds) to out/stills/
//   node mr.mjs sheet <project> [n]        contact sheet of n evenly spaced frames → out/sheet.png
//   node mr.mjs audio <project>            synthesise the SFX (+ your music) → out/soundtrack.wav
//   node mr.mjs render <project>           the film → out/<project>.mp4 (+ a small share copy)
//   node mr.mjs gif <project> [from] [to] [width] [fps]   GIF (part of) the film → out/<project>.gif
//   node mr.mjs all <project>              capture → plan → audio → render → gif
//   node mr.mjs studio                     Remotion Studio (pick a project in the props panel)
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { capture } from './scripts/capture.mjs';
import { projectDir, ROOT } from './scripts/lib/project.mjs';
import { film, gif, sheet, stills } from './scripts/render.mjs';

const [cmd, name, ...rest] = process.argv.slice(2);
const tsx = (script, ...args) => {
  const r = spawnSync(process.execPath, [join(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs'), join(ROOT, 'scripts', script), ...args], { stdio: 'inherit', cwd: ROOT });
  if (r.status === 2 && script === 'report.ts') console.warn('\n  some blocks are LATE: give their scenes more bars or fewer sections (see docs/proje-ayarlari.md)');
  else if (r.status) process.exit(r.status);
};
const need = () => {
  if (!name) throw new Error(`usage: node mr.mjs ${cmd} <project>`);
  if (!existsSync(join(projectDir(name), 'project.json'))) throw new Error(`no projects/${name}/project.json (node mr.mjs new ${name} <url>)`);
};

const run = async () => {
  switch (cmd) {
    case 'new': {
      const url = rest[0];
      if (!name || !url) throw new Error('usage: node mr.mjs new <project> <url>');
      const dir = projectDir(name);
      if (existsSync(join(dir, 'project.json'))) throw new Error(`projects/${name}/project.json already exists`);
      mkdirSync(dir, { recursive: true });
      const cfg = { name, url, format: 'landscape', bpm: 120, hook: 2, scenes: 'auto', maxScenes: 5, barsPerScene: 1.5, cursors: 40, cta: '', end: { title: name, subtitle: '', button: '', url: '' } };
      writeFileSync(join(dir, 'project.json'), JSON.stringify(cfg, null, 2) + '\n');
      console.log(`created projects/${name}/project.json — next: node mr.mjs capture ${name}`);
      break;
    }
    case 'capture':
      need();
      await capture(name);
      tsx('report.ts', name);
      break;
    case 'plan':
      need();
      tsx('report.ts', name);
      break;
    case 'stills':
      need();
      await stills(name, (rest[0] ?? '1s').split(','));
      console.log(`stills → projects/${name}/out/stills/`);
      break;
    case 'sheet':
      need();
      await sheet(name, Number(rest[0] ?? 20));
      break;
    case 'audio':
      need();
      tsx('audio.ts', name);
      break;
    case 'render':
      need();
      await film(name);
      break;
    case 'gif':
      need();
      // node mr.mjs gif <project> [from] [to] [width] [fps]
      await gif(name, { from: Number(rest[0] ?? 0), to: rest[1] != null ? Number(rest[1]) : undefined, width: Number(rest[2] ?? 960), fps: Number(rest[3] ?? 15) });
      break;
    case 'all':
      need();
      await capture(name);
      tsx('report.ts', name);
      tsx('audio.ts', name);
      await film(name);
      await gif(name);
      break;
    case 'studio':
      spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['remotion', 'studio'], { stdio: 'inherit', cwd: ROOT, shell: process.platform === 'win32' });
      break;
    default:
      console.log(`MotionReady\n\n  node mr.mjs new <project> <url>\n  node mr.mjs capture <project>\n  node mr.mjs plan <project>\n  node mr.mjs stills <project> 1s,4.5s\n  node mr.mjs sheet <project> [n]\n  node mr.mjs audio <project>\n  node mr.mjs render <project>\n  node mr.mjs gif <project> [from] [to]\n  node mr.mjs all <project>\n  node mr.mjs studio\n\nDocs: docs/README.md`);
  }
};

run().catch((e) => {
  console.error(`\n✗ ${e.message}`);
  process.exit(1);
});
