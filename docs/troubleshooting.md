# Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `No Chrome, Edge or Chromium found` | The browser is not in a known location | Set the `CHROME_PATH` environment variable |
| The film frame says "node mr.mjs capture …" | The project has not been captured yet | `node mr.mjs capture <name>` |
| The capture shows an "Access denied" or blocked page | The site's firewall blocks headless browsers | Do not try to get around it. Open the site in your own browser, save it with Ctrl+S → "Web page, complete" into `projects/<name>/site/` and set `"url": "site/index.html"` |
| Some sections are empty or faded in the capture | The page's own animation library keeps elements hidden | Raise `capture.wait`; remove stubborn layers with `capture.hide` |
| A cookie banner or chat bubble shows | It was captured as part of the page | `"capture": { "hide": ["#cookie", ".chat-widget"] }` |
| The plan shows `LATE` | The scene is short and the section is busy | Raise that scene's `bars` or pick fewer sections |
| The finale swarm gathers in the wrong place | The `cta` text also appears elsewhere on the page | Write the button's exact text. The engine picks the match inside a button and lowest on the page; see the `press "…"` line in the plan report |
| `finale: no CTA` | The CTA is not in the last scene's view | Make the CTA's section the last scene, or leave `cta` out |
| A headline is half under the nav | No room for the camera at the bottom of the page | Swap the last scene for the previous section, or shorten the page with `capture.maxHeight` |
| Blurry text | Capture scale lower than the film's | Raise `capture.dpr` (1.25 is enough for landscape) |
| No logo, a letter on the end card | No picture found in the sticky nav or the top band | Normal behaviour; the title's first letter is used |
| `EncodingError: The source image cannot be decoded` warnings | A very long page image | Harmless if the frames are fine. If needed, lower `capture.maxHeight` |
| The film is too long for a short cut | Default hook, tempo and 5 s end card | See "Short film" in [project settings](project-settings.md) |
| Sound too quiet | Music gain low or effects off | `audio.musicGainDb`, `audio.sfx` |

← [Audio](audio.md) · [Docs](README.md)
