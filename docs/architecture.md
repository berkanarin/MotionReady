# Architecture

```
mr.mjs ──► scripts/capture.mjs ──► projects/<name>/capture/{page,bare,ground,logo}.png + blocks.json
       ──► scripts/report.ts   ──► plan report          (src/engine/timing.ts + plan.ts)
       ──► scripts/audio.ts    ──► out/soundtrack.wav   (same plan → sound moments)
       ──► scripts/render.mjs  ──► out/<name>.mp4, -share.mp4, .gif   (Remotion: src/Root.tsx → src/film/*)
```

## 1. Capture: three images, one layout

The page opens in a headless browser over the DevTools protocol (no Playwright or Puppeteer needed). It is scrolled once from top to bottom, so lazy-loaded pictures and scroll-revealed content are triggered. Then every finite animation is finished with `animation.finish()`, and content that is still invisible is made visible. Three full-page shots of the same layout are taken:

| File | Contains | What the film uses it for |
|---|---|---|
| `page.png` | The finished page | Text and pictures are cut from it |
| `bare.png` | All text and pictures hidden | A card first appears as its empty surface |
| `ground.png` | Card surfaces hidden too, section backgrounds only | The empty page the film starts from |
| `logo.png` | The first picture in the sticky nav (or, with no nav, in the top band), 480 px | Hook tile and end card |

`blocks.json` keeps each block's box in page CSS pixels: **frame** (a surface with its own background, border or shadow), **media** (img/svg/video/canvas) and **text** (an element with its own text node, with font size and line count). Sections and the sticky nav are stored next to them.

A finished block is exactly that box of `page.png`, so it matches the real page pixel for pixel.

## 2. Timing (`timing.ts`)

- **Grid:** `DROP` is the end of the hook (a whole beat). `bar(k) = DROP + k × bar length`.
- **Scenes:** Sections become scenes in order. Each scene has a **band** (the page range built during it) and a **camera rest**. The rest keeps the section headline clear below the nav. At the bottom of the page, if the camera cannot go lower and the previous headline would sit half under the nav, the camera backs up.
- **Camera:** A quick whip between scenes (with vertical motion blur), and a slow drift of at most 36 px within a scene.
- **Finale:** If the CTA is in the last scene's view, the swarm gathers and presses it half a bar later. Then the end card follows; its beats ([`endTiming.ts`](../src/engine/endTiming.ts)) scale with `end.duration`.

## 3. Plan (`plan.ts`)

1. **Blocks** are assigned to scenes. Those inside the sticky nav are tied to the first scene and to screen coordinates.
2. **Repeated cards:** Among cards with the same size and fill on the same row or column, the first becomes the master and the others are copied from it. Cards inside a copy land with the copy.
3. **Durations:** A card drag depends on its size (12–30 frames). Text depends on its character count. Headlines of 30 px and above are typed at 22 px, then grow in 8 steps. A picture is dragged first, then swept in.
4. **Assignment:** Each block goes to the cursor that can start it earliest, nearest and with the least load. A card's content does not start before the card is done, and a copy not before its master. Big headlines and big cards get two helper cursors at the edges.
5. **Motion:** Every cursor has a target for every frame: its task path, an approach point (where it fidgets slightly) or, with no work, outside the window. A damped spring follows the target. Idle cursors gently push each other apart. They lean at most 9° into their travel. The simulation runs once per project and is cached.

## 4. Render (`src/film/`)

| Component | Job |
|---|---|
| `Chrome.tsx` | Browser window (never cropped, slight 3D float), scrolled page, guide lines, ruler |
| `Page.tsx` | The page band by band: finished bands from `page.png`, the live band from blocks. When a scene ends, its band hands over to the finished image (no selection marks remain) |
| `Swarm.tsx` | Cursors and the labels they carry while working. A cursor that leaves the window fades out |
| `Hook.tsx` | Logo tile on the empty page; on the drop it flies to its place on the page |
| `EndCard.tsx` | Tornado → flight to points sampled from the logo's pixels → sharp logo → title and buttons |

**Coordinates:** Page CSS pixels (blocks) → `K` scale and scroll → film pixels (cursors). Nav blocks ignore the scroll. The conversion lives in `plan.toScreen()`.

**Determinism:** No `Math.random`, `Date` or `performance`; randomness comes from `rand(seed)`. The same project gives the same film on every render.

← [Project settings](project-settings.md) · [Quality check](quality-check.md) →
