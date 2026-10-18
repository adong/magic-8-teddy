#!/usr/bin/env python3
"""Record every line in js/answers.js with the local voice model, into js/voices.js.

    ~/git-repos/voice-clone/.venv/bin/python tools/make_voices.py

The model is F5-TTS on Apple MLX from ~/git-repos/voice-clone (the voice-clone app): it reads text in the voice of a
short recording. Teddy speaks with the "Teddy English" recording. Tommy has no recording yet, so he gets Teddy's voice
pitched up (--tommy-pitch). Once Tommy is enrolled in voice-clone, run:

    ~/git-repos/voice-clone/.venv/bin/python tools/make_voices.py --voice-tommy "Tommy English" --tommy-pitch 1.0

Only new or changed lines are generated (clips are cached in tools/.voice-cache/, which git ignores). A line with no
clip (say, one you just added) is read by the browser's own voice instead, so the toy works without re-running this.
js/voices.js embeds the clips as MP3 data, which keeps the toy one offline page. It is a clone of Teddy's voice:
treat it like his photos when deciding where to publish.
"""
import argparse
import base64
import hashlib
import json
import os
import pathlib
import re
import subprocess
import sys
import tempfile

GAME = pathlib.Path(__file__).resolve().parent.parent
CACHE = GAME / "tools" / ".voice-cache"
OUT = GAME / "js" / "voices.js"
NAMES = {"teddy": "Teddy", "tommy": "Tommy"}

ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
ap.add_argument("--voice-clone", default=os.path.expanduser("~/git-repos/voice-clone"), help="the voice-clone repo")
ap.add_argument("--voice-teddy", default="Teddy English", help="voice-clone voice name or id for Teddy")
ap.add_argument("--voice-tommy", default="Teddy English", help="voice-clone voice name or id for Tommy")
ap.add_argument("--tommy-pitch", type=float, default=1.2, help="pitch factor for Tommy (1.2 = about 3 semitones up)")
ap.add_argument("--teddy-pitch", type=float, default=1.0, help="pitch factor for Teddy")
ap.add_argument("--speed", type=float, default=1.0, help="F5 speaking speed")
ap.add_argument("--seed", type=int, default=7, help="fixed seed, so a re-run gives the same takes")
ap.add_argument("--only", choices=["teddy", "tommy"], help="only this brother's lines")
ap.add_argument("--redo", action="store_true", help="ignore the cache and record everything again")
args = ap.parse_args()


ONES = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split()
TENS = "_ _ twenty thirty forty fifty sixty seventy eighty ninety".split()


