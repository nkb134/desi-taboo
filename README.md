# 🌶️ Desi Taboo

A mobile-first web version of the party game **Taboo**, with an Indian twist: 297 words across
Bollywood, cricket, street food, festivals, places, Hinglish slang, brands, mythology and more,
in three difficulty levels.

**Play:** https://nkb134.github.io/desi-taboo/

## How to play

1. Split into 2–4 teams. One player per round is the clue-giver; their team guesses.
2. Describe the word on the card without saying it or any of the 5 taboo words.
3. **Got it ✓** = +1 · **Taboo ✕** = −1 · **Pass ↷** = 0 (free passes are limited).
4. Swipe the card: right = got it, left = taboo, up = pass. Or use the buttons.
5. Most points after all rounds wins.

## Features

- Teams (2–4), configurable round time, free passes, difficulty (Easy / Medium / Hard / Mix) and rounds
- Swipe gestures, animated cards, countdown, timer ring with last-10-seconds alerts
- Sound effects and haptic feedback, screen wake-lock during rounds
- Post-round review: tap any word to fix a disputed result
- Installable PWA, works fully offline
- No build step: plain HTML / CSS / JS

## Libraries

- [GSAP](https://github.com/greensock/GSAP) — card physics and micro-interactions
- [howler.js](https://github.com/goldfire/howler.js) — audio playback
- [canvas-confetti](https://github.com/catdad/canvas-confetti) — celebrations

## Sounds

Two packs, switchable on the home screen: **Viral** ("FAAA!" on Taboo, sad "ummm…" on Skip, "Waaah!" on
Got it) and **Classic** (chimes and buzzers). The "ummm" and "Waaah" clips are synthesized; `faa.mp3` is a
user-supplied clip. To swap any clip, replace the file in `assets/sfx/` keeping the same name, or edit the
`PACKS` / `EXT` maps in `js/audio.js`.

## Add words

Edit `js/words.js`. Each entry is `[word, difficulty, category, [five taboo words]]`.

## Run locally

Any static server works, e.g.

```bash
python3 -m http.server 8765
```

then open http://localhost:8765.
