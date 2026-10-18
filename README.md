# Magic 8: Teddy & Tommy

[![Magic 8: Teddy & Tommy title screen](docs/screenshot.jpg)](https://adong.github.io/magic-8-teddy/)

Ask a question and shake the ball, and the brothers answer.

**中文：** 问个问题，摇一摇魔法球，兄弟俩来回答。

Press **?** any time (or tap the round **?** button on the left edge) to see the keys. The game waits while you look.
Tap the language button under it (the A文 icon) to switch between English and 中文; the dashboard and every game remember the choice.

A glossy 3D magic 8-ball starring Teddy and Tommy. Ask it anything (or just shake it), and the brother you picked shakes the ball, waits for the blue triangle to float up through the liquid, then reacts: his signature move for a YES, a shrug for a maybe, and a playful head shake for a no. Answers are read aloud in the brothers' voices.

The name lives in one place, [js/title.js](js/title.js), so it's easy to rename.

## Play

Online: **https://adong.github.io/magic-8-teddy/**

Or open `index.html` by double-click, or send `dist/magic-8-teddy.html` (one file, everything inside) to an iPad or phone. Both work offline.

| Do this | What happens |
|---|---|
| Tap or click the ball | Shake it and get an answer |
| Drag the ball around | Shake it by hand. It keeps shaking for as long as you drag. |
| Type in "Ask Teddy & Tommy anything…" and press Enter | Ask a real question. Typing is optional. |
| **🎱 SHAKE!** button, `Space` or `Enter` | Shake it |
| Shake the iPad or phone | Shake it for real. On iPad/iPhone, tap **📳** once to allow motion. |
| **TEDDY / BOTH / TOMMY** at the top, or `1` `2` `3` | Pick who answers. In Both, they take turns: one brother is on stage at a time, and after each answer he waves and runs off while the other runs in for the next question. |
| The orange portrait button or `T` | Call the other brother for a second opinion (see below) |
| Tap a brother | He does his signature move |
| 📜 or `H` | The last 8 questions and answers, with second opinions |
| 🔊 or `M` | Sound and voice on or off |
| `/` | Jump to the question box |

### How each brother reacts

- **YES:** confetti, a gold glow and his signature move (`Kit.roster.signature`). Teddy alternates his Tyson-style boxing combo (💥 on each jab and straight) with a basketball jump shot: a hoop pops up over the ball and the 🏀 swishes through it, then bounces off the 8-ball. Tommy does the Y peace-sign pose (比耶), with ✌️ and ⭐ floating up.
- **Maybe:** he scratches his head (🤔) or shrugs (❓).
- **No:** a big ❌ with his arms or folded arms, shaking his head, with 🙅 or 😜. Silly, never mean.

### Companion mode: the second opinion

The companion is always the brother who isn't on stage (`Kit.roster.buddyFor`): Tommy when Teddy is answering, Teddy when Tommy is. Call him as often as you like, with no cooldown. Each visit lasts about 10 seconds:

1. He runs in at his smaller buddy size, with a name tag.
2. He thinks for a second, then agrees or disagrees with a funny line (👍 or 🙃). If the ball is still answering, he waits for it. If the brother on stage hasn't answered anything yet, he cheers him on instead.
3. He does his signature move.
4. He tosses the answering brother a treat: 🍦 💧 🧃 🍪 🍉 or 🍌, with a toast like "🍦 ICE CREAM FROM TOMMY!". The brother catches it and cheers.
5. He does his goodbye move (Teddy's jump shot, Tommy's Y), then waves and runs off.

Tapping again while he's there gets another opinion and another treat. If he's already leaving, he runs back. In **Both**, the brothers swap only after his visit ends. If you ask the next question while he's visiting and it's his turn, he vanishes in a puff of sparkles and his full-size self runs in to answer.

## Changing what they say

Everything the brothers say is in [js/answers.js](js/answers.js): 10 yes, 5 maybe and 5 no answers each (the classic 8-ball odds), plus the companion's agree, disagree and nothing-asked-yet lines. Edit, save and reload. Keep answers short, because the triangle is small. Emoji are fine. They appear in the ball and are skipped when spoken.

Each line's 中文 is in [js/zh.js](js/zh.js), keyed by the English line, so a new or changed line needs its translation there too (until then it shows in English). The voices stay English in both languages. Questions the kids type, in either language, are shown as they typed them.

### Voices

The answers are spoken with clips recorded ahead of time by the local voice model, F5-TTS on Apple MLX, from `~/git-repos/voice-clone`. The clips are stored in [js/voices.js](js/voices.js) as embedded MP3s, so the toy still works offline and as one file. A line without a clip, such as one you just added, is read by the browser's built-in voice instead.

- Teddy speaks in his own voice, cloned from the "Teddy English" recording in voice-clone.
- Tommy has no recording yet, so he uses Teddy's voice pitched up.

After editing `answers.js`, record the new lines. Only new or changed lines are generated, at about 35 seconds per line on this Mac:

```bash
~/git-repos/voice-clone/.venv/bin/python tools/make_voices.py
```

To give Tommy his own voice, record about 10 seconds of him reading in the voice-clone app, then pass its name:

```bash
~/git-repos/voice-clone/.venv/bin/python tools/make_voices.py --voice-tommy "Tommy English" --tommy-pitch 1.0
```

> **Before publishing:** `js/voices.js` is a clone of Teddy's real voice, so treat it like his photos. To publish without it, replace the file's contents with `window.M8Voices = {};`. The browser voice then reads everything.

## Files

| File | What's in it |
|---|---|
| `index.html` | The page: layout, styles, the script tags. Playable by double-click. |
| `js/title.js` | The name, in one constant |
| `js/answers.js` | Everything the brothers say. Edit me. |
| `js/keys.js` | The keys the ? panel shows (`Kit.help`) |
| `js/zh.js` | The 中文 for every answer, second opinion, toast, button, tooltip and ? panel line (`Kit.lang`) |
| `js/voices.js` | Recorded voice clips. Generated by `tools/make_voices.py`, so don't edit it by hand. |
| `js/game.js` | The stage, layout, input, the ask → shake → reveal → react flow, and the companion's visit |
| `js/ball.js` | The 8-ball: glossy shell, the "8", the window, liquid, bubbles and the answer triangle with text fitted to its shape |
| `js/actor.js` | One brother on stage: walking, poses, hops, the effects of his signature moves, emoji over his head, holding a treat |
| `js/poses.js` | This toy's own poses: shake, watch, think, shrug, nope, folded, cheer, layered on `Kit.people.pose` |
| `js/fx.js` | Sounds (on `Kit.sound.tone` / `hiss`), the voice player, emoji flyers, sparkles, confetti, and the pop-up hoop |
| `tools/make_voices.py` | Records `js/voices.js` with the local voice model |
| `kit/` | Copy of the shared kit (`~/claude-games/kit`). Don't edit it here; re-sync with `python3 ../kit/tools/sync.py .` |
| `dist/magic-8-teddy.html` | The single-page build |

Rebuild the single page after any change:

```bash
python3 kit/tools/bundle.py .
```

## Testing hooks

The Browser pane throttles `requestAnimationFrame` while hidden, so `window.magic8` drives time directly:

- `magic8.hold(true)` stops the live clock, then `magic8.step(seconds)` advances it and draws a frame.
- `magic8.ask(text, { who, mood: 'yes' | 'maybe' | 'no', i })` forces an answer. `i` is the line's index in its list.
- `magic8.who('teddy' | 'tommy' | 'both')`, `magic8.buddy()`, `magic8.tap('teddy' | 'tommy' | 'buddy')`.
- `magic8.mute(bool)` and `magic8.history(bool)`.
- `magic8.state()` reports the stage, the current question, the visit and everyone's pose.

## Kit candidates

These live in this game's own JS for now:

- The poses in `js/poses.js`, especially `think`, `shrug` and `nope`, which any game could use for reactions.
- The recorded-voice player in `js/fx.js` (`M8.voice`): Web Audio clips from data URIs, a fallback to `speechSynthesis`, and a mute that covers both. Plus `tools/make_voices.py` for recording a game's lines with the local voice model.
- The pop-up hoop and 🏀 shot (`M8.Court`), which now aims at any rim position and bounces off a sphere.