def number_words(m):
    n = int(m.group(0))
    if n < 20:
        return ONES[n]
    if n < 100:
        return TENS[n // 10] + ("-" + ONES[n % 10] if n % 10 else "")
    return m.group(0)


def speech_text(text):
    """What the model reads: no emoji, '...' as a pause, numbers as words, shouted words in lower case."""
    t = re.sub("[\U0001F000-\U0001FAFF☀-➿️‍⬀-⯿]", "", text)
    t = t.replace("%", " percent")
    t = re.sub(r"\d+", number_words, t)
    t = t.replace("...", ", ").replace("…", ", ")
    t = re.sub(r"\b([A-Z]{2,})\b", lambda m: m.group(1).lower(), t)
    t = re.sub(r"\s+", " ", t).strip(" ,")
    return t


def load_answers():
    js = (GAME / "js" / "answers.js").read_text(encoding="utf-8")
    out = subprocess.run(
        ["node", "-e", "global.window = {}; eval(require('fs').readFileSync(0, 'utf8')); process.stdout.write(JSON.stringify(window.M8Answers))"],
        input=js, capture_output=True, text=True, check=True,
    )
    return json.loads(out.stdout)


def lines(answers):
    """(who, the line exactly as the game shows it) for every answer and every second opinion."""
    for who in ("teddy", "tommy"):
        for mood in ("yes", "maybe", "no"):
            for text in answers.get(who, {}).get(mood, []):
                yield who, text
    for who, kinds in (answers.get("opinions") or {}).items():
        other = NAMES["tommy" if who == "teddy" else "teddy"]
        for kind in ("agree", "disagree", "first"):
            for text in kinds.get(kind, []):
                yield who, text.replace("{name}", other)


def main():
    answers = load_answers()
    todo = [(who, text) for who, text in lines(answers) if not args.only or who == args.only]
    voice_name = {"teddy": args.voice_teddy, "tommy": args.voice_tommy}
    pitch = {"teddy": args.teddy_pitch, "tommy": args.tommy_pitch}
    CACHE.mkdir(parents=True, exist_ok=True)

    def cache_path(who, text):
        key = json.dumps([voice_name[who], speech_text(text), args.speed, args.seed, pitch[who]], ensure_ascii=False)
        return CACHE / (hashlib.sha1(key.encode()).hexdigest()[:16] + ".mp3")

    missing = [(w, t) for w, t in todo if args.redo or not cache_path(w, t).exists()]
    print(f"{len(todo)} lines, {len(missing)} to record")
    if missing:
        record(missing, voice_name, pitch, cache_path)

    # js/voices.js: every line that has a clip (lines from the other brother are kept when using --only)
    clips = {}
    for who, text in lines(answers):
        p = cache_path(who, text)
        if p.exists():
            clips[f"{who}|{text}"] = "data:audio/mpeg;base64," + base64.b64encode(p.read_bytes()).decode()
    body = ",\n".join(f"  {json.dumps(k, ensure_ascii=False)}: {json.dumps(v)}" for k, v in clips.items())
    OUT.write_text(
        "/* Magic 8: the brothers' recorded voices. GENERATED by tools/make_voices.py from js/answers.js: don't edit,\n"
        "   re-run it. Made with the local F5-TTS voice model (~/git-repos/voice-clone): Teddy in the\n"
        f"   \"{args.voice_teddy}\" voice, Tommy in \"{args.voice_tommy}\" at pitch x{args.tommy_pitch}. Keys are \"who|line\".\n"
        "   Lines missing here are read by the browser's own voice. This is a clone of Teddy's voice: think before publishing. */\n"
        "window.M8Voices = {\n" + body + "\n};\n",
        encoding="utf-8",
    )
    print(f"wrote {OUT.relative_to(GAME)}: {len(clips)} clips, {OUT.stat().st_size / 1024:.0f} KB")


def record(missing, voice_name, pitch, cache_path):
    vc = pathlib.Path(args.voice_clone).expanduser().resolve()
    sys.path.insert(0, str(vc))
    from app import audio as audio_utils, quality  # noqa: E402  (the voice-clone app)
    from app.cli import resolve_voice  # noqa: E402
    from app.engines import get_engine  # noqa: E402

    engine = get_engine()
    print("loading the model…", flush=True)
    engine.load()
    voices = {who: resolve_voice(voice_name[who]) for who in {w for w, _ in missing}}
    scratch = pathlib.Path(tempfile.mkdtemp(prefix="magic8-voices-"))
    worst = []
    for i, (who, text) in enumerate(missing, 1):
        v = voices[who]
        say = speech_text(text)
        result, score, tries = quality.generate_clean(engine, say, v.ref_wav, v.ref_text, args.speed, args.seed, scratch)
        wav = scratch / f"{i}.wav"
        audio_utils.write_wav(wav, result.audio, result.sample_rate)
        encode(wav, cache_path(who, text), pitch[who], result.sample_rate)
        cer = getattr(score, "cer", None)
        heard = getattr(score, "heard", None)
        mark = "" if cer is None else f"  CER {cer:5.1%}"
        print(f"  {i:3d}/{len(missing)}  {who:5s} {result.seconds:4.1f}s{mark}  {say}", flush=True)
        if cer is not None and cer > 0.2:
            worst.append((who, say, heard, cer))
    for who, say, heard, cer in worst:
        print(f"\n  worth a listen ({who}, CER {cer:.0%}):\n    wanted: {say}\n    heard:  {heard}")


def encode(wav, mp3, factor, rate):
    """Trim the silence, pitch (Tommy), even out the loudness, and squeeze into a small mono MP3."""
    trim = "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse"
    chain = [trim]
    if abs(factor - 1) > 1e-3:
        # raise the pitch (and the formants: a smaller, younger voice), then slow back down to near the original pace
        chain.append(f"asetrate={int(rate * factor)},aresample={rate},atempo={1 / factor * 1.08:.4f}")
    chain.append("loudnorm=I=-16:TP=-1.5:LRA=11")
    chain.append("apad=pad_dur=0.12")
    subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-y", "-i", str(wav), "-af", ",".join(chain),
         "-ac", "1", "-ar", "24000", "-codec:a", "libmp3lame", "-b:a", "40k", str(mp3)],
        check=True,
    )


main()
