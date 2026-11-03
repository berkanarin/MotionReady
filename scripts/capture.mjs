// Capture step: open the page, force every reveal animation to its end state and take three full-page images of the
// same layout plus the box of every block the swarm will build.
//   capture/page.png    the finished page                      → text and pictures are cut from it
//   capture/bare.png    surfaces only (all ink hidden)          → a card can appear empty first
//   capture/ground.png  section backgrounds only (cards hidden) → the empty page the film starts from
//   capture/blocks.json blocks, sections and the sticky nav, in page CSS px
// Usage: node scripts/capture.mjs <project>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from './lib/chrome.mjs';
import { CAPTURE_WIDTH, loadProject, projectDir, resolveUrl } from './lib/project.mjs';

export const capture = async (name) => {
  const cfg = loadProject(name);
  const format = cfg.format ?? 'landscape';
  const W = cfg.capture?.width ?? CAPTURE_WIDTH[format];
  const VH = format === 'portrait' ? 860 : 900;
  const DPR = cfg.capture?.dpr ?? (format === 'portrait' ? 2.5 : format === 'square' ? 1 : 1.25);
  const maxH = cfg.capture?.maxHeight ?? (format === 'portrait' ? 6000 : 11000);
  const url = resolveUrl(name, cfg.url);
  const out = join(projectDir(name), 'capture');
  mkdirSync(out, { recursive: true });

  const b = await launch({ width: W, height: VH });
  try {
    await b.send('Page.enable');
    await b.send('Runtime.enable');
    await b.send('Emulation.setDeviceMetricsOverride', { width: W, height: VH, deviceScaleFactor: DPR, mobile: format === 'portrait' });
    await b.send('Page.navigate', { url });
    await b.wait(cfg.capture?.wait ?? 2500);

    // walk the page once so lazy images and scroll reveals fire
    await b.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += 500) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 110));
      }
      window.scrollTo(0, 0);
      return true;
    });
    await b.wait(700);

    const layout = await b.evaluate(async (hide, maxH) => {
      // finish every finite animation and transition, then freeze the rest
      for (const a of document.getAnimations()) {
        try {
          if (a.effect?.getTiming().iterations !== Infinity) a.finish();
          else a.pause();
        } catch {}
      }
      const st = document.createElement('style');
      st.textContent = `*,*::before,*::after{transition:none!important;animation-play-state:paused!important;caret-color:transparent!important}`;
      document.head.appendChild(st);
      for (const sel of hide) document.querySelectorAll(sel).forEach((el) => el.remove());
      // anything still waiting for a reveal (opacity 0 / shifted by a scroll library) is shown as it will end up
      for (const el of document.querySelectorAll('body *')) {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || el.closest('[aria-hidden="true"]')) continue;
        if (Number(cs.opacity) < 0.05 && (el.textContent.trim() || el.querySelector('img,svg,video,canvas') || /^(IMG|SVG|VIDEO|CANVAS)$/.test(el.tagName))) {
          el.style.setProperty('opacity', '1', 'important');
          el.style.setProperty('transform', 'none', 'important');
          el.style.setProperty('filter', 'none', 'important');
        }
      }
      document.querySelectorAll('img[loading="lazy"]').forEach((i) => (i.loading = 'eager'));
      await Promise.all([...document.images].map((i) => (i.complete ? 0 : new Promise((r) => ((i.onload = i.onerror = r), setTimeout(r, 4000))))));
      await document.fonts.ready;
      await new Promise((r) => setTimeout(r, 500));

      const W = document.documentElement.clientWidth;
      const H = Math.min(document.documentElement.scrollHeight, maxH);
      const rgb = (c) => (c.match(/[\d.]+/g) || [255, 255, 255, 1]).map(Number);
      const lum = (c) => {
        const [r, g, b] = rgb(c);
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const opaque = (c) => c !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(c);
      const vis = (el) => {
        const cs = getComputedStyle(el);
        return cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05;
      };
      const rectOf = (el) => {
        const r = el.getBoundingClientRect();
        return [Math.round(r.x), Math.round(r.y + window.scrollY), Math.round(r.width), Math.round(r.height)];
      };
      const bgDarkOf = (el) => {
        for (let p = el; p && p !== document.documentElement; p = p.parentElement) {
          const c = getComputedStyle(p).backgroundColor;
          if (opaque(c)) return lum(c) < 110;
        }
        return lum(getComputedStyle(document.body).backgroundColor || '#fff') < 110;
      };

      // the sticky / fixed bar along the top, if there is one (drawn in viewport space by the film)
      let nav = null;
      for (const el of document.querySelectorAll('body *')) {
        const cs = getComputedStyle(el);
        if (!/fixed|sticky/.test(cs.position) || !vis(el)) continue;
        const r = el.getBoundingClientRect();
        if (r.top > 60 || r.height < 24 || r.height > 180 || r.width < W * 0.5) continue;
        let face = el;
        if (!opaque(cs.backgroundColor) && cs.boxShadow === 'none') {
          const kids = [...el.querySelectorAll('*')].filter((k) => opaque(getComputedStyle(k).backgroundColor) && k.getBoundingClientRect().width > W * 0.4);
          if (kids.length) face = kids.sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0];
        }
        const fr = rectOf(face);
        if (!nav || fr[2] * fr[3] > nav.r[2] * nav.r[3]) nav = { r: fr, radius: parseFloat(getComputedStyle(face).borderTopLeftRadius) || 0 };
      }

      // sections: outermost page bands (header / section / footer / main's children) at least 180 px tall
      const cand = [...document.querySelectorAll('header, section, footer, article, main > *, body > div > *')].filter((el) => {
        if (!vis(el)) return false;
        const r = el.getBoundingClientRect();
        return r.height >= 180 && r.width >= W * 0.6 && !/fixed|sticky/.test(getComputedStyle(el).position);
      });
      const outer = cand.filter((el) => !cand.some((o) => o !== el && o.contains(el)));
      const sections = outer
        .map((el, i) => ({ id: el.id || `${el.tagName.toLowerCase()}-${i + 1}`, r: rectOf(el), dark: bgDarkOf(el) }))
        .filter((s) => s.r[1] < H)
        .sort((a, b) => a.r[1] - b.r[1]);

      // blocks
      const all = [...document.body.querySelectorAll('*')].filter(vis);
      const seen = new Set();
      const blocks = [];
      const key = (k, el) => k + ':' + all.indexOf(el);
      const keep = (r) => r[2] >= 6 && r[3] >= 6 && r[0] < W && r[0] + r[2] > 0 && r[1] < H;
      for (const el of all) {
        const cs = getComputedStyle(el);
        const bg = opaque(cs.backgroundColor) || cs.backgroundImage !== 'none';
        const bd = parseFloat(cs.borderTopWidth) > 0 && opaque(cs.borderTopColor);
        const sh = cs.boxShadow !== 'none';
        const b = el.getBoundingClientRect();
        if (!(bg || bd || sh) || b.width >= W - 30 || el === document.body) continue;
        // every surface smaller than a page band is hidden in ground.png; only the bigger ones are built on their own
        el.setAttribute('data-mr-surface', '');
        if (b.width * b.height < 500) continue;
        const r = rectOf(el);
        if (!keep(r) || seen.has(key('f', el))) continue;
        seen.add(key('f', el));
        el.setAttribute('data-mr-frame', '');
        blocks.push({ kind: 'frame', r, tag: el.tagName.toLowerCase(), radius: parseFloat(cs.borderTopLeftRadius) || 0, dark: opaque(cs.backgroundColor) && lum(cs.backgroundColor) < 110, bgDark: bgDarkOf(el.parentElement || el) });
      }
      for (const el of all) {
        if (!/^(img|svg|video|canvas|picture|iframe)$/i.test(el.tagName) || el.parentElement?.closest('svg')) continue;
        const r = rectOf(el);
        if (!keep(r) || seen.has(key('m', el))) continue;
        seen.add(key('m', el));
        blocks.push({ kind: 'media', r, tag: el.tagName.toLowerCase(), bgDark: bgDarkOf(el) });
      }
      for (const el of all) {
        if (el.closest('svg')) continue;
        const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
        if (!own) continue;
        const cs = getComputedStyle(el);
        const range = document.createRange();
        range.selectNodeContents(el);
        const b = range.getBoundingClientRect();
        if (b.width < 4) continue;
        const r = [Math.round(b.x), Math.round(b.y + window.scrollY), Math.round(b.width), Math.round(b.height)];
        if (!keep(r)) continue;
        const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.25;
        blocks.push({ kind: 'text', r, tag: el.tagName.toLowerCase(), size: parseFloat(cs.fontSize), lines: Math.max(1, Math.round(b.height / lh)), text: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 80), bgDark: bgDarkOf(el) });
      }
      return { W, H, title: document.title, nav, sections, blocks };
    }, cfg.capture?.hide ?? [], maxH);

    const shot = async (file) => {
      const r = await b.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: layout.W, height: layout.H, scale: 1 } });
      writeFileSync(join(out, file), Buffer.from(r.result.data, 'base64'));
    };
    await b.send('Emulation.setDeviceMetricsOverride', { width: W, height: layout.H, deviceScaleFactor: DPR, mobile: format === 'portrait' });
    await b.wait(900);
    await shot('page.png');
    // the product's mark (first picture in the sticky nav), sharp enough to fill the end card
    let logo = null;
    const nr = layout.nav?.r;
    const mark = nr && layout.blocks.filter((k) => k.kind === 'media' && k.r[0] >= nr[0] - 2 && k.r[1] >= nr[1] - 2 && k.r[0] + k.r[2] <= nr[0] + nr[2] + 2 && k.r[1] + k.r[3] <= nr[1] + nr[3] + 2).sort((a, c) => a.r[0] - c.r[0])[0];
    if (mark) {
      const [x, y, w, h] = mark.r;
      const scale = 480 / (Math.max(w, h) * DPR);
      const r = await b.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x, y, width: w, height: h, scale } });
      writeFileSync(join(out, 'logo.png'), Buffer.from(r.result.data, 'base64'));
      logo = { r: mark.r, file: 'logo.png' };
    }
    await b.evaluate(() => {
      const st = document.createElement('style');
      st.textContent = `*,*::before,*::after{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important}
        img,svg,video,canvas,picture,iframe{visibility:hidden!important}`;
      document.head.appendChild(st);
      return true;
    });
    await b.wait(400);
    await shot('bare.png');
    await b.evaluate(() => {
      const st = document.createElement('style');
      st.textContent = `[data-mr-surface],[data-mr-surface]::before,[data-mr-surface]::after{background:none!important;border-color:transparent!important;box-shadow:none!important;outline:none!important}`;
      document.head.appendChild(st);
      return true;
    });
    await b.wait(400);
    await shot('ground.png');
    const data = { url, title: layout.title, W: layout.W, H: layout.H, DPR, nav: layout.nav, logo, sections: layout.sections, blocks: layout.blocks };
    writeFileSync(join(out, 'blocks.json'), JSON.stringify(data));
    console.log(`captured ${url}\n  page ${layout.W}×${layout.H} CSS px @${DPR}x, ${layout.blocks.length} blocks, nav ${layout.nav ? 'yes' : 'no'}\n  sections: ${layout.sections.map((s) => `${s.id}@${s.r[1]}`).join(', ')}`);
    return data;
  } finally {
    await b.close();
  }
};

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('capture.mjs')) {
  capture(process.argv[2]).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
