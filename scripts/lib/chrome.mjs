// A tiny DevTools-protocol client for the locally installed Chrome / Edge / Chromium (no Playwright, no Puppeteer).
import { spawn } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CANDIDATES = {
  win32: [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  ],
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ],
  linux: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge'],
};

export const findBrowser = () => {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const hit = (CANDIDATES[process.platform] ?? CANDIDATES.linux).find((p) => existsSync(p));
  if (!hit) throw new Error('No Chrome, Edge or Chromium found. Install one or set CHROME_PATH.');
  return hit;
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Launch a headless browser and return { send, evaluate, close } bound to its first page. */
export const launch = async ({ width, height, port = 9333 + Math.floor(Math.random() * 400) }) => {
  const prof = join(tmpdir(), `motionready-${process.pid}-${Date.now()}`);
  const proc = spawn(findBrowser(), ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--mute-audio', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, `--window-size=${width},${height}`, 'about:blank'], { stdio: 'ignore' });
  let target;
  for (let i = 0; i < 75 && !target; i++) {
    await wait(200);
    try {
      target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page');
    } catch {}
  }
  if (!target) {
    proc.kill();
    throw new Error('The browser did not open its DevTools port.');
  }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, j) => {
    ws.addEventListener('open', r);
    ws.addEventListener('error', j);
  });
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m);
      pending.delete(m.id);
    }
  });
  const send = (method, params = {}) =>
    new Promise((r) => {
      const k = ++id;
      pending.set(k, r);
      ws.send(JSON.stringify({ id: k, method, params }));
    });
  /** Run a function in the page; its arguments are JSON-serialised. */
  const evaluate = async (fn, ...args) => {
    const r = await send('Runtime.evaluate', { expression: `(${fn})(...${JSON.stringify(args)})`, awaitPromise: true, returnByValue: true });
    if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description ?? JSON.stringify(r.result.exceptionDetails));
    return r.result?.result?.value;
  };
  const close = async () => {
    ws.close();
    proc.kill();
    await wait(300);
    try {
      rmSync(prof, { recursive: true, force: true });
    } catch {}
  };
  return { send, evaluate, close, wait };
};
