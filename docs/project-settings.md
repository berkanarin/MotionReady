# Project settings (`project.json`)

Each project is `projects/<name>/project.json`. Only `url` is required; every other field has a sensible default. Types: [`src/engine/types.ts`](../src/engine/types.ts).

## Fields

| Field | Default | Description |
|---|---|---|
| `url` | (required) | The page to build. An `https://…` address or a file path relative to the project folder (`site/index.html`). |
| `format` | `landscape` | `landscape` 1920×1080 (page captured 1440 px wide), `square` 1080×1080 (1280 px), `portrait` 1080×1920 (430 px, mobile layout). |
| `fps` | `60` | Frame rate. |
| `bpm` | `120` | The tempo the cuts land on. If you use music, put its own BPM here. |
| `hook` | `2` | Length of the hook before the drop (seconds). Snapped to whole beats, at least 2 beats. |
| `scenes` | `"auto"` | `"auto"` picks the page's sections top to bottom. To choose yourself: `[{ "section": "<id>", "bars": 1.5 }, …]`. Section ids are listed in the `capture` output. |
| `maxScenes` | `6` | Maximum number of scenes in `auto` mode. Extra ones are thinned out evenly; the section with the CTA always stays. |
| `barsPerScene` | `1.5` | Scene length (bars) in `auto` mode. The first scene is at least 2 bars. |
| `cursors` | `44` | Number of cursors in the swarm (8–80). 140 extra cursors join for the end card. |
| `tags` | generic list | Labels the cursors carry while they work: the product's tools, features, team names… |
| `palette` | 11 colours | Cursor colours. |
| `cta` | none | Visible text of the button the swarm gathers on and presses in the finale. If the same text appears several times, the one inside a button and lowest on the page is picked. |
| `end` | none | End card: `{ "title", "subtitle", "button", "url", "duration" }`. `duration` is in seconds (3.5–8, default 5); shorten it for short films. Without `end` the film stops after the build. |
| `background` | dark gradient | Backdrop behind the window (CSS `background`). |
| `address` | the URL's host | Address shown in the browser bar. |
| `capture.width` | by format | Capture width (CSS px). |
| `capture.dpr` | by format | Capture pixel ratio. If it is lower than the film's scale, text gets blurry. |
| `capture.maxHeight` | 11000 (6000 in portrait) | Cuts very long pages here. |
| `capture.wait` | `2500` | Time to wait after the page opens (ms). |
| `capture.hide` | `[]` | CSS selectors removed before capture: cookie banners, chat bubbles, loading screens… |
| `audio.sfx` | `true` | UI effects. |
| `audio.music` | none | Music file inside `projects/<name>/audio/`. Never committed. |
| `audio.musicDrop` | `0` | Second of the drop in the music file; it lands on the film's drop. |
| `audio.musicGainDb` | `-6` | Music level in the mix. |

## Reading the plan

`node mr.mjs plan <name>` prints a report like this:

```
  tools     6.47s–11.18s  band 947–1773  camera 937→973   39 blocks, built by 10.58s  copies 5
```

- **band:** The page range built in that scene (CSS px). Anything outside looks finished from the start, because the camera never shows it while it is being built. A band runs on to the next picked section, so loose rows between sections are built too.
- **camera:** The scroll value where the camera rests at the start and end of the scene. The headline always stays at least 40 px below the nav.
- **built by:** When the last block finishes. Should be before the scene ends.
- **LATE n:** n blocks are still being built as the scene closes. Fix: give that scene more `bars` or pick fewer sections.
- **copies:** Number of repeated cards copied with ⌥-drag.

## Common adjustments

- **Skip a section or change the order:** write the `scenes` list yourself.
- **Faster or slower film:** `bpm` and `bars` decide it together. At 120 BPM one bar is 2 seconds.
- **A busy page runs late:** raise that scene's `bars` by 0.5.
- **Short film (around 10 s):** `"hook": 0.8`, a higher `bpm` (e.g. 150), two scenes and `"end": { …, "duration": 4 }`. Re-run `plan` until the total is right and nothing is `LATE`.
- **Portrait (Reels/Shorts):** `"format": "portrait"` and `capture` again. The page is captured in its mobile layout.

← [Setup](setup.md) · [Architecture](architecture.md) →
