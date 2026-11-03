# Setup

## Requirements

| Tool | Why |
|---|---|
| Node.js 22 or later | CLI, Remotion and the capture script (uses the built-in `WebSocket` and `fetch`) |
| ffmpeg and ffprobe (on the PATH) | Audio mix and measurement, share copy, GIF, contact sheets |
| Chrome, Edge or Chromium | Page capture. Remotion downloads its own browser for rendering |

ffmpeg on Windows: `winget install Gyan.FFmpeg`. On macOS: `brew install ffmpeg`.

If the browser is not in a known location, give its path with the `CHROME_PATH` environment variable:

```bash
CHROME_PATH="/opt/google/chrome/chrome" node mr.mjs capture demo
```

## First run

```bash
npm install
node scripts/check.mjs
node mr.mjs all demo
```

`check.mjs` checks the project files, the links in the docs, ffmpeg and the browser. On the first render Remotion downloads its own headless browser; this is normal and happens once.

## Platform notes

- **Windows:** Commands work in both PowerShell and Git Bash. Non-ASCII characters in paths are fine.
- **Linux server:** No display needed. Have a font package such as `fonts-noto` installed; the captured page downloads its own web fonts anyway.
- **Render time:** A 25 s film at 1080p60 takes a few minutes on a mid-range laptop. Concurrency is set in `remotion.config.ts` with `Config.setConcurrency(4)`.

← [Docs](README.md) · [Project settings](project-settings.md) →
