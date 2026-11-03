// Project folders: projects/<name>/project.json (+ capture/, audio/, out/ next to it).
import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const projectDir = (name) => join(ROOT, 'projects', name);

/** Capture width per format: the page's own layout at that width is what the film shows. */
export const CAPTURE_WIDTH = { landscape: 1440, square: 1280, portrait: 430 };

export const loadProject = (name) => {
  if (!name) throw new Error('Give a project name: node mr.mjs <command> <project>');
  const file = join(projectDir(name), 'project.json');
  if (!existsSync(file)) throw new Error(`No ${file}. Create one with: node mr.mjs new ${name} <url>`);
  const cfg = JSON.parse(readFileSync(file, 'utf8'));
  return { ...cfg, name: cfg.name ?? name };
};

/** http(s) URLs pass through; anything else is a file inside the project folder. */
export const resolveUrl = (name, url) => {
  if (/^https?:\/\//i.test(url) || url.startsWith('file:')) return url;
  const p = isAbsolute(url) ? url : join(projectDir(name), url);
  if (!existsSync(p)) throw new Error(`Page not found: ${p}`);
  return pathToFileURL(p).href;
};
