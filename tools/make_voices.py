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

Each take is checked by speech recognition (CER = how much of the line it got wrong). A take over 10% is recorded
again a little slower, which gives a rushed line room for all its words (--tries), and the lines still over are listed
at the end with what was heard. To redo a few lines by hand, after listening:

    ~/git-repos/voice-clone/.venv/bin/python tools/make_voices.py --redo-lines "José" "Mmm-hmm"
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
import unicodedata

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
ap.add_argument("--tries", type=int, default=3,
                help="takes per line at most, while speech recognition finds it wrong; each retake is 10%% slower")
ap.add_argument("--only", choices=["teddy", "tommy"], help="only this brother's lines")
ap.add_argument("--redo", action="store_true", help="ignore the cache and record everything again")
ap.add_argument("--redo-lines", nargs="+", metavar="TEXT",
                help="record again only the lines containing any of these bits of text (any case), e.g. \"José\" \"Mmm-hmm\"")
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


#: A take that speech recognition gets more of than this wrong is recorded again, then reported. One dropped short
#: word ("Can't tell you yet" without the "you") is about 13%.
MAX_CER = 0.1
#: Recognition leaves out "hmm"s unless it is primed to expect them. Primed, it hears the "Hmm" in "Hmm, no." and
#: still hears just "No." once the hum is cut off, so the priming adds no words that aren't there.
FILLERS = "Hmm, mm-hmm, nuh-uh, uh-huh, um."


def comparable(text):
    """A line as the CER check compares it: numbers as the words they were read as, no accents ("José" is often heard
    as "Jose"), and every "hmm", "mmm-hmm" and so on as one "hmm" (recognition can tell a hum is there, not how many
    it had)."""
    t = "".join(c for c in unicodedata.normalize("NFKD", speech_text(text)) if not unicodedata.combining(c))
    return re.sub(r"\b(?:hm+|mm+)(?:-(?:hm+|mm+))*\b", "hmm", t.lower())


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
        key = json.dumps([voice_name[who], speech_text(text), args.speed, args.seed, pitch[who], "tail trimmed"],
                         ensure_ascii=False)
        return CACHE / (hashlib.sha1(key.encode()).hexdigest()[:16] + ".mp3")

    def redo(text):
        return args.redo or any(bit.lower() in text.lower() for bit in args.redo_lines or [])

    missing = [(w, t) for w, t in todo if redo(t) or not cache_path(w, t).exists()]
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
    scratch = pathlib.Path(tempfile.mkdtemp(prefix="magic8-voices-"))
    voices = {}
    for who in {w for w, _ in missing}:
        v = resolve_voice(voice_name[who])
        voices[who] = (trim_tail(v.ref_wav, scratch / f"ref-{who}.wav"), v.ref_text)
    worst = []
    for i, (who, text) in enumerate(missing, 1):
        ref_wav, ref_text = voices[who]
        say = speech_text(text)
        best = None
        for attempt in range(max(1, args.tries)):
            # Slower, not another seed: a rushed "Slam dunk YES!" came out "Slumdang, yes" on three seeds, and clean
            # at 80% speed. The words barely slow down (1.1 s -> 1.2 s); the model gets room to say them all.
            speed = args.speed * (1 - 0.1 * attempt)
            result, score, _ = quality.generate_clean(engine, say, ref_wav, ref_text, speed, args.seed, scratch)
            wav = scratch / f"{i}-{attempt}.wav"
            audio_utils.write_wav(wav, result.audio, result.sample_rate)
            cer, heard = check(wav, say, score.heard)
            if best is None or (cer is not None and cer < best[2]):
                best = (wav, result, cer, heard, attempt + 1)
            if cer is None or cer <= MAX_CER:
                break
        wav, result, cer, heard, take = best
        encode(wav, cache_path(who, text), pitch[who], result.sample_rate)
        mark = "" if cer is None else f"  CER {cer:5.1%}"
        takes = f"  (take {take} of {attempt + 1})" if attempt else ""
        print(f"  {i:3d}/{len(missing)}  {who:5s} {result.seconds:4.1f}s{mark}  {say}{takes}", flush=True)
        if cer is not None and cer > MAX_CER:
            worst.append((who, say, heard, cer))
    for who, say, heard, cer in worst:
        print(f"\n  worth a listen ({who}, CER {cer:.0%}):\n    wanted: {say}\n    heard:  {heard}")


def trim_tail(ref_wav, out):
    """The reference recording without a stray sound after its last word.

    Teddy's ends with 0.2 s of something new (a word starting, or a breath) after the sentence and a 0.45 s pause. The
    model took it for the start of the line it was reading, so that line's first word fell inside the reference and was
    cut off with it: "SWISH! That's a YES!" came out "That's a yes", on 14 of 60 lines. Trimmed, all 14 kept their first
    word, while another seed on the untrimmed recording still lost it on most."""
    import numpy as np
    import soundfile as sf

    audio, rate = sf.read(str(ref_wav), dtype="float32")
    frame = int(0.01 * rate)
    n = len(audio) // frame
    energy = np.sqrt(np.mean(np.square(audio[: n * frame].reshape(n, frame)), axis=1))
    loud = np.flatnonzero(energy > 0.05 * energy.max())
    gaps = np.flatnonzero(np.diff(loud) > 30)  # pauses over 0.3 s
    if gaps.size:
        start = loud[gaps[-1] + 1]
        if loud[-1] - start < 30:  # what follows the last pause is too short to be a word of the reading
            audio = audio[: (start - 2) * frame]
            print(f"  trimmed a {(n - start) / 100:.2f}s stray sound off the end of {ref_wav}", flush=True)
    sf.write(str(out), audio, rate)
    return out


def check(wav, say, heard):
    """(CER, what was heard) for a take, or (None, None) without speech recognition. Of two hearings the closer one
    counts: voice-clone's plain one, and one primed to keep filler words (see FILLERS)."""
    if heard is None:
        return None, None
    import mlx_whisper
    from app import asr, mlx_runtime

    primed = mlx_runtime.run(lambda: mlx_whisper.transcribe(
        str(wav), path_or_hf_repo=asr.MODEL, language="en", initial_prompt=FILLERS, verbose=None)["text"].strip())
    return min((asr.character_error_rate(comparable(say), comparable(h)), h) for h in (heard, primed))


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
