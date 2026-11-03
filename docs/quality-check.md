# Quality check

For every film before delivery, no exceptions. Each of these rules was learned in a revision round.

## Commands

```bash
node mr.mjs plan <name>                  # no LATE line allowed
node mr.mjs sheet <name> 30              # 30-frame overview → out/sheet.png
node mr.mjs stills <name> 2.1s,6.6s      # suspicious moments, full size
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate:format=duration projects/<name>/out/<name>.mp4
```

After rendering, extract frames from every second and every scene change and look at each one (changes: scene start + 0.4 s, scene end − 0.2 s):

```bash
ffmpeg -i projects/<name>/out/<name>.mp4 -vf "fps=2,scale=480:-1" frames/%03d.png
```

## Frame checklist

- [ ] **The window is never cropped.** The browser window is always fully visible.
- [ ] **No idle cursor clusters.** After the drop there must be no group standing or circling anywhere without work. Apart from short exits, every cursor is on a task or heading to one. The swarm gathers only in the hook and the finale.
- [ ] **No headline under the nav.** At no camera rest may a headline sit half hidden behind the sticky nav. Passing under it during a whip is fine.
- [ ] **The hook reads from the first frame.** The empty page shows only the logo tile and the swarm, with no small elements left over in the base image.
- [ ] **The swarm gathers on the CTA**, not on some other text or footer link.
- [ ] **Copies are right.** Only cards that look the same are copied (a dark button is never a copy of a white one).
- [ ] **Clean-up.** When a scene ends, no selection box, size badge or guide mark remains.
- [ ] **End card.** The cursors draw the logo's shape legibly; the sharp logo lands exactly in their place, and the title and buttons do not overlap.
- [ ] **Text.** Non-ASCII characters render correctly (e.g. Turkish İ/ı, Ş, Ğ). For fictional products, no made-up metrics or figures presented as real.

## Sound checklist

- [ ] The measurement printed by `audio` is about -14 LUFS with true peak ≤ -1 dBTP.
- [ ] If music is used, its drop is on the film's drop, with no audible gap or cut. The music dips only ~3 dB under the accents.
- [ ] If you did not listen to the sound, do not say you did; report the measurement and the cue count.

## Delivery

- Full quality `out/<name>.mp4`, share copy `out/<name>-share.mp4` (a few MB).
- In the delivery note: file paths, length and resolution, sound measurement, number of frames checked and known gaps.

← [Architecture](architecture.md) · [Audio](audio.md) →
