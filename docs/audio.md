# Audio

`node mr.mjs audio <name>` mixes two parts and writes `projects/<name>/out/soundtrack.wav` and `cues.json`. If that file exists, `render` embeds it in the film.

## 1. UI effects (synthesized, no files needed)

Effects are generated from the plan's own moments, so the sound matches the picture frame by frame.

| Event | Sound |
|---|---|
| Swarm in the hook | Soft pentatonic blips |
| Drop | Low hit and a short air sound |
| Card surface lands | Short pop (spaced out, at most one every 7 frames) |
| Text is typed | Light keyboard tick (at most one every 5 frames) |
| Headline grows | A tick that rises in pitch at each step (8 steps) |
| Copy is dropped | Low "land" and a pop |
| Picture sweeps in | Very light sweep |
| Camera whip | Whoosh |
| CTA is pressed | Mouse click and a small chime |
| End card | Rising tornado sound, pops as cursors land on the logo, logo hit (chord), shine on the lock-up |

To turn the effects off: `"audio": { "sfx": false }`.

## 2. Your own music (optional)

1. Put the file under `projects/<name>/audio/` (this folder stays out of git).
2. In `project.json`:

```json
"bpm": 102,
"audio": { "music": "mytrack.mp3", "musicDrop": 10.81, "musicGainDb": -6 }
```

- `bpm` must be the music's own tempo; the cuts land on it.
- `musicDrop` is the second of the drop in the music file. It is aligned with the film's drop (the end of the hook).
- The music dips about 3 dB under the accents (landings, drop, clicks, end card) and is never cut. It fades out over 1.2 s at the end.

License: you are responsible for the right to use the music. Keep copyrighted tracks to personal use.

## 3. Mastering and measurement

First a soft limiter shaves the transients. Then a two-pass `loudnorm` measures and applies a single linear gain (target -14 LUFS, peak -1.5 dBTP). Finally `ebur128` measures the result and prints it:

```
soundtrack → projects/demo/out/soundtrack.wav
  152 cues, -14.6 LUFS, true peak -1.4 dBTP
```

When the peak limit does not allow it, the level may land up to 0.5 dB below target; that is acceptable.

← [Quality check](quality-check.md) · [Troubleshooting](troubleshooting.md) →
