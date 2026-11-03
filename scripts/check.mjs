// Repository check: every project.json is valid, every local link in the docs resolves, ffmpeg and a browser exist.
// Usage: node scripts/check.mjs   (exit code 1 on any problem)
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { findBrowser } from './lib/chrome.mjs';
import { ROOT } from './lib/project.mjs';

const problems = [];
const ok = (m) => console.log(`  ✓ ${m}`);

// projects
const FORMATS = ['landscape', 'portrait', 'square'];
for (const name of readdirSync(join(ROOT, 'projects'))) {
  const file = join(ROOT, 'projects', name, 'project.json');
  if (!existsSync(file)) continue;
  let cfg;
  try {
    cfg = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    problems.push(`${file}: not valid JSON (${e.message})`);
    continue;
  }
  if (!cfg.url) problems.push(`${file}: "url" is required`);
  if (cfg.format && !FORMATS.includes(cfg.format)) problems.push(`${file}: format must be one of ${FORMATS.join(', ')}`);
  if (cfg.bpm != null && !(cfg.bpm > 40 && cfg.bpm < 240)) problems.push(`${file}: bpm looks wrong (${cfg.bpm})`);
  if (cfg.scenes && cfg.scenes !== 'auto' && !Array.isArray(cfg.scenes)) problems.push(`${file}: scenes must be "auto" or a list`);
  if (cfg.url && !/^https?:/.test(cfg.url) && !existsSync(join(ROOT, 'projects', name, cfg.url))) problems.push(`${file}: page ${cfg.url} not found`);
  ok(`projects/${name}/project.json`);
}

// local links in markdown
const md = [];
const walk = (d) => {
  for (const f of readdirSync(d)) {
    if (f === 'node_modules' || f.startsWith('.') || f === 'out' || f === 'capture') continue;
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (f.endsWith('.md')) md.push(p);
  }
};
walk(ROOT);
let links = 0;
for (const file of md) {
  const text = readFileSync(file, 'utf8').replace(/```[\s\S]*?```/g, '');
  for (const m of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    const href = m[1].split('#')[0];
    if (!href || /^(https?:|mailto:)/.test(href)) continue;
    links++;
    if (!existsSync(resolve(dirname(file), decodeURI(href)))) problems.push(`${file.replace(ROOT, '.')}: broken link ${m[1]}`);
  }
}
ok(`${md.length} markdown files, ${links} local links`);

// tools
try {
  execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
  ok('ffmpeg');
} catch {
  problems.push('ffmpeg is not on PATH');
}
try {
  ok(`browser: ${findBrowser()}`);
} catch (e) {
  problems.push(e.message);
}

if (problems.length) {
  console.log(`\n✗ ${problems.length} problem(s):`);
  for (const p of problems) console.log(`  - ${p}`);
  process.exit(1);
}
console.log('\nall good');
