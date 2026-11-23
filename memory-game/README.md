# The Ticker

A 1920s Wall Street memory roguelike. Answer cards to fight the great panics, keep your capital, and reach Black Tuesday. Spaced repetition decides which cards you see, so you're re-tested just before you'd forget.

## How a session works

| Mode | What happens | Why it helps memory |
|---|---|---|
| **Daily 5** | 5 cards, overdue first. Finishing keeps your streak. | A daily habit; spacing works only if you come back |
| **Open the Market** | 5 floors. Each has 2 doors, a room (deck) and a panic. Right answers hit it, wrong ones cost capital. Pick a perk after each room. Floor 6 is Black Tuesday. | Active recall under light pressure, with difficulty that rises |
| **Walk the Palace** | Every card is pinned to a spot in a room of the Exchange. | The method of loci: you remember places easily, so you hang facts on them |
| **The Seat** | Spend gold to unlock perks for future runs. | A reason to keep playing |

New and shaky cards are multiple choice. Cards in box 3 and up (right three times in a row since the last miss) switch to typed answers. Black Tuesday makes you type every card you've already got right twice.

## Files: what each one does

```
index.html            the single page; loads everything below in order
style.css             Art Deco look; dark mode just swaps the colour variables
manifest.webmanifest  lets iPhone install it as a Home Screen app
sw.js                 service worker: caches every file so it plays offline
js/cards-data.js      the verified deck (generated, don't edit by hand)
js/srs.js             spaced repetition (Leitner boxes: 1,3,7,14,30,60,120 days)
js/store.js           saves progress in your browser (localStorage)
js/app.js             the game: screens, the run, combat, perks, palace
js/theme.js           the world: rooms, spots, panics, perks, ranks, Augustus
js/art.js             SVG drawings (the owl and the panics)
js/answer.js          typed-answer checking (forgives typos; numbers must be exact)
js/fx.js              synthesized sounds and haptics
tools/build-cards.js  keeps only cards that scored 90+, writes the report
tools/make-icons.js   renders the app icon PNGs
content/work/         raw card batches, checker scores and repairs
content/verification-report.md   audit trail for every card
```

**Data flow:** `cards-data.js` (facts) + `store.js` (your save) + `srs.js` (what's due) → `app.js` → screen.

## How the cards were verified

1. **Written from a source:** the writer opens an authoritative page first, writes the card from it, and saves a verbatim quote. Numbers, dates and named people need two agreeing sources.
2. **Independent check:** a separate agent opens every cited page and scores the card:
   source trace /30 · exact match /30 · one right answer /15 · still true /15 · precision /10.
3. **Pass bar:** 90+ and no hard fail. Hard fails are a mismatched number, date or name, a quote that isn't on the page, a disputed fact, or a decoy answer that could be argued correct.
4. **One repair:** a failed card is rewritten once and re-checked by a fresh agent, or it's cut.
5. **⚑ Report:** any card you flag leaves play at once. Settings → copy the reported list and send it to Claude to re-check.

## Put it on your iPhone (GitHub Pages)

1. On github.com, open the repo → **Settings** → **General** → scroll to **Danger Zone** → **Change visibility** → **Public**. Free accounts need a public repo for Pages.
2. **Settings** → **Pages** → Source **Deploy from a branch** → Branch `memory-game`, folder `/ (root)` → **Save**.
3. After about a minute, open `https://pc0709-debug.github.io/Test-Learn/memory-game/` (capital T and L: the repo was renamed `Test-Learn`, and this part of the address is case-sensitive) in Safari.
4. Tap **Share** → **Add to Home Screen**. Open it once while online so it caches everything. After that it works with no signal.

Note: Pages serves one branch per repo. When the focus timer is ready, merge both branches into `main` and point Pages at `main`.

## Updating

Change a file, then bump `VERSION` in `sw.js` so phones fetch the new copy (the update shows on the second launch).
