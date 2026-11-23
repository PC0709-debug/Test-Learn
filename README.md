# Test-Learn

Small productivity apps built with Claude Code while learning to code. Each one is a plain
HTML/CSS/JavaScript web app — no build step — that installs on iPhone/iPad from Safari.

| Project | Folder | What it does |
|---|---|---|
| **Still** | `focus-timer/` | Ambient focus timer that trains phone-free attention |
| Memory game | `memory-game/` | Active-recall game (built in a separate session) |

## Still — focus timer

Three screens, swipe between them:

```
 Stats  ◄──  Focus  ──►  Insights
 heatmap      ambient     patterns, Focus-mode
 streaks      timer       shortcut, settings
```

- **Ambient modes**: rain, ocean, forest night. Sound is generated live (no audio files);
  the scene slowly darkens and slows so the screen gets boring and your attention moves to work.
- **Trained mode**: starts at 10 min; +5 min after every session with zero interruptions (max 90).
- **Pure focus**: untimed, stop when you're done.
- **Flip to focus**: put the phone face down to start; picking it up counts as an interruption.
- **Urge surfing**: leaving the app, picking up, or ending early opens a 60s breathing sheet
  and asks what pulled you away.
- **Clean minutes**: only time without interruptions counts toward streaks and the heatmap.

### How the code fits together

| File | Job |
|---|---|
| `index.html` | All screens and their elements |
| `styles.css` | The look |
| `js/app.js` | The conductor: state machine, buttons, wiring everything together |
| `js/session.js` | Timing math: clean segments, interruptions |
| `js/storage.js` | Saving to the device + streak/day helpers |
| `js/sensors.js` | Keep screen awake, motion sensor for flip detection |
| `js/sound.js` | Generated soundscapes (Web Audio API) |
| `js/scenes.js` | Animated nature scenes on a `<canvas>` |
| `js/ui-stats.js`, `js/ui-insights.js` | Build the two side screens |
| `sw.js`, `manifest.webmanifest` | Make it installable and work offline |

### Put it on your iPhone

1. GitHub → this repo → **Settings → Pages** → Source: *Deploy from a branch* → pick the branch → `/ (root)` → Save.
2. Open `https://<your-username>.github.io/Test-Learn/focus-timer/` in **Safari**.
3. Share button → **Add to Home Screen**.

Notes: the app must stay open for sound (iOS pauses web audio in the background), which fits
the "phone down, app open" design. Data is stored only on your device.
